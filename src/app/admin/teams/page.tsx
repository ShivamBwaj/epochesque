import type { Metadata } from "next"
import Link from "next/link"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { SectionHeading } from "@/components/ui"
import { fetchAttendanceStateAction } from "@/lib/actions/attendance"
import { sheetsWebhookConfigured } from "@/lib/sheets"
import { TeamsBoard } from "./teams-board"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Teams",
}

export interface RosterMember {
  registrationId: string
  regNo: string
  name: string
  email: string
  phone: string
  hasAccount: boolean
  role: "leader" | "member"
}

export interface RosterTeam {
  id: string
  team_code: string
  team_name: string
  status: string
  problem_statement_id: number | null
  psCode: string
  members: RosterMember[]
}

export default async function AdminTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  await requireAdminPage()
  const sp = await searchParams
  const day = sp.day === "2" ? 2 : 1
  const admin = createAdminClient()

  const [{ data: teams }, { data: statements }, { data: registrations }, { data: members }, attendanceState, sheetsConfigured] = await Promise.all([
    admin.from("teams").select("id, team_code, team_name, status, problem_statement_id").order("team_code"),
    admin.from("problem_statements").select("id, code"),
    admin.from("registrations").select("id, reg_no, name, email, phone, auth_user_id").order("name"),
    admin.from("team_members").select("team_id, role, registration_id"),
    fetchAttendanceStateAction(day),
    sheetsWebhookConfigured(),
  ])

  const psMap = new Map((statements ?? []).map((p) => [p.id, p.code]))
  const regMap = new Map((registrations ?? []).map((r) => [r.id, r]))
  const teamedRegIds = new Set((members ?? []).map((m) => m.registration_id))

  const membersByTeam = new Map<string, RosterMember[]>()
  for (const m of members ?? []) {
    const reg = regMap.get(m.registration_id)
    if (!reg) continue
    const list = membersByTeam.get(m.team_id) ?? []
    list.push({
      registrationId: reg.id,
      regNo: reg.reg_no,
      name: reg.name,
      email: reg.email,
      phone: reg.phone,
      hasAccount: !!reg.auth_user_id,
      role: m.role as "leader" | "member",
    })
    membersByTeam.set(m.team_id, list)
  }
  for (const list of membersByTeam.values()) {
    list.sort((a, b) => (a.role === "leader" ? -1 : b.role === "leader" ? 1 : a.name.localeCompare(b.name)))
  }

  const rosterTeams: RosterTeam[] = (teams ?? []).map((t) => ({
    id: t.id,
    team_code: t.team_code,
    team_name: t.team_name,
    status: t.status,
    problem_statement_id: t.problem_statement_id,
    psCode: t.problem_statement_id ? psMap.get(t.problem_statement_id) ?? "—" : "—",
    members: membersByTeam.get(t.id) ?? [],
  }))

  const unassigned = (registrations ?? [])
    .filter((r) => !teamedRegIds.has(r.id))
    .map((r) => ({ id: r.id, regNo: r.reg_no, name: r.name, email: r.email, hasAccount: !!r.auth_user_id }))

  const teamOptions = rosterTeams.map((t) => ({ id: t.id, label: `${t.team_code} — ${t.team_name} (${t.members.length}/4)`, size: t.members.length }))

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="REGISTRY"
        title="Teams"
        description="Build teams by picking people from the unassigned list below and naming the team. Attendance ticks live right here too — no separate tab, everything syncs across every open admin screen."
      />

      <TeamsBoard
        rosterTeams={rosterTeams}
        unassigned={unassigned}
        teamOptions={teamOptions}
        initialDay={day as 1 | 2}
        initialMembers={attendanceState.members ?? []}
        sheetsConfigured={sheetsConfigured}
      />

      {rosterTeams.length > 0 ? (
        <p className="text-xs text-muted/70">
          Need a leaderboard link or a deck?{" "}
          <Link href="/admin/round1" className="text-accent-hover hover:underline">
            OC Round →
          </Link>
        </p>
      ) : null}
    </div>
  )
}
