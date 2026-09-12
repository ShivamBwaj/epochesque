import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming, deadlinePassed } from "@/lib/settings"
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
  const timing = await getEventTiming()
  const eligible = team.status === "advanced" || team.status === "finalist"
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
              className="mt-2 block truncate font-mono text-sm text-cyan-200 underline-offset-4 hover:underline"
            >
              {submission.url}
            </a>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">Submitted {fmt(submission.submitted_at)}</p>
          {eligible && !closed ? (
            <p className="mt-3 text-xs text-emerald-300/80">You can replace it until the deadline.</p>
          ) : null}
        </Card>
      ) : null}

      {!eligible ? (
        <Alert tone="info">Only shortlisted teams advance to the final round. Watch the leaderboard for results.</Alert>
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
