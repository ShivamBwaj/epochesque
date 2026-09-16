import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export interface SheetsAttendanceRow {
  team_code: string
  team_name: string
  member_key: string
  name: string
  reg_no: string
  present: boolean
  marked_at: string
}

const SECRET_KEY = "attendance_sheets_webhook_url"

// Env var wins when set (ops-level override); otherwise the admin-configured
// URL saved from /admin/attendance ("Connect Google Sheet") is used.
// Never read from event_settings — that table is public-readable and this
// URL is effectively a secret (anyone with it can write to the sheet).
export async function getSheetsWebhookUrl(): Promise<string | null> {
  const envUrl = process.env.ATTENDANCE_SHEETS_WEBHOOK_URL
  if (envUrl) return envUrl
  const admin = createAdminClient()
  const { data } = await admin.from("integration_secrets").select("value").eq("key", SECRET_KEY).maybeSingle()
  return data?.value || null
}

export async function setSheetsWebhookUrl(url: string | null): Promise<void> {
  const admin = createAdminClient()
  if (!url) {
    await admin.from("integration_secrets").delete().eq("key", SECRET_KEY)
    return
  }
  await admin.from("integration_secrets").upsert({ key: SECRET_KEY, value: url }, { onConflict: "key" })
}

export async function sheetsWebhookConfigured(): Promise<boolean> {
  return !!(await getSheetsWebhookUrl())
}

export async function pushAttendanceToSheets(
  type: "attendance.write" | "attendance.resync",
  day: number,
  rows: SheetsAttendanceRow[]
): Promise<boolean> {
  const url = await getSheetsWebhookUrl()
  if (!url || rows.length === 0) return false
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, day, rows }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export interface SheetsScoreRow {
  team_code: string
  team_name: string
  round: string
  total_score: number
  notes: string
  published: boolean
  updated_at: string
}

const SCORES_SECRET_KEY = "scores_sheets_webhook_url"

// Same posture as the attendance webhook URL: service-role only, never
// exposed to the browser or any public API.
export async function getScoresSheetsWebhookUrl(): Promise<string | null> {
  const envUrl = process.env.SCORES_SHEETS_WEBHOOK_URL
  if (envUrl) return envUrl
  const admin = createAdminClient()
  const { data } = await admin.from("integration_secrets").select("value").eq("key", SCORES_SECRET_KEY).maybeSingle()
  return data?.value || null
}

export async function setScoresSheetsWebhookUrl(url: string | null): Promise<void> {
  const admin = createAdminClient()
  if (!url) {
    await admin.from("integration_secrets").delete().eq("key", SCORES_SECRET_KEY)
    return
  }
  await admin.from("integration_secrets").upsert({ key: SCORES_SECRET_KEY, value: url }, { onConflict: "key" })
}

export async function scoresSheetsWebhookConfigured(): Promise<boolean> {
  return !!(await getScoresSheetsWebhookUrl())
}

export async function pushScoresToSheets(
  type: "scores.write" | "scores.resync",
  rows: SheetsScoreRow[]
): Promise<boolean> {
  const url = await getScoresSheetsWebhookUrl()
  if (!url || rows.length === 0) return false
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, rows }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}
