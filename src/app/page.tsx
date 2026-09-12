import type { Metadata } from "next"
import { getEventTiming } from "@/lib/settings"
import { Hero } from "@/components/landing/hero"
import { StatsBar } from "@/components/landing/stats-bar"
import { HowItWorks } from "@/components/landing/how-it-works"
import { RollSection } from "@/components/landing/roll-section"
import { FinalCta } from "@/components/landing/final-cta"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  description:
    "Epoch — a 48-hour hackathon. Roll your problem statement, build, submit, and climb the leaderboard.",
}

export default async function HomePage() {
  const timing = await getEventTiming()

  return (
    <div>
      <Hero eventStart={timing.event_start} />
      <StatsBar />
      <HowItWorks />
      <RollSection />
      <FinalCta />
    </div>
  )
}
