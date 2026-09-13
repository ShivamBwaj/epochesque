// ============================================================
// pristine-handover.mjs — wipe pre-event test junk, keep real data.
//
// KEEPS:  teams (real imports), problem statements, Aman, admin,
//         audit log (real roll history), event clocks.
// WIPES:  scores, submissions (+ storage), attendance, game bookings,
//         test people (Shivam x2) + their photos.
//
// One-time. Run: node scripts/pristine-handover.mjs
// ============================================================
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)) })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing Supabase env")
  process.exit(1)
}
const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// 1. submissions (+ their files in storage)
const { data: subs } = await supa.from("submissions").select("id, storage_path")
for (const s of subs ?? []) {
  if (s.storage_path) await supa.storage.from("submissions").remove([s.storage_path]).catch(() => {})
}
if (subs?.length) await supa.from("submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ submissions wiped: ${subs?.length ?? 0} (incl. storage files)`)

// 2. scores
const { data: scores } = await supa.from("scores").select("id")
if (scores?.length) await supa.from("scores").delete().neq("id", "00000000-0000-0000-0000-000000000000")
console.log(`✓ scores wiped: ${scores?.length ?? 0}`)

// 3. attendance
const { data: att } = await supa.from("attendance").select("id")
if (att?.length) await supa.from("attendance").delete().neq("id", 0)
console.log(`✓ attendance wiped: ${att?.length ?? 0}`)

// 4. game bookings
const { data: slots } = await supa.from("game_slots").select("id").not("taken_by_team_id", "is", null)
if (slots?.length) await supa.from("game_slots").update({ taken_by_team_id: null, booked_at: null }).not("taken_by_team_id", "is", null)
console.log(`✓ game bookings cleared: ${slots?.length ?? 0}`)

// 5. test people (keep Aman)
const { data: people } = await supa.from("people").select("id, name, photo_path")
const remove = (people ?? []).filter((p) => p.name.toLowerCase().includes("shivam"))
for (const p of remove) {
  if (p.photo_path) await supa.storage.from("people").remove([p.photo_path]).catch(() => {})
  await supa.from("people").delete().eq("id", p.id)
}
console.log(`✓ test people removed: ${remove.map((p) => p.name).join(", ") || "none"}`)

// 6. verify final state
const { count: peopleCount } = await supa.from("people").select("id", { count: "exact", head: true })
const { count: subCount } = await supa.from("submissions").select("id", { count: "exact", head: true })
const { count: scoreCount } = await supa.from("scores").select("id", { count: "exact", head: true })
const { count: attCount } = await supa.from("attendance").select("id", { count: "exact", head: true })
console.log(`— final: ${peopleCount} people (Aman), ${subCount} submissions, ${scoreCount} scores, ${attCount} attendance marks`)
