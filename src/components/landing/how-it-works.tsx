import { Reveal, StaggerContainer, StaggerItem } from "@/components/reveal"

const STEPS = [
  {
    n: "01",
    title: "Register off-site",
    body: "Sign up through the fest registration desk or form before event day. Leader details in, payment done, name on the list.",
  },
  {
    n: "02",
    title: "Team login",
    body: "Your leader signs in with the credentials handed over by the OC. One login, one team.",
  },
  {
    n: "03",
    title: "Roll your problem",
    body: "Your leader hits ROLL right from the team dashboard. The reel spins, decelerates, and locks a problem statement to your team — instantly and irreversibly.",
  },
  {
    n: "04",
    title: "Round 1 — Quiz",
    body: "The on-stage quiz. Quick, live, and worth 10% of your final score.",
  },
  {
    n: "05",
    title: "Round 2 — OC Round",
    body: "Shape the concept, build the prototype, upload your deck before the deadline slams shut. Worth 20% of your final score.",
  },
  {
    n: "06",
    title: "Judging & leaderboard",
    body: "Judges score every round. The leaderboard unlocks publicly on this site — check exactly where you stand.",
  },
  {
    n: "07",
    title: "Finals & podium",
    body: "Surviving teams push code to GitHub and demo live. Worth 70% of your final score. Winners take the podium at the closing ceremony.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 lg:py-24 scroll-mt-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-accent mb-2">Mission Brief</p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">How it works</h2>
          <p className="text-muted-foreground text-sm mb-12 max-w-lg">
            Seven steps between you and the podium. No surprises — except the roll.
          </p>
        </Reveal>

        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.08}>
          {STEPS.map((s) => (
            <StaggerItem key={s.n}>
              <div className="liquid-glass rounded-xl p-6 h-full card-hover">
                <span
                  className="font-mono text-xs tracking-widest text-accent/80"
                >
                  {s.n}
                </span>
                <h3 className="mt-3 text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
