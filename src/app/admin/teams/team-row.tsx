"use client"

import { useActionState, useState } from "react"
import type { Team, TeamMember } from "@/lib/database.types"
import { deleteTeamAction, resetTeamPasswordAction, updateTeamLeaderEmailAction } from "@/lib/actions/admin"
import type { ActionResult, ResetPasswordResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Badge, StatusBadge } from "@/components/ui"

const selectClass =
  "max-w-full truncate rounded-lg border border-white/[0.08] bg-surface/80 px-2.5 py-1.5 text-xs text-foreground focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"

export function TeamRow({ team, psCode }: { team: Team; psCode: string }) {
  const [resetState, resetAction] = useActionState<ResetPasswordResult, FormData>(resetTeamPasswordAction, { ok: false })
  const [emailState, emailAction] = useActionState<ActionResult, FormData>(updateTeamLeaderEmailAction, { ok: false })
  const [picked, setPicked] = useState(team.leader_email)
  const members = (team.members as TeamMember[] | null) ?? []
  const options = Array.from(
    new Map(
      members
        .filter((m) => m.email && m.email.trim())
        .map((m) => [m.email as string, { name: m.name, email: m.email as string }])
    ).values()
  )

  return (
    <tr className="align-top transition hover:bg-white/[0.02]">
      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs tracking-wide text-accent-hover">{team.team_code}</td>
      <td className="px-3 py-3">
        <p className="max-w-44 truncate font-medium text-foreground" title={team.team_name}>
          {team.team_name}
        </p>
        <p className="mt-0.5 text-[11px] text-muted/70">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
      </td>
      <td className="px-3 py-3">
        {options.length > 0 ? (
          <form action={emailAction} className="flex max-w-64 items-center gap-1.5">
            <input type="hidden" name="teamId" value={team.id} />
            <select
              name="email"
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              className={selectClass}
              aria-label={`Leader for ${team.team_code}`}
            >
              {options.map((o) => (
                <option key={o.email} value={o.email}>
                  {o.name} — {o.email}
                </option>
              ))}
            </select>
            <SubmitButton size="sm" pendingText="…" disabled={picked === team.leader_email} title="Make the selected member the leader">
              Set
            </SubmitButton>
          </form>
        ) : (
          <span className="break-all text-xs text-muted-foreground">{team.leader_email}</span>
        )}
        <div className="mt-1">
          {team.password_set ? (
            <Badge tone="green">password set</Badge>
          ) : (
            <Badge tone="amber">awaiting first login</Badge>
          )}
        </div>
        {emailState.ok && emailState.message ? (
          <p className="mt-1 text-xs text-emerald-300">{emailState.message}</p>
        ) : null}
        {!emailState.ok && emailState.error ? (
          <p className="mt-1 text-xs text-red-300">{emailState.error}</p>
        ) : null}
      </td>
      <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-xs text-muted md:table-cell">{psCode}</td>
      <td className="hidden px-3 py-3 md:table-cell">
        <StatusBadge status={team.status} />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1.5">
          <form action={resetAction}>
            <input type="hidden" name="teamId" value={team.id} />
            <SubmitButton variant="secondary" size="sm" pendingText="Resetting…">
              Reset pw
            </SubmitButton>
          </form>
          <form action={deleteTeamAction}>
            <input type="hidden" name="teamId" value={team.id} />
            <SubmitButton
              variant="danger"
              size="sm"
              confirm={`Delete ${team.team_code}? This wipes the team, its submission history, and its login. No undo.`}
            >
              Delete
            </SubmitButton>
          </form>
          {resetState.ok && resetState.message ? (
            <div className="w-72 max-w-[90vw] rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
              <p className="text-xs text-emerald-300">{resetState.message}</p>
            </div>
          ) : null}
          {!resetState.ok && resetState.error ? <p className="text-xs text-red-300">{resetState.error}</p> : null}
        </div>
      </td>
    </tr>
  )
}
