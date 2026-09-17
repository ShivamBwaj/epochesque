import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventFlags } from "@/lib/settings"
import { setRollOpenAction } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Badge, Card, EmptyState, SectionHeading, StatCard } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Rolls",
}

export default async function AdminRollPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const [{ data: teams }, { data: statements }, flags] = await Promise.all([
    admin.from("teams").select("id, team_code, team_name, problem_statement_id, ps_locked_at").order("team_code"),
    admin.from("problem_statements").select("id, code, title, is_active").order("id"),
    getEventFlags(),
  ])
  const psMap = new Map((statements ?? []).map((p) => [p.id, p.code]))
  const activePool = (statements ?? []).filter((p) => p.is_active)
  const rows = (teams ?? []).map((t) => ({
    id: t.id,
    code: t.team_code,
    name: t.team_name,
    psCode: t.problem_statement_id ? psMap.get(t.problem_statement_id) ?? null : null,
    lockedAt: t.ps_locked_at,
  }))

  const rolled = rows.filter((t) => t.psCode).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="SELF-SERVE"
        title="Rolls"
        description="Team leaders roll their own problem statement from their dashboard the moment you open it below — no stage, no calling teams up one by one."
      />

      <Card className={`p-5 ${flags.rollOpen ? "ring-glow" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="hud-label">🎲 ROLLING</p>
            <div className="mt-2 flex items-center gap-2">
              {flags.rollOpen ? <Badge tone="green">open — teams can roll now</Badge> : <Badge tone="slate">closed — teams can&apos;t roll yet</Badge>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Flips the roll button on for every team&apos;s dashboard at once. Leave it off until every team is ready.
            </p>
          </div>
          <form action={setRollOpenAction}>
            <input type="hidden" name="open" value={flags.rollOpen ? "false" : "true"} />
            <SubmitButton
              variant={flags.rollOpen ? "secondary" : "primary"}
              confirm={flags.rollOpen ? "Close rolling?" : "Open rolling for ALL teams?"}
              pendingText="Working…"
            >
              {flags.rollOpen ? "Close rolling" : "Open rolling"}
            </SubmitButton>
          </form>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Rolled" value={`${rolled}/${rows.length}`} sub="Teams with a problem" />
        <StatCard label="Remaining" value={String(rows.length - rolled)} sub="Haven't rolled yet" />
        <StatCard label="Pool" value={String(activePool.length)} sub="Active problem statements" />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Build teams first — they'll be able to roll once rolling is open." />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[6rem_minmax(0,1fr)_6rem] gap-4 border-b border-white/[0.08] px-5 py-3 md:grid">
            <span className="hud-label">CODE</span>
            <span className="hud-label">TEAM</span>
            <span className="hud-label text-right">PS</span>
          </div>
          <div className="divide-y divide-white/[0.05]">
            {rows.map((t) => (
              <div key={t.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[6rem_minmax(0,1fr)_6rem] md:gap-4 md:px-5">
                <span className="hidden font-mono text-xs text-cyan-300/70 md:block">{t.code}</span>
                <span className="truncate text-sm text-slate-100">{t.name}</span>
                {t.psCode ? <Badge tone="green">{t.psCode}</Badge> : <Badge tone="slate">waiting</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
