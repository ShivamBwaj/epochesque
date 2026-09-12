"use client"

import { useActionState } from "react"
import { saveScoresAction, setLeaderboardPublishedAction } from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Card, EmptyState, Input } from "@/components/ui"

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
  const scored = teams.filter((t) => t.id in existing).length

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

      {teams.length === 0 ? (
        <EmptyState icon="◇" title="No teams to score" description="Import teams first." />
      ) : (
        <form action={formAction}>
          <input type="hidden" name="round" value={round} />
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800/70">
                    <th className="hud-label px-4 py-3">CODE</th>
                    <th className="hud-label px-4 py-3">TEAM</th>
                    <th className="hud-label px-4 py-3">SCORE</th>
                    <th className="hud-label px-4 py-3">NOTES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {teams.map((t) => {
                    const ex = existing[t.id]
                    return (
                      <tr key={t.id} className="transition hover:bg-slate-900/30">
                        <td className="px-4 py-2.5 font-mono text-xs tracking-wide text-cyan-300">{t.team_code}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-100">{t.team_name}</td>
                        <td className="px-4 py-2.5">
                          <Input
                            type="number"
                            step="0.5"
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
            <span className="text-xs text-slate-500">
              {scored}/{teams.length} scored
            </span>
          </div>
        </form>
      )}
    </div>
  )
}
