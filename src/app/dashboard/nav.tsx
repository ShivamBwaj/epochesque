"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/problem-statement", label: "Problem Statement" },
  { href: "/dashboard/submit/round1", label: "Submit R1" },
  { href: "/dashboard/submit/final", label: "Submit Final" },
]

export function DashboardNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/40 p-1.5">
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
