import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming, getEventFlags, deadlinePassed } from "@/lib/settings"
import { createClient } from "@/lib/supabase/server"
import { Alert, Card, SectionHeading } from "@/components/ui"
import { FinalForm } from "../../final-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Submit Final",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function SubmitFinalPage() {
  const { team } = await requireTeamPage()
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
        title="Submit your repo"
        description="Link the GitHub repository with your final build. You can update the link any time until the deadline."
      />

      {submission ? (
        <Card className="p-5">
          <p className="hud-label">CURRENT SUBMISSION</p>
          {submission.url ? (
            <a
              href={submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block truncate font-mono text-sm text-accent-hover underline-offset-4 hover:underline"
            >
              {submission.url}
            </a>
          ) : null}
          <p className="mt-1 text-xs text-muted">{`Submitted ${fmt(submission.submitted_at)}`}</p>
          {flags.finalOpen && !closed ? (
            <p className="mt-3 text-xs text-emerald-300/80">You can replace it until the deadline.</p>
          ) : null}
        </Card>
      ) : null}

      {!flags.finalOpen ? (
        <Alert tone="info">Final round submissions open when the organizers flip the switch at the event. Watch for the announcement.</Alert>
      ) : closed ? (
        <Alert tone="error">Final round submissions are closed — the deadline has passed.</Alert>
      ) : (
        <Card className="p-5 md:p-6">
          <p className="hud-label mb-4">REPO LINK</p>
          <FinalForm />
        </Card>
      )}
    </div>
  )
}
