import type { Metadata } from "next"
import { requireTeamPage } from "@/lib/auth"
import { logoutAction } from "@/lib/actions/auth"
import { Badge, StatusBadge } from "@/components/ui"
import { DashboardNav } from "./nav"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { team } = await requireTeamPage()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label">TEAM CONSOLE</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">{team.team_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="cyan">{team.team_code}</Badge>
          <StatusBadge status={team.status} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-700/60 px-3 py-1.5 font-mono text-xs text-slate-500 transition hover:border-red-500/40 hover:text-red-300"
            >
              LOGOUT
            </button>
          </form>
        </div>
      </div>
      <DashboardNav />
      <div className="mt-8">{children}</div>
    </div>
  )
}
