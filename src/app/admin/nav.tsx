"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/teams/import", label: "Import" },
  { href: "/admin/problem-statements", label: "Problems" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/round1", label: "Round 1" },
  { href: "/admin/final", label: "Final" },
  { href: "/admin/scoring", label: "Scoring" },
  { href: "/admin/announce-winners", label: "Winners" },
  { href: "/admin/notices", label: "Notices" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/settings", label: "Settings" },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5 md:w-56 md:shrink-0 md:flex-col md:rounded-2xl md:overflow-x-visible">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(l.href + "/")
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all duration-300 md:rounded-lg ${
              active
                ? "bg-accent-soft border border-accent/30 text-accent-hover"
                : "border border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
