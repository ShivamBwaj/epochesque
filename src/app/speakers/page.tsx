import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Badge, Card, EmptyState, SectionHeading } from "@/components/ui"
import type { Person } from "@/lib/database.types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Speakers",
  description: "The Epochesque lineup — speakers, judges and mentors for the two-day build.",
}

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

function parseTags(tags: Person["tags"]): string[] {
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : []
}

export default async function SpeakersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("people")
    .select("*")
    .eq("kind", "speaker")
    .eq("is_published", true)
    .order("sort_order")
    .order("name")
  const speakers = (data ?? []) as Person[]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 py-12">
      <SectionHeading
        kicker="LINEUP"
        title="Speakers"
        description="Judges, mentors and humans with strong opinions. The full lineup locks in closer to event day."
      />
      {speakers.length === 0 ? (
        <EmptyState
          icon="◈"
          title="The lineup is still locking in"
          description="Speakers, judges and mentors get announced here as they confirm. Keep an eye on this space."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {speakers.map((s, i) => {
            const tags = parseTags(s.tags)
            return (
              <Card key={s.id} className="card-hover p-6">
                <div className="flex items-center gap-4">
                  {s.photo_path ? (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/people/${s.photo_path}`}
                      alt={s.name}
                      className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-white/10"
                    />
                  ) : (
                    <span
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                        HUES[i % HUES.length]
                      } font-mono text-lg font-black text-slate-950`}
                    >
                      {initials(s.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-slate-100">{s.name}</h3>
                    {s.role ? <p className="mt-0.5 truncate text-xs text-cyan-300/80">{s.role}</p> : null}
                  </div>
                </div>
                {s.tagline ? <p className="mt-4 text-sm leading-relaxed text-slate-400">{s.tagline}</p> : null}
                {tags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <Badge key={t} tone="cyan">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
