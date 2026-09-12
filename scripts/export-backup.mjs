import { createClient } from "@supabase/supabase-js"
import { writeFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const TABLES = [
  "teams",
  "problem_statements",
  "submissions",
  "scores",
  "leaderboard_visibility",
  "announcements",
  "admins",
  "event_settings",
  "gallery_photos",
  "admin_audit",
]

const stamp = new Date().toISOString().replace(/[:.]/g, "-")
const outDir = path.resolve(process.cwd(), "backups")
mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, `epoch-backup-${stamp}.json`)

const backup: Record<string, unknown> = {
  _meta: {
    project: url,
    created_at: new Date().toISOString(),
    note: "Storage objects (PPTs, gallery images) are NOT included — export them separately if needed.",
  },
}

for (const table of TABLES) {
  const { data, error } = await admin.from(table).select("*").order("created_at", { ascending: true, nullsFirst: false } as never)
  if (error) {
    console.error(`FAIL ${table}: ${error.message}`)
    process.exit(1)
  }
  backup[table] = data
  console.log(`OK   ${table}: ${(data ?? []).length} rows`)
}

writeFileSync(outPath, JSON.stringify(backup, null, 2))
console.log(`\nBackup written: ${outPath}`)
