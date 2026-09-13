"use client"

import { useActionState, useState } from "react"
import type { Team, TeamMember } from "@/lib/database.types"
import { deleteTeamAction, resetTeamPasswordAction, updateTeamLeaderEmailAction } from "@/lib/actions/admin"
import type { ActionResult, ResetPasswordResult } from "@/lib/actions/admin"
import { CopyField } from "@/components/copy-field"
import { SubmitButton } from "@/components/submit-button"
import { Button, Input, StatusBadge } from "@/components/ui"

export function TeamRow({ team, psCode, createdAt }: { team: Team; psCode: string; createdAt: string }) {
  const [resetState, resetAction] = useActionState<ResetPasswordResult, FormData>(resetTeamPasswordAction, { ok: false })
  const [emailState, emailAction] = useActionState<ActionResult, FormData>(updateTeamLeaderEmailAction, { ok: false })
  const [editingEmail, setEditingEmail] = useState(false)
  const members = (team.members as TeamMember[] | null) ?? []

  return (
    <tr className="align-top transition hover:bg-white/[0.02]">
      <td className="px-4 py-3 font-mono text-xs tracking-wide text-accent-hover">{team.team_code}</td>
      <td className="px-4 py-3 font-medium text-foreground">{team.team_name}</td>
      <td className="px-4 py-3">
        {editingEmail ? (
          <form action={emailAction} className="flex min-w-56 items-center gap-2">
            <input type="hidden" name="teamId" value={team.id} />
            <Input name="email" type="email" defaultValue={team.leader_email} className="w-52 text-xs" aria-label="New leader email" required />
            <SubmitButton size="sm" pendingText="…">
              Save
            </SubmitButton>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingEmail(false)}>
              ✕
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{team.leader_email}</span>
            <Button variant="ghost" size="sm" onClick={() => setEditingEmail(true)} title="Change leader email">
              ✎
            </Button>
          </div>
        )}
        {emailState.ok && emailState.message ? (
          <p className="mt-1 text-xs text-emerald-300">{emailState.message}</p>
        ) : null}
        {!emailState.ok && emailState.error ? (
          <p className="mt-1 text-xs text-red-300">{emailState.error}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 tabular-nums text-foreground/80">{members.length}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted">{psCode}</td>
      <td className="px-4 py-3">
        <StatusBadge status={team.status} />
      </td>
      <td className="px-4 py-3 text-xs text-muted/70">{createdAt}</td>
      <td className="px-4 py-3">
        <div className="flex min-w-48 flex-col gap-2">
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
            <div className="space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5">
              <p className="text-xs text-emerald-300">{resetState.message ?? "New password:"}</p>
              <CopyField value={resetState.password} label="password" />
              <p className="text-[11px] text-muted/70">Shown once — copy it now.</p>
            </div>
          ) : null}
          {!resetState.ok && resetState.error ? <p className="text-xs text-red-300">{resetState.error}</p> : null}
        </div>
      </td>
    </tr>
  )
}
