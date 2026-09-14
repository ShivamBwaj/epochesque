// ============================================================
// pristine-wipe-v2.mjs — full reset for a brand-new event run.
//
// KEEPS:   people (OC + speakers) and their photos, admins,
//          problem_statements content is WIPED per explicit request,
//          integration_secrets (Google Sheet webhook) left untouched.
// WIPES:   teams (+ their Supabase Auth logins), submissions (+ files),
//          scores, attendance, game_slot bookings (slots themselves kept,
//          just unbooked), problem_statements, announcements, admin_audit,
//          gallery_photos (+ files), event_settings (reset to blank/closed),
//          leaderboard_visibility (reset to unpublished).
//
// One-time. Run: node scripts/pristine-wipe-v2.mjs
// ============================================================
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing Supabase env")
  process.exit(1)
}
const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// 1. Submission files (need paths before the cascade delete removes the rows)
const { data: subs } = await supa.from("submissions").select("id, storage_path")
for (const s of subs ?? []) {
  if (s.storage_path) await supa.storage.from("submissions").remove([s.storage_path]).catch(() => {})
}
console.log(`✓ submission files removed: ${(subs ?? []).filter((s) => s.storage_path).length}`)

// 2. Teams — delete Auth logins, then the rows themselves. The FK schema
//    cascades submissions/scores/attendance and nulls out game_slots
//    bookings automatically (on delete cascade / on delete set null).
const { data: teams } = await supa.from("teams").select("id, team_code, auth_user_id")
for (const t of teams ?? []) {
  if (t.auth_user_id) await supa.auth.admin.deleteUser(t.auth_user_id).catch(() => {})
}
if (teams?.length) await supa.from("teams").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ teams wiped (+ logins): ${teams?.length ?? 0}`)

// 3. Problem statements — content wiped too (explicit choice; re-add before next event)
const { data: ps } = await supa.from("problem_statements").select("id")
if (ps?.length) await supa.from("problem_statements").delete().neq("id", 0)
console.log(`✓ problem statements wiped: ${ps?.length ?? 0}`)

// 4. Announcements
const { data: ann } = await supa.from("announcements").select("id")
if (ann?.length) await supa.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ announcements wiped: ${ann?.length ?? 0}`)

// 5. Admin audit log
const { data: audit } = await supa.from("admin_audit").select("id")
if (audit?.length) await supa.from("admin_audit").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ admin audit wiped: ${audit?.length ?? 0}`)

// 6. Gallery photos (+ files)
const { data: gallery } = await supa.from("gallery_photos").select("id, storage_path")
for (const g of gallery ?? []) {
  if (g.storage_path) await supa.storage.from("gallery").remove([g.storage_path]).catch(() => {})
}
if (gallery?.length) await supa.from("gallery_photos").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ gallery photos wiped: ${gallery?.length ?? 0}`)

// 7. Event settings — blank timing, close every gate. Timing fields are a
//    jsonb NOT NULL column: PostgREST maps a JS `null` to SQL NULL (violates
//    the constraint), so "unset" must be the empty string "" — matching
//    exactly what the real admin Settings form writes when a field is cleared.
const { error: settingsErr } = await supa.from("event_settings").upsert(
  [
    { key: "event_start", value: "" },
    { key: "ps_release_at", value: "" },
    { key: "round1_deadline", value: "" },
    { key: "final_deadline", value: "" },
    { key: "event_end", value: "" },
    { key: "roll_open", value: false },
    { key: "final_open", value: false },
    { key: "gaming_open", value: false },
  ],
  { onConflict: "key" }
)
if (settingsErr) console.error("✗ event_settings reset FAILED:", settingsErr.message)
else console.log("✓ event_settings reset (timing blank, all gates closed)")

// 8. Leaderboard visibility — unpublish every round (round1, round2/quiz, final)
await supa
  .from("leaderboard_visibility")
  .upsert(
    ["round1", "round2", "final"].map((round) => ({ round, is_published: false, published_at: null })),
    { onConflict: "round" }
  )
console.log("✓ leaderboard_visibility reset (all rounds unpublished)")

// 9. Game slot bookings — cleared already via teams cascade, but double-check
const { data: stillBooked } = await supa.from("game_slots").select("id").not("taken_by_team_id", "is", null)
if (stillBooked?.length) await supa.from("game_slots").update({ taken_by_team_id: null, booked_at: null }).not("taken_by_team_id", "is", null)
console.log(`✓ game slot bookings cleared: confirmed 0 booked${stillBooked?.length ? ` (had to force-clear ${stillBooked.length})` : ""}`)

// 10. Verify — people (OC + speakers) and admins must be untouched
const { count: peopleCount } = await supa.from("people").select("id", { count: "exact", head: true })
const { count: adminsCount } = await supa.from("admins").select("user_id", { count: "exact", head: true })
const { count: teamsLeft } = await supa.from("teams").select("id", { count: "exact", head: true })
console.log(`\n— final: ${peopleCount} people kept (OC + speakers), ${adminsCount} admin(s) kept, ${teamsLeft} teams remain (should be 0)`)
