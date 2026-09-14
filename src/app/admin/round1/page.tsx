import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, EmptyState, LinkButton, SectionHeading, StatCard, StatusBadge } from "@/components/ui"
import { CleanupUploadsButton } from "./cleanup-uploads-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "OC Round 1",
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
        kicker="OC ROUND 1 — CONCEPT & PITCH"
        title="OC Round 1 decks"
        description="Every team's deck in one place. Download links expire after 5 minutes — refresh the page for fresh ones. When the judges are done, enter scores under Scoring."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Teams" value={String(rows.length)} sub="In the arena" />
        <StatCard label="Decks in" value={String(submittedCount)} sub="OC Round 1 submissions" />
        <StatCard label="Missing" value={String(rows.length - submittedCount)} sub="No deck yet" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <LinkButton href="/admin/scoring?round=round1" size="sm">
          Enter OC Round 1 scores →
        </LinkButton>
        <CleanupUploadsButton />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Import teams first — nothing to judge." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="hud-label px-4 py-3">CODE</th>
                  <th className="hud-label px-4 py-3">TEAM</th>
                  <th className="hud-label px-4 py-3">STATUS</th>
                  <th className="hud-label px-4 py-3">PS</th>
                  <th className="hud-label px-4 py-3">DECK</th>
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
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {t.problem_statement_id ? psMap.get(t.problem_statement_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub ? (
                          <div className="space-y-0.5">
                            <p className="max-w-56 truncate font-mono text-xs text-foreground/80" title={sub.file_name ?? ""}>
                              {sub.file_name ?? "deck"}
                            </p>
                            <p className="text-xs text-muted/70">{((sub.file_size ?? 0) / 1048576).toFixed(1)} MB</p>
                            {sub.url ? (
                              <a
                                href={sub.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent-hover underline-offset-4 hover:underline"
                              >
                                Download
                              </a>
                            ) : (
                              <span className="text-xs text-muted/50">link unavailable</span>
                            )}
                          </div>
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
