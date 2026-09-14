export interface ParsedMember {
  row: number
  member_id: string | null
  name: string
  email: string | null
  phone: string | null
  college: string | null
  payment_status: string | null
  college_type: string | null
  email_valid: boolean
}

export interface ParsedTeam {
  key: string
  team_code: string
  team_name: string
  members: ParsedMember[]
  leaderIndex: number
  include: boolean
  issues: string[]
}

export interface ParseResult {
  teams: ParsedTeam[]
  skipped: { row: number; reason: string }[]
  totalRows: number
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const HEADER_ALIASES: Record<string, string[]> = {
  member_id: ["id", "member id", "reg no", "registration no", "student id"],
  name: ["name", "full name", "participant name"],
  email: ["email", "email address", "e-mail"],
  phone: ["ph_no", "phone", "ph no", "mobile", "phone number", "contact"],
  college: ["college", "institution", "university"],
  payment_status: ["payment status", "payment"],
  college_type: ["college type", "type"],
  team_id: ["team id", "team_id", "team code", "team no"],
}

function normalizeHeader(h: string): string | null {
  const clean = h.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (clean === canonical || aliases.includes(clean)) return canonical
  }
  return null
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ",") {
      out.push(cur)
      cur = ""
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function cleanCell(v: string | undefined): string | null {
  if (!v) return null
  const s = v.trim()
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "n/a" || s === "-") return null
  return s
}

function sanitizeCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9-]/g, "").slice(0, 24)
}

export function parseRegistrationCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)

  const skipped: { row: number; reason: string }[] = []
  if (lines.length < 2) {
    return { teams: [], skipped: [{ row: 1, reason: "File has no data rows" }], totalRows: 0 }
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader)
  const colIndex: Record<string, number> = {}
  headers.forEach((h, i) => {
    if (h && !(h in colIndex)) colIndex[h] = i
  })
  if (!("team_id" in colIndex) || !("name" in colIndex)) {
    return {
      teams: [],
      skipped: [{ row: 1, reason: "Missing required columns: need at least 'Team Id' and 'Name' (also recommended: Email)" }],
      totalRows: 0,
    }
  }

  const teamsMap = new Map<string, ParsedTeam>()
  let dataRowCount = 0

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1
    const cells = splitCsvLine(lines[i])
    const get = (col: string) => {
      const idx = colIndex[col]
      return idx === undefined ? null : cleanCell(cells[idx])
    }

    const teamIdRaw = get("team_id")
    const name = get("name")

    if (!teamIdRaw) {
      skipped.push({ row: rowNumber, reason: "No Team Id" })
      continue
    }
    if (!name) {
      skipped.push({ row: rowNumber, reason: "No member name" })
      continue
    }
    dataRowCount++

    const emailRaw = get("email")
    const email = emailRaw ? emailRaw.toLowerCase() : null
    const emailValid = !!email && EMAIL_RE.test(email)

    const member: ParsedMember = {
      row: rowNumber,
      member_id: get("member_id"),
      name,
      email: emailValid ? email : null,
      phone: get("phone"),
      college: get("college"),
      payment_status: get("payment_status"),
      college_type: get("college_type"),
      email_valid: emailValid,
    }

    const key = teamIdRaw.trim()
    let team = teamsMap.get(key)
    if (!team) {
      const code = sanitizeCode(key)
      team = {
        key,
        team_code: code ? `T-${code}` : `T-${teamsMap.size + 1}`,
        team_name: `Team ${code || key.trim()}`,
        members: [],
        leaderIndex: 0,
        include: true,
        issues: [],
      }
      teamsMap.set(key, team)
    }
    team.members.push(member)
  }

  const emailOwners = new Map<string, Set<string>>()
  for (const t of teamsMap.values()) {
    for (const m of t.members) {
      if (!m.email) continue
      const owners = emailOwners.get(m.email) ?? new Set<string>()
      owners.add(t.key)
      emailOwners.set(m.email, owners)
    }
  }
  for (const t of teamsMap.values()) {
    for (const m of t.members) {
      if (!m.email) continue
      const owners = emailOwners.get(m.email)!
      if (owners.size > 1) {
        const others = [...owners].filter((k) => k !== t.key).join(", ")
        t.issues.push(`Email ${m.email} also appears in team ${others}`)
        t.include = false
      }
    }
    const validEmails = t.members.filter((m) => m.email_valid)
    if (validEmails.length === 0) {
      t.issues.push("No member with a valid email (needed for login)")
      t.include = false
    }
    t.leaderIndex = Math.max(0, t.members.findIndex((m) => m.email_valid))
  }

  const teams = [...teamsMap.values()].sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
  return { teams, skipped, totalRows: dataRowCount }
}

export function genPassword(teamCode: string): string {
  return `Epoch@${teamCode}`
}

export interface ParsedScoreRow {
  team_code: string
  score: string
  notes: string
}

export interface ScoresParseResult {
  rows: ParsedScoreRow[]
  invalid: { line: number; text: string; reason: string }[]
}

export function parseScoresCsv(text: string): ScoresParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: ParsedScoreRow[] = []
  const invalid: ScoresParseResult["invalid"] = []

  if (lines.length === 0) return { rows, invalid }

  const first = splitCsvLine(lines[0]).map((c) => c.toLowerCase())
  const isHeader = first.some((c) => c.includes("team")) && first.some((c) => c.includes("score") || c.includes("total"))
  const start = isHeader ? 1 : 0

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    const code = (cells[0] ?? "").trim()
    const score = (cells[1] ?? "").trim()
    const notes = (cells[2] ?? "").trim()
    const lineNo = i + 1

    if (!code) {
      invalid.push({ line: lineNo, text: lines[i], reason: "missing team code" })
      continue
    }
    const num = Number(score)
    if (!Number.isFinite(num) || num < 0 || num > 10000) {
      invalid.push({ line: lineNo, text: lines[i], reason: "invalid score (must be 0–10000)" })
      continue
    }
    rows.push({ team_code: code, score, notes: notes.slice(0, 500) })
  }

  return { rows, invalid }
}
