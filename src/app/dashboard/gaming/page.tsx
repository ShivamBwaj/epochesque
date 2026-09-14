import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventFlags } from "@/lib/settings"
import { gameLabel, GAMES } from "@/lib/database.types"
import { SectionHeading, Alert } from "@/components/ui"
import { GamingPicker } from "./gaming-picker"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Gaming Slots",
}

export default async function DashboardGamingPage() {
  const { team } = await requireTeamPage()
  const admin = createAdminClient()
  const [{ data: slots }, flags] = await Promise.all([
    admin.from("game_slots").select("*").order("slot_index"),
    getEventFlags(),
  ])

  const myBooking = (slots ?? []).find((s) => s.taken_by_team_id === team.id) ?? null
  const slotCount = (slots ?? []).length

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="SIDE QUEST"
        title="Gaming Slots"
        description="Tekken or FIFA — 15 minutes of glory between builds. 11:00 to 14:00, one slot per team, one game per team. First come, first served."
      />

      {slotCount === 0 ? (
        <Alert tone="info">Gaming slots aren&apos;t set up yet. The organizers will open them soon.</Alert>
      ) : !flags.gamingOpen && !myBooking ? (
        <Alert tone="info">Booking isn&apos;t open yet — the organizers will flip it on soon. Check back here.</Alert>
      ) : (
        <GamingPicker
          games={GAMES.map((game) => ({
            game,
            label: gameLabel(game),
            slots: (slots ?? [])
              .filter((s) => s.game === game)
              .map((s) => ({ id: s.id, startTime: s.start_time, taken: s.taken_by_team_id !== null })),
          }))}
          myBooking={myBooking ? { game: myBooking.game, startTime: myBooking.start_time, label: gameLabel(myBooking.game) } : null}
        />
      )}
    </div>
  )
}
