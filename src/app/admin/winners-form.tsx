"use client"

import { useActionState, useState } from "react"
import type { WinnersEntry } from "@/lib/database.types"
import { saveWinnersAction } from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Button, Card, Input, Label } from "@/components/ui"

type Row = { position: string; team_code: string; team_name: string; prize: string }

function toRows(entries: WinnersEntry[]): Row[] {
  return entries.map((e) => ({
    position: String(e.position ?? ""),
    team_code: e.team_code ?? "",
    team_name: e.team_name ?? "",
    prize: e.prize ?? "",
  }))
}

function toEntries(rows: Row[]): WinnersEntry[] {
  return rows
    .filter((r) => r.team_code.trim() && r.team_name.trim())
    .map((r, i) => ({
      position: Number(r.position) || i + 1,
      team_code: r.team_code.trim(),
      team_name: r.team_name.trim(),
      prize: r.prize.trim() || undefined,
    }))
}

export function WinnersForm({
  initialTitle,
  initialEntries,
  isPublished,
}: {
  initialTitle: string
  initialEntries: WinnersEntry[]
  isPublished: boolean
}) {
  const [title, setTitle] = useState(initialTitle)
  const [rows, setRows] = useState<Row[]>(toRows(initialEntries))
  const [state, formAction] = useActionState<ActionResult, FormData>(saveWinnersAction, { ok: false })

  const entriesJson = JSON.stringify(toEntries(rows))
  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="hud-label">CURRENT STATE</p>
        <div className="flex items-center gap-2">
          {isPublished ? <Badge tone="green">published — live on /leaderboard</Badge> : <Badge tone="slate">draft — not public</Badge>}
        </div>
      </Card>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <Card className="p-5 md:p-6">
        <div className="space-y-5">
          <div>
            <Label htmlFor="winners-title">Title</Label>
            <Input
              id="winners-title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Winners"
            />
          </div>

          <div className="space-y-3">
            <p className="hud-label">PODIUM ENTRIES</p>
            {rows.length === 0 ? (
              <p className="text-sm text-slate-500">No entries yet — add the first winner.</p>
            ) : null}
            {rows.map((r, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800/60 bg-slate-950/40 p-3 md:grid-cols-[5rem_9rem_minmax(0,1fr)_minmax(0,10rem)_auto] md:items-end"
              >
                <div>
                  <Label htmlFor={`pos-${i}`}>Position</Label>
                  <Input id={`pos-${i}`} type="number" min={1} value={r.position} onChange={(e) => update(i, { position: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`code-${i}`}>Team code</Label>
                  <Input id={`code-${i}`} value={r.team_code} maxLength={30} onChange={(e) => update(i, { team_code: e.target.value })} placeholder="T-01" />
                </div>
                <div>
                  <Label htmlFor={`name-${i}`}>Team name</Label>
                  <Input id={`name-${i}`} value={r.team_name} maxLength={120} onChange={(e) => update(i, { team_name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor={`prize-${i}`}>Prize</Label>
                  <Input id={`prize-${i}`} value={r.prize} maxLength={120} onChange={(e) => update(i, { prize: e.target.value })} placeholder="₹20,000" />
                </div>
                <div className="flex items-end justify-end md:pb-0.5">
                  <Button type="button" variant="danger" size="sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRows((rs) => [...rs, { position: String(rs.length + 1), team_code: "", team_name: "", prize: "" }])}
            >
              + Add entry
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/60 pt-5">
            <form action={formAction}>
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="entries" value={entriesJson} />
              <input type="hidden" name="publish" value="false" />
              <SubmitButton variant="secondary" pendingText="Saving…">
                Save draft
              </SubmitButton>
            </form>
            <form action={formAction}>
              <input type="hidden" name="title" value={title} />
              <input type="hidden" name="entries" value={entriesJson} />
              <input type="hidden" name="publish" value="true" />
              <SubmitButton confirm="Publish the winners to the public leaderboard?" pendingText="Publishing…">
                Save &amp; publish
              </SubmitButton>
            </form>
            {isPublished ? (
              <form action={formAction}>
                <input type="hidden" name="title" value={initialTitle} />
                <input type="hidden" name="entries" value={JSON.stringify(initialEntries)} />
                <input type="hidden" name="publish" value="false" />
                <SubmitButton variant="danger" confirm="Take the winners announcement offline?" pendingText="Unpublishing…">
                  Unpublish
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}
