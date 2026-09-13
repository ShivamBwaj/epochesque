"use client"

import { useActionState, useRef, useState } from "react"
import { parseScoresCsv } from "@/lib/csv"
import type { ParsedScoreRow } from "@/lib/csv"
import { saveScoresAction, setLeaderboardPublishedAction, importScoresAction } from "@/lib/actions/admin"
import type { ActionResult, ImportScoresResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Button, Card, EmptyState, Input } from "@/components/ui"

type ScoringTeam = { id: string; team_code: string; team_name: string }

export function ScoringGrid({
  teams,
  existing,
  round,
  isPublished,
}: {
  teams: ScoringTeam[]
  existing: Record<string, { total_score: number; notes: string }>
  round: string
  isPublished: boolean
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(saveScoresAction, { ok: false })
  const [importState, importAction] = useActionState<ImportScoresResult, FormData>(importScoresAction, { ok: false })
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<ParsedScoreRow[] | null>(null)
  const [importInvalid, setImportInvalid] = useState<{ line: number; text: string; reason: string }[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scored = teams.filter((t) => t.id in existing).length

  const onImportFile = (file: File | undefined) => {
    setImportError(null)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = parseScoresCsv(String(reader.result ?? ""))
      if (res.rows.length === 0 && res.invalid.length > 0) {
        setImportRows(null)
        setImportInvalid(res.invalid)
        return
      }
      setImportRows(res.rows)
      setImportInvalid(res.invalid)
    }
    reader.onerror = () => setImportError("Could not read the file. Save it as CSV UTF-8 and try again.")
    reader.readAsText(file)
  }

  const resetImport = () => {
    setImportRows(null)
    setImportInvalid([])
    setImportError(null)
    setShowImport(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="hud-label">LEADERBOARD · {round === "final" ? "FINAL" : "ROUND 1"}</p>
            {isPublished ? <Badge tone="green">published</Badge> : <Badge tone="slate">unpublished</Badge>}
          </div>
          {isPublished ? (
            <form action={setLeaderboardPublishedAction}>
              <input type="hidden" name="round" value={round} />
              <input type="hidden" name="published" value="false" />
              <SubmitButton variant="secondary" size="sm" pendingText="Unpublishing…">
                Unpublish
              </SubmitButton>
            </form>
          ) : (
            <form action={setLeaderboardPublishedAction}>
              <input type="hidden" name="round" value={round} />
              <input type="hidden" name="published" value="true" />
              <SubmitButton size="sm" confirm="Publish this leaderboard to the public site?" pendingText="Publishing…">
                Publish
              </SubmitButton>
            </form>
          )}
        </div>
        <p className="mt-3 text-xs text-amber-300/90">
          Unpublish before editing published scores — corrections must never happen silently behind a live leaderboard.
        </p>
      </Card>

      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {importState.error ? <Alert tone="error">{importState.error}</Alert> : null}
      {importState.ok && importState.message ? <Alert tone="success">{importState.message}</Alert> : null}
      {importState.errors && importState.errors.length > 0 ? (
        <Alert tone="error">
          <p className="mb-1 font-medium">Skipped rows:</p>
          <ul className="list-inside list-disc space-y-0.5">
            {importState.errors.slice(0, 10).map((e, i) => (
              <li key={i} className="text-xs">{e}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="hud-label">BULK IMPORT</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste the judges&apos; Google Form summary as CSV: <code className="font-mono text-accent-hover">team_code, score, notes</code>
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowImport((s) => !s)}>
            {showImport ? "Hide" : "Import scores from CSV"}
          </Button>
        </div>

        {showImport ? (
          <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
            {isPublished ? (
              <Alert tone="error">This leaderboard is live. Unpublish before importing scores.</Alert>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => onImportFile(e.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-accent-hover"
            />
            {importError ? <Alert tone="error">{importError}</Alert> : null}
            {importInvalid.length > 0 ? (
              <Alert tone="error">
                <p className="mb-1 font-medium">Rejected lines:</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {importInvalid.slice(0, 10).map((v, i) => (
                    <li key={i} className="text-xs">Line {v.line}: {v.reason}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            {importRows && importRows.length > 0 ? (
              <form action={importAction}>
                <input type="hidden" name="round" value={round} />
                <input type="hidden" name="rows" value={JSON.stringify(importRows)} />
                <div className="mb-4 max-h-56 overflow-auto rounded-lg border border-white/[0.06]">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="border-b border-white/[0.08]">
                        <th className="hud-label px-3 py-2">TEAM CODE</th>
                        <th className="hud-label px-3 py-2">SCORE</th>
                        <th className="hud-label px-3 py-2">NOTES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {importRows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 font-mono text-xs text-accent-hover">{r.team_code}</td>
                          <td className="px-3 py-1.5 font-mono text-xs">{r.score}</td>
                          <td className="max-w-xs truncate px-3 py-1.5 text-xs text-muted">{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-3">
                  <SubmitButton size="sm" pendingText="Importing…">
                    Import {importRows.length} score{importRows.length === 1 ? "" : "s"}
                  </SubmitButton>
                  <Button type="button" variant="ghost" size="sm" onClick={resetImport}>
                    Clear
                  </Button>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
      </Card>

      {teams.length === 0 ? (
        <EmptyState icon="◇" title="No teams to score" description="Import teams first." />
      ) : (
        <form action={formAction}>
          <input type="hidden" name="round" value={round} />
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="hud-label px-4 py-3">CODE</th>
                    <th className="hud-label px-4 py-3">TEAM</th>
                    <th className="hud-label px-4 py-3">SCORE</th>
                    <th className="hud-label px-4 py-3">NOTES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {teams.map((t) => {
                    const ex = existing[t.id]
                    return (
                      <tr key={t.id} className="transition hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 font-mono text-xs tracking-wide text-accent-hover">{t.team_code}</td>
                        <td className="px-4 py-2.5 font-medium text-foreground">
                          <span className="block max-w-48 truncate" title={t.team_name}>{t.team_name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            min={0}
                            max={10000}
                            name={`score_${t.id}`}
                            defaultValue={ex ? String(ex.total_score) : ""}
                            className="w-24"
                            placeholder="—"
                            aria-label={`Score for ${t.team_code}`}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <Input
                            name={`notes_${t.id}`}
                            defaultValue={ex?.notes ?? ""}
                            maxLength={500}
                            placeholder="Judge notes (shown on the leaderboard)"
                            aria-label={`Notes for ${t.team_code}`}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SubmitButton pendingText="Saving…">Save {round === "final" ? "final" : "round 1"} scores</SubmitButton>
            <span className="text-xs text-muted">
              {scored}/{teams.length} scored
            </span>
          </div>
        </form>
      )}
    </div>
  )
}
