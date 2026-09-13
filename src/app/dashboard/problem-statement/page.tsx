import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Alert, Badge, Card, Prose, SectionHeading } from "@/components/ui"
import { AutoRefresh } from "@/components/auto-refresh"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Problem Statement",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function ProblemStatementPage() {
  const { team } = await requireTeamPage()

  if (team.problem_statement_id) {
    const admin = createAdminClient()
    const { data: ps } = await admin
      .from("problem_statements")
      .select("*")
      .eq("id", team.problem_statement_id)
      .maybeSingle()

    return (
      <div className="space-y-6">
        <SectionHeading
          kicker="YOUR MISSION"
          title="Problem Statement"
          description="The roll has spoken. This is what your team builds for Epochesque."
        />
        {ps ? (
          <Card className="ring-glow p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">{ps.code}</Badge>
              <Badge tone="green">LOCKED</Badge>
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground md:text-2xl">{ps.title}</h3>
            <div className="mt-4">
              <Prose>
                <p className="whitespace-pre-line">{ps.description}</p>
              </Prose>
            </div>
            <p className="mt-6 font-mono text-xs tracking-widest text-muted/60">
              LOCKED IN AT {fmt(team.ps_locked_at).toUpperCase()}
            </p>
          </Card>
        ) : (
          <Alert tone="info">
            Your problem statement is assigned but could not be loaded. Refresh the page — if it persists, contact the
            organizers.
          </Alert>
        )}
        <Alert tone="info">This pick is final — no re-rolls. Read it twice, scope it right, build smart.</Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="THE ROLL"
        title="Problem Statement"
        description="The organizers roll for every team on stage — watch the big screen."
      />
      <AutoRefresh intervalMs={5000} />
      <Card className="ring-glow mx-auto max-w-xl p-8 text-center md:p-10">
        <span className="inline-block text-5xl">🎁</span>
        <p className="hud-label mt-5">WAITING FOR YOUR TURN ON STAGE</p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          When the OC calls your team up, the roll happens on the projector and your problem statement locks in.
          This page updates itself the moment it lands — no refresh needed.
        </p>
        <div className="mt-8">
          <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-base font-medium text-muted/50">
            🎲 Watch the stage
          </span>
        </div>
        <p className="mt-3 font-mono text-[11px] tracking-widest text-slate-600">ONE CASE PER TEAM · NO RE-ROLLS</p>
      </Card>
    </div>
  )
}
