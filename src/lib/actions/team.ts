"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getViewer } from "@/lib/auth"
import { getEventTiming, getEventFlags, rollIsOpen, deadlinePassed } from "@/lib/settings"
import { deckFileError, deckMagicError, sanitizeFileName } from "@/lib/validate"

export interface SubmitState {
  ok?: boolean
  error?: string
  message?: string
}

const GITHUB_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/

export async function rollProblemStatementAction(): Promise<{ ok: boolean; error?: string }> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== "team" || !viewer.team) return { ok: false, error: "Not signed in as a team." }

  const [timing, flags] = await Promise.all([getEventTiming(), getEventFlags()])
  if (!rollIsOpen(flags, timing)) {
    return { ok: false, error: "The roll is not open yet. The organizers will open it at the event." }
  }
  if (viewer.team.problem_statement_id) return { ok: true }

  const supabase = await createClient()
  const { error } = await supabase.rpc("roll_problem_statement")
  if (error) {
    const msg = error.message.includes("ROLL_POOL_EMPTY")
      ? "All problem statements are taken. Contact the organizers."
      : error.message.includes("ROLL_NOT_ELIGIBLE")
        ? "Your team is not eligible to roll."
        : "Could not roll a problem statement. Try again."
    return { ok: false, error: msg }
  }
  revalidatePath("/dashboard/problem-statement")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function submitRound1Action(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const viewer = await getViewer()
  if (!viewer || viewer.role !== "team" || !viewer.team) return { error: "Not signed in as a team." }
  const team = viewer.team

  const timing = await getEventTiming()
  if (deadlinePassed(timing.round1_deadline)) {
    return { error: "The Round 1 deadline has passed. Submissions are closed." }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." }

  const fileError = deckFileError(file.name, file.size)
  if (fileError) return { error: fileError }

  const buffer = Buffer.from(await file.arrayBuffer())
  const magicError = deckMagicError(file.name, buffer)
  if (magicError) return { error: magicError }

  const safeName = sanitizeFileName(file.name)
  const path = `round1/${team.id}/${Date.now()}-${safeName}`

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("submissions")
    .select("storage_path")
    .eq("team_id", team.id)
    .eq("round", "round1")
    .maybeSingle()

  const { error: upErr } = await admin.storage
    .from("submissions")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true })
  if (upErr) return { error: "Upload failed. Try again." }
  const { error: dbErr } = await admin.from("submissions").upsert({
    team_id: team.id,
    round: "round1",
    type: "ppt",
    url: null,
    storage_path: path,
    file_name: file.name,
    file_size: file.size,
  }, { onConflict: "team_id,round" })
  if (dbErr) return { error: "Saved file but could not record submission. Contact organizers." }

  if (existing?.storage_path && existing.storage_path !== path) {
    await admin.storage.from("submissions").remove([existing.storage_path]).catch(() => {})
  }

  revalidatePath("/dashboard/submit/round1")
  revalidatePath("/dashboard")
  return { ok: true, message: "Round 1 submission received." }
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

  const url = String(formData.get("url") ?? "").trim()
  if (!GITHUB_RE.test(url)) return { error: "Enter a valid GitHub repository URL (https://github.com/user/repo)." }

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
