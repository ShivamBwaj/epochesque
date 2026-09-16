"use client"

import { useActionState, useState } from "react"
import { adminWalkinTeamAction } from "@/lib/actions/admin"
import type { AdminCreateTeamResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { CopyField } from "@/components/copy-field"
import { Alert, Button, Card, Input, Label } from "@/components/ui"

type Person = { name: string; regNo: string; phone: string; email: string }

const EMPTY_PERSON: Person = { name: "", regNo: "", phone: "", email: "" }

export function AddTeamForm() {
  const [state, formAction] = useActionState<AdminCreateTeamResult, FormData>(adminWalkinTeamAction, { ok: false })
  const [teamName, setTeamName] = useState("")
  const [people, setPeople] = useState<Person[]>([{ ...EMPTY_PERSON }, { ...EMPTY_PERSON }])
  const [day, setDay] = useState<1 | 2>(1)

  const update = (i: number, patch: Partial<Person>) =>
    setPeople((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))

  return (
    <div className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      {state.ok && state.team_code ? (
        <Card className="p-5">
          <Alert tone="success">
            {state.message} Anyone with an email on file signs up themselves at{" "}
            <code className="font-mono text-accent-hover">/login/setup</code> with their registration number and email — no
            password to hand out. Members with no email yet can&apos;t self-signup until you add one.
          </Alert>
          <div className="mt-4">
            <CopyField value={state.team_code} label="team code" />
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Add another team
            </Button>
          </div>
        </Card>
      ) : (
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="day" value={day} />
          <Card className="p-5 md:p-6">
            <p className="hud-label mb-4">TEAM</p>
            <div>
              <Label htmlFor="teamName">Team name *</Label>
              <Input
                id="teamName"
                name="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                maxLength={120}
                placeholder="Team Volt"
                required
              />
            </div>
            <div className="mt-4">
              <Label>They&apos;re here now — mark present for</Label>
              <div className="flex gap-2">
                {[1, 2].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDay(d as 1 | 2)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${
                      day === d ? "border-accent/40 bg-accent-soft text-accent-hover" : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Day {d}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <p className="hud-label mb-4">MEMBERS (2-4)</p>
            <div className="space-y-3">
              {people.map((p, i) => (
                <div key={i} className="grid gap-3 rounded-lg border border-white/[0.06] bg-surface/50 p-3 md:grid-cols-[1fr_1fr_0.8fr_1fr_auto] md:items-end">
                  <div>
                    <Label htmlFor={`p-name-${i}`}>Name *</Label>
                    <Input id={`p-name-${i}`} value={p.name} maxLength={120} onChange={(e) => update(i, { name: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor={`p-regno-${i}`}>Reg no *</Label>
                    <Input id={`p-regno-${i}`} value={p.regNo} maxLength={30} onChange={(e) => update(i, { regNo: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor={`p-phone-${i}`}>Phone</Label>
                    <Input id={`p-phone-${i}`} value={p.phone} maxLength={20} onChange={(e) => update(i, { phone: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor={`p-email-${i}`}>Email (optional)</Label>
                    <Input id={`p-email-${i}`} type="email" value={p.email} onChange={(e) => update(i, { email: e.target.value })} />
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={people.length <= 2}
                    onClick={() => setPeople((ps) => ps.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={people.length >= 4}
                onClick={() => setPeople((ps) => [...ps, { ...EMPTY_PERSON }])}
              >
                + Add member
              </Button>
            </div>
            <input type="hidden" name="people" value={JSON.stringify(people)} />
          </Card>

          <SubmitButton size="lg" pendingText="Creating team…">
            Register &amp; create team
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
