"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavLink {
  href: string
  label: string
  exact?: boolean
}

const groups: { label: string; links: NavLink[] }[] = [
  {
    label: "Event Day",
    links: [
      { href: "/admin", label: "Overview", exact: true },
      { href: "/admin/roll", label: "Rolls" },
      { href: "/admin/gaming", label: "Gaming" },
    ],
  },
  {
    label: "Teams & Problems",
    links: [
      { href: "/admin/teams", label: "Teams + Attendance" },
      { href: "/admin/teams/add", label: "Walk-in Team" },
      { href: "/admin/problem-statements", label: "Problems" },
    ],
  },
  {
    label: "Judging",
    links: [
      { href: "/admin/round1", label: "OC Round Decks" },
      { href: "/admin/final", label: "Final Repos" },
      { href: "/admin/scoring", label: "Scoring" },
      { href: "/leaderboard", label: "Leaderboard" },
      { href: "/admin/announce-winners", label: "Winners" },
    ],
  },
  {
    label: "Site Content",
    links: [
      { href: "/admin/people", label: "People" },
      { href: "/admin/notices", label: "Notices" },
      { href: "/admin/gallery", label: "Gallery" },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/admin/audit", label: "Audit" },
      { href: "/admin/settings", label: "Settings" },
    ],
  },
]

const allLinks = groups.flatMap((g) => g.links)

function isActive(pathname: string, link: NavLink) {
  return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + "/")
}

export function AdminNav() {
  const pathname = usePathname()
  return (
    <>
      <nav className="flex gap-1 overflow-x-auto rounded-full border border-white/[0.08] bg-white/[0.03] p-1.5 md:hidden">
        {allLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all duration-300 ${
              isActive(pathname, l)
                ? "bg-accent-soft border border-accent/30 text-accent-hover"
                : "border border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <nav className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-5 md:rounded-2xl md:border md:border-white/[0.08] md:bg-white/[0.03] md:p-3">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted/60">{g.label}</p>
            <div className="flex flex-col gap-0.5">
              {g.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-all duration-300 ${
                    isActive(pathname, l)
                      ? "bg-accent-soft border border-accent/30 text-accent-hover"
                      : "border border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  )
}
