"use client"

import { useActionState, useState } from "react"
import { parseRegistrationCsv } from "@/lib/csv"
import type { ParsedTeam } from "@/lib/csv"
import { importTeamsConfirmAction } from "@/lib/actions/admin"
import type { ImportPayloadTeam, ImportResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { CopyField } from "@/components/copy-field"
import { Alert, Badge, Button, Card, Input, Label, Select, StatCard } from "@/components/ui"

type Step = "upload" | "preview" | "confirm"

function csvCell(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function ImportWizard() {
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState("")
  const [teams, setTeams] = useState<ParsedTeam[]>([])
  const [skipped, setSkipped] = useState<{ row: number; reason: string }[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [readError, setReadError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [state, formAction] = useActionState<ImportResult, FormData>(importTeamsConfirmAction, { ok: false })

  const included = teams.filter((t) => t.include)
  const payload: ImportPayloadTeam[] = included.map((t) => ({
    key: t.key,
    team_code: t.team_code,
    team_name: t.team_name,
    leaderIndex: t.leaderIndex,
    members: t.members.map((m) => ({
      member_id: m.member_id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      college: m.college,
      payment_status: m.payment_status,
      college_type: m.college_type,
    })),
  }))
  const hasResult = submitted && (state.createdCount !== undefined || state.error !== undefined)

  const onFile = (file: File | undefined) => {
    if (!file) return
    setReadError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseRegistrationCsv(String(reader.result ?? ""))
      setFileName(file.name)
      setTeams(result.teams)
      setSkipped(result.skipped)
      setTotalRows(result.totalRows)
      setSubmitted(false)
      setStep("preview")
    }
    reader.onerror = () => setReadError("Could not read the file. Re-save it as CSV UTF-8 and try again.")
    reader.readAsText(file)
  }

  const updateTeam = (key: string, patch: Partial<ParsedTeam>) =>
    setTeams((ts) => ts.map((t) => (t.key === key ? { ...t, ...patch } : t)))

  const startOver = () => {
    setStep("upload")
    setFileName("")
    setTeams([])
    setSkipped([])
    setTotalRows(0)
    setReadError(null)
    setSubmitted(false)
  }

  const downloadCredentials = () => {
    const rows = state.credentials ?? []
    const lines = [
      "team_code,team_name,email,password",
      ...rows.map((r) => [r.team_code, r.team_name, r.email, r.password].map(csvCell).join(",")),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "epoch-team-credentials.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (step === "upload") {
    return (
      <Card className="p-5 md:p-6">
        <p className="hud-label mb-1">STEP 1 / 3 — UPLOAD</p>
        <p className="mb-4 text-sm text-slate-400">
          Pick the registration CSV. Nothing is written to the database until you confirm in step 3.
        </p>
        {readError ? <Alert tone="error">{readError}</Alert> : null}
        <div className="mt-4 space-y-3">
          <Label htmlFor="csv-file">CSV file</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      </Card>
    )
  }

  if (step === "preview") {
    return (
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="hud-label mb-1">STEP 2 / 3 — REVIEW</p>
              <p className="text-sm text-slate-400">
                Fix codes and names, pick the leader (their email becomes the login), and untick anything you don&apos;t
                want. Source: <span className="font-mono text-xs text-slate-300">{fileName}</span>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={startOver}>
              ← Different file
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Rows" value={String(totalRows)} sub="Data rows in CSV" />
          <StatCard label="Teams" value={String(teams.length)} sub="Detected groups" />
          <StatCard label="Included" value={String(included.length)} sub="Will be created" />
          <StatCard label="Skipped rows" value={String(skipped.length)} sub="Unusable rows" />
        </div>

        {teams.length === 0 ? (
          <Alert tone="error">
            No teams could be parsed from this file. Check that it has &quot;Team Id&quot; and &quot;Name&quot; columns.
          </Alert>
        ) : (
          <div className="space-y-4">
            {teams.map((t) => (
              <Card key={t.key} className={`p-5 ${t.include ? "" : "opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="cyan">{t.key}</Badge>
                      <Badge tone={t.include ? "green" : "red"}>{t.include ? "INCLUDE" : "SKIP"}</Badge>
                      <span className="text-xs text-slate-500">{t.members.length} members</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Team code</Label>
                        <Input
                          value={t.team_code}
                          maxLength={30}
                          onChange={(e) => updateTeam(t.key, { team_code: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Team name</Label>
                        <Input
                          value={t.team_name}
                          maxLength={120}
                          onChange={(e) => updateTeam(t.key, { team_name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="max-w-sm">
                      <Label>Leader (their email becomes the login)</Label>
                      <Select
                        value={String(t.leaderIndex)}
                        onChange={(e) => updateTeam(t.key, { leaderIndex: Number(e.target.value) })}
                      >
                        {t.members.map((m, i) =>
                          m.email_valid ? (
                            <option key={i} value={i}>
                              {m.name} — {m.email}
                            </option>
                          ) : null,
                        )}
                      </Select>
                    </div>
                    <ul className="divide-y divide-slate-800/50 rounded-lg border border-slate-800/60">
                      {t.members.map((m, i) => (
                        <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-200">
                              {m.name}
                              {i === t.leaderIndex ? <span className="ml-2 font-mono text-[10px] text-cyan-300">LEAD</span> : null}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {m.email ?? "no email"}
                              {m.college ? ` · ${m.college}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.payment_status ? (
                              <Badge tone={m.payment_status.toLowerCase() === "paid" ? "green" : "amber"}>
                                {m.payment_status.toUpperCase()}
                              </Badge>
                            ) : null}
                            {!m.email_valid ? <Badge tone="red">BAD EMAIL</Badge> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {t.issues.length > 0 ? (
                      <ul className="space-y-1">
                        {t.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-amber-300">
                            ⚠ {issue}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={t.include}
                      onChange={(e) => updateTeam(t.key, { include: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 accent-cyan-400"
                    />
                    Include
                  </label>
                </div>
              </Card>
            ))}
          </div>
        )}

        {skipped.length > 0 ? (
          <Card className="p-5">
            <p className="hud-label mb-3">SKIPPED ROWS</p>
            <ul className="space-y-1">
              {skipped.map((s, i) => (
                <li key={i} className="text-xs text-amber-300/90">
                  Row {s.row}: {s.reason}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <div className="flex items-center gap-3">
          <Button onClick={() => setStep("confirm")} disabled={included.length === 0}>
            Continue with {included.length} team{included.length === 1 ? "" : "s"} →
          </Button>
          {included.length === 0 ? (
            <span className="text-xs text-slate-500">Include at least one team to continue.</span>
          ) : null}
        </div>
      </div>
    )
  }

  if (hasResult) {
    return (
      <div className="space-y-6">
        <Card className="p-5">
          <p className="hud-label mb-1">STEP 3 / 3 — DONE</p>
          {state.ok ? (
            <Alert tone="success">
              Created {state.createdCount ?? 0} team{state.createdCount === 1 ? "" : "s"}. Hand the credentials below to
              each team leader.
            </Alert>
          ) : null}
          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        </Card>

        {state.credentials && state.credentials.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="hud-label">CREDENTIALS</p>
              <Button variant="secondary" size="sm" onClick={downloadCredentials}>
                Download CSV
              </Button>
            </div>
            <div className="overflow-x-auto border-t border-slate-800/70">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800/70">
                    <th className="hud-label px-5 py-3">CODE</th>
                    <th className="hud-label px-5 py-3">TEAM</th>
                    <th className="hud-label px-5 py-3">EMAIL</th>
                    <th className="hud-label px-5 py-3">PASSWORD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {state.credentials.map((c) => (
                    <tr key={c.email}>
                      <td className="px-5 py-2.5 font-mono text-xs text-cyan-300">{c.team_code}</td>
                      <td className="px-5 py-2.5 text-slate-100">{c.team_name}</td>
                      <td className="px-5 py-2.5 text-slate-400">{c.email}</td>
                      <td className="w-64 px-5 py-2.5">
                        <CopyField value={c.password} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {state.errors && state.errors.length > 0 ? (
          <Alert tone="error">
            <p className="mb-2 font-medium">Some teams were skipped:</p>
            <ul className="list-disc space-y-1 pl-4">
              {state.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        <Button variant="secondary" onClick={startOver}>
          Import another CSV
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="hud-label mb-1">STEP 3 / 3 — CONFIRM</p>
        <p className="text-sm text-slate-400">
          About to create <span className="font-semibold text-slate-100">{payload.length}</span> teams with logins.
          Passwords are generated now and shown once — download them before closing this page.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800/70">
                <th className="hud-label px-5 py-3">CODE</th>
                <th className="hud-label px-5 py-3">TEAM</th>
                <th className="hud-label px-5 py-3">LEADER LOGIN</th>
                <th className="hud-label px-5 py-3">MEMBERS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {payload.map((t) => (
                <tr key={t.key}>
                  <td className="px-5 py-2.5 font-mono text-xs text-cyan-300">{t.team_code}</td>
                  <td className="px-5 py-2.5 text-slate-100">{t.team_name}</td>
                  <td className="px-5 py-2.5 text-slate-400">{t.members[t.leaderIndex]?.email ?? "—"}</td>
                  <td className="px-5 py-2.5 tabular-nums text-slate-300">{t.members.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <form action={formAction} onSubmit={() => setSubmitted(true)} className="flex items-center gap-3">
        <input type="hidden" name="payload" value={JSON.stringify(payload)} />
        <SubmitButton pendingText="Creating teams…">Create {payload.length} teams</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setStep("preview")}>
          ← Back to review
        </Button>
      </form>
    </div>
  )
}
