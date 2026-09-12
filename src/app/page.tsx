import type { Metadata } from "next"
import { getEventTiming } from "@/lib/settings"
import { Countdown } from "@/components/countdown"
import { Card, LinkButton, SectionHeading, StatCard } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: { absolute: "Epoch — Hackathon" },
  description:
    "Epoch — a two-day hackathon where your problem statement is decided by the roll of a dice. Build, pitch, ship, and climb the leaderboard.",
}

const STATS: { label: string; value: string; sub?: string }[] = [
  { label: "TEAMS", value: "100+", sub: "Squads in the arena" },
  { label: "FORMAT", value: "2 Days", sub: "One relentless weekend" },
  { label: "PROBLEM", value: "1 Roll", sub: "Locked the moment it lands" },
  { label: "PRIZES", value: "₹ Prizes", sub: "Cash, goodies, glory" },
]

const STEPS: { title: string; body: string }[] = [
  {
    title: "Register off-site",
    body: "Teams sign up through the fest registration desk or form before event day. Leader details in, payment done, name on the list.",
  },
  {
    title: "Team login",
    body: "Your leader signs in here with the credentials handed over by the OC. One login, one team.",
  },
  {
    title: "Roll your problem statement",
    body: "Hit Roll on the dashboard. The dice pick your problem and lock it to your team — instantly and irreversibly.",
  },
  {
    title: "Round 1 — build & pitch",
    body: "Shape the concept, build the prototype, upload your PPT before the Round 1 deadline slams shut.",
  },
  {
    title: "Judging & leaderboard",
    body: "Judges score every deck. The Round 1 leaderboard unlocks publicly on this site — check exactly where you stand.",
  },
  {
    title: "Final round & winners",
    body: "Surviving teams push code to GitHub and demo live. Winners take the podium at the closing ceremony.",
  },
]

const ROLL_POINTS = [
  "One roll per team — the result locks to you the instant it lands",
  "Every problem is scoped for 48 hours, not 48 days",
  "No rerolls, no trades, no mercy — build what fate dealt you",
]

export default async function Home() {
  const timing = await getEventTiming()

  return (
    <div>
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-16 text-center md:pb-24 md:pt-24">
        <p className="hud-label fade-up">A 48-HOUR HACKATHON · MMXXVI</p>
        <h1 className="text-gradient fade-up mt-6 font-mono text-[clamp(4.5rem,14vw,11rem)] font-black leading-none tracking-[0.05em]">
          EPOCH
        </h1>
        <p className="fade-up mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-400 md:text-lg">
          You don&rsquo;t choose your problem — you roll it. Two days, one locked-in problem statement, and a leaderboard that remembers everything.
        </p>
        <div className="fade-up mt-10">
          <Countdown target={timing.event_start} label="UNTIL KICKOFF" pastLabel="LIVE NOW" />
        </div>
        <div className="fade-up mt-10 flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/login" size="lg">
            Team Login
          </LinkButton>
          <LinkButton href="/speakers" variant="secondary" size="lg">
            Meet the lineup
          </LinkButton>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <SectionHeading
          kicker="MISSION BRIEF"
          title="How it works"
          description="Six steps between you and the podium. No surprises — except the dice."
        />
        <ol className="ml-2 max-w-3xl space-y-7 border-l border-slate-800/80 pl-8 md:ml-6 md:pl-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="absolute -left-[3.125rem] top-0 flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-[#05060f] font-mono text-xs font-bold text-cyan-300 md:-left-[3.625rem]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="hud-label mb-2">THE ROLL</p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">
              One roll. One problem. <span className="text-gradient">No takebacks.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Every hackathon starts the same way: hours lost arguing over which problem to pick. Epoch deletes the argument. When the clock starts, your team leader hits Roll — and the problem statement that comes up is yours for the rest of the event.
            </p>
            <ul className="mt-6 space-y-3">
              {ROLL_POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-slate-300">
                  <span aria-hidden className="mt-0.5 font-mono text-cyan-400/70">
                    ◈
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex flex-col items-center">
            <div aria-hidden className="absolute h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="relative flex h-52 w-52 items-center justify-center rounded-3xl border border-slate-700/50 bg-gradient-to-b from-slate-900 to-slate-950 ring-glow">
              <span aria-hidden className="dice-face text-8xl select-none">
                🎲
              </span>
            </div>
            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/70 px-4 py-2 font-mono text-xs text-slate-400">
              <span className="text-cyan-300">PS-07</span>
              <span aria-hidden className="text-slate-600">
                ·
              </span>
              <span>Last-mile delivery router</span>
              <span className="rounded-full border border-amber-500/40 bg-amber-950/30 px-2 py-0.5 text-[10px] tracking-widest text-amber-300">
                LOCKED
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Card className="relative overflow-hidden px-6 py-14 text-center md:py-16">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-500/10" />
          <div className="relative">
            <p className="hud-label">FINAL CALL</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">Your epoch starts with one roll.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
              Registrations happened at the desk — if your team made the list, your leader already holds the keys.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <LinkButton href="/login" size="lg">
                Team Login
              </LinkButton>
              <LinkButton href="/leaderboard" variant="secondary" size="lg">
                Watch the leaderboard
              </LinkButton>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
