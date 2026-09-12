import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, EmptyState, SectionHeading, StatCard } from "@/components/ui"
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
        description="Every squad at Epoch — codes, squads, logins, and status. Reset passwords and prune dead registrations here."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Teams" value={String(rows.length)} sub="Registered squads" />
        <StatCard label="On a problem" value={String(withPs)} sub="Rolled a problem statement" />
        <StatCard label="With logins" value={String(withLogin)} sub="Auth accounts linked" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Import the registration CSV to create team logins." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800/70">
                  <th className="hud-label px-4 py-3">CODE</th>
                  <th className="hud-label px-4 py-3">TEAM</th>
                  <th className="hud-label px-4 py-3">LEADER</th>
                  <th className="hud-label px-4 py-3">MEMBERS</th>
                  <th className="hud-label px-4 py-3">PS</th>
                  <th className="hud-label px-4 py-3">STATUS</th>
                  <th className="hud-label px-4 py-3">CREATED</th>
                  <th className="hud-label px-4 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
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
