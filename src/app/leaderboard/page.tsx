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
  total: number | null
  rank: number | null
  projectUrl: string | null
  track: string | null
}

function buildUnifiedRows(
  round1: LeaderboardEntry[],
  round2: LeaderboardEntry[],
  final: LeaderboardEntry[],
  projectByCode: Map<string, string>,
  trackByTeamId: Map<string, string | null>
): UnifiedRow[] {
  const byTeam = new Map<string, UnifiedRow>()
  const ensure = (r: LeaderboardEntry) => {
    if (!r.team_id) return null
    let row = byTeam.get(r.team_id)
    if (!row) {
      row = {
        teamId: r.team_id,
        teamCode: r.team_code ?? "—",
        teamName: r.team_name ?? "Unnamed team",
        quiz: null,
        ocRound: null,
        total: null,
        rank: null,
        projectUrl: r.team_code ? projectByCode.get(r.team_code) ?? null : null,
        track: trackByTeamId.get(r.team_id) ?? null,
      }
      byTeam.set(r.team_id, row)
    }
    return row
  }
  for (const r of round2) {
    const row = ensure(r)
    if (row) row.quiz = r.total_score
  }
  for (const r of round1) {
    const row = ensure(r)
    if (row) row.ocRound = r.total_score
  }
  for (const r of final) {
    const row = ensure(r)
    if (row) {
      row.total = r.total_score
      row.rank = r.rank
    }
  }
  return [...byTeam.values()].sort(
    (a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || (b.total ?? 0) - (a.total ?? 0)
  )
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
          <div className="hidden grid-cols-[3.5rem_6rem_minmax(0,1fr)_5rem_5rem_5.5rem_7rem] gap-4 border-b border-slate-800/70 px-5 py-3 md:grid">
            <span className="hud-label">#</span>
            <span className="hud-label">CODE</span>
            <span className="hud-label">TEAM</span>
            <span className="hud-label text-right">QUIZ</span>
            <span className="hud-label text-right">OC ROUND</span>
            <span className="hud-label text-right">TOTAL</span>
            <span className="hud-label">PROJECT</span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {rows.map((r, i) => {
              const rank = r.rank ?? i + 1
              return (
                <div
                  key={r.teamId}
                  className={`grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-x-3 gap-y-1 px-4 py-3.5 md:grid-cols-[3.5rem_6rem_minmax(0,1fr)_5rem_5rem_5.5rem_7rem] md:gap-4 md:px-5 ${rankTint(rank)}`}
                >
                  <span className={`font-mono text-sm font-bold ${rankColor(rank)}`}>{String(rank).padStart(2, "0")}</span>
                  <span className="hidden font-mono text-xs tracking-wide text-cyan-300/70 md:block">{r.teamCode}</span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-100">{r.teamName}</p>
                    <p className="font-mono text-[11px] text-slate-500 md:hidden">{r.teamCode}</p>
                  </div>
                  <span className="text-right font-mono text-sm tabular-nums text-slate-300">{r.quiz === null ? "🔒" : r.quiz}</span>
                  <span className="text-right font-mono text-sm tabular-nums text-slate-300">{r.ocRound === null ? "🔒" : r.ocRound}</span>
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
  const [round1Res, round2Res, finalRes, winnersRes, projectsRes, teamsRes, psRes] = await Promise.all([
    supabase.from("leaderboard_round1_public").select("*"),
    supabase.from("leaderboard_round2_public").select("*"),
    supabase.from("leaderboard_final_public").select("*"),
    supabase.from("winners_public").select("*"),
    supabase.from("project_pages_public").select("team_code"),
    admin.from("teams").select("id, problem_statement_id"),
    admin.from("problem_statements").select("id, code"),
  ])

  const round1 = sortRows(round1Res.data ?? [])
  const round2 = sortRows(round2Res.data ?? [])
  const final = sortRows(finalRes.data ?? [])
  const projectByCode = new Map(
    (projectsRes.data ?? []).filter((p) => p.team_code).map((p) => [p.team_code as string, `/projects/${p.team_code}`])
  )
  const psCodeById = new Map((psRes.data ?? []).map((p) => [p.id, p.code]))
  const trackByTeamId = new Map(
    (teamsRes.data ?? []).map((t) => [t.id, t.problem_statement_id ? psCodeById.get(t.problem_statement_id) ?? null : null])
  )
  const unifiedRows = buildUnifiedRows(round1, round2, final, projectByCode, trackByTeamId)
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
  const reRank = (rows: UnifiedRow[]) =>
    [...rows]
      .sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
      .map((r, i) => ({ ...r, rank: i + 1 }))
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
          rows={reRank(rowsByTrack.get(track) ?? [])}
          kicker={`LEADERBOARD · ${track.toUpperCase()}`}
          title={track}
          description="Quiz (10%) + OC Round (20%) + Senior Final (70%, folded into Total), ranked within this track only. A column shows 🔒 until that round's score is entered and published."
        />
      ))}

      {unassigned.length > 0 ? (
        <UnifiedLeaderboard
          rows={reRank(unassigned)}
          kicker="LEADERBOARD · UNASSIGNED"
          title="No track rolled yet"
          description="Teams that haven't rolled a problem statement yet, so they can't be grouped by track."
        />
      ) : null}
    </div>
  )
}
