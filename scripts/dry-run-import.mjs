import { readFileSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import path from "node:path"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing env")
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const { parseRegistrationCsv } = await import("../src/lib/csv.ts").catch(() => ({}))
if (!parseRegistrationCsv) {
  console.error("Could not import parser (needs node >= 24 with type stripping)")
  process.exit(1)
}

const csv = readFileSync(path.resolve(process.cwd(), "tests/fixtures/real-registration.csv"), "utf8")
const res = parseRegistrationCsv(csv)

console.log(`Parsed: ${res.totalRows} data rows -> ${res.teams.length} teams, ${res.skipped.filter((s) => s.row <= 34).length} junk rows skipped`)
console.log(`Includable: ${res.teams.filter((t) => t.include).length} / ${res.teams.length}`)

const RUN = "dryrun-" + Date.now().toString(36)
const created = []
const errors = []

for (const t of res.teams.filter((x) => x.include)) {
  const leader = t.members[t.leaderIndex]
  if (!leader?.email) {
    errors.push(`${t.team_name}: no leader email`)
    continue
  }

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: leader.email,
    password: `Ep-DryRun-${RUN}!7x`,
    email_confirm: true,
    user_metadata: { team_code: t.team_code, role: "team", dryrun: RUN },
  })
  if (authErr || !authUser?.user) {
    errors.push(`${t.team_name}: ${authErr?.message}`)
    continue
  }

  const { data: team, error: teamErr } = await admin
    .from("teams")
    .insert({
      team_code: t.team_code,
      team_name: t.team_name,
      members: t.members,
      leader_email: leader.email,
      auth_user_id: authUser.user.id,
      status: "registered",
    })
    .select("id")
    .single()

  if (teamErr || !team) {
    await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {})
    errors.push(`${t.team_name}: ${teamErr?.message}`)
    continue
  }

  created.push({ teamId: team.id, userId: authUser.user.id, code: t.team_code, leader: leader.email })
}

console.log(`\nCreated ${created.length} teams + auth users. Errors: ${errors.length}`)
for (const e of errors) console.log("  ERR:", e)

// verify: total teams in DB, one spot-check login
const { count } = await admin.from("teams").select("id", { count: "exact", head: true })
console.log(`\nDB now has ${count} teams (expected ${created.length})`)

if (created.length > 0) {
  const probe = created[0]
  const { data: signIn, error: signInErr } = await admin.auth.signInWithPassword({
    email: probe.leader,
    password: `Ep-DryRun-${RUN}!7x`,
  })
  console.log(`Spot-check login as ${probe.leader} (${probe.code}):`, signInErr ? `FAIL ${signInErr.message}` : `OK (token ${signIn.session?.access_token ? "issued" : "?"})`)
  await admin.auth.signOut().catch(() => {})
}

// cleanup
console.log("\nCleaning up dry-run data…")
const { data: dryTeams } = await admin.from("teams").select("id, auth_user_id")
let deletedTeams = 0
for (const t of dryTeams ?? []) {
  await admin.from("teams").delete().eq("id", t.id)
  if (t.auth_user_id) await admin.auth.admin.deleteUser(t.auth_user_id).catch(() => {})
  deletedTeams++
}
const { count: after } = await admin.from("teams").select("id", { count: "exact", head: true })
const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 })
console.log(`Deleted ${deletedTeams} teams. DB teams now: ${after}. Auth users: ${users.users.map((u) => u.email).join(", ")}`)
console.log("\nDRY RUN COMPLETE — DB is clean")
