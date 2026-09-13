"use client"

import Image from "next/image"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { rollProblemStatementAction } from "@/lib/actions/team"
import { Alert, Button, Card } from "@/components/ui"

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

      <div className="relative mx-auto mt-8 h-48 w-48 md:h-56 md:w-56">
        <Image
          src="/animations/dice-roll.gif"
          alt="Dice rolling"
          fill
          sizes="(max-width: 768px) 192px, 224px"
          className={`rounded-2xl object-contain transition-transform duration-300 ${pending ? "scale-105" : "scale-100 hover:scale-[1.03]"}`}
          priority
          unoptimized
        />
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
