"use client"

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  connectSheetsWebhookAction,
  disconnectSheetsWebhookAction,
  fetchAttendanceStateAction,
  resyncAttendanceToSheetsAction,
  setAttendanceMemberAction,
  setAttendanceManyAction,
  type AttendanceMemberState,
  type ConnectSheetsResult,
} from "@/lib/actions/attendance"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Card, EmptyState, LinkButton, StatCard } from "@/components/ui"
import { TeamCard } from "./team-card"
import { UnassignedPanel } from "./unassigned-panel"
import type { RosterTeam } from "./page"

interface UnassignedPerson {
  id: string
  regNo: string
  name: string
  email: string
  hasAccount: boolean
}

export function TeamsBoard({
  rosterTeams,
  unassigned,
  teamOptions,
  initialDay,
  initialMembers,
  sheetsConfigured,
}: {
  rosterTeams: RosterTeam[]
  unassigned: UnassignedPerson[]
  teamOptions: { id: string; label: string; size: number }[]
  initialDay: 1 | 2
  initialMembers: AttendanceMemberState[]
  sheetsConfigured: boolean
}) {
  const [day, setDay] = useState<1 | 2>(initialDay)
  const [teamQuery, setTeamQuery] = useState("")
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)
  const [members, setMembers] = useState<AttendanceMemberState[]>(initialMembers)
  const [error, setError] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false)
  const [showConnectForm, setShowConnectForm] = useState(false)
  const [connectState, connectAction] = useActionState<ConnectSheetsResult, FormData>(connectSheetsWebhookAction, { ok: false })
  const connected = !manuallyDisconnected && (sheetsConfigured || connectState.ok)
  const pendingRef = useRef<Map<string, boolean>>(new Map())
  const writeQueue = useRef<Map<string, Promise<void>>>(new Map())

  const applyServerState = useCallback((server: AttendanceMemberState[]) => {
    const pending = pendingRef.current
    setMembers(server.map((m) => (pending.has(m.registrationId) ? { ...m, present: pending.get(m.registrationId)! } : m)))
  }, [])

  // Event's over -- no more live sync needed. Fetch once per day-tab switch
  // instead of polling every 2.5s (that alone was a meaningful chunk of the
  // Netlify function-compute bill during the live event).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await fetchAttendanceStateAction(day)
      if (!cancelled && res.ok && res.members) applyServerState(res.members)
    })()
    return () => {
      cancelled = true
    }
  }, [day, applyServerState])

  function queueWrite(key: string, run: () => Promise<{ ok: boolean; error?: string }>) {
    const prev = writeQueue.current.get(key) ?? Promise.resolve()
    const task = prev.then(() => run())
    writeQueue.current.set(
      key,
      task.then(
        () => undefined,
        () => undefined
      )
    )
    return task
  }

  const presentByReg = useMemo(() => new Map(members.map((m) => [m.registrationId, m.present])), [members])

  function toggleOne(registrationId: string, present: boolean) {
    pendingRef.current.set(registrationId, present)
    setMembers((prev) => prev.map((x) => (x.registrationId === registrationId ? { ...x, present } : x)))
    void queueWrite(registrationId, () => setAttendanceMemberAction(day, registrationId, present))
      .then((res) => {
        if (!res.ok) throw new Error(res.error ?? "Could not save — reverted.")
        setTimeout(() => pendingRef.current.delete(registrationId), 1200)
      })
      .catch(() => {
        pendingRef.current.delete(registrationId)
        setMembers((prev) => prev.map((x) => (x.registrationId === registrationId ? { ...x, present: !present } : x)))
        setError("Could not save — reverted. Check your connection.")
      })
  }

  function toggleMany(registrationIds: string[], present: boolean) {
    for (const id of registrationIds) pendingRef.current.set(id, present)
    setMembers((prev) => prev.map((x) => (registrationIds.includes(x.registrationId) ? { ...x, present } : x)))
    void queueWrite(registrationIds.join(","), () => setAttendanceManyAction(day, registrationIds, present))
      .then((res) => {
        if (!res.ok) throw new Error(res.error ?? "Could not save — reverted.")
        setTimeout(() => {
          for (const id of registrationIds) pendingRef.current.delete(id)
        }, 1200)
      })
      .catch(() => {
        for (const id of registrationIds) pendingRef.current.delete(id)
        setMembers((prev) => prev.map((x) => (registrationIds.includes(x.registrationId) ? { ...x, present: !present } : x)))
        setError("Could not save — reverted. Check your connection.")
      })
  }

  async function disconnectSheet() {
    if (!window.confirm("Disconnect this Google Sheet? Live sync stops until you connect one again.")) return
    setManuallyDisconnected(true)
    await disconnectSheetsWebhookAction()
  }

  async function resyncSheet() {
    setSyncing(true)
    setSyncMsg(null)
    const res = await resyncAttendanceToSheetsAction(day)
    setSyncing(false)
    setSyncMsg(res.ok ? "Sheet re-synced — the Google Sheet now mirrors the database exactly." : res.error ?? "Sync failed.")
  }

  const presentCount = members.filter((m) => m.present).length
  const incompleteCount = rosterTeams.filter((t) => t.members.length < 2).length

  const filteredTeams = useMemo(() => {
    const q = teamQuery.trim().toLowerCase()
    return rosterTeams.filter((t) => {
      if (showOnlyIncomplete && t.members.length >= 2) return false
      if (!q) return true
      return (
        t.team_code.toLowerCase().includes(q) ||
        t.team_name.toLowerCase().includes(q) ||
        t.members.some((m) => m.name.toLowerCase().includes(q) || m.regNo.toLowerCase().includes(q))
      )
    })
  }, [rosterTeams, teamQuery, showOnlyIncomplete])

  function downloadCsv() {
    const q = teamQuery.trim().toLowerCase()
    const rows = members
      .filter((m) => {
        if (showOnlyIncomplete && m.present) return false
        if (!q) return true
        return (
          (m.teamCode ?? "").toLowerCase().includes(q) ||
          (m.teamName ?? "").toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.regNo.toLowerCase().includes(q)
        )
      })
      .slice()
      .sort((a, b) => (a.teamCode ?? "").localeCompare(b.teamCode ?? "") || a.name.localeCompare(b.name))
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines = [
      "Team,Team Name,Name,Register Number,Status",
      ...rows.map((m) => [m.teamCode ?? "", m.teamName ?? "Unassigned", m.name, m.regNo, m.present ? "Present" : "Absent"].map(esc).join(",")),
    ]
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `epochesque-attendance-day${day}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Registrations" value={String(unassigned.length + rosterTeams.reduce((n, t) => n + t.members.length, 0))} sub="Everyone in the sheet" />
        <StatCard label="Teams" value={String(rosterTeams.length)} sub={`${incompleteCount} incomplete`} />
        <StatCard label="Unassigned" value={String(unassigned.length)} sub="Not on a team yet" />
        <StatCard label={`Day ${day} present`} value={String(presentCount)} sub={`of ${members.length}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
          {[1, 2].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d as 1 | 2)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                d === day ? "bg-accent-soft border border-accent/30 text-accent-hover" : "border border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Attendance — Day {d}
            </button>
          ))}
        </div>
        <input
          value={teamQuery}
          onChange={(e) => setTeamQuery(e.target.value)}
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
        <LinkButton href="/admin/teams/add" size="sm">
          + Add walk-in team
        </LinkButton>
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
            🔗 Connect Google Sheet (attendance mirror)
          </button>
        )}
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
            <code className="text-muted-foreground">docs/attendance-google-sheet.md</code> for the exact script to paste. Multiple
            admins can tick attendance here at once — every tick mirrors live to the sheet and to every other open admin screen.
          </p>
        </Card>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
      {syncMsg ? <Alert tone={syncMsg.startsWith("Sheet re-synced") ? "success" : "error"}>{syncMsg}</Alert> : null}
      {connectState.ok && connectState.message ? <Alert tone="success">{connectState.message}</Alert> : null}

      <UnassignedPanel people={unassigned} teamOptions={teamOptions} presentByReg={presentByReg} onToggleOne={toggleOne} day={day} />

      {rosterTeams.length === 0 ? (
        <EmptyState icon="◇" title="No teams yet" description="Build teams from the unassigned list above, or use Add walk-in team." />
      ) : filteredTeams.length === 0 ? (
        <EmptyState icon="◇" title="No teams match" description="Clear the search or the incomplete-only filter." />
      ) : (
        <div data-testid="team-roster" className="grid gap-4 md:grid-cols-2">
          {filteredTeams.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              teamOptions={teamOptions.filter((o) => o.id !== t.id)}
              presentByReg={presentByReg}
              onToggleOne={toggleOne}
              onToggleTeam={toggleMany}
            />
          ))}
        </div>
      )}
    </div>
  )
}
