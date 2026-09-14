"use client"

interface TeamCred {
  team_code: string
  team_name: string
  leader_email: string
}

export function DownloadCredentialsButton({ teams }: { teams: TeamCred[] }) {
  function download() {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lines = [
      "Team Code,Team Name,Leader Email,Password",
      ...teams
        .slice()
        .sort((a, b) => a.team_code.localeCompare(b.team_code))
        .map((t) => [t.team_code, t.team_name, t.leader_email, `Epoch@${t.team_code}`].map(esc).join(",")),
    ]
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `epochesque-team-logins-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={teams.length === 0}
      className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
      title="Downloads every team's code, leader email, and login password (Epoch@<team code>) as a CSV"
    >
      ⬇ Download all logins (CSV)
    </button>
  )
}
