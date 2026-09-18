import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventFlags } from "@/lib/settings"
import { clearGameSlotAction, setGameOpenAction } from "@/lib/actions/admin"
import { gameLabel, type GameSlot } from "@/lib/database.types"
import { SubmitButton } from "@/components/submit-button"
import { Badge, Card, EmptyState, SectionHeading, StatCard } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Gaming Slots",
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

export default async function AdminGamingPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const [{ data: slots }, { data: teams }, { data: teamMembers }, flags] = await Promise.all([
    admin.from("game_slots").select("*").order("slot_index"),
    admin.from("teams").select("id, team_code, team_name"),
    admin.from("team_members").select("team_id, role, registrations(name, reg_no)"),
    getEventFlags(),
  ])
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]))
  const leaderByTeam = new Map(
    (teamMembers ?? [])
      .filter((tm) => tm.role === "leader")
      .map((tm) => {
        const reg = Array.isArray(tm.registrations) ? tm.registrations[0] : tm.registrations
        return [tm.team_id, { name: reg?.name ?? "—", regNo: reg?.reg_no ?? "—" }] as const
      })
  )

  const games: {
    game: "tekken" | "fifa"
    slots: (GameSlot & { teamCode?: string; teamName?: string; leaderName?: string; leaderRegNo?: string })[]
  }[] = (["tekken", "fifa"] as const).map((game) => ({
    game,
    slots: (slots ?? [])
      .filter((s) => s.game === game)
      .map((s) => {
        const t = s.taken_by_team_id ? teamMap.get(s.taken_by_team_id) : undefined
        const leader = s.taken_by_team_id ? leaderByTeam.get(s.taken_by_team_id) : undefined
        return { ...s, teamCode: t?.team_code, teamName: t?.team_name, leaderName: leader?.name, leaderRegNo: leader?.regNo }
      }),
  }))

  const allSlots = slots ?? []
  const booked = allSlots.filter((s) => s.taken_by_team_id !== null).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="SIDE QUEST"
        title="Gaming Slots"
        description="Tekken (5-min slots, 11:30 AM–1:00 PM & 2:00–5:00 PM) and FIFA (15-min slots, 12:00 PM–5:00 PM). One slot per team per game — a team can hold one Tekken slot and one FIFA slot. Bookings are atomic, no double-booking possible. Open each game's booking independently."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {(["tekken", "fifa"] as const).map((game) => {
          const open = game === "tekken" ? flags.tekkenOpen : flags.fifaOpen
          return (
            <Card key={game} className={`p-5 ${open ? "ring-glow" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="hud-label">🎮 {gameLabel(game).toUpperCase()} BOOKING</p>
                  <div className="mt-2 flex items-center gap-2">
                    {open ? (
                      <Badge tone="green">open — teams can book now</Badge>
                    ) : (
                      <Badge tone="slate">closed — teams can&apos;t book yet</Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Flips {gameLabel(game)} slot booking on for every team&apos;s dashboard, independent of the other game.
                  </p>
                </div>
                <form action={setGameOpenAction}>
                  <input type="hidden" name="game" value={game} />
                  <input type="hidden" name="open" value={open ? "false" : "true"} />
                  <SubmitButton
                    variant={open ? "secondary" : "primary"}
                    confirm={open ? `Close ${gameLabel(game)} slot booking?` : `Open ${gameLabel(game)} slot booking for ALL teams?`}
                    pendingText="Working…"
                  >
                    {open ? "Close booking" : "Open booking"}
                  </SubmitButton>
                </form>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Slots booked" value={`${booked}/${allSlots.length}`} sub="across both games" />
        <StatCard label="Tekken" value={`${games[0].slots.filter((s) => s.taken_by_team_id).length}/${games[0].slots.length}`} sub="11:30 AM – 5:00 PM" />
        <StatCard label="FIFA" value={`${games[1].slots.filter((s) => s.taken_by_team_id).length}/${games[1].slots.length}`} sub="12:00 PM – 5:00 PM" />
      </div>

      {allSlots.length === 0 ? (
        <EmptyState icon="◇" title="No slots found" description="Run the gaming migration (0011) to create the 24 slots." />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {games.map(({ game, slots: gameSlots }) => (
            <Card key={game} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">{gameLabel(game)}</h3>
                <Badge tone="cyan">{gameSlots.filter((s) => s.taken_by_team_id).length}/{gameSlots.length} TAKEN</Badge>
              </div>
              <div>
                {gameSlots.map((s) => {
                  const stepMinutes = game === "tekken" ? 5 : 15
                  const endTime = addMinutes(s.start_time, stepMinutes)
                  const taken = s.taken_by_team_id !== null
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0 ${taken ? "bg-white/[0.02]" : ""}`}
                    >
                      <span className="w-24 shrink-0 font-mono text-xs text-muted">
                        {s.start_time}–{endTime}
                      </span>
                      {taken ? (
                        <>
                          <div className="min-w-0 flex-1 truncate text-sm text-foreground">
                            <span>
                              {s.teamName} <span className="text-muted-foreground">· {s.teamCode}</span>
                            </span>
                            <p className="truncate text-[11px] text-muted-foreground">
                              Leader: {s.leaderName} · {s.leaderRegNo}
                            </p>
                          </div>
                          <form action={clearGameSlotAction}>
                            <input type="hidden" name="slotId" value={s.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] text-red-300 transition hover:bg-red-500/20"
                            >
                              Clear
                            </button>
                          </form>
                        </>
                      ) : (
                        <span className="flex-1 text-sm text-muted/50">— open —</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted/60">
        Clearing a slot frees it instantly and lets that team book again. Teams pick slots themselves from their dashboard — first come, first served.
      </p>
    </div>
  )
}
