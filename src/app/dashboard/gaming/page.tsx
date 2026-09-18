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
  const { team, isLeader } = await requireTeamPage()
  const admin = createAdminClient()
  const [{ data: slots }, flags] = await Promise.all([
    admin.from("game_slots").select("*").order("slot_index"),
    getEventFlags(),
  ])

  const myBookings = (slots ?? []).filter((s) => s.taken_by_team_id === team.id)
  const slotCount = (slots ?? []).length
  const anyOpen = flags.tekkenOpen || flags.fifaOpen

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="SIDE QUEST"
        title="Gaming Slots"
        description="Tekken (5-min slots, 11:30 AM–1:00 PM & 2:00–5:00 PM) or FIFA (15-min slots, 12:00 PM–5:00 PM) — a break between builds. One slot per team per game — you can book both. First come, first served."
      />

      {slotCount === 0 ? (
        <Alert tone="info">Gaming slots aren&apos;t set up yet. The organizers will open them soon.</Alert>
      ) : !anyOpen && myBookings.length === 0 ? (
        <Alert tone="info">Booking isn&apos;t open yet — the organizers will flip it on soon. Check back here.</Alert>
      ) : (
        <GamingPicker
          games={GAMES.map((game) => ({
            game,
            label: gameLabel(game),
            open: game === "tekken" ? flags.tekkenOpen : flags.fifaOpen,
            slots: (slots ?? [])
              .filter((s) => s.game === game)
              .map((s) => ({ id: s.id, startTime: s.start_time, taken: s.taken_by_team_id !== null })),
          }))}
          myBookings={myBookings.map((s) => ({ game: s.game, startTime: s.start_time, label: gameLabel(s.game) }))}
          isLeader={isLeader}
        />
      )}
    </div>
  )
}
