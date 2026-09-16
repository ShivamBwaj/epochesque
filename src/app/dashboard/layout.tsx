import type { Metadata } from "next"
import { requireParticipantPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { logoutAction } from "@/lib/actions/auth"
import { Badge, StatusBadge } from "@/components/ui"
import { DashboardNav } from "./nav"
import { TeamSetup } from "./team-setup"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { registration, team } = await requireParticipantPage()

  if (!team) {
    return <TeamSetup registrationName={registration.name} />
  }

  const admin = createAdminClient()
  const { data: notices } = await admin
    .from("announcements")
    .select("id, title, body")
    .eq("kind", "notice")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(3)
  const liveNotices = (notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    text: typeof n.body === "string" ? n.body : "",
  }))

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-28 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label">TEAM CONSOLE</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{team.team_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="cyan">{team.team_code}</Badge>
          <StatusBadge status={team.status} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-xs text-muted-foreground transition hover:border-red-500/40 hover:text-red-300"
            >
              LOGOUT
            </button>
          </form>
        </div>
      </div>

      {liveNotices.length > 0 ? (
        <div className="mb-6 space-y-2">
          {liveNotices.map((n) => (
            <div key={n.id} className="rounded-xl border border-accent/25 bg-accent-soft px-4 py-3">
              <p className="text-sm font-medium text-accent-hover">📣 {n.title}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-muted-foreground">{n.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      <DashboardNav />
      <div className="mt-8">{children}</div>
    </div>
  )
}
