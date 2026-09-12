"use client"

import { motion } from "framer-motion"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { RotatingWords } from "@/components/rotating-words"
import { Countdown } from "@/components/countdown"
import { DiceFeed } from "./dice-feed"

export function Hero({ eventStart }: { eventStart: string | null }) {
  return (
    <AuroraBackground className="!bg-background overflow-hidden min-h-[100dvh]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent z-10" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full pt-32 pb-20">
        <div className="grid lg:grid-cols-[1fr_360px] gap-10 lg:gap-14 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span className="font-mono text-[11px] tracking-widest text-muted-foreground">
                A 48-HOUR HACKATHON · REGISTRATIONS LIVE
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-[clamp(36px,5.5vw,68px)] font-semibold leading-[1.06] tracking-[-0.02em] mb-6"
            >
              <span className="text-foreground/90">You don&apos;t choose</span>
              <br />
              <span className="text-foreground/90">your problem. You </span>
              <span className="text-accent italic" style={{ fontFamily: "var(--font-display)" }}>
                roll it.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="text-muted-foreground text-[15px] md:text-base leading-relaxed mb-6 max-w-lg"
            >
              Two days. One locked-in problem statement decided by the dice. 48 hours to{" "}
              <RotatingWords /> your way onto a leaderboard that remembers everything.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="mb-10"
            >
              <Countdown target={eventStart} label="UNTIL KICKOFF" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex flex-wrap items-center gap-3"
            >
              <a
                href="/login"
                className="rounded-full px-6 py-2.5 text-sm font-medium bg-accent text-white hover:bg-accent-hover hover:scale-[1.03] transition-all duration-300 shadow-[0_0_24px_rgba(194,112,62,0.3)]"
              >
                Team Login
              </a>
              <a
                href="#how-it-works"
                className="rounded-full px-6 py-2.5 text-sm font-medium border border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06] transition-all duration-300"
              >
                How it works
              </a>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="hidden lg:block"
          >
            <DiceFeed />
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </AuroraBackground>
  )
}
