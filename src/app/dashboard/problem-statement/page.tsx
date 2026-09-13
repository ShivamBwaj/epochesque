import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming, getEventFlags, rollIsOpen } from "@/lib/settings"
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
  const [timing, flags] = await Promise.all([getEventTiming(), getEventFlags()])

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

  if (!rollIsOpen(flags, timing)) {
    const scheduledSoon = timing.ps_release_at && !flags.rollOpen
    return (
      <div className="space-y-6">
        <SectionHeading
          kicker="THE ROLL"
          title="Problem Statement"
          description="The dice are loaded. The organizers open the roll at the event — hang tight."
        />
        <Card className="mx-auto max-w-xl p-8 text-center md:p-10">
          {scheduledSoon ? (
            <>
              <p className="hud-label">PROBLEM STATEMENTS UNLOCK IN</p>
              <Countdown target={timing.ps_release_at} className="mt-6 flex flex-col items-center" />
            </>
          ) : (
            <>
              <span className="dice-face inline-block text-4xl">🎲</span>
              <p className="hud-label mt-4">WAITING FOR THE ORGANIZERS</p>
              <p className="mt-3 text-sm text-muted-foreground">
                The roll opens the moment the OC flips the switch. Keep this page handy.
              </p>
            </>
          )}
          <div className="mt-8">
            <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-6 py-3 text-base font-medium text-muted/50">
              🎲 Roll the dice
            </span>
          </div>
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
