import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming, getEventFlags, deadlinePassed } from "@/lib/settings"
import { createClient } from "@/lib/supabase/server"
import { Alert, Card, SectionHeading } from "@/components/ui"
import { FinalForm } from "../../final-form"
import { formatIST as fmt } from "@/lib/format-date"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Submit Final",
}

export default async function SubmitFinalPage() {
  const { team, isLeader } = await requireTeamPage()
  const [timing, flags] = await Promise.all([getEventTiming(), getEventFlags()])
  const closed = deadlinePassed(timing.final_deadline)
  const supabase = await createClient()
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", team.id)
    .eq("round", "final")
    .maybeSingle()
  const submission = data ?? null

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="FINAL ROUND"
        title="Submit your project"
        description="Title, description, and GitHub repo — this becomes your public project page, shown on the leaderboard. You can update it any time until the deadline."
      />

      {submission ? (
        <Card className="p-5">
          <p className="hud-label">CURRENT SUBMISSION</p>
          {submission.project_title ? <p className="mt-2 text-lg font-semibold text-foreground">{submission.project_title}</p> : null}
          {submission.url ? (
            <a
              href={submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate font-mono text-sm text-accent-hover underline-offset-4 hover:underline"
            >
              {submission.url}
            </a>
          ) : null}
          <p className="mt-1 text-xs text-muted">{`Submitted ${fmt(submission.submitted_at)}`}</p>
          <a
            href={`/projects/${team.team_code}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-xs text-accent-hover transition hover:bg-accent-soft/80"
          >
            🔗 View your public project page
          </a>
          {flags.finalOpen && !closed ? (
            <p className="mt-3 text-xs text-emerald-300/80">You can replace it until the deadline.</p>
          ) : null}
        </Card>
      ) : null}

      {!flags.finalOpen ? (
        <Alert tone="info">Final round submissions open when the organizers flip the switch at the event. Watch for the announcement.</Alert>
      ) : closed ? (
        <Alert tone="error">Final round submissions are closed — the deadline has passed.</Alert>
      ) : isLeader ? (
        <Card className="p-5 md:p-6">
          <p className="hud-label mb-4">PROJECT</p>
          <FinalForm
            initial={
              submission
                ? {
                    url: submission.url ?? "",
                    projectTitle: submission.project_title ?? "",
                    projectDescription: submission.project_description ?? "",
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <Alert tone="info">Only your team leader can submit or replace the final repo link.</Alert>
      )}
    </div>
  )
}
