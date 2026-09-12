import type { Metadata } from "next"
import { Card, SectionHeading } from "@/components/ui"

export const metadata: Metadata = {
  title: "Organizing Committee",
  description: "The humans behind Epoch — convener, tech, design, ops and everything in between.",
}

const COMMITTEE: { name: string; role: string }[] = [
  { name: "Aarav Menon", role: "Convener" },
  { name: "Diya Krishnan", role: "Co-Convener" },
  { name: "Vishnu Rajan", role: "Tech Lead" },
  { name: "Ishita Bose", role: "Design Lead" },
  { name: "Karan Pillai", role: "Operations" },
  { name: "Meera Joshi", role: "PR & Outreach" },
  { name: "Siddharth Rao", role: "Sponsorships & Finance" },
  { name: "Tanvi Deshmukh", role: "Events & Logistics" },
  { name: "Nikhil Suresh", role: "Media & Content" },
  { name: "Zoya Khan", role: "Registrations" },
]

const HUES = [
  "from-indigo-500 to-cyan-400",
  "from-fuchsia-500 to-indigo-400",
  "from-cyan-400 to-emerald-300",
  "from-amber-400 to-rose-400",
  "from-violet-500 to-fuchsia-400",
  "from-sky-400 to-indigo-400",
  "from-emerald-400 to-teal-300",
  "from-rose-500 to-orange-400",
  "from-teal-400 to-cyan-300",
  "from-orange-400 to-amber-300",
]

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function OcPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading
        kicker="THE CREW"
        title="Organizing Committee"
        description="Ten sleep-deprived humans who made this happen. Find any of them on the floor if something breaks."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COMMITTEE.map((m, i) => (
          <Card key={m.name} className="card-hover flex items-center gap-4 p-5">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                HUES[i % HUES.length]
              } font-mono text-base font-black text-slate-950`}
            >
              {initials(m.name)}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-100">{m.name}</h3>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-300/70">{m.role}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
