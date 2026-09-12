"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/teams/import", label: "Import" },
  { href: "/admin/problem-statements", label: "Problem Statements" },
  { href: "/admin/round1", label: "Round 1" },
  { href: "/admin/final", label: "Final" },
  { href: "/admin/scoring", label: "Scoring" },
  { href: "/admin/announce-winners", label: "Winners" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/settings", label: "Settings" },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/40 p-1.5 md:w-56 md:shrink-0 md:flex-col md:overflow-x-visible">
      {links.map((l) => {
        const active = pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm transition ${
              active
                ? "border-cyan-500/40 bg-cyan-950/40 text-cyan-200"
                : "border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
