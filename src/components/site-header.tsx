import Link from "next/link"
import { getViewer } from "@/lib/auth"
import { logoutAction } from "@/lib/actions/auth"

const links = [
  { href: "/", label: "Home" },
  { href: "/speakers", label: "Speakers" },
  { href: "/oc", label: "OC" },
  { href: "/gallery", label: "Gallery" },
  { href: "/leaderboard", label: "Leaderboard" },
]

export async function SiteHeader() {
  const viewer = await getViewer()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#05060f]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-400 font-mono text-sm font-black text-slate-950">
            E
          </span>
          <span className="font-mono text-lg font-bold tracking-[0.2em] text-slate-100 group-hover:text-cyan-200">
            EPOCH
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800/50 hover:text-slate-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {viewer?.role === "admin" ? (
            <Link href="/admin" className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-3 py-1.5 font-mono text-xs text-indigo-300 transition hover:border-indigo-400">
              ADMIN
            </Link>
          ) : null}
          {viewer?.role === "team" ? (
            <Link href="/dashboard" className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-1.5 font-mono text-xs text-cyan-300 transition hover:border-cyan-400">
              DASHBOARD
            </Link>
          ) : null}
          {viewer ? (
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-3 py-1.5 font-mono text-xs text-slate-500 transition hover:text-slate-300">
                LOGOUT
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:brightness-110"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
