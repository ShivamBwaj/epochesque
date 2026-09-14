"use client"

import { motion } from "framer-motion"
import { Package, Lock, Timer } from "lucide-react"
import { Reveal } from "@/components/reveal"

const FEATURES = [
  {
    icon: Package,
    title: "True randomness",
    body: "Every unclaimed problem statement rides the reel. The roll decides — the claim is atomic, no two teams can ever land the same slot when capacity runs out.",
    accent: "text-accent",
    span: "md:col-span-2",
    visual: (
      <div className="mt-5">
        <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] py-3" style={{ maskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 12%, black 88%, transparent)" }}>
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="flex w-max gap-3"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex w-28 shrink-0 flex-col gap-1 rounded-lg border border-white/[0.10] bg-white/[0.04] px-3 py-2">
                <span className="font-mono text-[9px] tracking-widest text-muted/70">PS-{String(i % 3 + 1).padStart(2, "0")}</span>
                <span className="truncate text-[11px] text-muted-foreground">Problem {i % 3 + 1}</span>
              </div>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-accent shadow-[0_0_12px_rgba(194,112,62,0.9)]" />
        </div>
        <p className="mt-2 font-mono text-[10px] tracking-widest text-muted/60">SPINNING…</p>
      </div>
    ),
  },
  {
    icon: Lock,
    title: "Locked the moment it lands",
    body: "No re-rolls. No trades. No mercy.",
    accent: "text-red-400",
    span: "",
    visual: null,
  },
  {
    icon: Timer,
    title: "Scoped for 24 hours",
    body: "Every problem is sized for one relentless day — not one semester.",
    accent: "text-blue-300",
    span: "",
    visual: null,
  },
]

export function RollSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-accent mb-2">The Roll</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
            One spin. One problem.{" "}
            <span className="text-foreground/50 italic" style={{ fontFamily: "var(--font-display)" }}>
              no takebacks
            </span>
          </h2>
          <p className="text-muted-foreground text-sm mb-12 max-w-lg">
            Every hackathon starts the same way: hours lost arguing over which problem to pick. Epochesque deletes the argument — hit roll and let the reel decide.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.1} className={f.span}>
              <div className="liquid-glass rounded-xl p-6 h-full card-hover">
                <f.icon className={`w-5 h-5 ${f.accent} mb-4`} />
                <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{f.body}</p>
                {f.visual}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
