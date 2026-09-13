import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { logoutAction } from "@/lib/actions/auth"
import { AdminNav } from "./nav"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Admin",
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-28 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="hud-label">ORGANIZER CONSOLE</p>
          <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            <span className="text-gradient">Epochesque Control Room</span>
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 font-mono text-[11px] tracking-[0.25em] text-violet-300">
              ADMIN
            </span>
          </h1>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-full border border-white/[0.08] px-3 py-1.5 font-mono text-xs text-muted-foreground transition hover:border-red-500/40 hover:text-red-300"
          >
            LOGOUT
          </button>
        </form>
      </div>
      <div className="flex flex-col gap-8 md:flex-row">
        <AdminNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
