"use client"

import { useActionState, useMemo, useState } from "react"
import { adminMoveTeamMemberAction, adminCreateTeamAction, adminAddRegistrationAction } from "@/lib/actions/admin"
import type { ActionResult, AdminCreateTeamResult, AddRegistrationResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Card, EmptyState, Input, Label } from "@/components/ui"

interface UnassignedPerson {
  id: string
  regNo: string
  name: string
  email: string
  hasAccount: boolean
}

const selectClass =
  "max-w-full truncate rounded-lg border border-white/[0.08] bg-surface/80 px-2 py-1 text-xs text-foreground focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"

export function UnassignedPanel({
  people,
  teamOptions,
  presentByReg,
  onToggleOne,
}: {
  people: UnassignedPerson[]
  teamOptions: { id: string; label: string; size: number }[]
  presentByReg?: Map<string, boolean>
  onToggleOne?: (registrationId: string, present: boolean) => void
}) {
  const attendanceOn = !!presentByReg
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [, moveAction] = useActionState<ActionResult, FormData>(async (_p, fd) => adminMoveTeamMemberAction(fd), { ok: false })
  const [createState, createFormAction] = useActionState<AdminCreateTeamResult, FormData>(adminCreateTeamAction, { ok: false })
  const [addState, addFormAction] = useActionState<AddRegistrationResult, FormData>(adminAddRegistrationAction, { ok: false })
  const [teamName, setTeamName] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => p.name.toLowerCase().includes(q) || p.regNo.toLowerCase().includes(q))
  }, [people, query])

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 4 ? s : [...s, id]))
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="hud-label">UNASSIGNED REGISTRANTS ({people.length})</p>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="text-xs text-accent-hover hover:underline"
        >
          {showAddForm ? "Close" : "+ Register someone new"}
        </button>
      </div>

      {showAddForm ? (
        <form action={addFormAction} className="mt-3 grid gap-3 rounded-lg border border-white/[0.08] bg-surface/40 p-3 md:grid-cols-4">
          {addState.error ? <div className="md:col-span-4"><Alert tone="error">{addState.error}</Alert></div> : null}
          {addState.ok && addState.message ? <div className="md:col-span-4"><Alert tone="success">{addState.message}</Alert></div> : null}
          <div>
            <Label htmlFor="add-name">Name</Label>
            <Input id="add-name" name="name" maxLength={120} required />
          </div>
          <div>
            <Label htmlFor="add-regno">Reg no</Label>
            <Input id="add-regno" name="regNo" maxLength={30} required />
          </div>
          <div>
            <Label htmlFor="add-phone">Phone</Label>
            <Input id="add-phone" name="phone" maxLength={20} />
          </div>
          <div>
            <Label htmlFor="add-email">Email (optional)</Label>
            <Input id="add-email" name="email" type="email" />
          </div>
          <div className="md:col-span-4">
            <SubmitButton size="sm" pendingText="Registering…">Register</SubmitButton>
          </div>
        </form>
      ) : null}

      <div className="mt-4">
        <Input placeholder="Search by name or reg no" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon="◇" title="Nobody unassigned" description="Everyone in this list is already on a team." />
        </div>
      ) : (
        <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
          {filtered.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] px-3 py-2">
              <label className="flex min-w-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => {
                    const willSelect = !selected.includes(p.id)
                    toggle(p.id)
                    if (willSelect && attendanceOn) onToggleOne?.(p.id, true)
                  }}
                  disabled={!selected.includes(p.id) && selected.length >= 4}
                  aria-label={`Pick ${p.name} for a new team (also marks present)`}
                  title="Pick for new team — also marks present"
                  className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
                />
                <span className="truncate text-slate-100">{p.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{p.regNo}</span>
                {attendanceOn && presentByReg!.get(p.id) ? <Badge tone="green">PRESENT</Badge> : null}
                {!p.hasAccount ? <Badge tone="amber">NO ACCOUNT</Badge> : null}
              </label>
              {teamOptions.length > 0 ? (
                <form action={moveAction} className="flex items-center gap-1.5">
                  <input type="hidden" name="registrationId" value={p.id} />
                  <select name="newTeamId" defaultValue="__noop__" className={selectClass} aria-label={`Add ${p.name} to a team`}>
                    <option value="__noop__">Add to team…</option>
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
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {selected.length >= 1 ? (
        <form action={createFormAction} className="mt-4 rounded-lg border border-accent/25 bg-accent-soft p-3">
          {createState.error ? <Alert tone="error">{createState.error}</Alert> : null}
          <p className="hud-label mb-2">CREATE TEAM FROM SELECTION ({selected.length + 0}/4 selected)</p>
          <input type="hidden" name="registrationIds" value={JSON.stringify(selected)} />
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={teamName}
              name="teamName"
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="max-w-xs"
              required
            />
            <SubmitButton size="sm" disabled={selected.length < 2} pendingText="Creating…">
              Create team ({selected.length})
            </SubmitButton>
            <button type="button" onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:text-foreground">
              Clear selection
            </button>
          </div>
          {selected.length < 2 ? <p className="mt-1.5 text-[11px] text-amber-300">Pick at least 2 people.</p> : null}
        </form>
      ) : null}
    </Card>
  )
}
