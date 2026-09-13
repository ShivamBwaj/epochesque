"use client"

import { motion } from "framer-motion"
import { Dices, Lock, Timer } from "lucide-react"
import { Reveal } from "@/components/reveal"

const FEATURES = [
  {
    icon: Dices,
    title: "True randomness",
    body: "Every unclaimed problem statement is in the pool. The roll is atomic — no two teams can ever land the same slot when capacity runs out.",
    accent: "text-accent",
    span: "md:col-span-2",
    visual: (
      <div className="flex items-center gap-3 mt-5">
        {[1, 2, 3].map((i) => (
          <motion.span
            key={i}
            animate={{ rotate: [0, -12, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-accent/25 bg-accent-soft text-xl"
          >
            🎲
          </motion.span>
        ))}
        <span className="ml-2 font-mono text-[10px] tracking-widest text-muted/60">
          ROLLING…
        </span>
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
    title: "Scoped for 48 hours",
    body: "Every problem is sized for one relentless weekend — not one semester.",
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
            One roll. One problem.{" "}
            <span className="text-foreground/50 italic" style={{ fontFamily: "var(--font-display)" }}>
              no takebacks
            </span>
          </h2>
          <p className="text-muted-foreground text-sm mb-12 max-w-lg">
            Every hackathon starts the same way: hours lost arguing over which problem to pick. Epochesque deletes the argument.
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
