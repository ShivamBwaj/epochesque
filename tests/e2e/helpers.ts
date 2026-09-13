import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!url || !serviceKey) throw new Error("Missing Supabase env for e2e seed")

export const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export const RUN = Date.now().toString(36)
export const TEAM_EMAIL = `e2e-team-${RUN}@epoch.local`
export const TEAM_PASSWORD = `Ep-E2ePass-${RUN}!7`
export const TEAM_CODE = `E2E-${RUN}`

export interface SeedData {
  teamId: string
  teamUserId: string
  psIds: number[]
  startedAt: string
}

export async function seed(): Promise<SeedData> {
  const psRows = [1, 2, 3, 4, 5].map((i) => ({
    code: `E2E-${RUN}-PS${i}`,
    title: `E2E Problem Statement ${i}`,
    description: `Automated e2e test problem statement ${i} for run ${RUN}. Safe to ignore.`,
    max_teams: 1,
    is_active: true,
  }))
  const { data: ps, error: psErr } = await admin.from("problem_statements").insert(psRows).select("id")
  if (psErr || !ps) throw new Error(`seed PS failed: ${psErr?.message}`)

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: TEAM_EMAIL,
    password: TEAM_PASSWORD,
    email_confirm: true,
    user_metadata: { team_code: TEAM_CODE, role: "team", e2e: RUN },
  })
  if (authErr || !authUser?.user) throw new Error(`seed user failed: ${authErr?.message}`)

  const { data: team, error: teamErr } = await admin
    .from("teams")
    .insert({
      team_code: TEAM_CODE,
      team_name: `E2E Test Team ${RUN}`,
      members: [
        { name: "E2E Leader", email: TEAM_EMAIL, college: "E2E College" },
        { name: "E2E Member Two", email: null, college: "E2E College" },
      ],
      leader_email: TEAM_EMAIL,
      auth_user_id: authUser.user.id,
      status: "registered",
    })
    .select("id")
    .single()
  if (teamErr || !team) {
    await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {})
    throw new Error(`seed team failed: ${teamErr?.message}`)
  }

  await admin.from("event_settings").upsert(
    [
      { key: "roll_open", value: true },
      { key: "final_open", value: true },
    ],
    { onConflict: "key" }
  )
  await admin
    .from("leaderboard_visibility")
    .upsert([
      { round: "round1", is_published: false, published_at: null },
      { round: "final", is_published: false, published_at: null },
    ], { onConflict: "round" })

  return { teamId: team.id, teamUserId: authUser.user.id, psIds: ps.map((p) => p.id), startedAt: new Date().toISOString() }
}

export async function cleanup(seedData: SeedData) {
  const { data: subs } = await admin
    .from("submissions")
    .select("storage_path")
    .eq("team_id", seedData.teamId)
  for (const s of subs ?? []) {
    if (s.storage_path) await admin.storage.from("submissions").remove([s.storage_path]).catch(() => {})
  }
  await admin.from("submissions").delete().eq("team_id", seedData.teamId)
  await admin.from("scores").delete().eq("team_id", seedData.teamId)
  await admin.from("teams").delete().eq("id", seedData.teamId)
  await admin.auth.admin.deleteUser(seedData.teamUserId).catch(() => {})
  await admin.from("problem_statements").delete().in("id", seedData.psIds)
  await admin
    .from("leaderboard_visibility")
    .upsert([
      { round: "round1", is_published: false, published_at: null },
      { round: "final", is_published: false, published_at: null },
    ], { onConflict: "round" })
  await admin.from("announcements").delete().eq("kind", "winners")
  await admin.from("announcements").delete().eq("kind", "notice")
  await admin.from("admin_audit").delete().gte("created_at", seedData.startedAt)
  await admin.from("event_settings").upsert(
    [
      { key: "roll_open", value: false },
      { key: "final_open", value: false },
    ],
    { onConflict: "key" }
  )
}
