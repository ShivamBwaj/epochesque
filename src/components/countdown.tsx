"use client"

import { useEffect, useState } from "react"

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0")
}

export function Countdown({ target, label, pastLabel = "CLOSED", className = "" }: { target: string | null; label?: string; pastLabel?: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!target) {
    return (
      <div className={`flex items-baseline gap-3 ${className}`}>
        <span className="font-mono text-3xl font-semibold text-muted/60">TBA</span>
        {label ? <span className="hud-label">{label}</span> : null}
      </div>
    )
  }

  const diff = new Date(target).getTime() - now
  const past = diff <= 0
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  const secs = Math.floor((diff % 60_000) / 1000)

  const cells = past
    ? null
    : [
        [days, "D"],
        [hours, "H"],
        [mins, "M"],
        [secs, "S"],
      ].map(([v, l]) => (
        <div key={l as string} className="flex min-w-14 flex-col items-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-2">
          <span className="font-mono text-2xl font-semibold tabular-nums text-accent-hover">{pad(v as number)}</span>
          <span className="font-mono text-[10px] tracking-widest text-muted/60">{l}</span>
        </div>
      ))

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {past ? (
          <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-lg font-semibold text-red-300">{pastLabel}</span>
        ) : (
          cells
        )}
      </div>
      {label ? <p className="hud-label mt-2">{label}</p> : null}
    </div>
  )
}
