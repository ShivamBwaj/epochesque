"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dices } from "lucide-react"

const FEED = [
  { team: "T-19012", ps: "PS-07", title: "Last-mile delivery router", ms: "just now" },
  { team: "T-3637", ps: "PS-02", title: "Campus energy auditor", ms: "4s ago" },
  { team: "T-5817", ps: "PS-11", title: "Offline-first study pods", ms: "9s ago" },
  { team: "T-6286", ps: "PS-04", title: "Dorm food waste tracker", ms: "17s ago" },
  { team: "T-6529", ps: "PS-15", title: "Ticket-rush fair sharer", ms: "26s ago" },
  { team: "T-6846", ps: "PS-09", title: "Accessibility wayfinder", ms: "38s ago" },
]

export function DiceFeed() {
  const [head, setHead] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setHead((h) => (h + 1) % FEED.length), 2600)
    return () => clearInterval(t)
  }, [])

  const rows = Array.from({ length: 5 }, (_, i) => FEED[(head + i) % FEED.length])

  return (
    <div className="liquid-glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Dices className="w-4 h-4 text-accent" />
          <span className="text-xs font-medium text-muted uppercase tracking-wider">The Arena</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted">LIVE</span>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {rows.map((row, i) => (
            <motion.div
              key={`${row.team}-${head}-${i}`}
              layout
              initial={{ opacity: 0, y: -14, scale: 0.98 }}
              animate={{ opacity: i === 0 ? 1 : Math.max(0.35, 1 - i * 0.16), y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-white/[0.06] bg-surface/60"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-medium text-accent">{row.team}</span>
                  <span className="text-muted/30">·</span>
                  <span className="font-mono text-[10px] text-muted">{row.ps}</span>
                </div>
                <p className="text-[12.5px] text-foreground/85 truncate mt-0.5">rolled “{row.title}”</p>
              </div>
              <span className="text-[10px] text-muted/60 shrink-0 ml-3 font-mono">{row.ms}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="mt-4 text-center text-[10px] text-muted/50 font-mono tracking-widest">
        DEMO FEED · THE REAL ROLLS START AT KICKOFF
      </p>
    </div>
  )
}
