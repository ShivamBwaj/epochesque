import "server-only"

export interface SheetsAttendanceRow {
  team_code: string
  team_name: string
  member_key: string
  name: string
  reg_no: string
  present: boolean
  marked_at: string
}

export function sheetsWebhookConfigured(): boolean {
  return !!process.env.ATTENDANCE_SHEETS_WEBHOOK_URL
}

export async function pushAttendanceToSheets(
  type: "attendance.write" | "attendance.resync",
  day: number,
  rows: SheetsAttendanceRow[]
): Promise<boolean> {
  const url = process.env.ATTENDANCE_SHEETS_WEBHOOK_URL
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
