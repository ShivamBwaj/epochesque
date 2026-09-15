import "server-only"

export interface RegistrationSheetRow {
  name: string
  reg_no: string
  phone: string
  email: string
  registered_at: string
}

export function sheetsConfigured(): boolean {
  return !!process.env.REGISTRATION_SHEETS_WEBHOOK_URL
}

export async function pushRegistrationToSheets(row: RegistrationSheetRow): Promise<boolean> {
  const url = process.env.REGISTRATION_SHEETS_WEBHOOK_URL
  if (!url) return false
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: [row] }),
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}
