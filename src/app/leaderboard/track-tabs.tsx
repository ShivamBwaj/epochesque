"use client"

import { useState } from "react"
import { Card, EmptyState } from "@/components/ui"
import { SectionHeading } from "@/components/ui"
import type { UnifiedRow } from "@/lib/leaderboard"

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

function LeaderboardTable({ rows }: { rows: UnifiedRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon="🔒" title="Nothing scored yet" description="Rows appear here the moment any round is scored." />
  }
  return (
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
  )
}

export function TrackTabs({ tabs }: { tabs: { key: string; label: string; rows: UnifiedRow[] }[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "")
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0]

  return (
    <section>
      <SectionHeading
        kicker="LEADERBOARD"
        title="Standings by track"
        description="Quiz (10%) + OC Round (20%) + Senior Final (70%, folded into Total), ranked within each track. A column shows 🔒 until that round's score is entered."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              t.key === activeTab?.key
                ? "border border-accent/30 bg-accent-soft text-accent-hover"
                : "border border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]"
            }`}
          >
            {t.label} <span className="ml-1 font-mono text-xs text-muted/60">({t.rows.length})</span>
          </button>
        ))}
      </div>
      {activeTab ? <LeaderboardTable rows={activeTab.rows} /> : null}
    </section>
  )
}
