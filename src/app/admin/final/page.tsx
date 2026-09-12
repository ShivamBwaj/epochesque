import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { updateTeamStatusAction } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Card, EmptyState, SectionHeading, StatCard, StatusBadge } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Final Round",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function AdminFinalPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data: teams } = await admin
    .from("teams")
    .select("*")
    .in("status", ["advanced", "finalist"])
    .order("team_code")
  const { data: submissions } = await admin.from("submissions").select("*").eq("round", "final")
  const { data: statements } = await admin.from("problem_statements").select("id, code")
  const psMap = new Map((statements ?? []).map((p) => [p.id, p.code]))

  const subMap = new Map<string, { url: string | null; submitted_at: string }>()
  for (const row of submissions ?? []) {
    subMap.set(row.team_id, { url: row.url, submitted_at: row.submitted_at })
  }

  const rows = teams ?? []
  const reposIn = rows.filter((t) => subMap.has(t.id)).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="FINAL ROUND — SHIP IT"
        title="Final review"
        description="Shortlisted squads and their repos. Mark finalists as judging wraps, eliminate stragglers, or revert a misclick."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Shortlisted" value={String(rows.length)} sub="Advanced + finalists" />
        <StatCard label="Repos in" value={String(reposIn)} sub="Final submissions" />
        <StatCard label="Missing" value={String(rows.length - reposIn)} sub="No repo yet" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No shortlisted teams" description="Advance teams from Round 1 — they'll show up here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800/70">
                  <th className="hud-label px-4 py-3">CODE</th>
                  <th className="hud-label px-4 py-3">TEAM</th>
                  <th className="hud-label px-4 py-3">STATUS</th>
                  <th className="hud-label px-4 py-3">PS</th>
                  <th className="hud-label px-4 py-3">REPO</th>
                  <th className="hud-label px-4 py-3">SUBMITTED</th>
                  <th className="hud-label px-4 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((t) => {
                  const sub = subMap.get(t.id)
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono text-xs tracking-wide text-cyan-300">{t.team_code}</td>
                      <td className="px-4 py-3 font-medium text-slate-100">{t.team_name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {t.problem_statement_id ? psMap.get(t.problem_statement_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub?.url ? (
                          <a
                            href={sub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-56 truncate font-mono text-xs text-cyan-200 underline-offset-4 hover:underline"
                            title={sub.url}
                          >
                            {sub.url}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{sub ? fmt(sub.submitted_at) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <form action={updateTeamStatusAction}>
                            <input type="hidden" name="teamId" value={t.id} />
                            <input type="hidden" name="status" value="finalist" />
                            <SubmitButton size="sm" pendingText="…">
                              Mark finalist
                            </SubmitButton>
                          </form>
                          <form action={updateTeamStatusAction}>
                            <input type="hidden" name="teamId" value={t.id} />
                            <input type="hidden" name="status" value="eliminated" />
                            <SubmitButton variant="danger" size="sm" pendingText="…">
                              Eliminate
                            </SubmitButton>
                          </form>
                          <form action={updateTeamStatusAction}>
                            <input type="hidden" name="teamId" value={t.id} />
                            <input type="hidden" name="status" value="advanced" />
                            <SubmitButton variant="secondary" size="sm" pendingText="…">
                              Revert
                            </SubmitButton>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
