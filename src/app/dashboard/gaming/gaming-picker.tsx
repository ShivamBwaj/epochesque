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
  open: boolean
  slots: SlotView[]
}

interface MyBooking {
  game: string
  startTime: string
  label: string
}

function slotEnd(startTime: string, game: string) {
  const step = game === "tekken" ? 5 : 15
  const [h, m] = startTime.split(":").map(Number)
  const total = h * 60 + m + step
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export function GamingPicker({ games, myBookings, isLeader }: { games: GameView[]; myBookings: MyBooking[]; isLeader: boolean }) {
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
      {myBookings.length > 0 ? (
        <Card className="ring-glow p-6 text-center">
          <p className="hud-label">YOUR SLOTS — LOCKED</p>
          <div className="mt-3 space-y-1">
            {myBookings.map((b) => (
              <p key={b.game} className="text-xl font-semibold text-foreground">
                {b.label} · {b.startTime}
              </p>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            One slot per game, locked in. Show up on time — miss it and it&apos;s gone. Need a change? Ask the organizers at the gaming desk.
          </p>
        </Card>
      ) : isLeader ? (
        <Alert tone="info">Pick carefully — once you book a game, that&apos;s your slot. No switching times yourself. You can book both games.</Alert>
      ) : (
        <Alert tone="info">Ask your team leader to pick your gaming slot.</Alert>
      )}

      {error ? <Alert tone="error">{error}</Alert> : null}

      {!isLeader && myBookings.length === 0 ? null : (
        <div className="grid gap-6 lg:grid-cols-2">
          {games.map((g) => {
            const myBookingForGame = myBookings.find((b) => b.game === g.game) ?? null
            const free = g.slots.filter((s) => !s.taken && !myBookingForGame).length
            return (
              <Card key={g.game} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground">{g.label}</h3>
                  {myBookingForGame ? (
                    <Badge tone="green">YOURS · {myBookingForGame.startTime}</Badge>
                  ) : g.open ? (
                    <Badge tone={free > 0 ? "green" : "red"}>
                      {g.slots.filter((s) => !s.taken).length}/{g.slots.length} OPEN
                    </Badge>
                  ) : (
                    <Badge tone="slate">BOOKING CLOSED</Badge>
                  )}
                </div>
                {myBookingForGame ? (
                  <p className="p-4 text-sm text-muted-foreground">Booked — {myBookingForGame.startTime}. That&apos;s your {g.label} slot.</p>
                ) : !g.open ? (
                  <p className="p-4 text-sm text-muted-foreground">Booking for {g.label} isn&apos;t open yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                    {g.slots.map((s) => {
                      const disabled = s.taken || busySlot !== null || pending || !isLeader
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => book(s)}
                          title={s.taken ? "Taken by another team" : `${s.startTime}–${slotEnd(s.startTime, g.game)}`}
                          className={`rounded-xl border px-3 py-3 text-center transition ${
                            s.taken
                              ? "cursor-not-allowed border-white/[0.04] bg-white/[0.01] text-muted/40 line-through"
                              : disabled
                                ? "cursor-not-allowed border-white/[0.05] bg-white/[0.02] text-muted/50"
                                : "border-white/[0.10] bg-white/[0.04] text-foreground hover:border-accent/40 hover:bg-accent-soft"
                          }`}
                        >
                          <span className="block font-mono text-sm">{s.startTime}</span>
                          <span className="mt-0.5 block font-mono text-[10px] text-muted/60">{s.taken ? "TAKEN" : "OPEN"}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted/60">Slots go live immediately — if another team grabs one while you&apos;re deciding, it turns struck-through and you pick another.</p>
    </div>
  )
}
