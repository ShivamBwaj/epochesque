"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser, isAdmin } from "@/lib/auth"
import { memberKeyOf, type TeamMember } from "@/lib/database.types"
import { pushAttendanceToSheets, setSheetsWebhookUrl, sheetsWebhookConfigured, type SheetsAttendanceRow } from "@/lib/sheets"

export interface AttendanceMemberState {
  teamId: string
  teamCode: string
  teamName: string
  memberKey: string
  name: string
  regNo: string
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
  const [{ data: teams }, { data: rows }] = await Promise.all([
    admin.from("teams").select("id, team_code, team_name, members").order("team_code"),
    admin.from("attendance").select("team_id, member_key, is_present").eq("day", day),
  ])
  const presentSet = new Set(
    (rows ?? []).filter((r) => r.is_present).map((r) => `${r.team_id}|${r.member_key}`)
  )
  const members: AttendanceMemberState[] = []
  for (const t of teams ?? []) {
    const list = Array.isArray(t.members) ? (t.members as unknown as TeamMember[]) : []
    for (const m of list) {
      const key = memberKeyOf(m)
      members.push({
        teamId: t.id,
        teamCode: t.team_code,
        teamName: t.team_name,
        memberKey: key,
        name: m.name ?? "",
        regNo: m.member_id ?? "",
        present: presentSet.has(`${t.id}|${key}`),
      })
    }
  }
  return { ok: true, members }
}

export async function fetchAttendanceStateAction(day: number): Promise<AttendanceStateResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }
  return buildState(day)
}

function memberRows(
  team: { id: string; members: unknown },
  present: boolean
): { team_id: string; member_key: string; member_name: string; reg_no: string; is_present: boolean }[] {
  const list = Array.isArray(team.members) ? (team.members as unknown as TeamMember[]) : []
  return list.map((m) => ({
    team_id: team.id,
    member_key: memberKeyOf(m),
    member_name: (m.name ?? "").slice(0, 120),
    reg_no: (m.member_id ?? "").slice(0, 60),
    is_present: present,
  }))
}

function queueSheetsPush(type: "attendance.write" | "attendance.resync", day: number, rows: SheetsAttendanceRow[]) {
  if (rows.length === 0) return
  after(async () => {
    await pushAttendanceToSheets(type, day, rows)
  })
}

// Call after anything that changes the team roster (add/import) so a newly
// added team isn't a blind spot in the sheet until someone happens to mark
// their attendance or hits the manual Re-sync button. No-ops fast if no
// sheet is connected — pushAttendanceToSheets checks that internally.
export async function queueRosterChangeResync() {
  after(async () => {
    for (const day of [1, 2]) {
      const state = await buildState(day)
      const rows: SheetsAttendanceRow[] = (state.members ?? []).map((m) => ({
        team_code: m.teamCode,
        team_name: m.teamName,
        member_key: m.memberKey,
        name: m.name,
        reg_no: m.regNo,
        present: m.present,
        marked_at: new Date().toISOString(),
      }))
      await pushAttendanceToSheets("attendance.resync", day, rows)
    }
  })
}

export async function setAttendanceMemberAction(
  day: number,
  teamId: string,
  memberKey: string,
  present: boolean
): Promise<AttendanceWriteResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }

  const admin = createAdminClient()
  const { data: team } = await admin
    .from("teams")
    .select("id, team_code, team_name, members")
    .eq("id", teamId)
    .maybeSingle()
  if (!team) return { ok: false, error: "Team not found." }

  const list = Array.isArray(team.members) ? (team.members as unknown as TeamMember[]) : []
  const m = list.find((x) => memberKeyOf(x) === memberKey)
  if (!m) return { ok: false, error: "Member not found." }

  const { error } = await admin.from("attendance").upsert(
    {
      day,
      team_id: teamId,
      member_key: memberKey,
      member_name: (m.name ?? "").slice(0, 120),
      reg_no: (m.member_id ?? "").slice(0, 60),
      is_present: present,
    },
    { onConflict: "day,team_id,member_key" }
  )
  if (error) return { ok: false, error: "Could not save. Try again." }

  queueSheetsPush("attendance.write", day, [
    {
      team_code: team.team_code,
      team_name: team.team_name,
      member_key: memberKey,
      name: (m.name ?? "").slice(0, 120),
      reg_no: (m.member_id ?? "").slice(0, 60),
      present,
      marked_at: new Date().toISOString(),
    },
  ])
  return { ok: true }
}

export async function setAttendanceTeamAction(
  day: number,
  teamId: string,
  present: boolean
): Promise<AttendanceWriteResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }

  const admin = createAdminClient()
  const { data: team } = await admin
    .from("teams")
    .select("id, team_code, team_name, members")
    .eq("id", teamId)
    .maybeSingle()
  if (!team) return { ok: false, error: "Team not found." }

  const rows = memberRows(team, present).map((r) => ({ ...r, day }))
  if (rows.length === 0) return { ok: true }

  const { error } = await admin.from("attendance").upsert(rows, {
    onConflict: "day,team_id,member_key",
  })
  if (error) return { ok: false, error: "Could not save. Try again." }

  queueSheetsPush(
    "attendance.write",
    day,
    rows.map((r) => ({
      team_code: team.team_code,
      team_name: team.team_name,
      member_key: r.member_key,
      name: r.member_name,
      reg_no: r.reg_no,
      present: r.is_present,
      marked_at: new Date().toISOString(),
    }))
  )
  return { ok: true }
}

export async function resyncAttendanceToSheetsAction(day: number): Promise<AttendanceWriteResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!validDay(day)) return { ok: false, error: "Invalid day." }
  if (!(await sheetsWebhookConfigured())) return { ok: false, error: "No Google Sheet connected yet — connect one above." }

  const state = await buildState(day)
  const rows: SheetsAttendanceRow[] = (state.members ?? []).map((m) => ({
    team_code: m.teamCode,
    team_name: m.teamName,
    member_key: m.memberKey,
    name: m.name,
    reg_no: m.regNo,
    present: m.present,
    marked_at: new Date().toISOString(),
  }))

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
