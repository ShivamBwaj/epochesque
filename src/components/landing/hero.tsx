"use client"

import { motion } from "framer-motion"
import { AuroraBackground } from "@/components/ui/aurora-background"
import { RotatingWords } from "@/components/rotating-words"
import { Countdown } from "@/components/countdown"

const ROTATING = ["roll it.", "own it.", "build it.", "ship it.", "win it."]

export function Hero({ eventStart }: { eventStart: string | null }) {
  return (
    <AuroraBackground className="!bg-background overflow-hidden min-h-[100dvh]">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent z-10" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full pt-36 pb-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1"
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
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-[clamp(48px,9vw,120px)] font-semibold leading-[0.98] tracking-[-0.03em] mb-8"
        >
          <span
            className="text-gradient block"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Epochesque 2.0
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <p className="text-[clamp(24px,4vw,44px)] font-medium leading-tight tracking-tight text-foreground/90">
            You don&apos;t choose your problem.{" "}
            <span className="text-accent italic" style={{ fontFamily: "var(--font-display)" }}>
              You <RotatingWords words={ROTATING} />
            </span>
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-muted-foreground text-base md:text-lg leading-relaxed mb-10 max-w-xl"
        >
          One roll. One problem. Two days to prototype it, build it, break it,
          fix it, ship it — and a leaderboard that remembers everything.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-10"
        >
          <Countdown target={eventStart} label="UNTIL KICKOFF" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="/login"
            className="rounded-full px-7 py-3 text-sm font-medium bg-accent text-white hover:bg-accent-hover hover:scale-[1.03] transition-all duration-300 shadow-[0_0_24px_rgba(194,112,62,0.3)]"
          >
            Team Login
          </a>
          <a
            href="#how-it-works"
            className="rounded-full px-7 py-3 text-sm font-medium border border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06] transition-all duration-300"
          >
            How it works
          </a>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10" />
    </AuroraBackground>
  )
}
