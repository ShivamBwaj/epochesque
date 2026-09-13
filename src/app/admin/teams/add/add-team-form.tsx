"use client"

import { useActionState, useState } from "react"
import { addTeamManualAction } from "@/lib/actions/admin"
import type { AddTeamResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { CopyField } from "@/components/copy-field"
import { Alert, Button, Card, Input, Label } from "@/components/ui"

type ExtraMember = { name: string; email: string; phone: string; college: string }

export function AddTeamForm() {
  const [state, formAction] = useActionState<AddTeamResult, FormData>(addTeamManualAction, { ok: false })
  const [extras, setExtras] = useState<ExtraMember[]>([])

  const update = (i: number, patch: Partial<ExtraMember>) =>
    setExtras((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <div className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      {state.ok && state.password ? (
        <Card className="p-5">
          <Alert tone="success">
            {state.message} — give the password to the team leader now. It is shown only once (you can reset it later from the Teams page).
          </Alert>
          <div className="mt-4 space-y-3">
            <CopyField value={state.team_code ?? ""} label="team code" />
            <CopyField value={state.password} label="password" />
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Add another team
            </Button>
          </div>
        </Card>
      ) : (
        <form action={formAction} className="space-y-6">
          <Card className="p-5 md:p-6">
            <p className="hud-label mb-4">TEAM</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="teamName">Team name *</Label>
                <Input id="teamName" name="teamName" maxLength={120} placeholder="Team Volt" required />
              </div>
              <div>
                <Label htmlFor="teamCode">Team code (optional — auto-generated if blank)</Label>
                <Input id="teamCode" name="teamCode" maxLength={24} placeholder="T-101" />
              </div>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <p className="hud-label mb-4">LEADER (THIS IS THE LOGIN ACCOUNT)</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="leaderName">Leader name *</Label>
                <Input id="leaderName" name="leaderName" maxLength={120} placeholder="Full name" required />
              </div>
              <div>
                <Label htmlFor="leaderEmail">Leader email *</Label>
                <Input id="leaderEmail" name="leaderEmail" type="email" placeholder="leader@team.edu" required />
              </div>
              <div>
                <Label htmlFor="leaderPhone">Phone</Label>
                <Input id="leaderPhone" name="leaderPhone" maxLength={20} placeholder="Optional" />
              </div>
              <div>
                <Label htmlFor="leaderCollege">College</Label>
                <Input id="leaderCollege" name="leaderCollege" maxLength={120} placeholder="Optional" />
              </div>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <p className="hud-label mb-4">ADDITIONAL MEMBERS (OPTIONAL)</p>
            {extras.length === 0 ? (
              <p className="text-sm text-muted-foreground">No extra members yet.</p>
            ) : (
              <div className="space-y-3">
                {extras.map((m, i) => (
                  <div key={i} className="grid gap-3 rounded-lg border border-white/[0.06] bg-surface/50 p-3 md:grid-cols-[1fr_1fr_0.7fr_1fr_auto] md:items-end">
                    <div>
                      <Label htmlFor={`m-name-${i}`}>Name</Label>
                      <Input id={`m-name-${i}`} value={m.name} maxLength={120} onChange={(e) => update(i, { name: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor={`m-email-${i}`}>Email</Label>
                      <Input id={`m-email-${i}`} type="email" value={m.email} onChange={(e) => update(i, { email: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor={`m-phone-${i}`}>Phone</Label>
                      <Input id={`m-phone-${i}`} value={m.phone} maxLength={20} onChange={(e) => update(i, { phone: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor={`m-college-${i}`}>College</Label>
                      <Input id={`m-college-${i}`} value={m.college} maxLength={120} onChange={(e) => update(i, { college: e.target.value })} />
                    </div>
                    <Button type="button" variant="danger" size="sm" onClick={() => setExtras((xs) => xs.filter((_, j) => j !== i))}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setExtras((xs) => [...xs, { name: "", email: "", phone: "", college: "" }])}
              >
                + Add member
              </Button>
            </div>
            <input type="hidden" name="members" value={JSON.stringify(extras)} />
          </Card>

          <SubmitButton size="lg" pendingText="Creating team…">
            Create team & generate login
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
