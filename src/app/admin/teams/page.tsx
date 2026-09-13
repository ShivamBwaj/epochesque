import type { Metadata } from "next"
import Link from "next/link"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, EmptyState, LinkButton, SectionHeading, StatCard } from "@/components/ui"
import { TeamRow } from "./team-row"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Teams",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function AdminTeamsPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data: teams } = await admin.from("teams").select("*").order("team_code")
  const { data: statements } = await admin.from("problem_statements").select("id, code")
  const psMap = new Map((statements ?? []).map((p) => [p.id, p.code]))
  const rows = teams ?? []
  const withPs = rows.filter((t) => t.problem_statement_id !== null).length
  const withLogin = rows.filter((t) => t.auth_user_id !== null).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="REGISTRY"
        title="Teams"
        description="Every squad at Epoch. Change the leader's email on the spot (✎), reset passwords, or add walk-in teams manually."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Teams" value={String(rows.length)} sub="Registered squads" />
        <StatCard label="On a problem" value={String(withPs)} sub="Rolled a problem statement" />
        <StatCard label="With logins" value={String(withLogin)} sub="Auth accounts linked" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <LinkButton href="/admin/teams/add" size="sm">
          + Add team manually
        </LinkButton>
        <LinkButton href="/admin/teams/import" variant="secondary" size="sm">
          Import CSV
        </LinkButton>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Import the registration CSV or add a team manually." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="hud-label px-4 py-3">CODE</th>
                  <th className="hud-label px-4 py-3">TEAM</th>
                  <th className="hud-label px-4 py-3">LEADER (✎ = EDIT EMAIL)</th>
                  <th className="hud-label px-4 py-3">MEMBERS</th>
                  <th className="hud-label px-4 py-3">PS</th>
                  <th className="hud-label px-4 py-3">STATUS</th>
                  <th className="hud-label px-4 py-3">CREATED</th>
                  <th className="hud-label px-4 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    psCode={team.problem_statement_id ? psMap.get(team.problem_statement_id) ?? "—" : "—"}
                    createdAt={fmt(team.created_at)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
