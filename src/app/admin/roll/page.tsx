import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { SectionHeading, StatCard } from "@/components/ui"
import { RollStage } from "./roll-stage"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Roll Stage",
}

export default async function AdminRollPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const [{ data: teams }, { data: statements }] = await Promise.all([
    admin.from("teams").select("id, team_code, team_name, problem_statement_id").order("team_code"),
    admin.from("problem_statements").select("id, code, title, is_active").order("id"),
  ])
  const psMap = new Map((statements ?? []).map((p) => [p.id, p.code]))
  const pool = (statements ?? []).filter((p) => p.is_active).map((p) => ({ id: p.id, code: p.code, title: p.title }))
  const rows = (teams ?? []).map((t) => ({
    id: t.id,
    code: t.team_code,
    name: t.team_name,
    psCode: t.problem_statement_id ? psMap.get(t.problem_statement_id) ?? null : null,
  }))

  const rolled = rows.filter((t) => t.psCode).length

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="PROJECTOR MODE"
        title="Roll Stage"
        description="Call each team up, hit ROLL on the big screen, done. The result locks to the team instantly and their dashboard updates live."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Rolled" value={`${rolled}/${rows.length}`} sub="Teams with a problem" />
        <StatCard label="Remaining" value={String(rows.length - rolled)} sub="Still waiting for the stage" />
        <StatCard label="Pool" value={String(pool.length)} sub="Active problem statements" />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.10] px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">No teams yet</p>
          <p className="mt-1 text-xs text-muted">Import teams first — then bring them up one by one.</p>
        </div>
      ) : (
        <RollStage teams={rows} pool={pool} />
      )}
    </div>
  )
}
