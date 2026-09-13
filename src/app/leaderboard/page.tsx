import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui"
import type { Json, LeaderboardEntry, WinnersEntry } from "@/lib/database.types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Live rankings for Epochesque — Round 1 and final round scores, plus the winners' podium.",
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

function RoundBoard({
  kicker,
  title,
  description,
  rows,
}: {
  kicker: string
  title: string
  description: string
  rows: LeaderboardEntry[]
}) {
  return (
    <section>
      <SectionHeading kicker={kicker} title={title} description={description} />
      {rows.length === 0 ? (
        <EmptyState icon="🔒" title="Revealed after judging" description="Scores unlock here the moment the judges submit them." />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[3.5rem_6rem_minmax(0,1fr)_5.5rem_minmax(9rem,13rem)] gap-4 border-b border-slate-800/70 px-5 py-3 md:grid">
            <span className="hud-label">#</span>
            <span className="hud-label">CODE</span>
            <span className="hud-label">TEAM</span>
            <span className="hud-label text-right">SCORE</span>
            <span className="hud-label">NOTES</span>
          </div>
          <div className="divide-y divide-slate-800/50">
            {rows.map((r, i) => {
              const rank = r.rank ?? i + 1
              return (
                <div
                  key={r.team_id ?? `${r.team_code}-${i}`}
                  className={`grid grid-cols-[2.5rem_1fr_4.5rem] items-center gap-x-3 gap-y-1 px-4 py-3.5 md:grid-cols-[3.5rem_6rem_minmax(0,1fr)_5.5rem_minmax(9rem,13rem)] md:gap-4 md:px-5 ${rankTint(rank)}`}
                >
                  <span className={`font-mono text-sm font-bold ${rankColor(rank)}`}>{String(rank).padStart(2, "0")}</span>
                  <span className="hidden font-mono text-xs tracking-wide text-cyan-300/70 md:block">{r.team_code ?? "—"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-100">{r.team_name ?? "Unnamed team"}</p>
                    <p className="font-mono text-[11px] text-slate-500 md:hidden">{r.team_code ?? "—"}</p>
                  </div>
                  <span className="text-right font-mono text-sm font-semibold tabular-nums text-slate-200">
                    {r.total_score === null ? "—" : r.total_score}
                  </span>
                  {r.notes ? <p className="col-span-3 truncate text-xs text-slate-500 md:col-span-1">{r.notes}</p> : null}
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
  const supabase = await createClient()
  const [round1Res, finalRes, winnersRes] = await Promise.all([
    supabase.from("leaderboard_round1_public").select("*"),
    supabase.from("leaderboard_final_public").select("*"),
    supabase.from("winners_public").select("*"),
  ])

  const round1 = sortRows(round1Res.data ?? [])
  const final = sortRows(finalRes.data ?? [])
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

      <RoundBoard
        kicker="ROUND 1"
        title="Round 1 — Concept & Pitch"
        description="PPT and prototype round. Every submission, scored and ranked."
        rows={round1}
      />

      <RoundBoard
        kicker="FINAL ROUND"
        title="Final Round — Ship It"
        description="GitHub repos, live demos, and one last pass from the judges."
        rows={final}
      />
    </div>
  )
}
