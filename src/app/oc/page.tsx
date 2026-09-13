import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { EmptyState, SectionHeading } from "@/components/ui"
import { PersonCard } from "@/components/person-card"
import type { Person } from "@/lib/database.types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Organizing Committee",
  description: "The humans behind Epochesque — convener, tech, design, ops and everything in between.",
}

function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/people/${path}`
}

export default async function OcPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("people")
    .select("*")
    .eq("kind", "oc")
    .eq("is_published", true)
    .order("sort_order")
    .order("name")
  const committee = (data ?? []) as Person[]

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 py-12">
      <SectionHeading
        kicker="THE CREW"
        title="Organizing Committee"
        description="The sleep-deprived humans who made this happen. Find any of them on the floor if something breaks."
      />
      {committee.length === 0 ? (
        <EmptyState
          icon="◈"
          title="The crew page is being finalized"
          description="Committee members with their roles and taglines land here soon."
        />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-4">
          {committee.map((m, i) => (
            <PersonCard
              key={m.id}
              name={m.name}
              role={m.role}
              tagline={m.tagline}
              photoUrl={m.photo_path ? photoUrl(m.photo_path) : null}
              accentIndex={i}
            />
          ))}
        </div>
      )}
    </div>
  )
}
