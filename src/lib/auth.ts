import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Team } from "@/lib/database.types"

export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user ?? null
})

export const isAdmin = cache(async (userId: string | undefined | null) => {
  if (!userId) return false
  const admin = createAdminClient()
  const { data } = await admin.from("admins").select("user_id").eq("user_id", userId).maybeSingle()
  return !!data
})

export const getTeamByUserId = cache(async (userId: string | undefined | null): Promise<Team | null> => {
  if (!userId) return null
  const supabase = await createClient()
  const { data } = await supabase.from("teams").select("*").eq("auth_user_id", userId).maybeSingle()
  return (data as Team) ?? null
})

export type Viewer = {
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>
  role: "admin" | "team"
  team: Team | null
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getSessionUser()
  if (!user) return null
  if (await isAdmin(user.id)) return { user, role: "admin", team: null }
  const team = await getTeamByUserId(user.id)
  if (!team) return null
  return { user, role: "team", team }
})

export async function requireTeamPage(): Promise<{ user: Viewer["user"]; team: Team }> {
  const viewer = await getViewer()
  if (!viewer) redirect("/login?error=not_linked")
  if (viewer.role === "admin") redirect("/admin")
  return { user: viewer.user, team: viewer.team! }
}

export async function requireAdminPage(): Promise<Viewer["user"]> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (!(await isAdmin(user.id))) redirect("/dashboard")
  return user
}
