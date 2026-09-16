// ============================================================
// reset-for-fresh-run.mjs — wipe test clutter, keep the permanent
// stuff, re-pull registrations fresh from the Google Sheet.
//
// KEEPS:   people (OC + speakers) + photos, problem_statements,
//          admins, event_settings (clocks/gates untouched).
// WIPES:   registrations (+ their Supabase Auth logins), team_members,
//          teams (+ their legacy Auth logins, if any), submissions
//          (+ storage files), scores, attendance, game_slots bookings
//          (slots themselves kept, just unbooked), leaderboard_visibility
//          (reset to unpublished), announcements, admin_audit.
// THEN:    re-syncs registrations from the Epochesque Registrations
//          Google Sheet (same source as the scheduled Netlify function).
//
// Supersedes pristine-wipe-v2.mjs / pristine-handover.mjs (both predate
// the registrations/team_members model and don't touch those tables).
//
// One-time. Run: node scripts/reset-for-fresh-run.mjs
// ============================================================
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)")
  process.exit(1)
}
const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1MyjOlFs-cPLBA8aSDn9-PT0R33jErVPCYT2FWrN9MSQ/export?format=csv&gid=0"

function splitCsvLine(line) {
  const out = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function parseSheet(csv) {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = {
    name: headers.indexOf("name"),
    regNo: headers.indexOf("reg no"),
    phone: headers.indexOf("phone"),
    email: headers.indexOf("email"),
  }
  if (idx.name === -1 || idx.regNo === -1) return []

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const regNo = (cells[idx.regNo] ?? "").trim().toUpperCase()
    const name = (cells[idx.name] ?? "").trim()
    if (!regNo || !name) continue
    rows.push({
      name: name.slice(0, 120),
      regNo: regNo.slice(0, 30),
      phone: (cells[idx.phone] ?? "").trim().slice(0, 20),
      email: (cells[idx.email] ?? "").trim().toLowerCase().slice(0, 200),
    })
  }
  return rows
}

// 1. Submission files (need paths before the cascade delete removes the rows)
const { data: subs } = await supa.from("submissions").select("id, storage_path")
for (const s of subs ?? []) {
  if (s.storage_path) await supa.storage.from("submissions").remove([s.storage_path]).catch(() => {})
}
console.log(`✓ submission files removed: ${(subs ?? []).filter((s) => s.storage_path).length}`)

// 2. Teams — delete legacy Auth logins (old CSV-import model), then rows.
//    FK schema cascades team_members/submissions/scores/attendance and
//    nulls out game_slots bookings automatically.
const { data: teams } = await supa.from("teams").select("id, team_code, auth_user_id")
for (const t of teams ?? []) {
  if (t.auth_user_id) await supa.auth.admin.deleteUser(t.auth_user_id).catch(() => {})
}
if (teams?.length) await supa.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ teams wiped (+ legacy logins): ${teams?.length ?? 0}`)

// 3. Registrations — delete each person's Auth login (the real login
//    model now), then the rows themselves.
const { data: regs } = await supa.from("registrations").select("id, reg_no, auth_user_id")
for (const r of regs ?? []) {
  if (r.auth_user_id) await supa.auth.admin.deleteUser(r.auth_user_id).catch(() => {})
}
if (regs?.length) await supa.from("registrations").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ registrations wiped (+ logins): ${regs?.length ?? 0}`)

// 4. Announcements
const { data: ann } = await supa.from("announcements").select("id")
if (ann?.length) await supa.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ announcements wiped: ${ann?.length ?? 0}`)

// 5. Admin audit log
const { data: audit } = await supa.from("admin_audit").select("id")
if (audit?.length) await supa.from("admin_audit").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ admin audit wiped: ${audit?.length ?? 0}`)

// 6. Leaderboard visibility — unpublish every round
await supa
  .from("leaderboard_visibility")
  .upsert(
    ["round1", "round2", "final"].map((round) => ({ round, is_published: false, published_at: null })),
    { onConflict: "round" }
  )
console.log("✓ leaderboard_visibility reset (all rounds unpublished)")

// 7. Game slot bookings — cleared already via teams cascade, but double-check
const { data: stillBooked } = await supa.from("game_slots").select("id").not("taken_by_team_id", "is", null)
if (stillBooked?.length)
  await supa.from("game_slots").update({ taken_by_team_id: null, booked_at: null }).not("taken_by_team_id", "is", null)
console.log(
  `✓ game slot bookings cleared: confirmed 0 booked${stillBooked?.length ? ` (had to force-clear ${stillBooked.length})` : ""}`
)

// 8. Re-sync registrations fresh from the Google Sheet
const res = await fetch(SHEET_CSV_URL)
if (!res.ok) {
  console.error(`✗ sheet fetch failed (${res.status}) — registrations table is empty, run sync-registrations later`)
} else {
  const csv = await res.text()
  const rows = parseSheet(csv)
  let added = 0
  let skippedAsDuplicate = 0
  for (const r of rows) {
    if (!r.email) continue
    const { error } = await supa.from("registrations").insert({ name: r.name, reg_no: r.regNo, phone: r.phone, email: r.email })
    if (!error) added++
    else if (error.code === "23505") skippedAsDuplicate++
    else console.error(`  ✗ insert failed for ${r.regNo}: ${error.message}`)
  }
  const { count: finalCount } = await supa.from("registrations").select("id", { count: "exact", head: true })
  console.log(
    `✓ registrations re-synced: ${added} inserted by this script, ${skippedAsDuplicate} already present (likely the scheduled sync function beat it), ${finalCount}/${rows.length} present in DB now`
  )
}

// 9. Verify — people, problem_statements, admins, event_settings must be untouched
const { count: peopleCount } = await supa.from("people").select("id", { count: "exact", head: true })
const { count: psCount } = await supa.from("problem_statements").select("id", { count: "exact", head: true })
const { count: adminsCount } = await supa.from("admins").select("user_id", { count: "exact", head: true })
const { count: teamsLeft } = await supa.from("teams").select("id", { count: "exact", head: true })
const { count: regsLeft } = await supa.from("registrations").select("id", { count: "exact", head: true })
console.log(
  `\n— final: ${peopleCount} people kept, ${psCount} problem statements kept, ${adminsCount} admin(s) kept, ${teamsLeft} teams remain (should be 0), ${regsLeft} registrations (fresh from sheet)`
)
