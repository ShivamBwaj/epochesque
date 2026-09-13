import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Audit Log",
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function toneFor(action: string): "green" | "amber" | "red" | "cyan" | "slate" {
  if (action.includes("publish")) return "green"
  if (action.includes("unpublish")) return "amber"
  if (action.includes("delete")) return "red"
  if (action.includes("import") || action.includes("save")) return "cyan"
  return "slate"
}

export default async function AdminAuditPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data: rows } = await admin.from("admin_audit").select("*").order("created_at", { ascending: false }).limit(200)

  const entries = rows ?? []

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="ACCOUNTABILITY"
        title="Audit Log"
        description="Every admin mutation — imports, scores, publishes, deletions — recorded with actor and timestamp. Append-only."
      />

      {entries.length === 0 ? (
        <EmptyState icon="◇" title="Nothing logged yet" description="Admin actions will appear here as they happen." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="hud-label px-4 py-3">WHEN</th>
                  <th className="hud-label px-4 py-3">ACTOR</th>
                  <th className="hud-label px-4 py-3">ACTION</th>
                  <th className="hud-label px-4 py-3">TARGET</th>
                  <th className="hud-label px-4 py-3">DETAILS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {entries.map((a) => (
                  <tr key={a.id} className="transition hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">{fmt(a.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{a.actor_email}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={toneFor(a.action)}>{a.action}</Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground/80">{a.target || "—"}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 font-mono text-[11px] text-muted/70">
                      {a.details ? JSON.stringify(a.details) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
