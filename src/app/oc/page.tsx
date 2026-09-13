import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { Card, EmptyState, SectionHeading } from "@/components/ui"
import type { Person } from "@/lib/database.types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Organizing Committee",
  description: "The humans behind Epochesque — convener, tech, design, ops and everything in between.",
}

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {committee.map((m, i) => (
            <Card key={m.id} className="card-hover p-5">
              <div className="flex items-center gap-4">
                {m.photo_path ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/people/${m.photo_path}`}
                    alt={m.name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${
                      HUES[i % HUES.length]
                    } font-mono text-base font-black text-slate-950`}
                  >
                    {initials(m.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-slate-100">{m.name}</h3>
                  {m.role ? (
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-300/70">{m.role}</p>
                  ) : null}
                </div>
              </div>
              {m.tagline ? <p className="mt-3 text-xs leading-relaxed text-slate-400">{m.tagline}</p> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
