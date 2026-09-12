import type { Metadata } from "next"
import { Badge, Card, SectionHeading } from "@/components/ui"

export const metadata: Metadata = {
  title: "Speakers",
  description: "The Epoch lineup — speakers, judges and mentors for the two-day build.",
}

const SPEAKERS: { name: string; role: string; company: string; bio: string; tags: string[] }[] = [
  {
    name: "Kavya Nair",
    role: "Staff Engineer",
    company: "Bengaluru fintech",
    bio: "Keeps payment ledgers honest through festival-sale traffic. Fully expects at least one question about idempotency keys.",
    tags: ["Distributed Systems", "Payments"],
  },
  {
    name: "Rohan Mehta",
    role: "Developer Advocate",
    company: "Dev-tools startup",
    bio: "Ships demos, breaks them on stage, fixes them live. Believes every good talk should end with a repo link.",
    tags: ["DevRel", "Open Source"],
  },
  {
    name: "Dr. Sana Iqbal",
    role: "Research Scientist",
    company: "Applied AI lab",
    bio: "Turns papers into products before the ink dries. Promises to explain how LLMs actually work — without a single matrix on screen.",
    tags: ["ML", "LLMs"],
  },
  {
    name: "Arjun Verma",
    role: "Founder & CTO",
    company: "IoT hardware startup",
    bio: "Went from garage prototypes to shipped units in three years. Will be judging final demos and asking about your power budget.",
    tags: ["Hardware", "Startups"],
  },
  {
    name: "To Be Announced",
    role: "Speaker Slot",
    company: "Announcements coming soon",
    bio: "The lineup is still locking in. Keep an eye on this space — and on our socials.",
    tags: ["TBA"],
  },
  {
    name: "To Be Announced",
    role: "Speaker Slot",
    company: "Announcements coming soon",
    bio: "One more name is being finalized. Good things come to those who roll.",
    tags: ["TBA"],
  },
]

const HUES = [
  "from-indigo-500 to-cyan-400",
  "from-fuchsia-500 to-indigo-400",
  "from-cyan-400 to-emerald-300",
  "from-amber-400 to-rose-400",
  "from-violet-500 to-fuchsia-400",
  "from-sky-400 to-indigo-400",
]

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function SpeakersPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading
        kicker="LINEUP"
        title="Speakers"
        description="Judges, mentors and humans with strong opinions. The full lineup locks in closer to event day."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {SPEAKERS.map((s, i) => (
          <Card key={`${s.name}-${i}`} className="card-hover p-6">
            <div className="flex items-center gap-4">
              <span
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                  HUES[i % HUES.length]
                } font-mono text-lg font-black text-slate-950`}
              >
                {initials(s.name)}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-100">{s.name}</h3>
                <p className="mt-0.5 truncate text-xs text-cyan-300/80">
                  {s.role} · {s.company}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{s.bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <Badge key={t} tone="cyan">
                  {t}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
