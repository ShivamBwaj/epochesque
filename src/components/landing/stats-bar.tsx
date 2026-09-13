"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { AnimatedNumber } from "@/components/animated-number"

const stats = [
  { value: 100, label: "Teams in the arena", type: "number" as const },
  { value: "48", label: "Hours on the clock", type: "static" as const },
  { value: "1", label: "Roll — locked forever", type: "static" as const },
  { value: "🏆", label: "Exclusive prizes + goodies", type: "static" as const },
]

export function StatsBar() {
  const [inView, setInView] = useState(false)

  return (
    <section className="py-12 lg:py-16">
      <motion.div
        onViewportEnter={() => setInView(true)}
        viewport={{ once: true }}
        className="max-w-[1200px] mx-auto px-6"
      >
        <div className="liquid-glass rounded-2xl px-6 py-8 md:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-[clamp(28px,4vw,40px)] font-semibold text-foreground leading-none mb-2">
                  {stat.type === "number" ? (
                    <AnimatedNumber value={stat.value as number} duration={1400} />
                  ) : (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={inView ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.1 + 0.2 }}
                    >
                      {stat.value}
                    </motion.span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground tracking-wide uppercase">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
