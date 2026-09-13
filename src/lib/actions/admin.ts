"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser, isAdmin } from "@/lib/auth"
import type { TeamMember, WinnersEntry } from "@/lib/database.types"
import { genPassword } from "@/lib/csv"
import { sanitizeFileName, imageFileError, imageMagicError } from "@/lib/validate"
import type { User } from "@supabase/supabase-js"

export interface ActionResult {
  ok: boolean
  error?: string
  message?: string
}

export interface ImportPayloadTeam {
  key: string
  team_code: string
  team_name: string
  leaderIndex: number
  members: {
    member_id: string | null
    name: string
    email: string | null
    phone: string | null
    college: string | null
    payment_status: string | null
    college_type: string | null
  }[]
}

export interface ImportResult extends ActionResult {
  credentials?: { team_code: string; team_name: string; email: string; password: string }[]
  createdCount?: number
  errors?: string[]
}

export interface ResetPasswordResult extends ActionResult {
  password?: string
}

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
const ROUNDS = ["round1", "final"] as const
type Round = (typeof ROUNDS)[number]

export async function importTeamsConfirmAction(_prev: ImportResult, formData: FormData): Promise<ImportResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  let teams: ImportPayloadTeam[]
  try {
    teams = JSON.parse(String(formData.get("payload") ?? "[]"))
    if (!Array.isArray(teams) || teams.length === 0) throw new Error("empty")
    if (teams.length > 500) throw new Error("too many")
  } catch {
    return { ok: false, error: "Invalid import payload. Re-upload the CSV." }
  }

  const admin = createAdminClient()
  const { data: existingCodes } = await admin.from("teams").select("team_code")
  const takenCodes = new Set((existingCodes ?? []).map((r) => r.team_code.toLowerCase()))
  const { data: existingTeams } = await admin.from("teams").select("leader_email")
  const takenEmails = new Set((existingTeams ?? []).map((r) => r.leader_email.toLowerCase()))

  const credentials: ImportResult["credentials"] = []
  const errors: string[] = []
  let created = 0

  for (const t of teams) {
    const label = t.team_name || t.key || "team"
    const leaderIdx = Number(t.leaderIndex)
    const members = Array.isArray(t.members) ? t.members : []
    const leader = Number.isInteger(leaderIdx) ? members[leaderIdx] : undefined
    const leaderEmail = leader?.email?.toLowerCase() ?? ""

    if (!leader || !EMAIL_RE.test(leaderEmail)) {
      errors.push(`${label}: leader has no valid email — skipped`)
      continue
    }
    if (takenEmails.has(leaderEmail)) {
      errors.push(`${label}: ${leaderEmail} already has an account — skipped`)
      continue
    }

    let code = (t.team_code || `T-${sanitizeFileName(t.key) || created + 1}`).slice(0, 30)
    let candidate = code
    let n = 2
    while (takenCodes.has(candidate.toLowerCase())) candidate = `${code}-${n++}`
    code = candidate

    const password = genPassword()
    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email: leaderEmail,
      password,
      email_confirm: true,
      user_metadata: { team_code: code, role: "team" },
    })
    if (authErr || !authUser?.user) {
      errors.push(`${label}: ${authErr?.message ?? "could not create login"}`)
      continue
    }

    const membersJson: TeamMember[] = members.map((m) => ({
      member_id: m.member_id ?? null,
      name: String(m.name ?? "").slice(0, 120),
      email: m.email ?? null,
      phone: m.phone ?? null,
      college: m.college ?? null,
      payment_status: m.payment_status ?? null,
      college_type: m.college_type ?? null,
    }))

    const { error: teamErr } = await admin.from("teams").insert({
      team_code: code,
      team_name: String(t.team_name || label).slice(0, 120),
      members: membersJson as never,
      leader_email: leaderEmail,
      auth_user_id: authUser.user.id,
      status: "registered",
    })
    if (teamErr) {
      await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {})
      errors.push(`${label}: ${teamErr.message}`)
      continue
    }

    takenCodes.add(code.toLowerCase())
    takenEmails.add(leaderEmail)
    credentials.push({ team_code: code, team_name: t.team_name || label, email: leaderEmail, password })
    created++
  }

  await audit(admin, user, "teams.import", `${created} teams`, { created, skipped: errors.length })

  revalidatePath("/admin/teams")
  revalidatePath("/admin/round1")
  return { ok: created > 0, createdCount: created, credentials, errors }
}

export async function updateTeamLeaderEmailAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const teamId = String(formData.get("teamId") ?? "")
  const newEmail = String(formData.get("email") ?? "").trim().toLowerCase()
  if (!teamId) return { ok: false, error: "Missing team." }
  if (!EMAIL_RE.test(newEmail)) return { ok: false, error: "Enter a valid email address." }

  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("auth_user_id, team_code, leader_email, members").eq("id", teamId).maybeSingle()
  if (!team) return { ok: false, error: "Team not found." }
  if (team.leader_email === newEmail) return { ok: false, error: "That is already the leader's email." }
  if (!team.auth_user_id) return { ok: false, error: "Team has no linked login." }

  const { data: clash } = await admin.from("teams").select("team_code").eq("leader_email", newEmail).maybeSingle()
  if (clash) return { ok: false, error: `That email already belongs to ${clash.team_code}.` }

  const { error: authErr } = await admin.auth.admin.updateUserById(team.auth_user_id, { email: newEmail, email_confirm: true })
  if (authErr) return { ok: false, error: authErr.message }

  const members = Array.isArray(team.members) ? (team.members as unknown as TeamMember[]) : []
  const fixedMembers = members.some((m) => m.email === newEmail)
    ? members
    : members.map((m) => (m.email === team.leader_email ? { ...m, email: newEmail } : m))

  const { error: dbErr } = await admin
    .from("teams")
    .update({ leader_email: newEmail, members: (fixedMembers.length > 0 ? fixedMembers : members) as never })
    .eq("id", teamId)
  if (dbErr) return { ok: false, error: dbErr.message }

  await audit(admin, user, "team.leader_email", team.team_code, { from: team.leader_email, to: newEmail })
  revalidatePath("/admin/teams")
  return { ok: true, message: `Leader email for ${team.team_code} is now ${newEmail}. Their password is unchanged.` }
}

export interface ManualMemberInput {
  name: string
  email?: string | null
  phone?: string | null
  college?: string | null
}

export interface AddTeamResult extends ActionResult {
  password?: string
  team_code?: string
}

export async function addTeamManualAction(_prev: AddTeamResult, formData: FormData): Promise<AddTeamResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const teamName = String(formData.get("teamName") ?? "").trim().slice(0, 120)
  const leaderName = String(formData.get("leaderName") ?? "").trim().slice(0, 120)
  const leaderEmail = String(formData.get("leaderEmail") ?? "").trim().toLowerCase()
  const leaderPhone = String(formData.get("leaderPhone") ?? "").trim().slice(0, 20) || null
  const leaderCollege = String(formData.get("leaderCollege") ?? "").trim().slice(0, 120) || null

  if (!teamName) return { ok: false, error: "Team name is required." }
  if (!leaderName) return { ok: false, error: "Leader name is required." }
  if (!EMAIL_RE.test(leaderEmail)) return { ok: false, error: "Enter a valid leader email." }

  let extraMembers: ManualMemberInput[] = []
  try {
    extraMembers = JSON.parse(String(formData.get("members") ?? "[]"))
    if (!Array.isArray(extraMembers) || extraMembers.length > 10) throw new Error()
  } catch {
    return { ok: false, error: "Invalid members data." }
  }

  const admin = createAdminClient()
  const { data: clash } = await admin.from("teams").select("team_code").eq("leader_email", leaderEmail).maybeSingle()
  if (clash) return { ok: false, error: `That email already belongs to ${clash.team_code}.` }

  let teamCode = String(formData.get("teamCode") ?? "").trim().replace(/[^A-Za-z0-9-]/g, "").slice(0, 24)
  if (!teamCode) {
    const { count } = await admin.from("teams").select("id", { count: "exact", head: true })
    teamCode = `T-${String((count ?? 0) + 1).padStart(3, "0")}`
  }
  const { data: codeClash } = await admin.from("teams").select("team_code").eq("team_code", teamCode).maybeSingle()
  if (codeClash) return { ok: false, error: `Team code ${teamCode} is already taken — pick another.` }

  const password = genPassword()
  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email: leaderEmail,
    password,
    email_confirm: true,
    user_metadata: { team_code: teamCode, role: "team" },
  })
  if (authErr || !authUser?.user) return { ok: false, error: authErr?.message ?? "Could not create login." }

  const membersJson: TeamMember[] = [
    { name: leaderName, email: leaderEmail, phone: leaderPhone, college: leaderCollege },
    ...extraMembers
      .filter((m) => m && String(m.name ?? "").trim())
      .map((m) => ({
        name: String(m.name).trim().slice(0, 120),
        email: m.email ? String(m.email).trim().toLowerCase() : null,
        phone: m.phone ? String(m.phone).trim().slice(0, 20) : null,
        college: m.college ? String(m.college).trim().slice(0, 120) : null,
      })),
  ]

  const { error: teamErr } = await admin.from("teams").insert({
    team_code: teamCode,
    team_name: teamName,
    members: membersJson as never,
    leader_email: leaderEmail,
    auth_user_id: authUser.user.id,
    status: "registered",
  })
  if (teamErr) {
    await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {})
    return { ok: false, error: teamErr.message }
  }

  await audit(admin, user, "team.add_manual", teamCode, { leader: leaderEmail })
  revalidatePath("/admin/teams")
  revalidatePath("/admin/round1")
  return { ok: true, team_code: teamCode, password, message: `Team ${teamCode} created. Login: ${leaderEmail}` }
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

export async function resetTeamPasswordAction(_prev: ResetPasswordResult, formData: FormData): Promise<ResetPasswordResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }
  const teamId = String(formData.get("teamId") ?? "")
  if (!teamId) return { ok: false, error: "Missing team." }

  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("auth_user_id, team_code, leader_email").eq("id", teamId).maybeSingle()
  if (!team?.auth_user_id) return { ok: false, error: "Team has no linked login." }

  const password = genPassword()
  const { error } = await admin.auth.admin.updateUserById(team.auth_user_id, { password })
  if (error) return { ok: false, error: error.message }
  await audit(admin, user, "team.reset_password", team.team_code)
  revalidatePath("/admin/teams")
  return { ok: true, password, message: `New password for ${team.team_code} (${team.leader_email}):` }
}

export async function deleteTeamAction(formData: FormData): Promise<void> {
  const user = await requireAdminAction()
  if (!user) return
  const teamId = String(formData.get("teamId") ?? "")
  if (!teamId) return
  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("auth_user_id, team_code, problem_statement_id").eq("id", teamId).maybeSingle()
  await admin.from("teams").delete().eq("id", teamId)
  if (team?.problem_statement_id) {
    try {
      await admin.rpc("decrement_ps_taken", { ps_id: team.problem_statement_id })
    } catch {}
  }
  if (team?.auth_user_id) await admin.auth.admin.deleteUser(team.auth_user_id).catch(() => {})
  await audit(admin, user, "team.delete", team?.team_code ?? teamId)
  revalidatePath("/admin/teams")
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

export async function saveScoresAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireAdminAction()
  if (!user) return { ok: false, error: "Admins only." }

  const round = String(formData.get("round") ?? "")
  if (!ROUNDS.includes(round as Round)) return { ok: false, error: "Invalid round." }

  const admin = createAdminClient()
  if (await roundIsPublished(admin, round)) {
    return { ok: false, error: "This round's leaderboard is live. Unpublish it before editing scores — corrections must never happen behind a live leaderboard." }
  }

  const { data: teams } = await admin.from("teams").select("id").order("team_code")
  if (!teams) return { ok: false, error: "Could not load teams." }

  const rows: { team_id: string; round: string; total_score: number; notes: string }[] = []
  for (const t of teams) {
    const raw = String(formData.get(`score_${t.id}`) ?? "").trim()
    const notes = String(formData.get(`notes_${t.id}`) ?? "").trim().slice(0, 500)
    if (!raw) continue
    const score = Number(raw)
    if (!Number.isFinite(score) || score < 0 || score > 10000) {
      return { ok: false, error: "Invalid score for a team (must be 0–10000)." }
    }
    rows.push({ team_id: t.id, round, total_score: Math.round(score * 100) / 100, notes })
  }

  if (rows.length > 0) {
    const { error } = await admin.from("scores").upsert(rows, { onConflict: "team_id,round" })
    if (error) return { ok: false, error: error.message }
  }
  await audit(admin, user, "scores.save", round, { count: rows.length })
  revalidatePath("/admin/scoring")
  return { ok: true, message: `Saved ${rows.length} score${rows.length === 1 ? "" : "s"} for ${round}.` }
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
  const rows: { team_id: string; round: string; total_score: number; notes: string }[] = []
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
    rows.push({ team_id: id, round, total_score: Math.round(score * 100) / 100, notes: String(r.notes ?? "").slice(0, 500) })
  }

  if (rows.length === 0) {
    return { ok: false, errors, error: "No valid rows to import." }
  }

  const { error } = await admin.from("scores").upsert(rows, { onConflict: "team_id,round" })
  if (error) return { ok: false, error: error.message }

  await audit(admin, user, "scores.import", round, { imported: rows.length, rejected: errors.length })
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

  if (!PEOPLE_KINDS.includes(kind as PeopleKind)) return { ok: false, error: "Invalid person kind." }
  if (!name) return { ok: false, error: "Name is required." }
  if (photoPath && !photoPath.startsWith("people/")) return { ok: false, error: "Invalid photo path." }

  const admin = createAdminClient()

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
