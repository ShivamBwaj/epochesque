"use client"

import { useActionState } from "react"
import type { EventTiming } from "@/lib/database.types"
import { saveSettingsAction } from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Card, Input, Label } from "@/components/ui"

function toLocal(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("sv-SE").slice(0, 16) : ""
}

export function SettingsForm({ timing }: { timing: EventTiming }) {
  const [state, formAction] = useActionState<ActionResult, FormData>(saveSettingsAction, { ok: false })

  const fields: { name: keyof EventTiming; label: string; help: string }[] = [
    { name: "event_start", label: "Event start", help: "Drives the landing page countdown." },
    { name: "ps_release_at", label: "Problem statements release", help: "Gates the roll button on team dashboards." },
    { name: "round1_deadline", label: "Round 1 deadline", help: "Gates Round 1 deck submissions." },
    { name: "final_deadline", label: "Final round deadline", help: "Gates final round repo submissions." },
    { name: "event_end", label: "Event end", help: "Informational — the closing time of Epochesque." },
  ]

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <Card className="p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name}>
              <Label htmlFor={f.name}>{f.label}</Label>
              <Input id={f.name} name={f.name} type="datetime-local" defaultValue={toLocal(timing[f.name])} />
              <p className="mt-1.5 text-xs text-slate-500">{f.help}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="Saving…">Save timing</SubmitButton>
          <span className="text-xs text-slate-500">Clear a field and save to unset it. Times are in your local timezone.</span>
        </div>
      </Card>
    </form>
  )
}
