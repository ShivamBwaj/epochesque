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

  const { data: registrationRow } = await admin
    .from("registrations")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle()
  if (registrationRow) redirect("/dashboard")

  await supabase.auth.signOut()
  return { error: "This account isn't linked to a registration. Contact the organizers." }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export interface RegistrationCheckResult {
  eligible: boolean
  name?: string
}

// Drives the signup form's two-step UX: reg no + email must match an
// existing registrations row that hasn't been claimed yet before we show
// the "create a password" step. Rate-limited per-IP since it's an
// unauthenticated probe that reveals whether a reg no/email pair exists.
export async function checkRegistrationAction(regNo: string, email: string): Promise<RegistrationCheckResult> {
  const cleanRegNo = regNo.trim().toUpperCase()
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanRegNo || !cleanEmail) return { eligible: false }

  const hdrs = await headers()
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim()
  if (rateLimited(`regcheck:ip:${ip}`, 60, 15 * 60_000)) return { eligible: false }

  const admin = createAdminClient()
  const { data: reg } = await admin
    .from("registrations")
    .select("name, email, auth_user_id")
    .eq("reg_no", cleanRegNo)
    .maybeSingle()
  if (!reg || reg.auth_user_id) return { eligible: false }
  if (reg.email.trim().toLowerCase() !== cleanEmail) return { eligible: false }
  return { eligible: true, name: reg.name }
}

export interface SignupState {
  error?: string
}

export async function signupAction(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const regNo = String(formData.get("regNo") ?? "").trim().toUpperCase()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirmPassword") ?? "")

  if (!regNo || !email) return { error: "Enter your registration number and email." }
  if (password.length < 8) return { error: "Password must be at least 8 characters." }
  if (password !== confirm) return { error: "Passwords don't match." }

  const hdrs = await headers()
  const ip = (hdrs.get("x-forwarded-for") ?? "local").split(",")[0].trim()
  if (rateLimited(`signup:ip:${ip}`, 20, 15 * 60_000)) return { error: "Too many attempts. Try again in 15 minutes." }
  if (rateLimited(`signup:regno:${regNo}`, 8, 15 * 60_000)) return { error: "Too many attempts for this registration number. Try again in 15 minutes." }

  const admin = createAdminClient()
  const { data: reg } = await admin
    .from("registrations")
    .select("id, email, auth_user_id")
    .eq("reg_no", regNo)
    .maybeSingle()
  if (!reg) return { error: "That registration number isn't recognized. Check it, or contact the organizers if you registered recently." }
  if (reg.auth_user_id) return { error: "This registration already has an account — use the sign-in form instead." }
  if (reg.email.trim().toLowerCase() !== email) return { error: "That email doesn't match what you registered with." }

  const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { reg_no: regNo, role: "participant" },
  })
  if (authErr || !authUser?.user) {
    return { error: authErr?.message.includes("already been registered") ? "This email already has an account — use the sign-in form instead." : "Could not create your account. Try again." }
  }

  const { error: linkErr } = await admin.from("registrations").update({ auth_user_id: authUser.user.id }).eq("id", reg.id)
  if (linkErr) {
    await admin.auth.admin.deleteUser(authUser.user.id).catch(() => {})
    return { error: "Could not finish setting up your account. Try again." }
  }

  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) return { error: "Account created — but sign-in failed. Try logging in again." }

  redirect("/dashboard")
}
