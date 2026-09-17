import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getEventTiming, getEventFlags, rollIsOpen } from "@/lib/settings"
import { rollProblemStatementAction } from "@/lib/actions/team"
import { Alert, Badge, Card, Prose, SectionHeading } from "@/components/ui"
import { AutoRefresh } from "@/components/auto-refresh"
import { CaseOpener } from "@/components/case-opener"
import { Countdown } from "@/components/countdown"
import { formatIST as fmt } from "@/lib/format-date"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Problem Statement",
}

export default async function ProblemStatementPage() {
  const { team, isLeader } = await requireTeamPage()

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
            <h3 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-5xl">{ps.title}</h3>
            <div className="mt-6">
              <Prose>
                <p className="whitespace-pre-line text-lg md:text-xl">{ps.description}</p>
              </Prose>
            </div>
            <p className="mt-6 font-mono text-xs tracking-widest text-muted/60">
              LOCKED IN AT {fmt(team.ps_locked_at).toUpperCase()}
            </p>
            <a
              href="/epochesque-tracks.pdf"
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-xs text-accent-hover transition hover:bg-accent-soft/80"
            >
              📄 View track rubric & ideas (PDF)
            </a>
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

  const [timing, flags] = await Promise.all([getEventTiming(), getEventFlags()])
  const open = rollIsOpen(flags, timing)

  if (!open) {
    return (
      <div className="space-y-6">
        <SectionHeading
          kicker="THE ROLL"
          title="Problem Statement"
          description="Rolling opens for every team at the same time — no stage, no waiting in line."
        />
        <AutoRefresh intervalMs={15000} />
        <Card className="ring-glow mx-auto max-w-xl p-8 text-center md:p-10">
          <span className="inline-block text-5xl">🎁</span>
          <p className="hud-label mt-5">ROLLING ISN&apos;T OPEN YET</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The organizers will flip the switch soon — this page updates itself the moment it opens, no refresh needed.
          </p>
          {timing.ps_release_at ? (
            <div className="mt-6">
              <Countdown target={timing.ps_release_at} label="Opens in" pastLabel="OPENING…" />
            </div>
          ) : null}
          <p className="mt-6 font-mono text-[11px] tracking-widest text-slate-600">ONE ROLL PER TEAM · NO RE-ROLLS</p>
        </Card>
      </div>
    )
  }

  const admin = createAdminClient()
  const { data: statements } = await admin
    .from("problem_statements")
    .select("id, code, title")
    .eq("is_active", true)
    .order("id")
  const pool = statements ?? []

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="THE ROLL"
        title="Problem Statement"
        description="One roll, right here, right now. Locked the moment it lands — no re-rolls, no trades."
      />
      {isLeader ? (
        <Card className="ring-glow p-6 md:p-8">
          <CaseOpener pool={pool} rollFn={rollProblemStatementAction} />
        </Card>
      ) : (
        <Alert tone="info">Only your team leader can roll. Ask them to open this page and hit roll.</Alert>
      )}
    </div>
  )
}
