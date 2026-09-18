import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { getLeaderboardData } from "@/lib/leaderboard"
import type { UnifiedRow } from "@/lib/leaderboard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Podium",
  robots: { index: false, follow: false },
}

const MEDAL: Record<number, { icon: string; border: string; glow: string }> = {
  1: { icon: "🏆", border: "border-amber-400/50", glow: "shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)]" },
  2: { icon: "🥈", border: "border-slate-300/40", glow: "" },
  3: { icon: "🥉", border: "border-orange-400/40", glow: "" },
}

function PodiumSpot({ row, place }: { row: UnifiedRow | undefined; place: number }) {
  const medal = MEDAL[place]
  if (!row) {
    return (
      <div className={`flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5`}>
        <span className="font-mono text-xs text-muted/40">— empty —</span>
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl border ${medal.border} ${medal.glow} bg-white/[0.03] px-3 py-2.5`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-lg leading-none">{medal.icon}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-slate-100">{row.teamName}</p>
          <p className="truncate font-mono text-[10px] leading-tight text-cyan-300/70">{row.teamCode}</p>
        </div>
      </div>
      <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-slate-100">
        {row.total === null ? "🔒" : row.total}
      </span>
    </div>
  )
}

export default async function PodiumPage() {
  await requireAdminPage()
  const { tracks, rowsByTrack } = await getLeaderboardData()
  const columns = tracks.map((t) => ({ label: t, rows: rowsByTrack.get(t) ?? [] }))

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-hidden bg-background px-6 pb-6 pt-24">
      <p className="hud-label mb-4 shrink-0 text-center">🏆 TOP 3 · EVERY TRACK</p>
      <div
        className="grid min-h-0 flex-1 gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))` }}
      >
        {columns.map((col) => (
          <div key={col.label} className="flex min-h-0 flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="hud-label shrink-0 text-center text-accent-hover">{col.label}</p>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
              {[1, 2, 3].map((place) => (
                <PodiumSpot key={place} row={col.rows[place - 1]} place={place} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
