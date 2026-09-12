import { Reveal } from "@/components/reveal"

export function FinalCta() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <div className="liquid-glass-strong rounded-2xl px-8 py-16 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 80% at 50% 120%, rgba(194,112,62,0.14) 0%, transparent 60%)",
              }}
            />
            <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-accent mb-4">Final Call</p>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground leading-tight">
              Your epoch starts with{" "}
              <span className="text-accent italic" style={{ fontFamily: "var(--font-display)" }}>
                one roll
              </span>
              .
            </h2>
            <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">
              Registrations happened at the desk — if your team made the list, your leader already holds the keys.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/login"
                className="rounded-full px-7 py-2.5 text-sm font-medium bg-accent text-white hover:bg-accent-hover hover:scale-[1.03] transition-all duration-300 shadow-[0_0_28px_rgba(194,112,62,0.35)]"
              >
                Team Login
              </a>
              <a
                href="/leaderboard"
                className="rounded-full px-7 py-2.5 text-sm font-medium border border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06] transition-all duration-300"
              >
                Watch the leaderboard
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
