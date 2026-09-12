"use client"

import { useActionState } from "react"
import { TEAM_STATUSES } from "@/lib/database.types"
import type { Team, TeamMember } from "@/lib/database.types"
import { deleteTeamAction, resetTeamPasswordAction, updateTeamStatusAction } from "@/lib/actions/admin"
import type { ResetPasswordResult } from "@/lib/actions/admin"
import { CopyField } from "@/components/copy-field"
import { SubmitButton } from "@/components/submit-button"
import { Select, StatusBadge } from "@/components/ui"

export function TeamRow({ team, psCode, createdAt }: { team: Team; psCode: string; createdAt: string }) {
  const [resetState, resetAction] = useActionState<ResetPasswordResult, FormData>(resetTeamPasswordAction, { ok: false })
  const members = (team.members as TeamMember[] | null) ?? []

  return (
    <tr className="align-top transition hover:bg-slate-900/30">
      <td className="px-4 py-3 font-mono text-xs tracking-wide text-cyan-300">{team.team_code}</td>
      <td className="px-4 py-3 font-medium text-slate-100">{team.team_name}</td>
      <td className="px-4 py-3 text-slate-400">{team.leader_email}</td>
      <td className="px-4 py-3 tabular-nums text-slate-300">{members.length}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-400">{psCode}</td>
      <td className="px-4 py-3">
        <StatusBadge status={team.status} />
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">{createdAt}</td>
      <td className="px-4 py-3">
        <div className="flex min-w-56 flex-col gap-2">
          <form action={updateTeamStatusAction}>
            <input type="hidden" name="teamId" value={team.id} />
            <Select
              name="status"
              defaultValue={team.status}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="w-40 text-xs"
              aria-label={`Status for ${team.team_code}`}
            >
              {TEAM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </form>
          <div className="flex flex-wrap gap-2">
            <form action={resetAction}>
              <input type="hidden" name="teamId" value={team.id} />
              <SubmitButton variant="secondary" size="sm" pendingText="Resetting…">
                Reset password
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
          </div>
          {resetState.ok && resetState.password ? (
            <div className="space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5">
              <p className="text-xs text-emerald-300">{resetState.message ?? "New password:"}</p>
              <CopyField value={resetState.password} label="password" />
              <p className="text-[11px] text-slate-500">Shown once — copy it now.</p>
            </div>
          ) : null}
          {!resetState.ok && resetState.error ? <p className="text-xs text-red-300">{resetState.error}</p> : null}
        </div>
      </td>
    </tr>
  )
}
