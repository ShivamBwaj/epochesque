import type { Metadata } from "next"
import Link from "next/link"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventTiming, deadlinePassed } from "@/lib/settings"
import { Badge, Card, EmptyState, SectionHeading, StatCard } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Overview",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function AdminOverviewPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const timing = await getEventTiming()

  const [teams, ps, subs, lv, audit] = await Promise.all([
    admin.from("teams").select("status, problem_statement_id"),
    admin.from("problem_statements").select("max_teams, taken_count, is_active"),
    admin.from("submissions").select("round"),
    admin.from("leaderboard_visibility").select("round, is_published"),
    admin.from("admin_audit").select("*").order("created_at", { ascending: false }).limit(12),
  ])

  const teamRows = teams.data ?? []
  const psRows = ps.data ?? []
  const subRows = subs.data ?? []
  const lvRows = lv.data ?? []
  const auditRows = audit.data ?? []

  const byStatus = Object.fromEntries(
    ["registered", "round1", "advanced", "finalist", "eliminated"].map((s) => [s, teamRows.filter((t) => t.status === s).length])
  )
  const capacity = psRows.filter((p) => p.is_active).reduce((a, p) => a + p.max_teams, 0)
  const taken = psRows.reduce((a, p) => a + p.taken_count, 0)
  const r1Subs = subRows.filter((s) => s.round === "round1").length
  const finalSubs = subRows.filter((s) => s.round === "final").length
  const publishedRounds = lvRows.filter((r) => r.is_published).map((r) => r.round)

  const gates = [
    { label: "Event start", value: timing.event_start, note: "Landing countdown" },
    { label: "PS release", value: timing.ps_release_at, note: deadlinePassed(timing.ps_release_at) ? "Roll is OPEN" : "Roll is gated" },
    { label: "Round 1 deadline", value: timing.round1_deadline, note: deadlinePassed(timing.round1_deadline) ? "CLOSED" : "Open" },
    { label: "Final deadline", value: timing.final_deadline, note: deadlinePassed(timing.final_deadline) ? "CLOSED" : "Open" },
  ]

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MISSION CONTROL"
        title="Overview"
        description="Live state of the event — teams, rolls, submissions, and the last admin actions."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Teams" value={String(teamRows.length)} sub={`${byStatus.registered} registered · ${byStatus.round1} in round 1`} />
        <StatCard label="PS capacity" value={`${taken}/${capacity}`} sub={`${capacity - taken} slots free`} />
        <StatCard label="Round 1 decks" value={String(r1Subs)} sub={`${byStatus.advanced + byStatus.finalist} shortlisted`} />
        <StatCard label="Final repos" value={String(finalSubs)} sub={`${byStatus.finalist} finalists`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="hud-label mb-4">EVENT GATES</p>
          <div className="space-y-3">
            {gates.map((g) => (
              <div key={g.label} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="text-foreground/90">{g.label}</p>
                  <p className="text-xs text-muted">{fmt(g.value)}</p>
                </div>
                <Badge tone={g.value === null ? "slate" : "cyan"}>{g.note}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-xs text-muted-foreground">
              Leaderboards live:{" "}
              {publishedRounds.length === 0 ? (
                <span className="text-muted">none</span>
              ) : (
                publishedRounds.map((r) => (
                  <Badge key={r} tone="green">{r}</Badge>
                ))
              )}
            </p>
          </div>
          <Link href="/admin/settings" className="mt-4 inline-block text-xs text-accent-hover hover:underline">
            Adjust timing →
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="hud-label">RECENT ADMIN ACTIONS</p>
            <Link href="/admin/audit" className="text-xs text-accent-hover hover:underline">
              Full log →
            </Link>
          </div>
          {auditRows.length === 0 ? (
            <EmptyState icon="◇" title="No admin actions yet" description="Imports, publishes and edits will show up here." />
          ) : (
            <div className="space-y-2.5">
              {auditRows.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate text-foreground/90">
                      <span className="font-mono text-[11px] text-accent-hover">{a.action}</span>{" "}
                      {a.target ? <span className="text-muted">· {a.target}</span> : null}
                    </p>
                    <p className="text-[11px] text-muted/70">{fmt(a.created_at)} · {a.actor_email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-5">
        {Object.entries(byStatus).map(([status, count]) => (
          <StatCard key={status} label={status} value={String(count)} />
        ))}
      </div>
    </div>
  )
}
