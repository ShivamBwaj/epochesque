"use client"

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  connectSheetsWebhookAction,
  disconnectSheetsWebhookAction,
  fetchAttendanceStateAction,
  resyncAttendanceToSheetsAction,
  setAttendanceMemberAction,
  setAttendanceTeamAction,
  type AttendanceMemberState,
  type ConnectSheetsResult,
} from "@/lib/actions/attendance"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Card } from "@/components/ui"

const POLL_MS = 2500

interface TeamGroup {
  teamId: string
  teamCode: string
  teamName: string
  members: AttendanceMemberState[]
}

export function AttendanceBoard({
  day,
  initialMembers,
  sheetsConfigured,
}: {
  day: number
  initialMembers: AttendanceMemberState[]
  sheetsConfigured: boolean
}) {
  const [members, setMembers] = useState<AttendanceMemberState[]>(initialMembers)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false)
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [connectState, connectAction] = useActionState<ConnectSheetsResult, FormData>(connectSheetsWebhookAction, { ok: false })
  const connected = !manuallyDisconnected && (sheetsConfigured || connectState.ok)
  const pendingRef = useRef<Map<string, boolean>>(new Map())

  async function disconnectSheet() {
    if (!window.confirm("Disconnect this Google Sheet? Live sync stops until you connect one again.")) return
    setManuallyDisconnected(true)
    await disconnectSheetsWebhookAction()
  }

  const applyServerState = useCallback((server: AttendanceMemberState[]) => {
    const pending = pendingRef.current
    setMembers(
      server.map((m) => {
        const key = `${m.teamId}|${m.memberKey}`
        return pending.has(key) ? { ...m, present: pending.get(key)! } : m
      })
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      if (cancelled || document.hidden) return
      const res = await fetchAttendanceStateAction(day)
      if (!cancelled && res.ok && res.members) applyServerState(res.members)
    }
    const id = setInterval(tick, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [day, applyServerState])

  const groups = useMemo(() => {
    const map = new Map<string, TeamGroup>()
    for (const m of members) {
      const g = map.get(m.teamId) ?? { teamId: m.teamId, teamCode: m.teamCode, teamName: m.teamName, members: [] }
      g.members.push(m)
      map.set(m.teamId, g)
    }
    const q = query.trim().toLowerCase()
    return [...map.values()]
      .map((g) => ({
        ...g,
        members: g.members.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((g) => {
        if (showOnlyIncomplete && g.members.every((m) => m.present)) return false
        if (!q) return true
        return (
          g.teamCode.toLowerCase().includes(q) ||
          g.teamName.toLowerCase().includes(q) ||
          g.members.some(
            (m) => m.name.toLowerCase().includes(q) || m.regNo.toLowerCase().includes(q)
          )
        )
      })
      .sort((a, b) => a.teamCode.localeCompare(b.teamCode))
  }, [members, query, showOnlyIncomplete])

  const counts = useMemo(() => {
    const present = members.filter((m) => m.present).length
    return { present, total: members.length }
  }, [members])

  const writeQueue = useRef<Map<string, Promise<void>>>(new Map())

  function queueWrite(teamId: string, run: () => Promise<{ ok: boolean; error?: string }>) {
    const prev = writeQueue.current.get(teamId) ?? Promise.resolve()
    const task = prev.then(() => run())
    writeQueue.current.set(
      teamId,
      task.then(
        () => undefined,
        () => undefined
      )
    )
    return task
  }

  function toggleMember(m: AttendanceMemberState) {
    const next = !m.present
    const key = `${m.teamId}|${m.memberKey}`
    pendingRef.current.set(key, next)
    setMembers((prev) => prev.map((x) => (x === m ? { ...x, present: next } : x)))
    void queueWrite(m.teamId, () => setAttendanceMemberAction(day, m.teamId, m.memberKey, next))
      .then((res) => {
        if (!res.ok) throw new Error(res.error ?? "Could not save — reverted.")
        setTimeout(() => pendingRef.current.delete(key), 1200)
      })
      .catch(() => {
        pendingRef.current.delete(key)
        setMembers((prev) => prev.map((x) => (x.teamId === m.teamId && x.memberKey === m.memberKey ? { ...x, present: !next } : x)))
        setError("Could not save — reverted. Check your connection.")
      })
  }

  function toggleTeam(g: TeamGroup, present: boolean) {
    const keys = g.members.map((m) => `${m.teamId}|${m.memberKey}`)
    for (const m of g.members) pendingRef.current.set(`${m.teamId}|${m.memberKey}`, present)
    setMembers((prev) => prev.map((x) => (x.teamId === g.teamId ? { ...x, present } : x)))
    void queueWrite(g.teamId, () => setAttendanceTeamAction(day, g.teamId, present))
      .then((res) => {
        if (!res.ok) throw new Error(res.error ?? "Could not save — reverted.")
        setTimeout(() => {
          for (const k of keys) pendingRef.current.delete(k)
        }, 1200)
      })
      .catch(() => {
        for (const k of keys) pendingRef.current.delete(k)
        setMembers((prev) => prev.map((x) => (x.teamId === g.teamId ? { ...x, present: !present } : x)))
        setError("Could not save — reverted. Check your connection.")
      })
  }

  function downloadCsv() {
    const q = query.trim().toLowerCase()
    const rows = members
      .filter((m) => {
        if (showOnlyIncomplete && m.present) return false
        if (!q) return true
        return m.teamCode.toLowerCase().includes(q) || m.teamName.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.regNo.toLowerCase().includes(q)
      })
      .slice()
      .sort((a, b) => a.teamCode.localeCompare(b.teamCode) || a.name.localeCompare(b.name))
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines = [
      "Team,Team Name,Name,Register Number,Status",
      ...rows.map((m) => [m.teamCode, m.teamName, m.name, m.regNo, m.present ? "Present" : "Absent"].map(esc).join(",")),
    ]
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `epochesque-attendance-day${day}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function resyncSheet() {
    setSyncing(true)
    setSyncMsg(null)
    const res = await resyncAttendanceToSheetsAction(day)
    setSyncing(false)
    setSyncMsg(res.ok ? "Sheet re-synced — the Google Sheet now mirrors the database exactly." : res.error ?? "Sync failed.")
  }

  const otherDay = day === 1 ? 2 : 1

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          {[1, 2].map((d) => (
            <Link
              key={d}
              href={`/admin/attendance?day=${d}`}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                d === day ? "bg-accent-soft border border-accent/30 text-accent-hover" : "border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Day {d}
            </Link>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team / name / reg no…"
          className="w-56 rounded-full border border-white/[0.08] bg-surface/80 px-4 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShowOnlyIncomplete((v) => !v)}
          className={`rounded-full border px-4 py-2 text-xs transition ${
            showOnlyIncomplete ? "border-accent/40 bg-accent-soft text-accent-hover" : "border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground"
          }`}
        >
          {showOnlyIncomplete ? "Showing: incomplete teams" : "Show incomplete teams only"}
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          ⬇ Download CSV ({day === 1 ? "Day 1" : "Day 2"})
        </button>
        {connected ? (
          <>
            <button
              type="button"
              onClick={resyncSheet}
              disabled={syncing}
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "⟳ Re-sync Google Sheet"}
            </button>
            <button
              type="button"
              onClick={disconnectSheet}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
              title="Disconnect the Google Sheet"
            >
              Disconnect sheet
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowConnectForm((v) => !v)}
            className="rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-xs text-accent-hover transition hover:bg-accent-soft/80"
          >
            🔗 Connect Google Sheet
          </button>
        )}
        <span className="ml-auto font-mono text-xs text-muted/70">
          {counts.present}/{counts.total} PRESENT · LIVE SYNC {POLL_MS / 1000}s
        </span>
      </div>

      {showConnectForm && !connected ? (
        <Card className="p-4">
          <form action={connectAction} className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="webhookUrl" className="mb-1 block text-xs font-medium text-muted-foreground">
                Google Apps Script web app URL
              </label>
              <input
                id="webhookUrl"
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
            Deploy the sheet&apos;s Apps Script as a web app (Execute as: Me, Access: Anyone), paste the /exec URL here. See{" "}
            <code className="text-muted-foreground">docs/attendance-google-sheet.md</code> for the exact script to paste.
          </p>
        </Card>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
      {syncMsg ? <Alert tone={syncMsg.startsWith("Sheet re-synced") ? "success" : "error"}>{syncMsg}</Alert> : null}
      {connectState.ok && connectState.message ? <Alert tone="success">{connectState.message}</Alert> : null}

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.10] px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground">Nothing to show</p>
          <p className="mt-1 text-xs text-muted">No teams match the filter — import teams first or clear the search.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((g) => {
            const presentCount = g.members.filter((m) => m.present).length
            const allPresent = presentCount === g.members.length && g.members.length > 0
            return (
              <Card key={g.teamId} className={`p-4 transition ${allPresent ? "border-emerald-500/30" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={allPresent ? "green" : "slate"}>{g.teamCode}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={g.teamName}>
                    {g.teamName}
                  </span>
                  <span className="font-mono text-[11px] text-muted">
                    {presentCount}/{g.members.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleTeam(g, !allPresent)}
                    title={allPresent ? "Mark whole team absent" : "Mark whole team present"}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition ${
                      allPresent
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : "border-white/[0.10] bg-white/[0.04] text-muted-foreground hover:border-accent/40 hover:text-accent-hover"
                    }`}
                  >
                    ✓
                  </button>
                </div>
                <div className="mt-3 grid gap-1.5">
                  {g.members.map((m, i) => {
                    const inputId = `att-${day}-${g.teamId}-${i}`
                    return (
                      <div
                        key={m.memberKey}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition select-none ${
                          m.present ? "border-emerald-500/25 bg-emerald-500/[0.07]" : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.12]"
                        }`}
                      >
                        <input
                          id={inputId}
                          type="checkbox"
                          checked={m.present}
                          onChange={() => toggleMember(m)}
                          className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-500"
                        />
                        <label htmlFor={inputId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <span className={`min-w-0 flex-1 truncate text-sm ${m.present ? "text-foreground" : "text-muted-foreground"}`}>{m.name}</span>
                          {m.regNo ? (
                            <span className="shrink-0 font-mono text-[11px] text-muted/70" title={m.regNo}>
                              {m.regNo}
                            </span>
                          ) : null}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <p className="text-xs text-muted/60">
        Day {day} board · switching to <Link href={`/admin/attendance?day=${otherDay}`} className="text-accent-hover hover:underline">Day {otherDay}</Link> keeps both days independent. CSV exports exactly what you see (filters applied).
      </p>
    </div>
  )
}
