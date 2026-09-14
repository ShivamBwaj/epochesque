"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getViewer } from "@/lib/auth"
import { getEventTiming, getEventFlags, deadlinePassed } from "@/lib/settings"
import { deckFileError, deckMagicError, sanitizeFileName } from "@/lib/validate"

export interface SubmitState {
  ok?: boolean
  error?: string
  message?: string
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
  const team = viewer.team

  const timing = await getEventTiming()
  if (deadlinePassed(timing.round1_deadline)) {
    return { ok: false, error: "The OC Round 1 deadline has passed. Submissions are closed." }
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
  const team = viewer.team

  const timing = await getEventTiming()
  if (deadlinePassed(timing.round1_deadline)) {
    return { error: "The OC Round 1 deadline has passed. Submissions are closed." }
  }

  const path = String(formData.get("path") ?? "")
  const fileName = String(formData.get("file_name") ?? "")
  const fileSize = Number(formData.get("file_size") ?? 0)

  if (!path.startsWith(`round1/${team.id}/`)) return { error: "Invalid upload path. Try again." }
  const fileError = deckFileError(fileName, fileSize)
  if (fileError) return { error: fileError }

  const admin = createAdminClient()
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
  if (Number.isFinite(realSize) && realSize > 25 * 1024 * 1024) {
    await admin.storage.from("submissions").remove([path]).catch(() => {})
    return { error: "File is larger than 25 MB." }
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

  const admin = createAdminClient()
  const { error } = await admin.from("submissions").upsert({
    team_id: team.id,
    round: "final",
    type: "github",
    url,
    storage_path: null,
    file_name: null,
    file_size: null,
  }, { onConflict: "team_id,round" })
  if (error) return { error: "Could not save your submission. Try again." }

  revalidatePath("/dashboard/submit/final")
  revalidatePath("/dashboard")
  return { ok: true, message: "Final round submission received." }
}
