// ============================================================
// import-official-teams.mjs — bulk-create app teams from the
// college's official registration sheet (has a pre-assigned
// "Team Id" column), for groups that are completely clean:
//   - every member is already in `registrations` (has shown up
//     on the app / been synced from the Epochesque form)
//   - NONE of them are already on any app team (skips every
//     official group that overlaps a team someone already built
//     by hand, so it never touches the clash cases)
//   - group size is 2-4 (the only sizes the team RPC accepts)
//
// Leader = first row for that Team Id in the sheet. Team name
// defaults to "Team <officialTeamId>" — rename any time from the
// pencil icon on /admin/teams.
//
// Usage: node scripts/import-official-teams.mjs <official-sheet-csv-url>
// ============================================================
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true })

const SHEET_URL = process.argv[2]
if (!SHEET_URL) {
  console.error("Usage: node scripts/import-official-teams.mjs <official-sheet-csv-export-url>")
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

function splitCsvLine(line) {
  const out = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ",") { out.push(cur); cur = "" }
    else cur += ch
  }
  out.push(cur)
  return out
}

const res = await fetch(SHEET_URL)
if (!res.ok) { console.error("sheet fetch failed", res.status); process.exit(1) }
const csv = await res.text()
const lines = csv.split(/\r?\n/).filter((l) => l.trim())
const headers = splitCsvLine(lines[0]).map((h) => h.trim())
const idx = { id: headers.indexOf("Id"), teamId: headers.indexOf("Team Id") }
const rows = lines.slice(1).map(splitCsvLine)

const byTeam = new Map()
for (const r of rows) {
  const tid = (r[idx.teamId] || "").trim()
  const regNo = (r[idx.id] || "").trim().toUpperCase()
  if (!tid || !regNo) continue
  if (!byTeam.has(tid)) byTeam.set(tid, [])
  byTeam.get(tid).push(regNo)
}

const { data: regs } = await admin.from("registrations").select("id, reg_no")
const { data: tm } = await admin.from("team_members").select("registration_id")
const regIdByRegNo = new Map(regs.map((r) => [r.reg_no.toUpperCase(), r.id]))
const alreadyOnTeam = new Set(tm.map((t) => t.registration_id))

let imported = 0
const skipped = { notRegistered: 0, alreadyOnTeam: 0, wrongSize: 0 }

for (const [officialTid, regNos] of byTeam) {
  if (regNos.length < 2 || regNos.length > 4) { skipped.wrongSize++; continue }
  const regIds = regNos.map((rn) => regIdByRegNo.get(rn))
  if (regIds.some((id) => !id)) { skipped.notRegistered++; continue }
  if (regIds.some((id) => alreadyOnTeam.has(id))) { skipped.alreadyOnTeam++; continue }

  const { error } = await admin.rpc("admin_create_team_with_members", {
    p_team_name: `Team ${officialTid}`,
    p_registration_ids: regIds,
  })
  if (error) {
    console.error(`  ✗ ${officialTid} failed:`, error.message)
    continue
  }
  for (const id of regIds) alreadyOnTeam.add(id)
  imported++
}

console.log(`✓ imported: ${imported} teams`)
console.log(`  skipped — not all registered yet: ${skipped.notRegistered}`)
console.log(`  skipped — someone already on a team (clash-adjacent): ${skipped.alreadyOnTeam}`)
console.log(`  skipped — group size not 2-4: ${skipped.wrongSize}`)
