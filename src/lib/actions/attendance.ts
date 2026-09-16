"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser, isAdmin } from "@/lib/auth"
import { pushAttendanceToSheets, setSheetsWebhookUrl, sheetsWebhookConfigured, type SheetsAttendanceRow } from "@/lib/sheets"

export interface AttendanceMemberState {
  registrationId: string
  name: string
  regNo: string
  teamId: string | null
  teamCode: string | null
  teamName: string | null
  present: boolean
}

export interface AttendanceStateResult {
  ok: boolean
  error?: string
  members?: AttendanceMemberState[]
}

export interface AttendanceWriteResult {
  ok: boolean
  error?: string
}

async function requireAdminAction() {
  const user = await getSessionUser()
  if (!user) return null
  if (!(await isAdmin(user.id))) return null
  return user
}

function validDay(day: number): boolean {
  return day === 1 || day === 2
}

async function buildState(day: number): Promise<AttendanceStateResult> {
  const admin = createAdminClient()
  const [{ data: regs }, { data: teamMembers }, { data: teams }, { data: rows }] = await Promise.all([
    admin.from("registrations").select("id, name, reg_no").order("name"),
    admin.from("team_members").select("registration_id, team_id"),
    admin.from("teams").select("id, team_code, team_name"),
    admin.from("attendance").select("registration_id, is_present").eq("day", day),
  ])

  const teamById = new Map((teams ?? []).map((t) => [t.id, t]))
  const teamByReg = new Map((teamMembers ?? []).map((tm) => [tm.registration_id, teamById.get(tm.team_id) ?? null]))
  const presentSet = new Set((rows ?? []).filter((r) => r.is_present).map((r) => r.registration_id))

  const members: AttendanceMemberState[] = (regs ?? []).map((r) => {
    const team = teamByReg.get(r.id) ?? null
    return {
      registrationId: r.id,
      name: r.name,
      regNo: r.reg_no,
      teamId: team?.id ?? null,
      teamCode: team?.team_code ?? null,
      teamName: team?.team_name ?? null,
      present: presentSet.has(r.id),
    }
  })
  return { ok: true, members }
}

export async function fetchAttendanceStateAction(day: number): Promise<AttendanceStateResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }
  return buildState(day)
}

function toSheetRows(members: AttendanceMemberState[]): SheetsAttendanceRow[] {
  return members.map((m) => ({
    team_code: m.teamCode ?? "",
    team_name: m.teamName ?? "Unassigned",
    member_key: m.registrationId,
    name: m.name,
    reg_no: m.regNo,
    present: m.present,
    marked_at: new Date().toISOString(),
  }))
}

function queueSheetsPush(type: "attendance.write" | "attendance.resync", day: number, rows: SheetsAttendanceRow[]) {
  if (rows.length === 0) return
  after(async () => {
    await pushAttendanceToSheets(type, day, rows)
  })
}

// Call after anything that changes the registrant/team roster (walk-in add,
// team formation) so a newly added person isn't a blind spot in the sheet
// until someone happens to mark their attendance or hits manual Re-sync.
// No-ops fast if no sheet is connected — pushAttendanceToSheets checks that.
export async function queueRosterChangeResync() {
  after(async () => {
    for (const day of [1, 2]) {
      const state = await buildState(day)
      await pushAttendanceToSheets("attendance.resync", day, toSheetRows(state.members ?? []))
    }
  })
}

export async function setAttendanceMemberAction(
  day: number,
  registrationId: string,
  present: boolean
): Promise<AttendanceWriteResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }

  const admin = createAdminClient()
  const { data: reg } = await admin.from("registrations").select("id, name, reg_no").eq("id", registrationId).maybeSingle()
  if (!reg) return { ok: false, error: "Registration not found." }

  const { error } = await admin.from("attendance").upsert(
    { day, registration_id: registrationId, is_present: present, marked_at: new Date().toISOString() },
    { onConflict: "day,registration_id" }
  )
  if (error) return { ok: false, error: "Could not save. Try again." }

  const { data: tm } = await admin.from("team_members").select("team_id").eq("registration_id", registrationId).maybeSingle()
  const team = tm ? (await admin.from("teams").select("team_code, team_name").eq("id", tm.team_id).maybeSingle()).data : null

  queueSheetsPush("attendance.write", day, [
    {
      team_code: team?.team_code ?? "",
      team_name: team?.team_name ?? "Unassigned",
      member_key: registrationId,
      name: reg.name,
      reg_no: reg.reg_no,
      present,
      marked_at: new Date().toISOString(),
    },
  ])
  return { ok: true }
}

export async function setAttendanceManyAction(
  day: number,
  registrationIds: string[],
  present: boolean
): Promise<AttendanceWriteResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }
  if (registrationIds.length === 0) return { ok: true }
  if (registrationIds.length > 10) return { ok: false, error: "Too many at once." }

  const admin = createAdminClient()
  const [{ data: regs }, { data: teamMembers }] = await Promise.all([
    admin.from("registrations").select("id, name, reg_no").in("id", registrationIds),
    admin.from("team_members").select("registration_id, team_id").in("registration_id", registrationIds),
  ])
  const teamIds = [...new Set((teamMembers ?? []).map((tm) => tm.team_id))]
  const { data: teams } = teamIds.length
    ? await admin.from("teams").select("id, team_code, team_name").in("id", teamIds)
    : { data: [] }
  const teamById = new Map((teams ?? []).map((t) => [t.id, t]))
  const teamByReg = new Map((teamMembers ?? []).map((tm) => [tm.registration_id, teamById.get(tm.team_id) ?? null]))

  const now = new Date().toISOString()
  const rows = registrationIds.map((id) => ({ day, registration_id: id, is_present: present, marked_at: now }))
  const { error } = await admin.from("attendance").upsert(rows, { onConflict: "day,registration_id" })
  if (error) return { ok: false, error: "Could not save. Try again." }

  queueSheetsPush(
    "attendance.write",
    day,
    (regs ?? []).map((r) => {
      const team = teamByReg.get(r.id) ?? null
      return {
        team_code: team?.team_code ?? "",
        team_name: team?.team_name ?? "Unassigned",
        member_key: r.id,
        name: r.name,
        reg_no: r.reg_no,
        present,
        marked_at: now,
      }
    })
  )
  return { ok: true }
}

export async function resyncAttendanceToSheetsAction(day: number): Promise<AttendanceWriteResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }
  if (!(await sheetsWebhookConfigured())) return { ok: false, error: "No Google Sheet connected yet — connect one above." }

  const state = await buildState(day)
  const rows = toSheetRows(state.members ?? [])

  const ok = await pushAttendanceToSheets("attendance.resync", day, rows)
  if (!ok) return { ok: false, error: "The sheet did not confirm the sync. Check the Apps Script deployment and try again." }

  const admin = createAdminClient()
  await admin.from("admin_audit").insert({
    actor_user_id: user.id,
    actor_email: user.email ?? "",
    action: "attendance.sheets_resync",
    target: `day ${day}`,
    details: { rows: rows.length } as never,
  }).then(() => undefined, () => undefined)

  revalidatePath("/admin/attendance")
  return { ok: true }
}

export interface ConnectSheetsResult {
  ok: boolean
  error?: string
  message?: string
}

export async function connectSheetsWebhookAction(_prev: ConnectSheetsResult, formData: FormData): Promise<ConnectSheetsResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const url = String(formData.get("webhookUrl") ?? "").trim()
  if (!url) return { ok: false, error: "Paste the Apps Script web app URL first." }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) {
    return { ok: false, error: "That doesn't look like a Google Apps Script web app URL (should end in /exec)." }
  }

  // Ping first with an empty payload — cheap and fast, so a slow Apps Script
  // cold start (common on the very first hit after deploying it) doesn't get
  // compounded by also building and shipping the full attendance snapshot.
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "attendance.resync", day: 1, rows: [] }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return { ok: false, error: `Sheet did not confirm (HTTP ${res.status}). Check the Apps Script deployment (Execute as: Me, Access: Anyone) and try again.` }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError"
    return {
      ok: false,
      error: timedOut
        ? "The sheet took too long to respond (Apps Script cold start). This is usually a one-off — try Connect again."
        : "Could not reach that URL. Check it's the deployed web app URL and try again.",
    }
  }

  await setSheetsWebhookUrl(url)
  const admin = createAdminClient()
  await admin.from("admin_audit").insert({
    actor_user_id: user.id,
    actor_email: user.email ?? "",
    action: "attendance.sheets_connect",
    target: "webhook",
    details: {} as never,
  }).then(() => undefined, () => undefined)

  // Now that the sheet answered, do the real first sync (both days) in the
  // background so the admin isn't stuck waiting on it too.
  await queueRosterChangeResync()

  revalidatePath("/admin/attendance")
  return { ok: true, message: "Connected — syncing both days now. Every tick mirrors live from here." }
}

export async function disconnectSheetsWebhookAction(): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  await setSheetsWebhookUrl(null)
  const admin = createAdminClient()
  await admin.from("admin_audit").insert({
    actor_user_id: user.id,
    actor_email: user.email ?? "",
    action: "attendance.sheets_disconnect",
    target: "webhook",
    details: {} as never,
  }).then(() => undefined, () => undefined)
  revalidatePath("/admin/attendance")
}
