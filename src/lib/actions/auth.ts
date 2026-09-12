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
  if (rateLimited(`ip:${ip}`, 20, 15 * 60_000)) return { error: "Too many attempts. Try again in 15 minutes." }
  if (rateLimited(`email:${email}`, 5, 15 * 60_000)) return { error: "Too many attempts for this email. Try again in 15 minutes." }

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
