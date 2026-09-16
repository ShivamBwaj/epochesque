import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming, deadlinePassed, getPptTemplatePath } from "@/lib/settings"
import { createClient } from "@/lib/supabase/server"
import { Alert, Card, SectionHeading } from "@/components/ui"
import { Round1Form } from "../../round1-form"
import { formatIST as fmt } from "@/lib/format-date"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Submit PPT",
}

export default async function SubmitRound1Page() {
  const { team, isLeader } = await requireTeamPage()
  const timing = await getEventTiming()
  const closed = deadlinePassed(timing.round1_deadline)
  const templatePath = await getPptTemplatePath()
  const templateUrl = templatePath ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${templatePath}` : null
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
        kicker="PPT ROUND"
        title="Submit your deck"
        description="Upload your pitch deck as .ppt, .pptx or .pdf. Max 10 MB. Re-upload any time until the deadline — the newest file wins."
      />

      {templateUrl ? (
        <a
          href={templateUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-xs text-accent-hover transition hover:bg-accent-soft/80"
        >
          📄 Download the pitch deck template
        </a>
      ) : null}

      {closed ? <Alert tone="error">OC Round submissions are closed — the deadline has passed.</Alert> : null}

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

      {!closed && isLeader ? (
        <Card className="p-5 md:p-6">
          <p className="hud-label mb-4">UPLOAD</p>
          <Round1Form />
        </Card>
      ) : !closed ? (
        <Alert tone="info">Only your team leader can upload or replace the deck.</Alert>
      ) : null}
    </div>
  )
}
