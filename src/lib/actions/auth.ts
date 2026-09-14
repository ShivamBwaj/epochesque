"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface LoginState {
  error?: string
}

const attempts = new Map<string, { count: number; resetAt: number }>()

function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count++
  return entry.count > max
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) return { error: "Enter your email and password." }

  const hdrs = await headers()
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim()
  if (rateLimited(`ip:${ip}`, 60, 15 * 60_000)) return { error: "Too many attempts. Try again in 15 minutes." }
  if (rateLimited(`email:${email}`, 15, 15 * 60_000)) return { error: "Too many attempts for this email. Try again in 15 minutes." }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return { error: "Invalid email or password." }

  const admin = createAdminClient()
  const { data: adminRow } = await admin.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle()
  if (adminRow) redirect("/admin")

  const { data: teamRow } = await supabase.from("teams").select("id").eq("auth_user_id", data.user.id).maybeSingle()
  if (teamRow) redirect("/dashboard")

  await supabase.auth.signOut()
  return { error: "This account is not linked to a team. Contact the organizers." }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export interface EmailCheckResult {
  needsSetup: boolean
}

// Drives the login form's two-step UX: a team leader who hasn't set their
// own password yet gets a "create your password" form instead of a
// password field. Rate-limited per-IP since it's an unauthenticated probe
// that reveals a small amount of info (whether an email belongs to a team
// still awaiting first-time setup) — same tradeoff accepted for the
// self-serve design (no shared/guessable initial password to leak instead).
export async function checkLeaderEmailAction(email: string): Promise<EmailCheckResult> {
  const clean = email.trim().toLowerCase()
  if (!clean) return { needsSetup: false }

  const hdrs = await headers()
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim()
  if (rateLimited(`emailcheck:ip:${ip}`, 60, 15 * 60_000)) return { needsSetup: false }

  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("password_set").eq("leader_email", clean).maybeSingle()
  return { needsSetup: !!team && !team.password_set }
}

export interface SetPasswordState {
  error?: string
}

export async function setInitialPasswordAction(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirmPassword") ?? "")

  if (!email) return { error: "Enter your email." }
  if (password.length < 8) return { error: "Password must be at least 8 characters." }
  if (password !== confirm) return { error: "Passwords don't match." }

  const hdrs = await headers()
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim()
  if (rateLimited(`setpw:ip:${ip}`, 20, 15 * 60_000)) return { error: "Too many attempts. Try again in 15 minutes." }
  if (rateLimited(`setpw:email:${email}`, 8, 15 * 60_000)) return { error: "Too many attempts for this email. Try again in 15 minutes." }

  const admin = createAdminClient()
  const { data: team } = await admin.from("teams").select("id, auth_user_id, team_code, password_set").eq("leader_email", email).maybeSingle()
  if (!team || !team.auth_user_id) return { error: "That email isn't registered as a team leader. Contact the organizers." }
  if (team.password_set) return { error: "This account already has a password set — use the password field instead." }

  const { error: pwErr } = await admin.auth.admin.updateUserById(team.auth_user_id, { password })
  if (pwErr) return { error: "Could not set your password. Try again." }

  await admin.from("teams").update({ password_set: true }).eq("id", team.id)
  await admin
    .from("admin_audit")
    .insert({ actor_user_id: team.auth_user_id, actor_email: email, action: "team.password_set", target: team.team_code, details: {} as never })
    .then(() => undefined, () => undefined)

  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) return { error: "Password set — but sign-in failed. Try logging in again." }

  redirect("/dashboard")
}
