import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { SectionHeading, StatCard } from "@/components/ui"
import { fetchAttendanceStateAction, type AttendanceMemberState } from "@/lib/actions/attendance"
import { sheetsWebhookConfigured } from "@/lib/sheets"
import { AttendanceBoard } from "./attendance-board"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Attendance",
}

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  await requireAdminPage()
  const sp = await searchParams
  const day = sp.day === "2" ? 2 : 1

  const state = await fetchAttendanceStateAction(day)
  const members: AttendanceMemberState[] = state.members ?? []
  const present = members.filter((m) => m.present).length
  const teams = new Map<string, { code: string; name: string; present: number; total: number }>()
  for (const m of members) {
    const t = teams.get(m.teamId) ?? { code: m.teamCode, name: m.teamName, present: 0, total: 0 }
    if (m.present) t.present++
    t.total++
    teams.set(m.teamId, t)
  }
  const fullTeams = [...teams.values()].filter((t) => t.present === t.total && t.total > 0).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="CROWD CONTROL"
        title="Attendance"
        description="Tick names as people walk in. Everything syncs live across every admin screen — no refresh needed."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Day" value={`Day ${day}`} sub={day === 1 ? "Day 2 → switch tab above" : "Day 1 → switch tab above"} />
        <StatCard label="Present" value={String(present)} sub={`of ${members.length} members`} />
        <StatCard label="Absent" value={String(members.length - present)} sub="not marked yet or missing" />
        <StatCard label="Full teams" value={String(fullTeams)} sub={`of ${teams.size} teams, all present`} />
      </div>

      <AttendanceBoard key={day} day={day} initialMembers={members} sheetsConfigured={sheetsWebhookConfigured()} />
    </div>
  )
}
