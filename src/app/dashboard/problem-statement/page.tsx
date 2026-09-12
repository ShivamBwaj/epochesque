import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming, deadlinePassed } from "@/lib/settings"
import { createClient } from "@/lib/supabase/server"
import { Alert, Badge, Card, Prose, SectionHeading } from "@/components/ui"
import { Countdown } from "@/components/countdown"
import { RollButton } from "../roll-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Problem Statement",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function ProblemStatementPage() {
  const { team } = await requireTeamPage()
  const timing = await getEventTiming()

  if (team.problem_statement_id) {
    const supabase = await createClient()
    const { data: ps } = await supabase
      .from("problem_statements")
      .select("*")
      .eq("id", team.problem_statement_id)
      .maybeSingle()

    return (
      <div className="space-y-6">
        <SectionHeading
          kicker="YOUR MISSION"
          title="Problem Statement"
          description="The dice have spoken. This is what your team builds for Epoch."
        />
        {ps ? (
          <Card className="ring-glow p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">{ps.code}</Badge>
              <Badge tone="green">LOCKED</Badge>
            </div>
            <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-100 md:text-2xl">{ps.title}</h3>
            <div className="mt-4">
              <Prose>
                <p className="whitespace-pre-line">{ps.description}</p>
              </Prose>
            </div>
            <p className="mt-6 font-mono text-xs tracking-widest text-slate-500">
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

  const released = timing.ps_release_at ? deadlinePassed(timing.ps_release_at) : true

  if (!released) {
    return (
      <div className="space-y-6">
        <SectionHeading
          kicker="THE ROLL"
          title="Problem Statement"
          description="Problem statements drop soon. Warm up your ideas — the dice wait for no one."
        />
        <Card className="mx-auto max-w-xl p-8 text-center md:p-10">
          <p className="hud-label">PROBLEM STATEMENTS UNLOCK IN</p>
          <Countdown target={timing.ps_release_at} className="mt-6 flex flex-col items-center" />
          <div className="mt-8">
            <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-6 py-3 text-base font-medium text-slate-600">
              🎲 Roll the dice
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Come back when the clock hits zero.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="THE ROLL"
        title="Problem Statement"
        description="Every great build starts with a problem. Yours is one roll away."
      />
      <RollButton />
    </div>
  )
}
