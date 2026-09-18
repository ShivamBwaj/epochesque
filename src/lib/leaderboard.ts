import "server-only"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { LeaderboardEntry } from "@/lib/database.types"

export interface UnifiedRow {
  teamId: string
  teamCode: string
  teamName: string
  quiz: number | null
  ocRound: number | null
  finalRound: number | null
  total: number | null
  projectUrl: string | null
  track: string | null
}

function sortRows(rows: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...rows].sort(
    (a, b) =>
      (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
      (b.total_score ?? 0) - (a.total_score ?? 0)
  )
}

// Weighted composite of whatever's been scored so far -- 10% quiz + 20% OC
// round + 70% senior final, each out of 10, scaled up to a 0-100 total (a
// team acing every round shows 100, not 10). A round that hasn't happened
// yet contributes 0, same as every other "current standing" table on this
// site; this is NOT the same as leaderboard_final_public, which stays empty
// until an admin explicitly publishes the final round (that gate is for the
// public podium reveal, not for ranking teams against each other mid-event).
function weightedTotal(quiz: number | null, ocRound: number | null, finalRound: number | null): number | null {
  if (quiz === null && ocRound === null && finalRound === null) return null
  return Math.round(((quiz ?? 0) * 0.1 + (ocRound ?? 0) * 0.2 + (finalRound ?? 0) * 0.7) * 10 * 100) / 100
}

function buildUnifiedRows(
  round1: LeaderboardEntry[],
  round2: LeaderboardEntry[],
  teams: { id: string; team_code: string; team_name: string }[],
  finalRawByTeamId: Map<string, number>,
  projectByCode: Map<string, string>,
  trackByTeamId: Map<string, string | null>
): UnifiedRow[] {
  const byTeam = new Map<string, UnifiedRow>()
  const ensure = (teamId: string, teamCode: string, teamName: string) => {
    let row = byTeam.get(teamId)
    if (!row) {
      row = {
        teamId,
        teamCode,
        teamName,
        quiz: null,
        ocRound: null,
        finalRound: finalRawByTeamId.get(teamId) ?? null,
        total: null,
        projectUrl: projectByCode.get(teamCode) ?? null,
        track: trackByTeamId.get(teamId) ?? null,
      }
      byTeam.set(teamId, row)
    }
    return row
  }
  for (const t of teams) ensure(t.id, t.team_code, t.team_name)
  for (const r of round2) {
    if (!r.team_id) continue
    const row = ensure(r.team_id, r.team_code ?? "—", r.team_name ?? "Unnamed team")
    row.quiz = r.total_score
  }
  for (const r of round1) {
    if (!r.team_id) continue
    const row = ensure(r.team_id, r.team_code ?? "—", r.team_name ?? "Unnamed team")
    row.ocRound = r.total_score
  }
  for (const row of byTeam.values()) {
    row.total = weightedTotal(row.quiz, row.ocRound, row.finalRound)
  }
  return [...byTeam.values()]
    .filter((r) => r.quiz !== null || r.ocRound !== null || r.finalRound !== null)
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
}

export interface LeaderboardData {
  tracks: string[]
  rowsByTrack: Map<string, UnifiedRow[]>
  unassigned: UnifiedRow[]
}

export async function getLeaderboardData(): Promise<LeaderboardData> {
  const supabase = await createClient()
  const admin = createAdminClient()
  const [round1Res, round2Res, finalScoresRes, projectsRes, teamsRes, psRes] = await Promise.all([
    supabase.from("leaderboard_round1_public").select("*"),
    supabase.from("leaderboard_round2_public").select("*"),
    admin.from("scores").select("team_id, total_score").eq("round", "final"),
    supabase.from("project_pages_public").select("team_code"),
    admin.from("teams").select("id, team_code, team_name, problem_statement_id"),
    admin.from("problem_statements").select("id, code"),
  ])

  const round1 = sortRows(round1Res.data ?? [])
  const round2 = sortRows(round2Res.data ?? [])
  const finalRawByTeamId = new Map((finalScoresRes.data ?? []).map((s) => [s.team_id, s.total_score]))
  const projectByCode = new Map(
    (projectsRes.data ?? []).filter((p) => p.team_code).map((p) => [p.team_code as string, `/projects/${p.team_code}`])
  )
  const psCodeById = new Map((psRes.data ?? []).map((p) => [p.id, p.code]))
  const teams = teamsRes.data ?? []
  const trackByTeamId = new Map(
    teams.map((t) => [t.id, t.problem_statement_id ? psCodeById.get(t.problem_statement_id) ?? null : null])
  )
  const unifiedRows = buildUnifiedRows(round1, round2, teams, finalRawByTeamId, projectByCode, trackByTeamId)
  const tracks = [...new Set([...psCodeById.values()])].sort()
  const rowsByTrack = new Map<string, UnifiedRow[]>()
  const unassigned: UnifiedRow[] = []
  for (const row of unifiedRows) {
    if (row.track) {
      const arr = rowsByTrack.get(row.track) ?? []
      arr.push(row)
      rowsByTrack.set(row.track, arr)
    } else {
      unassigned.push(row)
    }
  }
  return { tracks, rowsByTrack, unassigned }
}
