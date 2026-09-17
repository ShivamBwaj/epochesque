"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getViewer } from "@/lib/auth"
import { isTeamLeader } from "@/lib/database.types"
import { getEventTiming, getEventFlags, deadlinePassed, rollIsOpen } from "@/lib/settings"
import { deckFileError, deckMagicError, sanitizeFileName } from "@/lib/validate"
import type { RollResult } from "@/components/case-opener"

export interface SubmitState {
  ok?: boolean
  error?: string
  message?: string
}

const ROLL_ERROR_MESSAGES: Record<string, string> = {
  ROLL_NO_TEAM: "Your account isn't linked to a team. Contact the organizers.",
  ROLL_LEADER_ONLY: "Only your team leader can roll the problem statement.",
  ROLL_NOT_ELIGIBLE: "Your team can't roll right now. Contact the organizers.",
  ROLL_POOL_EMPTY: "All problem statements are taken. Talk to the organizers at the desk.",
}

export async function rollProblemStatementAction(): Promise<RollResult> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== "team" || !viewer.team) return { ok: false, error: "Not signed in as a team." }
  if (!isTeamLeader(viewer.team, viewer.registration?.id)) {
    return { ok: false, error: "Only your team leader can roll the problem statement." }
  }

  const [timing, flags] = await Promise.all([getEventTiming(), getEventFlags()])
  if (!rollIsOpen(flags, timing)) {
    return { ok: false, error: "Rolling isn't open yet — wait for the organizers to open it." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("roll_problem_statement")
  if (error) {
    const msg = Object.keys(ROLL_ERROR_MESSAGES).find((code) => error.message.includes(code))
    return { ok: false, error: msg ? ROLL_ERROR_MESSAGES[msg] : "Could not roll. Try again." }
  }

  const ps = (data ?? [])[0]
  if (!ps) return { ok: false, error: "Could not roll. Try again." }

  revalidatePath("/dashboard/problem-statement")
  revalidatePath("/dashboard")
  return { ok: true, ps }
}

const GITHUB_RE = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/

// Teams paste this from wherever — no scheme, http, trailing .git, or a
// /tree/branch, /blob/..., or ?query suffix should be a hard rejection at
// hour 23 of the event. Normalize down to the bare repo URL before validating.
function normalizeGithubUrl(raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  s = s.replace(/^http:\/\//i, "https://")
  const m = GITHUB_RE.exec(s)
  if (!m) return null
  const repo = m[2].replace(/\.git$/i, "")
  return `https://github.com/${m[1]}/${repo}`
}

export interface BookSlotResult {
  ok: boolean
  error?: string
  slot?: { id: string; game: string; start_time: string }
}

export async function bookGameSlotAction(slotId: string): Promise<BookSlotResult> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== "team" || !viewer.team) return { ok: false, error: "Not signed in as a team." }
  if (!isTeamLeader(viewer.team, viewer.registration?.id)) {
    return { ok: false, error: "Only your team leader can book a gaming slot." }
  }

  const flags = await getEventFlags()
  if (!flags.gamingOpen) return { ok: false, error: "Gaming slots aren't open yet — wait for the organizers to open booking." }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("book_game_slot", { p_slot_id: slotId })
  if (error) {
    const msg = error.message.includes("SLOT_ALREADY_BOOKED")
      ? "Your team already booked a slot. One slot per team — that's the rule."
      : error.message.includes("SLOT_TAKEN")
        ? "Another team just grabbed that slot. Pick another one."
        : error.message.includes("SLOT_NOT_FOUND")
          ? "That slot no longer exists. Refresh the page."
          : error.message.includes("SLOT_LEADER_ONLY")
            ? "Only your team leader can book a gaming slot."
            : error.message.includes("SLOT_NO_TEAM")
              ? "Your account isn't linked to a team yet. Contact the organizers."
              : "Could not book the slot. Try again."
    return { ok: false, error: msg }
  }
  revalidatePath("/dashboard/gaming")
  revalidatePath("/admin/gaming")
  const s = (data ?? [])[0]
  return s ? { ok: true, slot: { id: s.slot_id, game: s.slot_game, start_time: s.slot_start } } : { ok: false, error: "Could not book the slot. Try again." }
}

export interface UploadBeginResult {
  ok: boolean
  path?: string
  signedUrl?: string
  error?: string
}

export async function beginRound1UploadAction(fileName: string, fileSize: number): Promise<UploadBeginResult> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== "team" || !viewer.team) return { ok: false, error: "Not signed in as a team." }
  if (!isTeamLeader(viewer.team, viewer.registration?.id)) {
    return { ok: false, error: "Only your team leader can upload the deck." }
  }
  const team = viewer.team

  const timing = await getEventTiming()
  if (deadlinePassed(timing.round1_deadline)) {
    return { ok: false, error: "The OC Round deadline has passed. Submissions are closed." }
  }

  const fileError = deckFileError(fileName, fileSize)
  if (fileError) return { ok: false, error: fileError }

  const path = `round1/${team.id}/${Date.now()}-${sanitizeFileName(fileName)}`
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from("submissions").createSignedUploadUrl(path)
  if (error || !data?.signedUrl) return { ok: false, error: "Could not start the upload. Try again." }
  return { ok: true, path, signedUrl: data.signedUrl }
}

export async function submitRound1Action(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== "team" || !viewer.team) return { error: "Not signed in as a team." }
  if (!isTeamLeader(viewer.team, viewer.registration?.id)) {
    return { error: "Only your team leader can upload the deck." }
  }
  const team = viewer.team

  const timing = await getEventTiming()
  if (deadlinePassed(timing.round1_deadline)) {
    return { error: "The OC Round deadline has passed. Submissions are closed." }
  }

  const fileName = String(formData.get("file_name") ?? "")
  const fileSize = Number(formData.get("file_size") ?? 0)

  const fileError = deckFileError(fileName, fileSize)
  if (fileError) return { error: fileError }

  const admin = createAdminClient()

  const path = String(formData.get("path") ?? "")
  if (!path.startsWith(`round1/${team.id}/`)) return { error: "Invalid upload path. Try again." }

  const { data: signed } = await admin.storage.from("submissions").createSignedUrl(path, 60)
  if (!signed?.signedUrl) return { error: "Could not verify the upload. Try again." }
  const headRes = await fetch(signed.signedUrl, { headers: { Range: "bytes=0-15" } })
  if (!headRes.ok) return { error: "Uploaded file not found. Upload it again." }
  const head = Buffer.from(await headRes.arrayBuffer())
  const magicError = deckMagicError(fileName, head)
  if (magicError) {
    await admin.storage.from("submissions").remove([path]).catch(() => {})
    return { error: magicError }
  }
  const contentRange = headRes.headers.get("content-range")
  const realSize = contentRange ? Number(contentRange.split("/")[1]) : fileSize
  if (Number.isFinite(realSize) && realSize > 5 * 1024 * 1024) {
    await admin.storage.from("submissions").remove([path]).catch(() => {})
    return { error: "File is larger than 5 MB." }
  }

  const { data: existing } = await admin
    .from("submissions")
    .select("storage_path")
    .eq("team_id", team.id)
    .eq("round", "round1")
    .maybeSingle()

  const { error: dbErr } = await admin.from("submissions").upsert({
    team_id: team.id,
    round: "round1",
    type: "ppt",
    url: null,
    storage_path: path,
    drive_file_id: null,
    drive_view_link: null,
    file_name: fileName,
    file_size: fileSize,
  }, { onConflict: "team_id,round" })
  if (dbErr) return { error: "Saved file but could not record submission. Contact organizers." }

  if (existing?.storage_path && existing.storage_path !== path) {
    await admin.storage.from("submissions").remove([existing.storage_path]).catch(() => {})
  }

  revalidatePath("/dashboard/submit/round1")
  revalidatePath("/dashboard")
  return { ok: true, message: "PPT submission received." }
}

export async function submitFinalAction(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== "team" || !viewer.team) return { error: "Not signed in as a team." }
  if (!isTeamLeader(viewer.team, viewer.registration?.id)) {
    return { error: "Only your team leader can submit the final repo." }
  }
  const team = viewer.team

  const [timing, flags] = await Promise.all([getEventTiming(), getEventFlags()])
  if (!flags.finalOpen) {
    return { error: "Final round submissions are not open yet. The organizers will open them at the event." }
  }
  if (deadlinePassed(timing.final_deadline)) {
    return { error: "The final round deadline has passed. Submissions are closed." }
  }

  const url = normalizeGithubUrl(String(formData.get("url") ?? ""))
  if (!url) return { error: "Enter a valid GitHub repository URL (https://github.com/user/repo)." }

  const projectTitle = String(formData.get("project_title") ?? "").trim().slice(0, 120)
  const projectDescription = String(formData.get("project_description") ?? "").trim().slice(0, 2000)
  if (!projectTitle) return { error: "Enter a project title." }
  if (!projectDescription) return { error: "Enter a project description." }

  const admin = createAdminClient()
  const { error } = await admin.from("submissions").upsert({
    team_id: team.id,
    round: "final",
    type: "github",
    url,
    storage_path: null,
    file_name: null,
    file_size: null,
    project_title: projectTitle,
    project_description: projectDescription,
  }, { onConflict: "team_id,round" })
  if (error) return { error: "Could not save your submission. Try again." }

  revalidatePath("/dashboard/submit/final")
  revalidatePath("/dashboard")
  return { ok: true, message: "Final round submission received." }
}
