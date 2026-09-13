import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { clearGameSlotAction } from "@/lib/actions/admin"
import { gameLabel, type GameSlot } from "@/lib/database.types"
import { Badge, Card, EmptyState, SectionHeading, StatCard } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Gaming Slots",
}

export default async function AdminGamingPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const [{ data: slots }, { data: teams }] = await Promise.all([
    admin.from("game_slots").select("*").order("slot_index"),
    admin.from("teams").select("id, team_code, team_name"),
  ])
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]))

  const games: { game: "tekken" | "fifa"; slots: (GameSlot & { teamCode?: string; teamName?: string })[] }[] = (["tekken", "fifa"] as const).map(
    (game) => ({
      game,
      slots: (slots ?? [])
        .filter((s) => s.game === game)
        .map((s) => {
          const t = s.taken_by_team_id ? teamMap.get(s.taken_by_team_id) : undefined
          return { ...s, teamCode: t?.team_code, teamName: t?.team_name }
        }),
    })
  )

  const allSlots = slots ?? []
  const booked = allSlots.filter((s) => s.taken_by_team_id !== null).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="SIDE QUEST"
        title="Gaming Slots"
        description="Tekken and FIFA, 15-minute slots from 11:00 to 14:00. One team per slot, one slot per team — bookings are atomic, no double-booking possible."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Slots booked" value={`${booked}/${allSlots.length}`} sub="across both games" />
        <StatCard label="Tekken" value={`${games[0].slots.filter((s) => s.taken_by_team_id).length}/12`} sub="11:00 – 14:00" />
        <StatCard label="FIFA" value={`${games[1].slots.filter((s) => s.taken_by_team_id).length}/12`} sub="11:00 – 14:00" />
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
                {gameSlots.map((s, i) => {
                  const endTime = `${String(11 + Math.floor(((i + 1) * 15) / 60)).padStart(2, "0")}:${String(((i + 1) * 15) % 60).padStart(2, "0")}`
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
                          <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                            {s.teamCode} <span className="text-muted-foreground">· {s.teamName}</span>
                          </span>
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
