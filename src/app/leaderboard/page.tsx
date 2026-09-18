import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminPage } from "@/lib/auth"
import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui"
import type { Json, LeaderboardEntry, WinnersEntry } from "@/lib/database.types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Quiz, OC Round, and Final scores, plus the winners' podium — admin view.",
  robots: { index: false, follow: false },
}

const MEDALS: Record<number, { icon: string; label: string; border: string; tint: string }> = {
  1: { icon: "🏆", label: "GOLD", border: "border-amber-400/50", tint: "from-amber-500/10" },
  2: { icon: "🥈", label: "SILVER", border: "border-slate-300/40", tint: "from-slate-300/10" },
  3: { icon: "🥉", label: "BRONZE", border: "border-orange-400/40", tint: "from-orange-400/10" },
}

function sortRows(rows: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...rows].sort(
    (a, b) =>
      (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
      (b.total_score ?? 0) - (a.total_score ?? 0)
  )
}

function parseWinners(body: Json | null): WinnersEntry[] {
  if (!Array.isArray(body)) return []
  const out: WinnersEntry[] = []
  for (const e of body) {
    if (typeof e !== "object" || e === null || Array.isArray(e)) continue
    const { position, team_code, team_name, prize } = e
    if (typeof position !== "number" || typeof team_code !== "string" || typeof team_name !== "string") continue
    out.push({ position, team_code, team_name, prize: typeof prize === "string" ? prize : undefined })
  }
  return out.sort((a, b) => a.position - b.position)
}

function rankColor(rank: number) {
  if (rank === 1) return "text-amber-300"
  if (rank === 2) return "text-slate-100"
  if (rank === 3) return "text-orange-400"
  return "text-slate-500"
}

function rankTint(rank: number) {
  if (rank === 1) return "bg-amber-400/[0.05]"
  if (rank === 2) return "bg-slate-300/[0.05]"
  if (rank === 3) return "bg-orange-400/[0.05]"
  return ""
}

function WinnerCard({ entry }: { entry: WinnersEntry }) {
  const medal = MEDALS[entry.position]
  return (
    <Card className={`card-hover relative overflow-hidden p-6 text-center ${medal ? medal.border : ""}`}>
      {medal ? (
        <>
          <div aria-hidden className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${medal.tint} to-transparent`} />
          <span aria-hidden className="absolute right-4 top-4 text-2xl">
            {medal.icon}
          </span>
        </>
      ) : null}
      <div className="relative">
        <p className="hud-label">{medal ? `${medal.label} · ` : ""}POSITION {String(entry.position).padStart(2, "0")}</p>
        <h3 className="mt-3 text-lg font-bold text-slate-100">{entry.team_name}</h3>
        <p className="mt-1 font-mono text-xs tracking-wide text-cyan-300/70">{entry.team_code}</p>
        {entry.prize ? (
          <div className="mt-4">
            <Badge tone="amber">{entry.prize}</Badge>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

interface UnifiedRow {
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

// Weighted composite of whatever's been scored so far -- 10% quiz + 20% OC
// round + 70% senior final, each out of 10. A round that hasn't happened yet
// contributes 0, same as every other "current standing" table on this site;
// this is NOT the same as leaderboard_final_public, which stays empty until
// an admin explicitly publishes the final round (that gate is for the public
// podium reveal, not for ranking teams against each other mid-event).
function weightedTotal(quiz: number | null, ocRound: number | null, finalRound: number | null): number | null {
  if (quiz === null && ocRound === null && finalRound === null) return null
  return Math.round(((quiz ?? 0) * 0.1 + (ocRound ?? 0) * 0.2 + (finalRound ?? 0) * 0.7) * 100) / 100
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

function UnifiedLeaderboard({
  rows,
  kicker = "LEADERBOARD",
  title = "Every round, one table",
  description = "Quiz (10%) + OC Round (20%) + Senior Final (70%, folded into Total). A column shows 🔒 until that round's score is entered and published.",
}: {
  rows: UnifiedRow[]
  kicker?: string
  title?: string
  description?: string
}) {
  return (
    <section>
      <SectionHeading kicker={kicker} title={title} description={description} />
      {rows.length === 0 ? (
        <EmptyState icon="🔒" title="Nothing published yet" description="Rows appear here the moment any round is scored and published." />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[3.5rem_6rem_minmax(0,1fr)_5rem_5rem_5rem_5.5rem_7rem] gap-4 border-b border-slate-800/70 px-5 py-3 md:grid">
            <span className="hud-label">#</span>
            <span className="hud-label">CODE</span>
            <span className="hud-label">TEAM</span>
            <span className="hud-label text-right">QUIZ</span>
            <span className="hud-label text-right">OC ROUND</span>
            <span className="hud-label text-right">FINAL</span>
            <span className="hud-label text-right">TOTAL</span>
            <span className="hud-label">PROJECT</span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {rows.map((r, i) => {
              const rank = i + 1
              return (
                <div
                  key={r.teamId}
                  className={`grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-x-3 gap-y-1 px-4 py-3.5 md:grid-cols-[3.5rem_6rem_minmax(0,1fr)_5rem_5rem_5rem_5.5rem_7rem] md:gap-4 md:px-5 ${rankTint(rank)}`}
                >
                  <span className={`font-mono text-sm font-bold ${rankColor(rank)}`}>{String(rank).padStart(2, "0")}</span>
                  <span className="hidden font-mono text-xs tracking-wide text-cyan-300/70 md:block">{r.teamCode}</span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-100">{r.teamName}</p>
                    <p className="font-mono text-[11px] text-slate-500 md:hidden">{r.teamCode}</p>
                  </div>
                  <span className="text-right font-mono text-sm tabular-nums text-slate-300">{r.quiz === null ? "🔒" : r.quiz}</span>
                  <span className="text-right font-mono text-sm tabular-nums text-slate-300">{r.ocRound === null ? "🔒" : r.ocRound}</span>
                  <span className="text-right font-mono text-sm tabular-nums text-slate-300">{r.finalRound === null ? "🔒" : r.finalRound}</span>
                  <span className="text-right font-mono text-sm font-semibold tabular-nums text-slate-100">
                    {r.total === null ? "🔒" : r.total}
                  </span>
                  {r.projectUrl ? (
                    <a href={r.projectUrl} target="_blank" rel="noreferrer" className="col-span-3 truncate text-xs text-accent-hover hover:underline md:col-span-1">
                      View project →
                    </a>
                  ) : (
                    <span className="col-span-3 text-xs text-muted/40 md:col-span-1">—</span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </section>
  )
}

export default async function LeaderboardPage() {
  await requireAdminPage()
  const supabase = await createClient()
  const admin = createAdminClient()
  const [round1Res, round2Res, finalScoresRes, winnersRes, projectsRes, teamsRes, psRes] = await Promise.all([
    supabase.from("leaderboard_round1_public").select("*"),
    supabase.from("leaderboard_round2_public").select("*"),
    admin.from("scores").select("team_id, total_score").eq("round", "final"),
    supabase.from("winners_public").select("*"),
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
  const winnerRows = (winnersRes.data ?? [])
    .filter((w) => w.body != null)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
  const winnerRow = winnerRows[0]
  const winners = winnerRow ? parseWinners(winnerRow.body) : []
  const winnersTitle = winnerRow?.title ?? "Winners"

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 pt-28 py-12">
      {winners.length > 0 ? (
        <section>
          <SectionHeading
            kicker="PODIUM"
            title={winnersTitle}
            description="The final standings are in. That's a wrap on Epochesque."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {winners.map((w) => (
              <WinnerCard key={`${w.position}-${w.team_code}`} entry={w} />
            ))}
          </div>
        </section>
      ) : null}

      {tracks.map((track) => (
        <UnifiedLeaderboard
          key={track}
          rows={rowsByTrack.get(track) ?? []}
          kicker={`LEADERBOARD · ${track.toUpperCase()}`}
          title={track}
          description="Quiz (10%) + OC Round (20%) + Senior Final (70%, folded into Total), ranked within this track only. A column shows 🔒 until that round's score is entered and published."
        />
      ))}

      {unassigned.length > 0 ? (
        <UnifiedLeaderboard
          rows={unassigned}
          kicker="LEADERBOARD · UNASSIGNED"
          title="No track rolled yet"
          description="Teams that haven't rolled a problem statement yet, so they can't be grouped by track."
        />
      ) : null}
    </div>
  )
}
