"use client"

import { useActionState, useState } from "react"
import {
  connectScoresSheetsWebhookAction,
  disconnectScoresSheetsWebhookAction,
  resyncScoresToSheetsAction,
} from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Card } from "@/components/ui"

export function ScoringSheetConnect({ round, connected: initiallyConnected }: { round: string; connected: boolean }) {
  const [connectState, connectAction] = useActionState<ActionResult, FormData>(connectScoresSheetsWebhookAction, { ok: false })
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const connected = !manuallyDisconnected && (initiallyConnected || connectState.ok)

  async function disconnect() {
    if (!window.confirm("Disconnect this Google Sheet? Scores stop mirroring until you connect one again.")) return
    setManuallyDisconnected(true)
    await disconnectScoresSheetsWebhookAction()
  }

  async function resync() {
    setSyncing(true)
    setSyncMsg(null)
    const res = await resyncScoresToSheetsAction(round)
    setSyncing(false)
    setSyncMsg(res.ok ? "Sheet re-synced." : res.error ?? "Sync failed.")
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {connected ? (
          <>
            <button
              type="button"
              onClick={resync}
              disabled={syncing}
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "⟳ Re-sync Google Sheet"}
            </button>
            <button
              type="button"
              onClick={disconnect}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
            >
              Disconnect sheet
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-xs text-accent-hover transition hover:bg-accent-soft/80"
          >
            🔗 Connect Google Sheet for scores
          </button>
        )}
      </div>

      {showForm && !connected ? (
        <Card className="p-4">
          <form action={connectAction} className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="scoresWebhookUrl" className="mb-1 block text-xs font-medium text-muted-foreground">
                Google Apps Script web app URL
              </label>
              <input
                id="scoresWebhookUrl"
                name="webhookUrl"
                type="url"
                required
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full rounded-lg border border-white/[0.08] bg-surface/80 px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent/50 focus:outline-none"
              />
            </div>
            <SubmitButton pendingText="Connecting…">Connect</SubmitButton>
          </form>
          {connectState.error ? <p className="mt-2 text-xs text-red-400">{connectState.error}</p> : null}
          <p className="mt-2 text-xs text-muted/60">
            Deploy the sheet&apos;s Apps Script as a web app (Execute as: Me, Access: Anyone), paste the /exec URL here.
            See <code className="text-muted-foreground">docs/scores-google-sheet.md</code> for the exact script.
          </p>
        </Card>
      ) : null}

      {connectState.ok && connectState.message ? <Alert tone="success">{connectState.message}</Alert> : null}
      {syncMsg ? <Alert tone={syncMsg.startsWith("Sheet re-synced") ? "success" : "error"}>{syncMsg}</Alert> : null}
    </div>
  )
}
