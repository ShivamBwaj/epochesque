"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"

const WORDS = ["prototype it", "build it", "break it", "fix it", "ship it"]

export function RotatingWords() {
  const words = useMemo(() => WORDS, [])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIndex((i) => (i + 1) % words.length)
    }, 2400)
    return () => clearTimeout(timeout)
  }, [index, words])

  return (
    <span className="relative inline-flex overflow-hidden h-[1.15em] align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-accent italic"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
