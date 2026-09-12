"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { rollProblemStatementAction } from "@/lib/actions/team"
import { Alert, Button, Card } from "@/components/ui"

const tiles = [0, 1, 2]

export function RollButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function roll() {
    setError(null)
    startTransition(async () => {
      const res = await rollProblemStatementAction()
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? "Something went wrong. Try again.")
      }
    })
  }

  return (
    <Card className="ring-glow mx-auto max-w-xl p-8 text-center md:p-10">
      <p className="hud-label">THE ROLL</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-100">Roll your problem statement</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
        One roll per team. The dice decide your mission — no take-backs, no re-rolls.
      </p>

      <div className="mt-8 flex items-center justify-center gap-3 md:gap-4">
        {tiles.map((i) => (
          <div
            key={i}
            className={`flex h-20 w-20 items-center justify-center rounded-2xl border bg-slate-950/70 md:h-24 md:w-24 ${
              pending ? "border-cyan-500/50 shadow-lg shadow-cyan-500/20" : "border-slate-700/60"
            }`}
          >
            <span
              className={`text-4xl md:text-5xl ${pending ? "dice-face" : ""}`}
              style={pending ? { animationDelay: `${i * 140}ms`, animationDuration: `${0.7 + i * 0.15}s` } : undefined}
            >
              🎲
            </span>
          </div>
        ))}
      </div>

      {error ? (
        <div className="mt-6">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-8">
        <Button size="lg" onClick={roll} disabled={pending}>
          {pending ? "Rolling…" : "🎲 Roll the dice"}
        </Button>
      </div>
      <p className="mt-3 font-mono text-[11px] tracking-widest text-slate-600">NO RE-ROLLS · CHOOSE WISELY (YOU CAN&apos;T)</p>
    </Card>
  )
}
