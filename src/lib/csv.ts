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
