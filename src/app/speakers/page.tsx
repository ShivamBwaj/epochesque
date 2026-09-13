import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Badge, EmptyState, SectionHeading } from "@/components/ui"
import { PersonCard } from "@/components/person-card"
import type { Person } from "@/lib/database.types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Speakers",
  description: "The Epochesque lineup — speakers, judges and mentors for the two-day build.",
}

function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/people/${path}`
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
  const solo = speakers.length === 1 ? speakers[0] : null

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
      ) : solo ? (
        <div className="mt-12 flex flex-col items-center gap-8">
          <PersonCard
            name={solo.name}
            role={solo.role}
            tagline={solo.tagline}
            photoUrl={solo.photo_path ? photoUrl(solo.photo_path) : null}
            accentIndex={0}
            feature
          />
          {parseTags(solo.tags).length > 0 ? (
            <div className="flex max-w-xl flex-wrap justify-center gap-2">
              {parseTags(solo.tags).map((t) => (
                <Badge key={t} tone="cyan">
                  {t}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          {speakers.map((s, i) => (
            <PersonCard
              key={s.id}
              name={s.name}
              role={s.role}
              tagline={s.tagline}
              photoUrl={s.photo_path ? photoUrl(s.photo_path) : null}
              accentIndex={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
