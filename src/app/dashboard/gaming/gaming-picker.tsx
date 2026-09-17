"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { bookGameSlotAction } from "@/lib/actions/team"
import { Alert, Badge, Card } from "@/components/ui"

interface SlotView {
  id: string
  startTime: string
  taken: boolean
}

interface GameView {
  game: string
  label: string
  slots: SlotView[]
}

interface MyBooking {
  game: string
  startTime: string
  label: string
}

function slotEnd(i: number, game: string) {
  const step = game === "tekken" ? 5 : 10
  const total = 14 * 60 + (i + 1) * step
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export function GamingPicker({ games, myBooking, isLeader }: { games: GameView[]; myBooking: MyBooking | null; isLeader: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function book(slot: SlotView) {
    setError(null)
    setBusySlot(slot.id)
    startTransition(async () => {
      const res = await bookGameSlotAction(slot.id)
      setBusySlot(null)
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? "Could not book. Try again.")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      {myBooking ? (
        <Card className="ring-glow p-6 text-center">
          <p className="hud-label">YOUR SLOT — LOCKED</p>
          <p className="mt-3 text-xl font-semibold text-foreground">
            {myBooking.label} · {myBooking.startTime}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            One slot per team. Show up on time — miss it and it&apos;s gone. Need a change? Ask the organizers at the gaming desk.
          </p>
        </Card>
      ) : isLeader ? (
        <Alert tone="info">Pick carefully — once you book, that&apos;s your slot. No switching games or times yourself.</Alert>
      ) : (
        <Alert tone="info">Ask your team leader to pick your gaming slot.</Alert>
      )}

      {error ? <Alert tone="error">{error}</Alert> : null}

      {!myBooking && !isLeader ? null : (
        <div className="grid gap-6 lg:grid-cols-2">
          {games.map((g) => {
            const free = g.slots.filter((s) => !s.taken && !myBooking).length
            return (
              <Card key={g.game} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">{g.label}</h3>
                  <Badge tone={free > 0 ? "green" : "red"}>
                    {g.slots.filter((s) => !s.taken).length}/{g.slots.length} OPEN
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                  {g.slots.map((s, i) => {
                    const isMine = myBooking?.game === g.game && myBooking?.startTime === s.startTime
                    const disabled = s.taken || !!myBooking || busySlot !== null || pending || !isLeader
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => book(s)}
                        title={s.taken && !isMine ? "Taken by another team" : `${s.startTime}–${slotEnd(i, g.game)}`}
                        className={`rounded-xl border px-3 py-3 text-center transition ${
                          isMine
                            ? "border-accent/50 bg-accent-soft text-accent-hover ring-glow"
                            : s.taken
                              ? "cursor-not-allowed border-white/[0.04] bg-white/[0.01] text-muted/40 line-through"
                              : disabled
                                ? "cursor-not-allowed border-white/[0.05] bg-white/[0.02] text-muted/50"
                                : "border-white/[0.10] bg-white/[0.04] text-foreground hover:border-accent/40 hover:bg-accent-soft"
                        }`}
                      >
                        <span className="block font-mono text-sm">{s.startTime}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-muted/60">{isMine ? "YOURS" : s.taken ? "TAKEN" : "OPEN"}</span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted/60">Slots go live immediately — if another team grabs one while you&apos;re deciding, it turns struck-through and you pick another.</p>
    </div>
  )
}
