import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { updateTeamStatusAction } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Card, EmptyState, SectionHeading, StatCard, StatusBadge } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Round 1",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function AdminRound1Page() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data: teams } = await admin.from("teams").select("*").order("team_code")
  const { data: submissions } = await admin.from("submissions").select("*").eq("round", "round1")
  const { data: statements } = await admin.from("problem_statements").select("id, code")
  const psMap = new Map((statements ?? []).map((p) => [p.id, p.code]))

  const subMap = new Map<string, { file_name: string | null; file_size: number | null; submitted_at: string; url: string | null }>()
  for (const row of submissions ?? []) {
    let url: string | null = null
    if (row.storage_path) {
      const { data } = await admin.storage.from("submissions").createSignedUrl(row.storage_path, 300)
      url = data?.signedUrl ?? null
    }
    subMap.set(row.team_id, {
      file_name: row.file_name,
      file_size: row.file_size,
      submitted_at: row.submitted_at,
      url,
    })
  }

  const rows = teams ?? []
  const submittedCount = rows.filter((t) => subMap.has(t.id)).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="ROUND 1 — CONCEPT & PITCH"
        title="Round 1 review"
        description="Decks, statuses, and the advance/eliminate calls. Download links expire after 5 minutes — refresh the page for fresh ones."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Teams" value={String(rows.length)} sub="In the registry" />
        <StatCard label="Decks in" value={String(submittedCount)} sub="Round 1 submissions" />
        <StatCard label="Missing" value={String(rows.length - submittedCount)} sub="No deck yet" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Import teams first — nothing to judge." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800/70">
                  <th className="hud-label px-4 py-3">CODE</th>
                  <th className="hud-label px-4 py-3">TEAM</th>
                  <th className="hud-label px-4 py-3">STATUS</th>
                  <th className="hud-label px-4 py-3">PS</th>
                  <th className="hud-label px-4 py-3">DECK</th>
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
                        {sub ? (
                          <div className="space-y-0.5">
                            <p className="max-w-56 truncate font-mono text-xs text-slate-300" title={sub.file_name ?? ""}>
                              {sub.file_name ?? "deck"}
                            </p>
                            <p className="text-xs text-slate-500">{((sub.file_size ?? 0) / 1048576).toFixed(1)} MB</p>
                            {sub.url ? (
                              <a
                                href={sub.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-cyan-300 underline-offset-4 hover:underline"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-xs text-slate-600">link unavailable</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{sub ? fmt(sub.submitted_at) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <form action={updateTeamStatusAction}>
                            <input type="hidden" name="teamId" value={t.id} />
                            <input type="hidden" name="status" value="advanced" />
                            <SubmitButton size="sm" pendingText="…">
                              Advance
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
                            <input type="hidden" name="status" value="round1" />
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
