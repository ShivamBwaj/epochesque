"use server"

import { after } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { pushRegistrationToSheets } from "@/lib/sheets"

export interface RegisterState {
  ok: boolean
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/

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

export async function submitRegistrationAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 120)
  const regNo = String(formData.get("regNo") ?? "").trim().toUpperCase().slice(0, 60)
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 20)
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 160)

  if (!name) return { ok: false, error: "Enter your name." }
  if (!regNo) return { ok: false, error: "Enter your registration number." }
  if (!PHONE_RE.test(phone)) return { ok: false, error: "Enter a valid phone number." }
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." }

  // Rate limit per submitted reg no — this is a public, no-auth form, so
  // this is the cheap guard against a script hammering it.
  if (rateLimited(`regno:${regNo.toLowerCase()}`, 5, 15 * 60_000)) {
    return { ok: false, error: "Too many attempts for this registration number. Try again later." }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("registrations")
    .upsert({ name, reg_no: regNo, phone, email }, { onConflict: "reg_no" })

  if (error) return { ok: false, error: "Could not save your registration. Try again in a moment." }

  after(async () => {
    await pushRegistrationToSheets({ name, reg_no: regNo, phone, email, registered_at: new Date().toISOString() })
  })

  return { ok: true }
}
