import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Team, Registration, MyTeam } from "@/lib/database.types"
import { myTeamFromRows, isTeamLeader } from "@/lib/database.types"

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

export const getMyRegistration = cache(async (userId: string | undefined | null): Promise<Registration | null> => {
  if (!userId) return null
  const admin = createAdminClient()
  const { data } = await admin.from("registrations").select("*").eq("auth_user_id", userId).maybeSingle()
  return (data as Registration) ?? null
})

export const getMyTeam = cache(async (): Promise<MyTeam | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_my_team")
  if (error || !data) return null
  return myTeamFromRows(data)
})

export type Viewer = {
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>
  role: "admin" | "team" | "unassigned"
  registration: Registration | null
  team: MyTeam | null
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getSessionUser()
  if (!user) return null
  if (await isAdmin(user.id)) return { user, role: "admin", registration: null, team: null }
  const registration = await getMyRegistration(user.id)
  if (!registration) return null
  const team = await getMyTeam()
  return { user, role: team ? "team" : "unassigned", registration, team }
})

export async function requireParticipantPage(): Promise<{ user: Viewer["user"]; registration: Registration; team: MyTeam | null }> {
  const viewer = await getViewer()
  if (!viewer) redirect("/login?error=not_linked")
  if (viewer.role === "admin") redirect("/admin")
  return { user: viewer.user, registration: viewer.registration!, team: viewer.team }
}

export async function requireTeamPage(): Promise<{ user: Viewer["user"]; team: MyTeam; registration: Registration; isLeader: boolean }> {
  const viewer = await getViewer()
  if (!viewer) redirect("/login?error=not_linked")
  if (viewer.role === "admin") redirect("/admin")
  if (viewer.role === "unassigned" || !viewer.team) redirect("/dashboard")
  return {
    user: viewer.user,
    team: viewer.team,
    registration: viewer.registration!,
    isLeader: isTeamLeader(viewer.team, viewer.registration?.id),
  }
}

export async function requireAdminPage(): Promise<Viewer["user"]> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  if (!(await isAdmin(user.id))) redirect("/dashboard")
  return user
}
