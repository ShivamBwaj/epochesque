// ============================================================
// export-team-roster.mjs — CSV of every current team + members,
// leader clearly tagged, for sharing in the group so people can
// self-check their team and flag discrepancies.
// ============================================================
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import { writeFileSync } from "node:fs"
import dotenv from "dotenv"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true })

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: teams } = await admin.from("teams").select("id, team_code, team_name").order("team_code")
const { data: tm } = await admin.from("team_members").select("team_id, role, registration_id")
const { data: regs } = await admin.from("registrations").select("id, name, reg_no, email")

const regById = new Map(regs.map((r) => [r.id, r]))
const membersByTeam = new Map()
for (const m of tm) {
  if (!membersByTeam.has(m.team_id)) membersByTeam.set(m.team_id, [])
  membersByTeam.get(m.team_id).push(m)
}
for (const list of membersByTeam.values()) {
  list.sort((a, b) => (a.role === "leader" ? -1 : b.role === "leader" ? 1 : 0))
}

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`
const lines = ["Team Code,Team Name,Member Name,Reg No,Role,Email"]
for (const t of teams) {
  const members = membersByTeam.get(t.id) ?? []
  for (const m of members) {
    const reg = regById.get(m.registration_id)
    lines.push(
      [t.team_code, t.team_name, reg?.name ?? "—", reg?.reg_no ?? "—", m.role === "leader" ? "LEADER" : "Member", reg?.email ?? ""]
        .map(esc)
        .join(",")
    )
  }
}

const outPath = fileURLToPath(new URL("../team-roster.csv", import.meta.url))
writeFileSync(outPath, "﻿" + lines.join("\r\n"))
console.log(`✓ wrote ${teams.length} teams, ${tm.length} members to ${outPath}`)
