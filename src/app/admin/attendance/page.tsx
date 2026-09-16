import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AdminAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>
}) {
  const sp = await searchParams
  redirect(sp.day === "2" ? "/admin/teams?day=2" : "/admin/teams")
}
