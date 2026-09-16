"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getSessionUser, isAdmin } from "@/lib/auth"
import type { WinnersEntry } from "@/lib/database.types"
import type { RollResult } from "@/components/case-opener"
import { queueRosterChangeResync } from "@/lib/actions/attendance"
import { pushScoresToSheets, setScoresSheetsWebhookUrl, scoresSheetsWebhookConfigured, type SheetsScoreRow } from "@/lib/sheets"
import { after } from "next/server"
import { sanitizeFileName, imageFileError, imageMagicError } from "@/lib/validate"
import type { User } from "@supabase/supabase-js"

export interface ActionResult {
  ok: boolean
  error?: string
  message?: string
}

export type ResetPasswordResult = ActionResult

export interface ImportScoresResult extends ActionResult {
  savedCount?: number
  errors?: string[]
}

async function requireAdminAction(): Promise<User | null> {
  const user = await getSessionUser()
  if (!user) return null
  if (!(await isAdmin(user.id))) return null
  return user
}

async function audit(
  admin: ReturnType<typeof createAdminClient>,
  user: User | null,
  action: string,
  target = "",
  details?: Record<string, unknown>
) {
  if (!user) return
  await admin
    .from("admin_audit")
    .insert({
      actor_user_id: user.id,
      actor_email: user.email ?? "",
      action,
      target,
      details: (details ?? null) as never,
    })
    .then(() => undefined, () => undefined)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROUNDS = ["round1", "round2", "final"] as const
type Round = (typeof ROUNDS)[number]

export async function adminRollForTeamAction(teamId: string): Promise<RollResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("team_code").eq("id", teamId).maybeSingle()
  if (!team) return { ok: false, error: "Team not found." }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("roll_problem_statement_for", { p_team_id: teamId })
  if (error) {
    const msg = error.message.includes("ROLL_POOL_EMPTY")
      ? "All problem statements are taken. Add more in Problems."
      : error.message.includes("ROLL_NOT_ELIGIBLE")
        ? "This team is not eligible to roll."
        : "Could not roll. Try again."
    return { ok: false, error: msg }
  }

  const ps = (data ?? [])[0]
  await audit(admin, user, "roll.stage", team.team_code, { ps: ps?.code })
  revalidatePath("/admin/roll")
  revalidatePath("/admin")
  revalidatePath("/dashboard/problem-statement")
  revalidatePath("/dashboard")
  return ps ? { ok: true, ps } : { ok: false, error: "Could not roll. Try again." }
}

export interface AddRegistrationResult extends ActionResult {
  registrationId?: string
}

// On-spot registration: OC types someone in directly (no register-site form,
// no waiting for the sheet poll). They can self-serve signup with this reg_no
// immediately, or an admin can fold them straight into a walk-in team below.
export async function adminAddRegistrationAction(_prev: AddRegistrationResult, formData: FormData): Promise<AddRegistrationResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  const regNo = String(formData.get("regNo") ?? "").trim().toUpperCase().slice(0, 30)
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 20)
  const email = String(formData.get("email") ?? "").trim().toLowerCase()

  if (!name) return { ok: false, error: "Name is required." }
  if (!regNo) return { ok: false, error: "Registration number is required." }
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "That email doesn't look right — leave it blank or fix it." }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("registrations")
    .insert({ name, reg_no: regNo, phone, email })
    .select("id")
    .single()
  if (error) {
    return { ok: false, error: error.message.includes("duplicate") ? `Registration number ${regNo} already exists.` : error.message }
  }

  await audit(admin, user, "registration.add_walkin", regNo, { name, email })
  await queueRosterChangeResync()
  revalidatePath("/admin/teams")
  return {
    ok: true,
    registrationId: data.id,
    message: email
      ? `${name} (${regNo}) registered.`
      : `${name} (${regNo}) registered — no email yet, so they can't self-signup until one's added.`,
  }
}

export interface AdminCreateTeamResult extends ActionResult {
  team_code?: string
}

export async function adminCreateTeamAction(_prev: AdminCreateTeamResult, formData: FormData): Promise<AdminCreateTeamResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const teamName = String(formData.get("teamName") ?? "").trim().slice(0, 120)
  let registrationIds: string[] = []
  try {
    registrationIds = JSON.parse(String(formData.get("registrationIds") ?? "[]"))
    if (!Array.isArray(registrationIds)) throw new Error()
  } catch {
    return { ok: false, error: "Invalid member selection." }
  }
  if (!teamName) return { ok: false, error: "Team name is required." }
  if (registrationIds.length < 2 || registrationIds.length > 4) return { ok: false, error: "Teams must have 2-4 members." }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("admin_create_team_with_members", {
    p_team_name: teamName,
    p_registration_ids: registrationIds,
  })
  if (error) {
    const msg = error.message.includes("ALREADY_ON_A_TEAM")
      ? "One of the selected people is already on a team."
      : error.message.includes("REGISTRATION_NOT_FOUND")
        ? "One of the selected people couldn't be found."
        : "Could not create the team."
    return { ok: false, error: msg }
  }

  await audit(admin, user, "team.add_walkin", data?.team_code ?? teamName, { members: registrationIds.length })
  await queueRosterChangeResync()
  revalidatePath("/admin/teams")
  return { ok: true, team_code: data?.team_code, message: `Team ${data?.team_code} created.` }
}

export interface WalkinPersonInput {
  name: string
  regNo: string
  phone: string
  email: string
}

// One-stop walk-in desk tool: registers (or reuses) each person's
// registration row, then forms a team from them in one go — for people who
// show up on the day with no prior registration and want to be teamed up
// on the spot.
export async function adminWalkinTeamAction(_prev: AdminCreateTeamResult, formData: FormData): Promise<AdminCreateTeamResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const teamName = String(formData.get("teamName") ?? "").trim().slice(0, 120)
  let people: WalkinPersonInput[]
  try {
    people = JSON.parse(String(formData.get("people") ?? "[]"))
    if (!Array.isArray(people)) throw new Error()
  } catch {
    return { ok: false, error: "Invalid member data." }
  }
  if (!teamName) return { ok: false, error: "Team name is required." }
  if (people.length < 2 || people.length > 4) return { ok: false, error: "Teams must have 2-4 members." }

  const admin = createAdminClient()
  const registrationIds: string[] = []

  for (const p of people) {
    const name = String(p.name ?? "").trim().slice(0, 120)
    const regNo = String(p.regNo ?? "").trim().toUpperCase().slice(0, 30)
    const phone = String(p.phone ?? "").trim().slice(0, 20)
    const email = String(p.email ?? "").trim().toLowerCase()
    if (!name || !regNo) return { ok: false, error: `Every member needs a name and registration number (missing for one entry).` }
    if (email && !EMAIL_RE.test(email)) return { ok: false, error: `That email doesn't look right for ${name || regNo} — leave it blank or fix it.` }

    const { data: existing } = await admin.from("registrations").select("id").eq("reg_no", regNo).maybeSingle()
    if (existing) {
      registrationIds.push(existing.id)
      continue
    }
    const { data: created, error: insertErr } = await admin
      .from("registrations")
      .insert({ name, reg_no: regNo, phone, email })
      .select("id")
      .single()
    if (insertErr || !created) return { ok: false, error: `Could not register ${name} (${regNo}).` }
    registrationIds.push(created.id)
  }

  const { data: team, error } = await admin.rpc("admin_create_team_with_members", {
    p_team_name: teamName,
    p_registration_ids: registrationIds,
  })
  if (error) {
    const msg = error.message.includes("ALREADY_ON_A_TEAM")
      ? "One of these people is already on a team."
      : "Could not create the team."
    return { ok: false, error: msg }
  }

  await audit(admin, user, "team.add_walkin", team?.team_code ?? teamName, { members: people.length })
  await queueRosterChangeResync()
  revalidatePath("/admin/teams")
  return { ok: true, team_code: team?.team_code, message: `Team ${team?.team_code} created with ${people.length} members.` }
}

export async function adminMoveTeamMemberAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const registrationId = String(formData.get("registrationId") ?? "")
  const newTeamIdRaw = String(formData.get("newTeamId") ?? "")
  if (!registrationId) return { ok: false, error: "Missing registration." }
  if (newTeamIdRaw === "__noop__") return { ok: true }
  const newTeamId = newTeamIdRaw === "__unassign__" ? null : newTeamIdRaw

  const admin = createAdminClient()
  const { error } = await admin.rpc("admin_move_team_member", { p_registration_id: registrationId, p_new_team_id: newTeamId })
  if (error) {
    const msg = error.message.includes("TEAM_FULL") ? "That team already has 4 members." : "Could not move that person."
    return { ok: false, error: msg }
  }

  await audit(admin, user, "team_member.move", registrationId, { newTeamId })
  await queueRosterChangeResync()
  revalidatePath("/admin/teams")
  return { ok: true }
}

export async function connectScoresSheetsWebhookAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const url = String(formData.get("webhookUrl") ?? "").trim()
  if (!url) return { ok: false, error: "Paste the Apps Script web app URL first." }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) {
    return { ok: false, error: "That doesn't look like a Google Apps Script web app URL (should end in /exec)." }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "scores.resync", rows: [] }),
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

  await setScoresSheetsWebhookUrl(url)
  const admin = createAdminClient()
  await audit(admin, user, "scores.sheets_connect", "webhook")

  for (const round of ROUNDS) {
    const rows = await buildScoresSheetRows(admin, round)
    await pushScoresToSheets("scores.resync", rows)
  }

  revalidatePath("/admin/scoring")
  return { ok: true, message: "Connected — every save, import, or publish now mirrors to the sheet." }
}

export async function disconnectScoresSheetsWebhookAction(): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  await setScoresSheetsWebhookUrl(null)
  const admin = createAdminClient()
  await audit(admin, user, "scores.sheets_disconnect", "webhook")
  revalidatePath("/admin/scoring")
}

export async function resyncScoresToSheetsAction(round: string): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!ROUNDS.includes(round as Round)) return { ok: false, error: "Invalid round." }
  if (!(await scoresSheetsWebhookConfigured())) return { ok: false, error: "No Google Sheet connected yet — connect one above." }

  const admin = createAdminClient()
  const rows = await buildScoresSheetRows(admin, round)
  const ok = await pushScoresToSheets("scores.resync", rows)
  if (!ok) return { ok: false, error: "The sheet did not confirm the sync. Check the Apps Script deployment and try again." }

  await audit(admin, user, "scores.sheets_resync", round, { rows: rows.length })
  revalidatePath("/admin/scoring")
  return { ok: true }
}

const TEMPLATE_EXTS = [".ppt", ".pptx", ".pdf"]
const MAX_TEMPLATE_BYTES = 30 * 1024 * 1024

export interface UploadPptTemplateResult extends ActionResult {
  path?: string
}

export async function uploadPptTemplateAction(_prev: UploadPptTemplateResult, formData: FormData): Promise<UploadPptTemplateResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload." }

  const lower = file.name.toLowerCase()
  const ext = TEMPLATE_EXTS.find((e) => lower.endsWith(e))
  if (!ext) return { ok: false, error: "Only .ppt, .pptx or .pdf files are allowed." }
  if (file.size > MAX_TEMPLATE_BYTES) return { ok: false, error: "File is larger than 30 MB." }

  const admin = createAdminClient()
  const { data: existing } = await admin.from("event_settings").select("value").eq("key", "ppt_template_path").maybeSingle()
  const oldPath = typeof existing?.value === "string" ? existing.value : null

  const path = `template${ext}`
  const { error: upErr } = await admin.storage.from("templates").upload(path, file, { upsert: true })
  if (upErr) return { ok: false, error: "Upload failed. Try again." }

  if (oldPath && oldPath !== path) {
    await admin.storage.from("templates").remove([oldPath]).catch(() => {})
  }

  await admin.from("event_settings").upsert({ key: "ppt_template_path", value: path as never }, { onConflict: "key" })
  await audit(admin, user, "ppt_template.upload", path, { fileName: sanitizeFileName(file.name), size: file.size })
  revalidatePath("/admin/settings")
  revalidatePath("/dashboard/submit/round1")
  return { ok: true, path, message: "Template updated — teams will see the new file immediately." }
}

export async function setCertificatesPublishedAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const published = String(formData.get("published") ?? "") === "true"
  const admin = createAdminClient()
  await admin.from("event_settings").upsert({ key: "certificates_published", value: published as never }, { onConflict: "key" })
  await audit(admin, user, published ? "certificates.publish" : "certificates.unpublish")
  revalidatePath("/admin/settings")
  revalidatePath("/dashboard")
}

export async function setProjectsPublishedAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const published = String(formData.get("published") ?? "") === "true"
  const admin = createAdminClient()
  await admin.from("event_settings").upsert({ key: "projects_published", value: published as never }, { onConflict: "key" })
  await audit(admin, user, published ? "projects.publish" : "projects.unpublish")
  revalidatePath("/admin/settings")
  revalidatePath("/leaderboard")
}

export async function adminSetTeamLeaderAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const teamId = String(formData.get("teamId") ?? "")
  const registrationId = String(formData.get("registrationId") ?? "")
  if (!teamId || !registrationId) return { ok: false, error: "Missing team or member." }

  const admin = createAdminClient()
  const { error } = await admin.rpc("admin_set_team_leader", { p_team_id: teamId, p_registration_id: registrationId })
  if (error) return { ok: false, error: "Could not set leader." }

  await audit(admin, user, "team.set_leader", teamId, { registrationId })
  revalidatePath("/admin/teams")
  return { ok: true }
}

export async function setRollOpenAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const open = String(formData.get("open") ?? "") === "true"
  const admin = createAdminClient()
  await admin.from("event_settings").upsert({ key: "roll_open", value: open as never }, { onConflict: "key" })
  await audit(admin, user, open ? "roll.open" : "roll.close", undefined, undefined)
  revalidatePath("/admin")
  revalidatePath("/dashboard/problem-statement")
}

export async function setFinalOpenAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const open = String(formData.get("open") ?? "") === "true"
  const admin = createAdminClient()
  await admin.from("event_settings").upsert({ key: "final_open", value: open as never }, { onConflict: "key" })
  await audit(admin, user, open ? "final.open" : "final.close", undefined, undefined)
  revalidatePath("/admin")
  revalidatePath("/admin/final")
  revalidatePath("/dashboard/submit/final")
  revalidatePath("/dashboard")
}

export async function setGamingOpenAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const open = String(formData.get("open") ?? "") === "true"
  const admin = createAdminClient()
  await admin.from("event_settings").upsert({ key: "gaming_open", value: open as never }, { onConflict: "key" })
  await audit(admin, user, open ? "gaming.open" : "gaming.close", undefined, undefined)
  revalidatePath("/admin/gaming")
  revalidatePath("/dashboard/gaming")
  revalidatePath("/dashboard")
}

// Resets a participant's account by unlinking + deleting their auth user —
// they run through /login/setup again and pick a fresh password themselves.
// Their registration row, team membership, and everything the team has done
// is untouched; only the login credential resets.
export async function adminResetParticipantAccountAction(_prev: ResetPasswordResult, formData: FormData): Promise<ResetPasswordResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  const registrationId = String(formData.get("registrationId") ?? "")
  if (!registrationId) return { ok: false, error: "Missing registration." }

  const admin = createAdminClient()
  const { data: reg } = await admin.from("registrations").select("auth_user_id, reg_no").eq("id", registrationId).maybeSingle()
  if (!reg?.auth_user_id) return { ok: false, error: "This person hasn't signed up yet." }

  await admin.from("registrations").update({ auth_user_id: null }).eq("id", registrationId)
  await admin.auth.admin.deleteUser(reg.auth_user_id).catch(() => {})
  await audit(admin, user, "registration.reset_account", reg.reg_no)
  revalidatePath("/admin/teams")
  return { ok: true, message: `Reset — tell ${reg.reg_no} to go to /login/setup and sign up again. Their team is untouched.` }
}

export async function deleteTeamAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const teamId = String(formData.get("teamId") ?? "")
  if (!teamId) return
  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("team_code, problem_statement_id").eq("id", teamId).maybeSingle()
  const { data: subs } = await admin.from("submissions").select("storage_path").eq("team_id", teamId)
  for (const s of subs ?? []) {
    if (s.storage_path) await admin.storage.from("submissions").remove([s.storage_path]).catch(() => {})
  }
  await admin.from("teams").delete().eq("id", teamId)
  if (team?.problem_statement_id) {
    try {
      await admin.rpc("decrement_ps_taken", { ps_id: team.problem_statement_id })
    } catch {}
  }
  await audit(admin, user, "team.delete", team?.team_code ?? teamId)
  revalidatePath("/admin/teams")
}

export interface CleanupUploadsResult extends ActionResult {
  removed?: number
}

// Round 1 deck uploads go straight to storage before the DB row is written
// (begin-upload -> client PUT -> finalize). If a team closes the tab after
// the PUT but before finalizing, or the deadline passes in that gap, the
// file is stranded in storage with nothing pointing to it. Sweep round1/
// for objects no submissions row references, and remove them.
export async function cleanupOrphanedUploadsAction(): Promise<CleanupUploadsResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  const admin = createAdminClient()

  const { data: teamFolders, error: listErr } = await admin.storage.from("submissions").list("round1", { limit: 1000 })
  if (listErr) return { ok: false, error: listErr.message }

  const { data: subs } = await admin.from("submissions").select("storage_path").eq("round", "round1").not("storage_path", "is", null)
  const referenced = new Set((subs ?? []).map((s) => s.storage_path))

  let removed = 0
  for (const folder of teamFolders ?? []) {
    if (!folder.name) continue
    const prefix = `round1/${folder.name}`
    const { data: files } = await admin.storage.from("submissions").list(prefix, { limit: 1000 })
    for (const f of files ?? []) {
      if (!f.name) continue
      const fullPath = `${prefix}/${f.name}`
      if (referenced.has(fullPath)) continue
      const { error } = await admin.storage.from("submissions").remove([fullPath])
      if (!error) removed++
    }
  }

  await audit(admin, user, "submissions.cleanup_orphans", "round1", { removed })
  revalidatePath("/admin/round1")
  return { ok: true, removed, message: removed > 0 ? `Removed ${removed} orphaned file${removed === 1 ? "" : "s"}.` : "No orphaned files found." }
}

export async function upsertProblemStatementAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const id = String(formData.get("id") ?? "")
  const code = String(formData.get("code") ?? "").trim().slice(0, 20)
  const title = String(formData.get("title") ?? "").trim().slice(0, 200)
  const description = String(formData.get("description") ?? "").trim().slice(0, 4000)
  const maxTeams = Math.max(1, Math.min(500, Number(formData.get("max_teams") ?? 1) || 1))
  const isActive = formData.get("is_active") === "on" || formData.get("is_active") === "true"

  if (!code || !title) return { ok: false, error: "Code and title are required." }

  const admin = createAdminClient()
  const { error } = id
    ? await admin.from("problem_statements").update({ code, title, description, max_teams: maxTeams, is_active: isActive }).eq("id", Number(id))
    : await admin.from("problem_statements").insert({ code, title, description, max_teams: maxTeams, is_active: isActive })

  if (error) return { ok: false, error: error.message.includes("duplicate") ? "A problem statement with this code already exists." : error.message }
  await audit(admin, user, id ? "ps.update" : "ps.create", code, { max_teams: maxTeams, is_active: isActive })
  revalidatePath("/admin/problem-statements")
  return { ok: true, message: id ? "Problem statement updated." : "Problem statement added." }
}

export async function deleteProblemStatementAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const id = Number(formData.get("id") ?? 0)
  if (!id) return
  const admin = createAdminClient()
  const { data: ps } = await admin.from("problem_statements").select("code, taken_count").eq("id", id).maybeSingle()
  if (ps && ps.taken_count > 0) {
    await admin.from("problem_statements").update({ is_active: false }).eq("id", id)
    await audit(admin, user, "ps.deactivate", ps.code)
  } else {
    await admin.from("problem_statements").delete().eq("id", id)
    await audit(admin, user, "ps.delete", ps?.code ?? String(id))
  }
  revalidatePath("/admin/problem-statements")
}

async function roundIsPublished(admin: ReturnType<typeof createAdminClient>, round: string): Promise<boolean> {
  const { data } = await admin.from("leaderboard_visibility").select("is_published").eq("round", round).maybeSingle()
  return !!data?.is_published
}

async function buildScoresSheetRows(admin: ReturnType<typeof createAdminClient>, round: string): Promise<SheetsScoreRow[]> {
  const [{ data: teams }, { data: scores }, published] = await Promise.all([
    admin.from("teams").select("id, team_code, team_name"),
    admin.from("scores").select("team_id, total_score, notes").eq("round", round),
    roundIsPublished(admin, round),
  ])
  const scoreByTeam = new Map((scores ?? []).map((s) => [s.team_id, s]))
  const now = new Date().toISOString()
  return (teams ?? []).map((t) => {
    const s = scoreByTeam.get(t.id)
    return {
      team_code: t.team_code,
      team_name: t.team_name,
      round,
      total_score: s?.total_score ?? 0,
      notes: s?.notes ?? "",
      published,
      updated_at: now,
    }
  })
}

function queueScoresSheetsPush(admin: ReturnType<typeof createAdminClient>, round: string) {
  after(async () => {
    const rows = await buildScoresSheetRows(admin, round)
    await pushScoresToSheets("scores.write", rows)
  })
}

export async function saveScoresAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const round = String(formData.get("round") ?? "")
  if (!ROUNDS.includes(round as Round)) return { ok: false, error: "Invalid round." }

  const admin = createAdminClient()
  if (await roundIsPublished(admin, round)) {
    return { ok: false, error: "This round's leaderboard is live. Unpublish it before editing scores — corrections must never happen behind a live leaderboard." }
  }

  // Field-level dirty set ("<teamId>::score" / "<teamId>::notes"), not whole
  // rows: a judge who only edited notes must never resend the score input's
  // page-load snapshot — another judge may have saved a newer score for that
  // team since this page loaded, and resending the stale value would
  // silently overwrite it (a real lost-update race under concurrent judging).
  const dirtyByTeam = new Map<string, Set<"score" | "notes">>()
  for (const entry of String(formData.get("dirtyFields") ?? "").split(",")) {
    const [teamId, field] = entry.split("::")
    if (!teamId || (field !== "score" && field !== "notes")) continue
    if (!dirtyByTeam.has(teamId)) dirtyByTeam.set(teamId, new Set())
    dirtyByTeam.get(teamId)!.add(field)
  }

  if (dirtyByTeam.size === 0) {
    return { ok: true, message: "Nothing to save — edit a score or notes first." }
  }

  const { data: existingScores } = await admin
    .from("scores")
    .select("team_id, total_score, notes")
    .eq("round", round)
    .in("team_id", [...dirtyByTeam.keys()])
  const existingByTeam = new Map((existingScores ?? []).map((s) => [s.team_id, s]))

  let saved = 0
  for (const [teamId, fields] of dirtyByTeam) {
    const existingRow = existingByTeam.get(teamId)

    let total_score: number | undefined
    if (fields.has("score")) {
      const raw = String(formData.get(`score_${teamId}`) ?? "").trim()
      if (raw) {
        const score = Number(raw)
        if (!Number.isFinite(score) || score < 0 || score > 10000) {
          return { ok: false, error: "Invalid score for a team (must be 0–10000)." }
        }
        total_score = Math.round(score * 100) / 100
      }
    }
    const notes = fields.has("notes") ? String(formData.get(`notes_${teamId}`) ?? "").trim().slice(0, 500) : undefined

    if (existingRow) {
      // Update only the columns this judge actually touched — the other
      // column is left exactly as-is in the DB, never re-sent stale.
      const patch: { total_score?: number; notes?: string } = {}
      if (total_score !== undefined) patch.total_score = total_score
      if (notes !== undefined) patch.notes = notes
      if (Object.keys(patch).length === 0) continue
      const { error } = await admin.from("scores").update(patch).eq("team_id", teamId).eq("round", round)
      if (error) return { ok: false, error: error.message }
      saved++
    } else {
      // No row yet for this team — a score is required to create one; notes
      // alone can't, so tell the judge instead of silently dropping the edit.
      if (total_score === undefined) {
        return { ok: false, error: "Enter a score before saving notes for a team that hasn't been scored yet." }
      }
      const { error } = await admin
        .from("scores")
        .upsert({ team_id: teamId, round, total_score, notes: notes ?? "" }, { onConflict: "team_id,round" })
      if (error) return { ok: false, error: error.message }
      saved++
    }
  }

  if (saved === 0) {
    return { ok: true, message: "Nothing to save — edit a score or notes first." }
  }

  await audit(admin, user, "scores.save", round, { count: saved })
  queueScoresSheetsPush(admin, round)
  revalidatePath("/admin/scoring")
  return { ok: true, message: `Saved ${saved} score${saved === 1 ? "" : "s"} for ${round}.` }
}

export async function importScoresAction(_prev: ImportScoresResult, formData: FormData): Promise<ImportScoresResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const round = String(formData.get("round") ?? "")
  if (!ROUNDS.includes(round as Round)) return { ok: false, error: "Invalid round." }

  let parsed: { team_code: string; score: string; notes: string }[]
  try {
    parsed = JSON.parse(String(formData.get("rows") ?? "[]"))
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("empty")
    if (parsed.length > 500) throw new Error("too many")
  } catch {
    return { ok: false, error: "Invalid score data." }
  }

  const admin = createAdminClient()
  if (await roundIsPublished(admin, round)) {
    return { ok: false, error: "This round's leaderboard is live. Unpublish it before editing scores." }
  }

  const { data: teams } = await admin.from("teams").select("id, team_code")
  if (!teams) return { ok: false, error: "Could not load teams." }
  const codeToId = new Map(teams.map((t) => [t.team_code.toLowerCase(), t.id]))

  const errors: string[] = []
  // Keyed by team_id so a repeated team_code (copy-paste slip in the judges'
  // export) doesn't reach Postgres twice in one upsert batch — ON CONFLICT
  // can't affect the same row twice in a single statement, which would fail
  // the whole import. Last occurrence wins; every duplicate is flagged.
  const byTeamId = new Map<string, { team_id: string; round: string; total_score: number; notes: string }>()
  for (const r of parsed) {
    const id = codeToId.get(String(r.team_code).trim().toLowerCase())
    if (!id) {
      errors.push(`Unknown team code: ${r.team_code}`)
      continue
    }
    const score = Number(r.score)
    if (!Number.isFinite(score) || score < 0 || score > 10000) {
      errors.push(`Invalid score for ${r.team_code}`)
      continue
    }
    if (byTeamId.has(id)) {
      errors.push(`Duplicate row for ${r.team_code} — only the last one in the file was used`)
    }
    byTeamId.set(id, { team_id: id, round, total_score: Math.round(score * 100) / 100, notes: String(r.notes ?? "").slice(0, 500) })
  }
  const rows = [...byTeamId.values()]

  if (rows.length === 0) {
    return { ok: false, errors, error: "No valid rows to import." }
  }

  const { error } = await admin.from("scores").upsert(rows, { onConflict: "team_id,round" })
  if (error) return { ok: false, error: error.message }

  await audit(admin, user, "scores.import", round, { imported: rows.length, rejected: errors.length })
  queueScoresSheetsPush(admin, round)
  revalidatePath("/admin/scoring")
  return {
    ok: true,
    savedCount: rows.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Imported ${rows.length} score${rows.length === 1 ? "" : "s"}${errors.length > 0 ? ` (${errors.length} skipped)` : ""}.`,
  }
}

export async function setLeaderboardPublishedAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const round = String(formData.get("round") ?? "")
  const published = String(formData.get("published") ?? "") === "true"
  if (!ROUNDS.includes(round as Round)) return

  const admin = createAdminClient()
  await admin.from("leaderboard_visibility").upsert({
    round,
    is_published: published,
    published_at: published ? new Date().toISOString() : null,
  }, { onConflict: "round" })
  await audit(admin, user, published ? "leaderboard.publish" : "leaderboard.unpublish", round)
  queueScoresSheetsPush(admin, round)
  revalidatePath("/admin/scoring")
  revalidatePath("/leaderboard")
}

export async function saveWinnersAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const title = String(formData.get("title") ?? "").trim().slice(0, 200) || "Winners"
  const publish = formData.get("publish") === "true"

  let entries: WinnersEntry[] = []
  try {
    entries = JSON.parse(String(formData.get("entries") ?? "[]"))
    if (!Array.isArray(entries) || entries.length > 50) throw new Error()
  } catch {
    return { ok: false, error: "Invalid winners data." }
  }

  const clean: WinnersEntry[] = entries
    .filter((e) => e && String(e.team_code ?? "").trim() && String(e.team_name ?? "").trim())
    .map((e, i) => ({
      position: Number(e.position) || i + 1,
      team_code: String(e.team_code).trim().slice(0, 30),
      team_name: String(e.team_name).trim().slice(0, 120),
      prize: e.prize ? String(e.prize).trim().slice(0, 120) : undefined,
    }))
    .sort((a, b) => a.position - b.position)

  const admin = createAdminClient()
  const { data: existing } = await admin.from("announcements").select("id").eq("kind", "winners").maybeSingle()

  const payload = {
    kind: "winners",
    title,
    body: clean as never,
    is_published: publish,
    published_at: publish ? new Date().toISOString() : null,
  }

  const { error } = existing
    ? await admin.from("announcements").update(payload).eq("id", existing.id)
    : await admin.from("announcements").insert(payload)

  if (error) return { ok: false, error: error.message }
  await audit(admin, user, "winners.save", undefined, { publish, entries: clean.length })
  revalidatePath("/admin/announce-winners")
  revalidatePath("/leaderboard")
  return { ok: true, message: publish ? "Winners published." : "Winners saved (not published)." }
}

export async function saveNoticeAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const id = String(formData.get("id") ?? "")
  const title = String(formData.get("title") ?? "").trim().slice(0, 200)
  const text = String(formData.get("text") ?? "").trim().slice(0, 2000)

  if (!title || !text) return { ok: false, error: "Title and text are required." }

  const admin = createAdminClient()
  const { error } = id
    ? await admin.from("announcements").update({ title, body: text as never }).eq("id", id).eq("kind", "notice")
    : await admin.from("announcements").insert({ kind: "notice", title, body: text as never, is_published: false })

  if (error) return { ok: false, error: error.message }
  await audit(admin, user, id ? "notice.update" : "notice.create", title)
  revalidatePath("/admin/notices")
  revalidatePath("/dashboard")
  return { ok: true, message: id ? "Notice updated." : "Notice created (draft)." }
}

export async function setNoticePublishedAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  const published = String(formData.get("published") ?? "") === "true"
  if (!id) return

  const admin = createAdminClient()
  const { data: notice } = await admin.from("announcements").select("title").eq("id", id).eq("kind", "notice").maybeSingle()
  await admin.from("announcements").update({
    is_published: published,
    published_at: published ? new Date().toISOString() : null,
  }).eq("id", id).eq("kind", "notice")
  await audit(admin, user, published ? "notice.publish" : "notice.unpublish", notice?.title ?? id)
  revalidatePath("/admin/notices")
  revalidatePath("/dashboard")
}

export async function deleteNoticeAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const admin = createAdminClient()
  const { data: notice } = await admin.from("announcements").select("title").eq("id", id).eq("kind", "notice").maybeSingle()
  await admin.from("announcements").delete().eq("id", id).eq("kind", "notice")
  await audit(admin, user, "notice.delete", notice?.title ?? id)
  revalidatePath("/admin/notices")
  revalidatePath("/dashboard")
}

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const keys = ["event_start", "ps_release_at", "round1_deadline", "final_deadline", "event_end"]
  const rows: { key: string; value: string }[] = []

  for (const k of keys) {
    const raw = String(formData.get(k) ?? "").trim()
    if (!raw) {
      rows.push({ key: k, value: "" })
      continue
    }
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return { ok: false, error: `Invalid date for ${k}.` }
    rows.push({ key: k, value: d.toISOString() })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("event_settings").upsert(rows.map((r) => ({ key: r.key, value: r.value as never })), { onConflict: "key" })
  if (error) return { ok: false, error: error.message }
  await audit(admin, user, "settings.save", undefined, Object.fromEntries(rows.map((r) => [r.key, r.value])))
  revalidatePath("/admin/settings")
  revalidatePath("/")
  revalidatePath("/dashboard")
  return { ok: true, message: "Event timing saved." }
}

export async function beginGalleryUploadAction(fileName: string, fileSize: number): Promise<UploadBeginResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  if (!/\.(jpe?g|png|webp|gif)$/i.test(fileName)) return { ok: false, error: "Only image files are allowed." }
  if (fileSize > 10 * 1024 * 1024) return { ok: false, error: "Each image must be under 10 MB." }

  const admin = createAdminClient()
  const path = `photos/${Date.now()}-${sanitizeFileName(fileName)}`
  const { data, error } = await admin.storage.from("gallery").createSignedUploadUrl(path)
  if (error || !data?.signedUrl) return { ok: false, error: "Could not start the upload. Try again." }
  return { ok: true, path, signedUrl: data.signedUrl }
}

export async function galleryUploadAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const caption = String(formData.get("caption") ?? "").trim().slice(0, 200)

  let paths: string[] = []
  try {
    paths = JSON.parse(String(formData.get("paths") ?? "[]"))
    if (!Array.isArray(paths) || paths.length === 0) throw new Error("empty")
    if (paths.length > 20) throw new Error("too many")
    if (paths.some((p) => typeof p !== "string" || !p.startsWith("photos/"))) throw new Error("bad path")
  } catch {
    return { ok: false, error: "No uploaded photos to save. Upload images first." }
  }

  const admin = createAdminClient()
  const { data: maxRow } = await admin.from("gallery_photos").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle()
  let order = (maxRow?.sort_order ?? 0) + 1
  let saved = 0

  for (const path of paths as string[]) {
    const { error: dbErr } = await admin.from("gallery_photos").insert({ storage_path: path, caption, sort_order: order++ })
    if (!dbErr) saved++
  }

  await audit(admin, user, "gallery.upload", undefined, { uploaded: saved })
  revalidatePath("/admin/gallery")
  revalidatePath("/gallery")
  return { ok: saved > 0, message: `Uploaded ${saved} photo${saved === 1 ? "" : "s"}.` }
}

export async function galleryDeleteAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const admin = createAdminClient()
  const { data: photo } = await admin.from("gallery_photos").select("storage_path").eq("id", id).maybeSingle()
  if (!photo) return
  await admin.from("gallery_photos").delete().eq("id", id)
  await admin.storage.from("gallery").remove([photo.storage_path]).catch(() => {})
  await audit(admin, user, "gallery.delete", id)
  revalidatePath("/admin/gallery")
  revalidatePath("/gallery")
}

const PEOPLE_KINDS = ["oc", "speaker"] as const
type PeopleKind = (typeof PEOPLE_KINDS)[number]

export interface UploadBeginResult {
  ok: boolean
  path?: string
  signedUrl?: string
  error?: string
}

export async function beginPersonPhotoUploadAction(fileName: string, fileSize: number): Promise<UploadBeginResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  const imgError = imageFileError(fileName, fileSize)
  if (imgError) return { ok: false, error: imgError }

  const admin = createAdminClient()
  const path = `people/${Date.now()}-${sanitizeFileName(fileName)}`
  const { data, error } = await admin.storage.from("people").createSignedUploadUrl(path)
  if (error || !data?.signedUrl) return { ok: false, error: "Could not start the photo upload. Try again." }
  return { ok: true, path, signedUrl: data.signedUrl }
}

export async function upsertPersonAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const id = String(formData.get("id") ?? "")
  const kind = String(formData.get("kind") ?? "")
  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  const role = String(formData.get("role") ?? "").trim().slice(0, 120)
  const tagline = String(formData.get("tagline") ?? "").trim().slice(0, 400)
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => t.slice(0, 40))
  const sortOrder = Math.max(0, Math.min(9999, Number(formData.get("sort_order") ?? 0) || 0))
  const isPublished = formData.get("is_published") === "on" || formData.get("is_published") === "true"
  const photoPath = String(formData.get("photo_path") ?? "").trim()
  const removePhoto = formData.get("remove_photo") === "on"

  if (!PEOPLE_KINDS.includes(kind as PeopleKind)) return { ok: false, error: "Invalid person kind." }
  if (!name) return { ok: false, error: "Name is required." }
  if (photoPath && !photoPath.startsWith("people/")) return { ok: false, error: "Invalid photo path." }

  const admin = createAdminClient()

  if (removePhoto && id) {
    const { data: existing } = await admin.from("people").select("photo_path").eq("id", id).maybeSingle()
    const { error: clearErr } = await admin.from("people").update({ photo_path: null }).eq("id", id)
    if (clearErr) return { ok: false, error: clearErr.message }
    if (existing?.photo_path) await admin.storage.from("people").remove([existing.photo_path]).catch(() => {})
    await audit(admin, user, "person.update", name, { kind, photo_removed: true })
    revalidatePath("/admin/people")
    revalidatePath("/speakers")
    revalidatePath("/oc")
    return { ok: true, message: `${name}'s photo removed — the card shows their initials now.` }
  }

  let verifiedPhotoPath: string | null = null
  if (photoPath) {
    const { data: signedPhoto } = await admin.storage.from("people").createSignedUrl(photoPath, 60)
    if (!signedPhoto?.signedUrl) return { ok: false, error: "Uploaded photo not found. Upload it again." }
    const imgRes = await fetch(signedPhoto.signedUrl, { headers: { Range: "bytes=0-15" } })
    if (!imgRes.ok) return { ok: false, error: "Uploaded photo not found. Upload it again." }
    const imgHead = Buffer.from(await imgRes.arrayBuffer())
    const magicError = imageMagicError(photoPath, imgHead)
    if (magicError) {
      await admin.storage.from("people").remove([photoPath]).catch(() => {})
      return { ok: false, error: magicError }
    }
    const contentRange = imgRes.headers.get("content-range")
    const realSize = contentRange ? Number(contentRange.split("/")[1]) : NaN
    if (Number.isFinite(realSize) && realSize > 5 * 1024 * 1024) {
      await admin.storage.from("people").remove([photoPath]).catch(() => {})
      return { ok: false, error: "Photo is larger than 5 MB." }
    }
    verifiedPhotoPath = photoPath
    if (id) {
      const { data: existing } = await admin.from("people").select("photo_path").eq("id", id).maybeSingle()
      if (existing?.photo_path && existing.photo_path !== photoPath) {
        await admin.storage.from("people").remove([existing.photo_path]).catch(() => {})
      }
    }
  }

  const payload = {
    kind,
    name,
    role,
    tagline,
    tags: tags as never,
    sort_order: sortOrder,
    is_published: isPublished,
    ...(verifiedPhotoPath ? { photo_path: verifiedPhotoPath } : {}),
  }

  const { error } = id
    ? await admin.from("people").update(payload).eq("id", id)
    : await admin.from("people").insert(payload)

  if (error) return { ok: false, error: error.message }
  await audit(admin, user, id ? "person.update" : "person.create", name, { kind, published: isPublished })
  revalidatePath("/admin/people")
  revalidatePath("/speakers")
  revalidatePath("/oc")
  return { ok: true, message: id ? `${name} updated.` : `${name} added.` }
}

export async function clearGameSlotAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const slotId = String(formData.get("slotId") ?? "")
  if (!slotId) return
  const admin = createAdminClient()
  const { data: slot } = await admin.from("game_slots").select("game, start_time").eq("id", slotId).maybeSingle()
  await admin.from("game_slots").update({ taken_by_team_id: null, booked_at: null }).eq("id", slotId)
  await audit(admin, user, "gaming.slot_clear", `${slot?.game ?? ""} ${slot?.start_time ?? ""}`.trim())
  revalidatePath("/admin/gaming")
  revalidatePath("/dashboard/gaming")
}

export async function deletePersonAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const admin = createAdminClient()
  const { data: person } = await admin.from("people").select("name, kind, photo_path").eq("id", id).maybeSingle()
  await admin.from("people").delete().eq("id", id)
  if (person?.photo_path) await admin.storage.from("people").remove([person.photo_path]).catch(() => {})
  await audit(admin, user, "person.delete", person?.name ?? id, { kind: person?.kind })
  revalidatePath("/admin/people")
  revalidatePath("/speakers")
  revalidatePath("/oc")
}
