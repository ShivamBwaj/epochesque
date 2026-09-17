// ============================================================
// import-official-registrations.mjs — the college's official
// sheet is the source of truth for who's a real participant.
// Anyone on it who never showed up in `registrations` (never
// touched the app's own signup form / walk-in desk) gets added
// directly from the sheet's Name/Email/Phone.
//
// Usage: node scripts/import-official-registrations.mjs <official-sheet-csv-url>
// ============================================================
import { createClient } from "@supabase/supabase-js"
import { fileURLToPath } from "node:url"
import dotenv from "dotenv"

dotenv.config({ path: fileURLToPath(new URL("../.env.local", import.meta.url)), quiet: true })

const SHEET_URL = process.argv[2]
if (!SHEET_URL) {
  console.error("Usage: node scripts/import-official-registrations.mjs <official-sheet-csv-export-url>")
  process.exit(1)
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function splitCsvLine(line) {
  const out = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ",") { out.push(cur); cur = "" }
    else cur += ch
  }
  out.push(cur)
  return out
}

const res = await fetch(SHEET_URL)
if (!res.ok) { console.error("sheet fetch failed", res.status); process.exit(1) }
const csv = await res.text()
const lines = csv.split(/\r?\n/).filter((l) => l.trim())
const headers = splitCsvLine(lines[0]).map((h) => h.trim())
const idx = { id: headers.indexOf("Id"), name: headers.indexOf("Name"), email: headers.indexOf("Email"), phone: headers.indexOf("Ph_No") }
const rows = lines.slice(1).map(splitCsvLine)

const { data: existing } = await admin.from("registrations").select("reg_no")
const existingRegNos = new Set(existing.map((r) => r.reg_no.toUpperCase()))

let added = 0
let skippedDupInSheet = 0
const seenThisRun = new Set()

for (const r of rows) {
  const regNo = (r[idx.id] || "").trim().toUpperCase()
  const name = (r[idx.name] || "").trim()
  const email = (r[idx.email] || "").trim().toLowerCase()
  const phone = (r[idx.phone] || "").trim()
  if (!regNo || !name) continue
  if (existingRegNos.has(regNo) || seenThisRun.has(regNo)) { if (seenThisRun.has(regNo)) skippedDupInSheet++; continue }
  seenThisRun.add(regNo)

  const { error } = await admin.from("registrations").insert({ name, reg_no: regNo, phone, email: email || "" })
  if (error) {
    console.error(`  ✗ ${regNo} (${name}):`, error.message)
    continue
  }
  added++
}

console.log(`✓ added ${added} people who were on the official sheet but missing from registrations`)
console.log(`  (${skippedDupInSheet} duplicate rows within the sheet itself, skipped)`)
