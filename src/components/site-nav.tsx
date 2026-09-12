"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { logoutAction } from "@/lib/actions/auth"

export function SiteNav({
  role,
  links,
}: {
  role: "admin" | "team" | null
  links: { href: string; label: string }[]
}) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-40 flex justify-center pointer-events-none pt-4 px-4"
    >
      <nav
        className={`pointer-events-auto flex items-center justify-between gap-6 px-5 h-12 rounded-full transition-all duration-500 ${
          scrolled
            ? "bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.25),0_0_15px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] shadow-[0_0_12px_rgba(255,255,255,0.03),0_0_4px_rgba(255,255,255,0.02)]"
        }`}
        style={{ minWidth: "min(680px, calc(100vw - 2rem))" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="5" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="11" cy="11" r="2.2" fill="#c2703e" />
            <circle cx="21" cy="11" r="2.2" fill="currentColor" />
            <circle cx="16" cy="16" r="2.2" fill="#c2703e" />
            <circle cx="11" cy="21" r="2.2" fill="currentColor" />
            <circle cx="21" cy="21" r="2.2" fill="#c2703e" />
          </svg>
          <span
            className="text-sm font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Epoch
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-1 text-xs">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all duration-300"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {role === "admin" ? (
            <Link
              href="/admin"
              className="rounded-full px-3 py-1.5 text-xs font-medium border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-all duration-300"
            >
              Admin
            </Link>
          ) : null}
          {role === "team" ? (
            <Link
              href="/dashboard"
              className="rounded-full px-4 py-1.5 text-xs font-medium bg-accent text-white hover:bg-accent-hover hover:scale-[1.03] transition-all duration-300"
            >
              Dashboard
            </Link>
          ) : role === "admin" ? (
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Logout
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-1.5 text-xs font-medium bg-accent text-white hover:bg-accent-hover hover:scale-[1.03] transition-all duration-300"
            >
              Team Login
            </Link>
          )}
        </div>
      </nav>
    </motion.header>
  )
}
