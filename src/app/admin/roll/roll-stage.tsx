"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { adminRollForTeamAction } from "@/lib/actions/admin"
import { CaseOpener, type PoolItem } from "@/components/case-opener"
import { GhostFibers } from "@/components/ghost-fibers"
import { Badge } from "@/components/ui"

interface StageTeam {
  id: string
  code: string
  name: string
  psCode: string | null
}

export function RollStage({ teams, pool }: { teams: StageTeam[]; pool: PoolItem[] }) {
  const router = useRouter()
  const unrolled = useMemo(() => teams.filter((t) => !t.psCode), [teams])
  const [selectedId, setSelectedId] = useState<string | null>(unrolled[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Kill the page scrollbar while the stage is up (the admin page behind this
  // fixed overlay is taller than the viewport and otherwise scrolls underneath).
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [])

  const selected = teams.find((t) => t.id === selectedId) ?? unrolled[0] ?? null

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
  }, [teams, search])

  function handleLanded() {}

  return (
    <div className="fixed inset-0 z-40 flex overflow-hidden bg-[#0a0a0b]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60">
        <GhostFibers
          lineColor="#140E35"
          glowColor="#3437A0"
          speed={0.2}
          scale={2}
          rotation={0}
          rotationSpeed={0.25}
          layers={4}
          waveAmplitude={0.015}
          waveFrequency={3}
          waveSpeed={0.15}
          layerSpeed={0.08}
          twist={0.1}
          twistFrequency={5}
          twistSpeed={1.2}
          lineFrequency={5}
          lineSpacing={2}
          lineSharpness={16}
          glowFalloff={10}
          glowIntensity={1.6}
          brightness={2}
          blueBoost={1.25}
          vignette={0.8}
          grain={0.05}
          dpr={1}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#0a0a0b]/35" />

      <aside
        className={`absolute left-0 top-0 z-30 flex h-full flex-col border-r border-white/[0.06] bg-[#0d0d0e]/90 backdrop-blur-md transition-all duration-300 ${
          sidebarOpen ? "w-72" : "w-0"
        }`}
      >
        <div className={`flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4 ${sidebarOpen ? "" : "hidden"}`}>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">TEAMS</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-md p-1.5 text-muted transition hover:bg-white/[0.05] hover:text-foreground"
            title="Hide sidebar"
          >
            ‹‹
          </button>
        </div>
        <div className={`shrink-0 border-b border-white/[0.06] p-3 ${sidebarOpen ? "" : "hidden"}`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team…"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`flex w-full items-center gap-2 border-b border-white/[0.04] px-4 py-2.5 text-left transition ${
                selected && t.id === selected.id ? "bg-accent-soft" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground/90">{t.name}</span>
                <span className="block truncate font-mono text-xs text-accent-hover">{t.code}</span>
              </span>
              {t.psCode ? <Badge tone="green">{t.psCode}</Badge> : <Badge tone="slate">—</Badge>}
            </button>
          ))}
          {filtered.length === 0 ? <p className="px-4 py-6 text-center text-xs text-muted">No teams match.</p> : null}
        </div>
        <div className={`shrink-0 border-t border-white/[0.06] px-4 py-2.5 font-mono text-[11px] text-muted/70 ${sidebarOpen ? "" : "hidden"}`}>
          {unrolled.length} WAITING · {teams.length - unrolled.length} ROLLED
        </div>
      </aside>

      {!sidebarOpen ? (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute left-0 top-1/2 z-30 -translate-y-1/2 rounded-r-lg border border-l-0 border-white/[0.08] bg-[#0d0d0e] px-2 py-6 text-muted transition hover:text-foreground"
          title="Show teams"
        >
          ››
        </button>
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0b]/60 px-4 backdrop-blur-sm">
          <Link
            href="/admin"
            className="rounded-lg px-3 py-1.5 font-mono text-xs text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground"
          >
            ← EXIT STAGE
          </Link>
          <div className="text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted">
              NOW ROLLING · {unrolled.length} LEFT
            </span>
          </div>
          <span className="font-mono text-[11px] text-muted/70">{teams.length - unrolled.length}/{teams.length} ROLLED</span>
        </header>

        {selected ? (
          <main className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-6 pb-6">
            <div className="mb-8 text-center">
              <h1 className="truncate text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                {selected.name}
              </h1>
              <p className="mt-1 truncate font-mono text-sm text-muted-foreground md:text-base">{selected.code}</p>
            </div>
            <div className="mx-auto w-full max-w-5xl">
              <CaseOpener key={selected.id} pool={pool} onLanded={handleLanded} rollFn={() => adminRollForTeamAction(selected.id)} />
            </div>
          </main>
        ) : (
          <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3">
            <span className="text-6xl">🏆</span>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">ALL TEAMS ROLLED</p>
            <p className="text-sm text-muted-foreground">Every team has a problem statement. The build starts now.</p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
            >
              ⟳ Refresh
            </button>
          </main>
        )}
      </div>
    </div>
  )
}
