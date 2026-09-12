import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming, deadlinePassed } from "@/lib/settings"
import { createClient } from "@/lib/supabase/server"
import { Alert, Card, SectionHeading } from "@/components/ui"
import { Round1Form } from "../../round1-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Submit Round 1",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function SubmitRound1Page() {
  const { team } = await requireTeamPage()
  const timing = await getEventTiming()
  const closed = deadlinePassed(timing.round1_deadline)
  const supabase = await createClient()
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("team_id", team.id)
    .eq("round", "round1")
    .maybeSingle()
  const submission = data ?? null

  return (
    <div className="space-y-6">
      <SectionHeading
        kicker="ROUND 1"
        title="Submit your deck"
        description="Upload your pitch deck as .ppt, .pptx or .pdf. Max 25 MB. Re-upload any time until the deadline — the newest file wins."
      />

      {closed ? <Alert tone="error">Round 1 submissions are closed — the deadline has passed.</Alert> : null}

      {submission ? (
        <Card className="p-5">
          <p className="hud-label">CURRENT SUBMISSION</p>
          <p className="mt-2 truncate font-mono text-sm text-cyan-200">{submission.file_name ?? "deck"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {((submission.file_size ?? 0) / 1048576).toFixed(1)} MB · Submitted {fmt(submission.submitted_at)}
          </p>
          {!closed ? <p className="mt-3 text-xs text-emerald-300/80">You can replace it until the deadline.</p> : null}
        </Card>
      ) : !closed ? (
        <Card className="p-5 text-sm text-slate-400">Nothing uploaded yet — this slot is empty.</Card>
      ) : null}

      {!closed ? (
        <Card className="p-5 md:p-6">
          <p className="hud-label mb-4">UPLOAD</p>
          <Round1Form />
        </Card>
      ) : null}
    </div>
  )
}
