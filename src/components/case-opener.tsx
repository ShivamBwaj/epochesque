"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  useVelocity,
} from "framer-motion"
import { Alert, Button } from "@/components/ui"

export interface PoolItem {
  id: number
  code: string
  title: string
}

export interface RolledPs {
  id: number
  code: string
  title: string
  description: string
}

export interface RollResult {
  ok: boolean
  error?: string
  ps?: RolledPs
}

type Phase = "idle" | "resolving" | "spinning" | "landed"

// One simple schedule, synced to the ~5s roll.mp3:
// gentle drift → ramp up → cruise (readable, not dizzy) → power ease-out onto the winner.
const DRIFT_START_V = 90 // px/s — slow opening drift
const CRUISE_V = 1600 // px/s — fast but readable
const RAMP_S = 0.85 // drift → cruise
const DECEL_S = 2.65 // final slowdown onto the winner
const LAND_AT_S = 5.0 // target total spin ≈ roll.mp3 length
const DECEL_MIN_S = 1.5
const WATCHDOG_MS = 15000
const CARD_GAP = 12
const REVEALS = [
  "/sounds/case_reveal_rare_01.mp3",
  "/sounds/case_reveal_mythical_01.mp3",
  "/sounds/case_reveal_legendary_01.mp3",
  "/sounds/case_reveal_ancient_01.mp3",
]
const RARITY = ["#4b69ff", "#8847ff", "#d32ce6", "#eb4b4b", "#ffd700"]

interface Particle {
  id: number
  dx: number
  dy: number
  rot: number
  size: number
  color: string
}

function makeParticles(): Particle[] {
  const colors = ["#d4824e", "#e8956a", "#34d399", "#a78bfa", "#fafaf9"]
  return Array.from({ length: 28 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 28 + Math.random() * 0.5
    const dist = 90 + Math.random() * 130
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 40,
      rot: Math.random() * 540 - 270,
      size: 4 + Math.random() * 5,
      color: colors[i % colors.length],
    }
  })
}

export function CaseOpener({
  pool,
  rollFn,
  onLanded,
}: {
  pool: PoolItem[]
  rollFn: () => Promise<RollResult>
  onLanded?: () => void
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [winner, setWinner] = useState<RolledPs | null>(null)
  const [winningIndex, setWinningIndex] = useState<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])

  const viewportRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const rollAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastTickIdx = useRef<number>(-1)
  const phaseRef = useRef<Phase>("idle")
  const hasRollSound = useRef<boolean | null>(null)
  const spinRef = useRef<{ raf: number | null; cancelled: boolean }>({ raf: null, cancelled: false })

  const x = useMotionValue(0)
  const velocity = useVelocity(x)
  const blurAmount = useTransform(velocity, [-5000, -1800, 0, 1800, 5000], [9, 2.2, 0, 2.2, 9], { clamp: true })
  const filter = useMotionTemplate`blur(${blurAmount}px)`

  const repeats = useMemo(() => Math.max(8, Math.ceil(160 / Math.max(1, pool.length))), [pool.length])
  const strip = useMemo(() => Array.from({ length: repeats }, () => pool).flat(), [pool, repeats])

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null
    if (!audioRef.current) {
      try {
        audioRef.current = new AudioContext()
      } catch {
        return null
      }
    }
    return audioRef.current
  }, [])

  const fileSound = useCallback((src: string, vol: number) => {
    try {
      const a = new Audio(src)
      a.volume = vol
      const p = a.play()
      if (p) p.catch(() => {})
      return true
    } catch {
      return false
    }
  }, [])

  const tick = useCallback(() => {
    if (muted) return
    if (hasRollSound.current === true) return
    const ctx = ensureAudio()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "square"
      const base = 1900 + Math.random() * 350
      osc.frequency.setValueAtTime(base, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(base * 0.6, ctx.currentTime + 0.025)
      gain.gain.setValueAtTime(0.05, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.05)
    } catch {}
  }, [muted, ensureAudio])

  const chime = useCallback(() => {
    if (muted) return
    if (fileSound(REVEALS[Math.floor(Math.random() * REVEALS.length)], 0.85)) return
    const ctx = ensureAudio()
    if (!ctx) return
    try {
      ;[392, 523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const t = ctx.currentTime + i * 0.1
        osc.type = "triangle"
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.13, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.65)
      })
      const bass = ctx.createOscillator()
      const bassGain = ctx.createGain()
      bass.type = "sine"
      bass.frequency.setValueAtTime(130.81, ctx.currentTime)
      bassGain.gain.setValueAtTime(0.1, ctx.currentTime)
      bassGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8)
      bass.connect(bassGain).connect(ctx.destination)
      bass.start()
      bass.stop(ctx.currentTime + 0.85)
    } catch {}
  }, [muted, ensureAudio, fileSound])

  useMotionValueEvent(x, "change", (latest) => {
    const ph = phaseRef.current
    if (ph !== "resolving" && ph !== "spinning") return
    const viewport = viewportRef.current
    const card = cardRef.current
    if (!viewport || !card) return
    const step = card.offsetWidth + CARD_GAP
    const markerX = viewport.clientWidth / 2
    const idx = Math.round((markerX - latest - card.offsetWidth / 2) / step)
    if (idx !== lastTickIdx.current) {
      lastTickIdx.current = idx
      tick()
    }
  })

  useEffect(() => {
    fetch("/sounds/roll.mp3", { method: "HEAD" })
      .then((r) => {
        hasRollSound.current = r.ok
      })
      .catch(() => {
        hasRollSound.current = false
      })
  }, [])

  useEffect(() => {
    const machine = spinRef.current
    return () => {
      machine.cancelled = true
      if (machine.raf !== null) cancelAnimationFrame(machine.raf)
      audioRef.current?.close().catch(() => {})
    }
  }, [])

  function playRollSound() {
    if (muted) return
    if (!rollAudioRef.current) {
      const a = new Audio("/sounds/roll.mp3")
      a.preload = "auto"
      a.volume = 0.85
      rollAudioRef.current = a
    }
    try {
      rollAudioRef.current.currentTime = 0
      const p = rollAudioRef.current.play()
      if (p) p.catch(() => {})
    } catch {}
  }

  const chimeRef = useRef(chime)
  const onLandedRef = useRef(onLanded)
  useEffect(() => {
    chimeRef.current = chime
    onLandedRef.current = onLanded
  })

  async function roll() {
    if (phase !== "idle") return
    setError(null)
    const ctx = ensureAudio()
    ctx?.resume().catch(() => {})
    setPhase("resolving")
    phaseRef.current = "resolving"

    const resultP = rollFn()

    const viewport = viewportRef.current
    const card = cardRef.current
    if (!viewport || !card) {
      const res = await resultP
      if (!res.ok || !res.ps) {
        setError(res.error ?? "Could not roll. Try again.")
        setPhase("idle")
        phaseRef.current = "idle"
        return
      }
      setWinner(res.ps)
      setPhase("landed")
      phaseRef.current = "landed"
      chime()
      onLanded?.()
      return
    }

    if (!muted) playRollSound()

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      const res = await resultP
      if (!res.ok || !res.ps) {
        setError(res.error ?? "Could not roll. Try again.")
        setPhase("idle")
        phaseRef.current = "idle"
        return
      }
      const poolIndex = Math.max(0, pool.findIndex((p) => p.code === res.ps!.code))
      const stripIndex = (repeats - 2) * pool.length + poolIndex
      setWinner(res.ps)
      setWinningIndex(stripIndex)
      setPhase("landed")
      phaseRef.current = "landed"
      setParticles(makeParticles())
      chime()
      onLanded?.()
      setTimeout(() => router.refresh(), 1200)
      return
    }

    // ---- the spin machine: drift → cruise → decel, all in one rAF loop ----
    const cardW = card.offsetWidth
    const step = cardW + CARD_GAP
    const loop = Math.max(1, pool.length) * step
    const markerX = viewport.clientWidth / 2
    const marginLoops = Math.ceil(viewport.clientWidth / loop) + 1
    let baseX = x.get()
    const wrapped = ((baseX % loop) + loop) % loop
    baseX = wrapped - (repeats - marginLoops) * loop
    x.set(baseX)

    let result: RolledPs | null = null
    let failed: string | null = null
    resultP
      .then((res) => {
        if (res.ok && res.ps) result = res.ps
        else failed = res.error ?? "Could not roll. Try again."
      })
      .catch(() => {
        failed = "Could not roll. Try again."
      })

    const machine = spinRef.current
    machine.cancelled = false
    let stage: "ramp" | "cruise" | "decel" = "ramp"
    let decel: { startX: number; dist: number; durMs: number; k: number; start: number } | null = null
    const t0 = performance.now()
    let last = t0
    const decelEarliestMs = (LAND_AT_S - DECEL_S) * 1000

    const stopFailed = (msg: string) => {
      rollAudioRef.current?.pause()
      setError(msg)
      setPhase("idle")
      phaseRef.current = "idle"
    }

    const frame = (now: number) => {
      if (machine.cancelled) return
      const t = now - t0

      if (failed) {
        stopFailed(failed)
        return
      }
      if (t > WATCHDOG_MS && !result) {
        stopFailed("Roll is taking too long. Try again.")
        return
      }

      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (stage === "ramp" || stage === "cruise") {
        const u = Math.min(t / (RAMP_S * 1000), 1)
        const ease = u * u * (3 - 2 * u)
        const v = DRIFT_START_V + (CRUISE_V - DRIFT_START_V) * ease
        x.set(x.get() - v * dt)
        if (x.get() < baseX - loop) x.set(x.get() + loop)
        stage = u >= 1 ? "cruise" : "ramp"

        if (stage === "cruise" && result && t >= decelEarliestMs) {
          const T = Math.min(DECEL_S, Math.max(DECEL_MIN_S, LAND_AT_S - t / 1000))
          const ps = result
          const poolIndex = Math.max(0, pool.findIndex((p) => p.code === ps.code))
          const stripIndex = (repeats - 2) * pool.length + poolIndex
          const targetX = markerX - stripIndex * step - cardW / 2
          const rem = ((x.get() - targetX) % loop + loop) % loop
          const minDist = (CRUISE_V * T) / 4
          const loops = Math.max(1, Math.ceil((minDist - rem) / loop))
          const dist = rem + loops * loop
          let k = (CRUISE_V * T) / dist
          k = Math.min(4, Math.max(0.55, k))
          decel = { startX: targetX + dist, dist, durMs: T * 1000, k, start: now }
          x.set(decel.startX)
          lastTickIdx.current = -1
          setWinner(ps)
          setWinningIndex(stripIndex)
          setPhase("spinning")
          phaseRef.current = "spinning"
          stage = "decel"
        }
      } else if (decel) {
        const u = Math.min((now - decel.start) / decel.durMs, 1)
        const e = 1 - Math.pow(1 - u, decel.k)
        x.set(decel.startX - decel.dist * e)
        if (u >= 1) {
          setPhase("landed")
          phaseRef.current = "landed"
          setParticles(makeParticles())
          chimeRef.current()
          onLandedRef.current?.()
          setTimeout(() => router.refresh(), 3000)
          return
        }
      }

      machine.raf = requestAnimationFrame(frame)
    }
    machine.raf = requestAnimationFrame(frame)
  }

  if (pool.length === 0) {
    return <Alert tone="error">All problem statements are taken. Talk to the organizers at the desk.</Alert>
  }

  const busy = phase !== "idle"
  const winnerColor = winner ? RARITY[pool.findIndex((p) => p.code === winner.code) % RARITY.length] ?? "#c2703e" : "#c2703e"

  return (
    <div className="w-full">
      <div className="relative">
        <div
          ref={viewportRef}
          className="relative h-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0b]/85 backdrop-blur-sm sm:h-52 md:h-64"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 14%, black 86%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 14%, black 86%, transparent)",
          }}
        >
          <motion.div style={{ x, filter }} className="absolute left-0 top-0 flex h-full gap-3">
            {strip.map((p, i) => {
              const isWinner = phase === "landed" && i === winningIndex
              const dimmed = phase === "landed" && !isWinner
              const color = RARITY[i % RARITY.length]
              return (
                <div
                  key={i}
                  ref={i === 0 ? cardRef : undefined}
                  className={`relative flex h-full w-40 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 py-3 transition-opacity sm:w-52 md:w-60 ${
                    isWinner
                      ? "border-white/[0.25] bg-white/[0.06]"
                      : dimmed
                        ? "border-white/[0.05] bg-white/[0.02] opacity-30"
                        : "border-white/[0.10] bg-white/[0.03]"
                  }`}
                  style={
                    isWinner
                      ? { boxShadow: `0 0 60px -8px ${color}66, inset 0 0 40px -10px ${color}55` }
                      : undefined
                  }
                >
                  <span className={`font-mono text-[10px] tracking-widest sm:text-xs ${isWinner ? "text-accent-hover" : "text-muted/60"}`}>
                    {p.code}
                  </span>
                  <span
                    className={`line-clamp-3 text-center text-xs font-medium leading-snug sm:text-sm md:text-base ${
                      isWinner ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {p.title}
                  </span>
                  <span className="h-1 w-12 rounded-full" style={{ background: color, opacity: isWinner ? 1 : 0.55 }} />
                  {isWinner ? (
                    <motion.span
                      initial={{ x: "-120%" }}
                      animate={{ x: "120%" }}
                      transition={{ duration: 0.9, delay: 0.1, ease: "easeInOut" }}
                      className="pointer-events-none absolute inset-0"
                      style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)" }}
                    />
                  ) : null}
                </div>
              )
            })}
          </motion.div>

          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 -translate-x-1/2">
            <div className={`h-full w-[3px] bg-[#ffd700] shadow-[0_0_16px_rgba(255,215,0,0.9)] ${phase === "spinning" ? "scale-y-105" : ""}`} />
            <div className="absolute -top-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#ffd700]" />
            <div className="absolute -bottom-0.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-[#ffd700]" />
          </div>

          {phase === "landed" && winningIndex !== null ? (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              {particles.map((p) => (
                <motion.span
                  key={p.id}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                  animate={{ x: p.dx, y: p.dy, opacity: 0, rotate: p.rot }}
                  transition={{ duration: 1 + (p.id % 5) * 0.12, ease: "easeOut" }}
                  style={{ position: "absolute", left: 0, top: 0, width: p.size, height: p.size * 0.6, background: p.color, borderRadius: 1 }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4">
        {phase === "landed" && winner ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.3em]" style={{ color: winnerColor }}>
              the roll has spoken
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-4xl">
              {winner.code} — {winner.title}
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-4 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
            >
              View my problem statement →
            </button>
          </motion.div>
        ) : (
          <Button size="lg" onClick={roll} disabled={busy} className="min-w-56 px-10 py-4 text-base md:text-lg">
            ROLL IT !!
          </Button>
        )}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {error ? <div className="mt-4"><Alert tone="error">{error}</Alert></div> : null}
    </div>
  )
}
