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
    <nav className="flex gap-1 overflow-x-auto rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5">
      {links.map((l) => {
        const active = pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-all duration-300 ${
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
