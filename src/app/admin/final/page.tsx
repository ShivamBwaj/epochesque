import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventFlags } from "@/lib/settings"
import { setFinalOpenAction } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Badge, Card, EmptyState, LinkButton, SectionHeading, StatCard } from "@/components/ui"

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
  const flags = await getEventFlags()
  const { data: teams } = await admin.from("teams").select("*").order("team_code")
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
        title="Final round"
        description="Flip the switch to open repo submissions for every team, then watch the links come in. Scores go in under Scoring like the other rounds."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="hud-label">REPO SUBMISSIONS</p>
            {flags.finalOpen ? <Badge tone="green">open — teams can submit</Badge> : <Badge tone="slate">closed</Badge>}
          </div>
          <form action={setFinalOpenAction}>
            <input type="hidden" name="open" value={flags.finalOpen ? "false" : "true"} />
            <SubmitButton
              variant={flags.finalOpen ? "secondary" : "primary"}
              confirm={flags.finalOpen ? "Close final round submissions?" : "Open final round submissions for ALL teams?"}
              pendingText="Working…"
            >
              {flags.finalOpen ? "Close submissions" : "Open final submissions"}
            </SubmitButton>
          </form>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Every team submits — no shortlisting needed. The final deadline (if set in Settings) still applies.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Teams" value={String(rows.length)} sub="In the arena" />
        <StatCard label="Repos in" value={String(reposIn)} sub="Final submissions" />
        <StatCard label="Missing" value={String(rows.length - reposIn)} sub="No repo yet" />
      </div>

      <div className="flex flex-wrap gap-3">
        <LinkButton href="/admin/scoring?round=final" variant="secondary" size="sm">
          Enter final scores →
        </LinkButton>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Import or add teams first." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="hud-label px-4 py-3">CODE</th>
                  <th className="hud-label px-4 py-3">TEAM</th>
                  <th className="hud-label px-4 py-3">PS</th>
                  <th className="hud-label px-4 py-3">REPO</th>
                  <th className="hud-label px-4 py-3">SUBMITTED</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {rows.map((t) => {
                  const sub = subMap.get(t.id)
                  return (
                    <tr key={t.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-xs tracking-wide text-accent-hover">{t.team_code}</td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        <span className="block max-w-48 truncate" title={t.team_name}>{t.team_name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {t.problem_statement_id ? psMap.get(t.problem_statement_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub?.url ? (
                          <a
                            href={sub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-56 truncate font-mono text-xs text-accent-hover underline-offset-4 hover:underline"
                            title={sub.url}
                          >
                            {sub.url}
                          </a>
                        ) : (
                          <span className="text-xs text-muted/50">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted/70">{sub ? fmt(sub.submitted_at) : "—"}</td>
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
