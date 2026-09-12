"use client"

import { useActionState, useState } from "react"
import type { ProblemStatement } from "@/lib/database.types"
import { deleteProblemStatementAction, upsertProblemStatementAction } from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Button, Card, EmptyState, Input, Label, StatCard, Textarea } from "@/components/ui"

export function PsManager({ statements }: { statements: ProblemStatement[] }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(upsertProblemStatementAction, { ok: false })
  const [editing, setEditing] = useState<ProblemStatement | null>(null)

  const total = statements.length
  const active = statements.filter((s) => s.is_active).length
  const capacity = statements.reduce((a, s) => a + s.max_teams, 0)
  const taken = statements.reduce((a, s) => a + s.taken_count, 0)

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Problems" value={String(total)} sub="In the pool" />
        <StatCard label="Active" value={String(active)} sub="Rollable right now" />
        <StatCard label="Capacity" value={String(capacity)} sub="Total slots" />
        <StatCard label="Taken" value={String(taken)} sub="Slots locked by teams" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {statements.length === 0 ? (
          <EmptyState icon="◈" title="No problem statements" description="Add the first one — the roll button stays dead until then." />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800/70">
                    <th className="hud-label px-4 py-3">CODE</th>
                    <th className="hud-label px-4 py-3">TITLE</th>
                    <th className="hud-label px-4 py-3">TEAMS</th>
                    <th className="hud-label px-4 py-3">STATE</th>
                    <th className="hud-label px-4 py-3">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {statements.map((s) => {
                    const pct = s.max_teams > 0 ? Math.min(100, Math.round((s.taken_count / s.max_teams) * 100)) : 0
                    return (
                      <tr key={s.id} className="transition hover:bg-slate-900/30">
                        <td className="px-4 py-3 font-mono text-xs tracking-wide text-cyan-300">{s.code}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-100">{s.title}</p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{s.description || "No description"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-28">
                            <p className="font-mono text-xs tabular-nums text-slate-300">
                              {s.taken_count}/{s.max_teams}
                            </p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {s.is_active ? <Badge tone="green">active</Badge> : <Badge tone="slate">inactive</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setEditing(s)}>
                              Edit
                            </Button>
                            <form action={deleteProblemStatementAction}>
                              <input type="hidden" name="id" value={s.id} />
                              <SubmitButton
                                variant="danger"
                                size="sm"
                                confirm={
                                  s.taken_count > 0
                                    ? `${s.code} has ${s.taken_count} team(s) — deleting marks it inactive instead. Continue?`
                                    : `Delete ${s.code}? No teams are on it.`
                                }
                              >
                                Delete
                              </SubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="hud-label">{editing ? `EDIT ${editing.code}` : "NEW PROBLEM"}</p>
            {editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            ) : null}
          </div>
          <form key={editing?.id ?? "new"} action={formAction} className="space-y-4">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            {state.error ? <Alert tone="error">{state.error}</Alert> : null}
            {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
            <div>
              <Label htmlFor="ps-code">Code</Label>
              <Input id="ps-code" name="code" defaultValue={editing?.code ?? ""} required maxLength={20} placeholder="PS-01" />
            </div>
            <div>
              <Label htmlFor="ps-title">Title</Label>
              <Input id="ps-title" name="title" defaultValue={editing?.title ?? ""} required maxLength={200} placeholder="Reimagining campus food waste" />
            </div>
            <div>
              <Label htmlFor="ps-description">Description</Label>
              <Textarea id="ps-description" name="description" defaultValue={editing?.description ?? ""} maxLength={4000} placeholder="One tight paragraph teams see after rolling." />
            </div>
            <div>
              <Label htmlFor="ps-max">Max teams</Label>
              <Input id="ps-max" name="max_teams" type="number" min={1} max={500} defaultValue={editing?.max_teams ?? 10} />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing ? editing.is_active : true}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
              />
              Active (teams can roll it)
            </label>
            <SubmitButton pendingText="Saving…">{editing ? "Save changes" : "Add problem statement"}</SubmitButton>
          </form>
        </Card>
      </div>
    </div>
  )
}
