import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { getEventTiming } from "@/lib/settings"
import { createClient } from "@/lib/supabase/server"
import type { TeamMember } from "@/lib/database.types"
import { Badge, Card, EmptyState, LinkButton, SectionHeading, StatCard } from "@/components/ui"
import { Countdown } from "@/components/countdown"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Overview",
}

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"
}

export default async function DashboardOverviewPage() {
  const { team } = await requireTeamPage()
  const timing = await getEventTiming()
  const supabase = await createClient()
  const { data: submissions } = await supabase.from("submissions").select("*").eq("team_id", team.id)
  const round1 = (submissions ?? []).find((s) => s.round === "round1") ?? null
  const final = (submissions ?? []).find((s) => s.round === "final") ?? null
  const members = (team.members as TeamMember[] | null) ?? []

  let deadlineTarget: string | null = null
  let deadlineLabel = ""
  let activeStage = true
  if (team.status === "registered" || team.status === "round1") {
    deadlineTarget = timing.round1_deadline
    deadlineLabel = "ROUND 1 CLOSES IN"
  } else if (team.status === "advanced" || team.status === "finalist") {
    deadlineTarget = timing.final_deadline
    deadlineLabel = "FINAL ROUND CLOSES IN"
  } else {
    activeStage = false
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MISSION CONTROL"
        title="Overview"
        description="Everything your squad needs for the run: your problem, your submissions, and the clock."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team Code" value={team.team_code} sub="Your identity across Epoch" />
        <StatCard label="Status" value={team.status.toUpperCase()} sub="Current stage" />
        <StatCard label="Members" value={String(members.length)} sub="Registered squad size" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-hover p-5">
          <p className="hud-label">PROBLEM STATEMENT</p>
          {team.problem_statement_id ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Badge tone="green">LOCKED</Badge>
                <span className="text-sm text-slate-300">Your fate is sealed.</span>
              </div>
              <LinkButton href="/dashboard/problem-statement" variant="secondary" size="sm">
                View problem statement
              </LinkButton>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-300">Not rolled yet — the dice are waiting.</p>
              <LinkButton href="/dashboard/problem-statement" size="sm">
                🎲 Roll your problem statement
              </LinkButton>
            </div>
          )}
        </Card>

        <Card className="card-hover p-5">
          <p className="hud-label">ROUND 1 SUBMISSION</p>
          {round1 ? (
            <div className="mt-3 space-y-1">
              <p className="truncate font-mono text-sm text-cyan-200">{round1.file_name ?? "deck"}</p>
              <p className="text-xs text-slate-500">
                {((round1.file_size ?? 0) / 1048576).toFixed(1)} MB · {fmt(round1.submitted_at)}
              </p>
              <div className="pt-2">
                <LinkButton href="/dashboard/submit/round1" variant="secondary" size="sm">
                  Manage submission
                </LinkButton>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-300">No deck uploaded yet.</p>
              <LinkButton href="/dashboard/submit/round1" variant="secondary" size="sm">
                Submit Round 1 deck
              </LinkButton>
            </div>
          )}
        </Card>

        <Card className="card-hover p-5">
          <p className="hud-label">FINAL ROUND SUBMISSION</p>
          {team.status !== "advanced" && team.status !== "finalist" ? (
            <p className="mt-3 text-sm text-slate-500">Only shortlisted teams advance to the final round.</p>
          ) : final ? (
            <div className="mt-3 space-y-1">
              {final.url ? (
                <a
                  href={final.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-sm text-cyan-200 underline-offset-4 hover:underline"
                >
                  {final.url}
                </a>
              ) : null}
              <p className="text-xs text-slate-500">Submitted {fmt(final.submitted_at)}</p>
              <div className="pt-2">
                <LinkButton href="/dashboard/submit/final" variant="secondary" size="sm">
                  Manage submission
                </LinkButton>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-300">No repo linked yet.</p>
              <LinkButton href="/dashboard/submit/final" variant="secondary" size="sm">
                Submit final repo
              </LinkButton>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <p className="hud-label">DEADLINE</p>
          <div className="mt-4">
            {activeStage ? (
              <Countdown target={deadlineTarget} label={deadlineLabel} pastLabel="CLOSED" />
            ) : (
              <p className="text-sm text-slate-500">No active deadline — your run this season has ended.</p>
            )}
          </div>
        </Card>

        <Card className="p-5 md:col-span-2">
          <p className="hud-label">SQUAD</p>
          {members.length === 0 ? (
            <div className="mt-3">
              <EmptyState icon="◈" title="No members recorded" description="If this looks wrong, ping the organizers." />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800/60">
              {members.map((m, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-100">
                      <span className="truncate">{m.name}</span>
                      {m.email === team.leader_email ? <Badge tone="indigo">LEAD</Badge> : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {m.email ?? "no email"}
                      {m.college ? ` · ${m.college}` : ""}
                    </p>
                  </div>
                  {m.payment_status ? (
                    <Badge tone={m.payment_status.toLowerCase() === "paid" ? "green" : "amber"}>
                      {m.payment_status.toUpperCase()}
                    </Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-600">Something off in your squad list? Ping the organizers at the help desk.</p>
        </Card>
      </div>
    </div>
  )
}
