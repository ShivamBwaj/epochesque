import type { Metadata } from "next"
import Link from "next/link"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, EmptyState, LinkButton, SectionHeading, StatCard } from "@/components/ui"
import { TeamRow } from "./team-row"
import { DownloadCredentialsButton } from "./download-credentials-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Teams",
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
        description="Every squad at Epochesque. Pick a different leader from the member dropdown, reset passwords, or add walk-in teams manually."
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
        <DownloadCredentialsButton
          teams={rows.filter((t) => t.auth_user_id !== null).map((t) => ({ team_code: t.team_code, team_name: t.team_name, leader_email: t.leader_email }))}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Import the registration CSV or add a team manually." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="hud-label whitespace-nowrap px-3 py-3">CODE</th>
                  <th className="hud-label px-3 py-3">TEAM</th>
                  <th className="hud-label px-3 py-3">LEADER (PICK FROM MEMBERS)</th>
                  <th className="hud-label hidden whitespace-nowrap px-3 py-3 md:table-cell">PS</th>
                  <th className="hud-label hidden px-3 py-3 md:table-cell">STATUS</th>
                  <th className="hud-label px-3 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    psCode={team.problem_statement_id ? psMap.get(team.problem_statement_id) ?? "—" : "—"}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {rows.length > 0 ? (
        <p className="text-xs text-muted/70">
          Need a leaderboard link or a deck?{" "}
          <Link href="/admin/round1" className="text-accent-hover hover:underline">
            Round 1 →
          </Link>
        </p>
      ) : null}
    </div>
  )
}
