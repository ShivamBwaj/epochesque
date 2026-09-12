"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getSessionUser, isAdmin } from "@/lib/auth"
import { TEAM_STATUSES } from "@/lib/database.types"
import type { TeamMember, WinnersEntry } from "@/lib/database.types"
import { genPassword, sanitizeFileName } from "@/lib/csv"

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

async function requireAdminAction(): Promise<string | null> {
  const user = await getSessionUser()
  if (!user) return "Not signed in."
  if (!(await isAdmin(user.id))) return "Admins only."
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ROUNDS = ["round1", "final"] as const
type Round = (typeof ROUNDS)[number]

export async function importTeamsConfirmAction(_prev: ImportResult, formData: FormData): Promise<ImportResult> {
  const denied = await requireAdminAction()
  if (denied) return { ok: false, error: denied }

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

  revalidatePath("/admin/teams")
  revalidatePath("/admin/round1")
  return { ok: created > 0, createdCount: created, credentials, errors }
}

export async function updateTeamStatusAction(formData: FormData): Promise<void> {
  const denied = await requireAdminAction()
  if (denied) return
  const teamId = String(formData.get("teamId") ?? "")
  const status = String(formData.get("status") ?? "")
  if (!teamId || !TEAM_STATUSES.includes(status as never)) return
  const admin = createAdminClient()
  await admin.from("teams").update({ status: status as never }).eq("id", teamId)
  revalidatePath("/admin/teams")
  revalidatePath("/admin/round1")
  revalidatePath("/admin/final")
}

export async function resetTeamPasswordAction(_prev: ResetPasswordResult, formData: FormData): Promise<ResetPasswordResult> {
  const denied = await requireAdminAction()
  if (denied) return { ok: false, error: denied }
  const teamId = String(formData.get("teamId") ?? "")
  if (!teamId) return { ok: false, error: "Missing team." }

  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("auth_user_id, team_code, leader_email").eq("id", teamId).maybeSingle()
  if (!team?.auth_user_id) return { ok: false, error: "Team has no linked login." }

  const password = genPassword()
  const { error } = await admin.auth.admin.updateUserById(team.auth_user_id, { password })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/teams")
  return { ok: true, password, message: `New password for ${team.team_code} (${team.leader_email}):` }
}

export async function deleteTeamAction(formData: FormData): Promise<void> {
  const denied = await requireAdminAction()
  if (denied) return
  const teamId = String(formData.get("teamId") ?? "")
  if (!teamId) return
  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("auth_user_id").eq("id", teamId).maybeSingle()
  await admin.from("teams").delete().eq("id", teamId)
  if (team?.auth_user_id) await admin.auth.admin.deleteUser(team.auth_user_id).catch(() => {})
  revalidatePath("/admin/teams")
}

export async function upsertProblemStatementAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction()
  if (denied) return { ok: false, error: denied }

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
  revalidatePath("/admin/problem-statements")
  return { ok: true, message: id ? "Problem statement updated." : "Problem statement added." }
}

export async function deleteProblemStatementAction(formData: FormData): Promise<void> {
  const denied = await requireAdminAction()
  if (denied) return
  const id = Number(formData.get("id") ?? 0)
  if (!id) return
  const admin = createAdminClient()
  const { data: ps } = await admin.from("problem_statements").select("taken_count").eq("id", id).maybeSingle()
  if (ps && ps.taken_count > 0) {
    await admin.from("problem_statements").update({ is_active: false }).eq("id", id)
  } else {
    await admin.from("problem_statements").delete().eq("id", id)
  }
  revalidatePath("/admin/problem-statements")
}

export async function saveScoresAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction()
  if (denied) return { ok: false, error: denied }

  const round = String(formData.get("round") ?? "")
  if (!ROUNDS.includes(round as Round)) return { ok: false, error: "Invalid round." }

  const admin = createAdminClient()
  const { data: teams } = await admin.from("teams").select("id").order("team_code")
  if (!teams) return { ok: false, error: "Could not load teams." }

  const rows: { team_id: string; round: string; total_score: number; notes: string }[] = []
  for (const t of teams) {
    const raw = String(formData.get(`score_${t.id}`) ?? "").trim()
    const notes = String(formData.get(`notes_${t.id}`) ?? "").trim().slice(0, 500)
    if (!raw) continue
    const score = Number(raw)
    if (!Number.isFinite(score) || score < 0 || score > 10000) {
      return { ok: false, error: `Invalid score for a team (must be 0–10000).` }
    }
    rows.push({ team_id: t.id, round, total_score: Math.round(score * 100) / 100, notes })
  }

  if (rows.length > 0) {
    const { error } = await admin.from("scores").upsert(rows, { onConflict: "team_id,round" })
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath("/admin/scoring")
  return { ok: true, message: `Saved ${rows.length} score${rows.length === 1 ? "" : "s"} for ${round}.` }
}

export async function setLeaderboardPublishedAction(formData: FormData): Promise<void> {
  const denied = await requireAdminAction()
  if (denied) return
  const round = String(formData.get("round") ?? "")
  const published = String(formData.get("published") ?? "") === "true"
  if (!ROUNDS.includes(round as Round)) return

  const admin = createAdminClient()
  await admin.from("leaderboard_visibility").upsert({
    round,
    is_published: published,
    published_at: published ? new Date().toISOString() : null,
  }, { onConflict: "round" })
  revalidatePath("/admin/scoring")
  revalidatePath("/leaderboard")
}

export async function saveWinnersAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction()
  if (denied) return { ok: false, error: denied }

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
  revalidatePath("/admin/announce-winners")
  revalidatePath("/leaderboard")
  return { ok: true, message: publish ? "Winners published." : "Winners saved (not published)." }
}

export async function saveSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction()
  if (denied) return { ok: false, error: denied }

  const keys = ["event_start", "ps_release_at", "round1_deadline", "final_deadline", "event_end"]
  const rows: { key: string; value: string | null }[] = []

  for (const k of keys) {
    const raw = String(formData.get(k) ?? "").trim()
    if (!raw) {
      rows.push({ key: k, value: null })
      continue
    }
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return { ok: false, error: `Invalid date for ${k}.` }
    rows.push({ key: k, value: d.toISOString() })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("event_settings").upsert(rows.map((r) => ({ key: r.key, value: r.value as never })), { onConflict: "key" })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/settings")
  revalidatePath("/")
  revalidatePath("/dashboard")
  return { ok: true, message: "Event timing saved." }
}

export async function galleryUploadAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const denied = await requireAdminAction()
  if (denied) return { ok: false, error: denied }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0)
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 200)
  if (files.length === 0) return { ok: false, error: "Choose at least one image." }
  if (files.length > 20) return { ok: false, error: "Max 20 images per upload." }

  for (const f of files) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(f.name)) return { ok: false, error: "Only image files are allowed." }
    if (f.size > 10 * 1024 * 1024) return { ok: false, error: "Each image must be under 10 MB." }
  }

  const admin = createAdminClient()
  const { data: maxRow } = await admin.from("gallery_photos").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle()
  let order = (maxRow?.sort_order ?? 0) + 1

  for (const f of files) {
    const path = `photos/${Date.now()}-${sanitizeFileName(f.name)}`
    const buffer = Buffer.from(await f.arrayBuffer())
    const { error: upErr } = await admin.storage.from("gallery").upload(path, buffer, { contentType: f.type || "image/jpeg", upsert: false })
    if (upErr) continue
    await admin.from("gallery_photos").insert({ storage_path: path, caption, sort_order: order++ })
  }

  revalidatePath("/admin/gallery")
  revalidatePath("/gallery")
  return { ok: true, message: "Photos uploaded." }
}

export async function galleryDeleteAction(formData: FormData): Promise<void> {
  const denied = await requireAdminAction()
  if (denied) return
  const id = String(formData.get("id") ?? "")
  if (!id) return
  const admin = createAdminClient()
  const { data: photo } = await admin.from("gallery_photos").select("storage_path").eq("id", id).maybeSingle()
  if (!photo) return
  await admin.from("gallery_photos").delete().eq("id", id)
  await admin.storage.from("gallery").remove([photo.storage_path]).catch(() => {})
  revalidatePath("/admin/gallery")
  revalidatePath("/gallery")
}
