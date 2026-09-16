"use client"

import { useActionState } from "react"
import {
  adminMoveTeamMemberAction,
  adminSetTeamLeaderAction,
  adminResetParticipantAccountAction,
  deleteTeamAction,
} from "@/lib/actions/admin"
import type { ActionResult, ResetPasswordResult } from "@/lib/actions/admin"
import type { RosterTeam } from "./page"
import { SubmitButton } from "@/components/submit-button"
import { Badge, Card, StatusBadge } from "@/components/ui"

const selectClass =
  "max-w-full truncate rounded-lg border border-white/[0.08] bg-surface/80 px-2 py-1 text-xs text-foreground focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"

export function TeamCard({
  team,
  teamOptions,
  presentByReg,
  onToggleOne,
  onToggleTeam,
}: {
  team: RosterTeam
  teamOptions: { id: string; label: string; size: number }[]
  presentByReg?: Map<string, boolean>
  onToggleOne?: (registrationId: string, present: boolean) => void
  onToggleTeam?: (registrationIds: string[], present: boolean) => void
}) {
  const [, moveAction] = useActionState<ActionResult, FormData>(async (_p, fd) => adminMoveTeamMemberAction(fd), { ok: false })
  const [, leaderAction] = useActionState<ActionResult, FormData>(async (_p, fd) => adminSetTeamLeaderAction(fd), { ok: false })
  const [resetState, resetAction] = useActionState<ResetPasswordResult, FormData>(adminResetParticipantAccountAction, { ok: false })

  const attendanceOn = !!presentByReg
  const presentCount = attendanceOn ? team.members.filter((m) => presentByReg!.get(m.registrationId)).length : 0
  const allPresent = attendanceOn && presentCount === team.members.length && team.members.length > 0

  return (
    <Card className={`p-4 ${team.members.length < 2 ? "border-amber-500/40" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-xs tracking-wide text-accent-hover">{team.team_code}</p>
          <p className="font-medium text-foreground">{team.team_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={team.status} />
          {team.members.length < 2 ? <Badge tone="amber">INCOMPLETE ({team.members.length}/4)</Badge> : <Badge tone="cyan">{team.members.length}/4</Badge>}
          {attendanceOn ? (
            <button
              type="button"
              onClick={() => onToggleTeam?.(team.members.map((m) => m.registrationId), !allPresent)}
              title={allPresent ? "Mark whole team absent" : "Mark whole team present"}
              className={`flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] transition ${
                allPresent
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                  : "border-white/[0.10] bg-white/[0.04] text-muted-foreground hover:border-accent/40 hover:text-accent-hover"
              }`}
            >
              ✓ {presentCount}/{team.members.length}
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted/70">PS: {team.psCode}</p>

      <ul className="mt-3 space-y-2">
        {team.members.map((m) => (
          <li key={m.registrationId} className="rounded-lg border border-white/[0.06] bg-surface/40 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {attendanceOn ? (
                  <input
                    type="checkbox"
                    checked={!!presentByReg!.get(m.registrationId)}
                    onChange={() => onToggleOne?.(m.registrationId, !presentByReg!.get(m.registrationId))}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
                    aria-label={`Present: ${m.name}`}
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm text-slate-100">
                    {m.name}
                    {m.role === "leader" ? <Badge tone="indigo">LEAD</Badge> : null}
                    {!m.hasAccount ? <Badge tone="amber">NO ACCOUNT</Badge> : null}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{m.regNo} · {m.email}</p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <form action={moveAction} className="flex items-center gap-1.5">
                <input type="hidden" name="registrationId" value={m.registrationId} />
                <select name="newTeamId" defaultValue="__noop__" className={selectClass} aria-label={`Move ${m.name}`}>
                  <option value="__noop__">Move to…</option>
                  <option value="__unassign__">Unassign</option>
                  {teamOptions.map((o) => (
                    <option key={o.id} value={o.id} disabled={o.size >= 4}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <SubmitButton size="sm" variant="secondary" pendingText="…">
                  Go
                </SubmitButton>
              </form>
              {m.role !== "leader" ? (
                <form action={leaderAction}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <input type="hidden" name="registrationId" value={m.registrationId} />
                  <SubmitButton size="sm" variant="secondary" pendingText="…">
                    Make leader
                  </SubmitButton>
                </form>
              ) : null}
              {m.hasAccount ? (
                <form action={resetAction}>
                  <input type="hidden" name="registrationId" value={m.registrationId} />
                  <SubmitButton
                    size="sm"
                    variant="secondary"
                    pendingText="…"
                    confirm={`Reset ${m.name}'s account? They'll need to sign up again at /login/setup.`}
                  >
                    Reset account
                  </SubmitButton>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {resetState.ok && resetState.message ? <p className="mt-2 text-xs text-emerald-300">{resetState.message}</p> : null}
      {!resetState.ok && resetState.error ? <p className="mt-2 text-xs text-red-300">{resetState.error}</p> : null}

      <form action={deleteTeamAction} className="mt-3">
        <input type="hidden" name="teamId" value={team.id} />
        <SubmitButton
          variant="danger"
          size="sm"
          confirm={`Delete ${team.team_code}? This wipes the team and its submission history. Members return to the unassigned pool. No undo.`}
        >
          Delete team
        </SubmitButton>
      </form>
    </Card>
  )
}
