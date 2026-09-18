import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { Badge, Card, SectionHeading } from "@/components/ui"
import { getLeaderboardData, getWinners } from "@/lib/leaderboard"
import { TrackTabs } from "./track-tabs"
import type { WinnersEntry } from "@/lib/database.types"

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

export default async function LeaderboardPage() {
  await requireAdminPage()
  const [{ tracks, rowsByTrack, unassigned }, winnersRow] = await Promise.all([getLeaderboardData(), getWinners()])

  const winners = winnersRow?.entries ?? []
  const winnersTitle = winnersRow?.title ?? "Winners"

  const tabs = [
    ...tracks.map((track) => ({ key: track, label: track, rows: rowsByTrack.get(track) ?? [] })),
    ...(unassigned.length > 0 ? [{ key: "unassigned", label: "Unassigned", rows: unassigned }] : []),
  ]

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

      <TrackTabs tabs={tabs} />
    </div>
  )
}
