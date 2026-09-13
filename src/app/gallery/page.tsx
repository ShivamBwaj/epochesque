import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { EmptyState, SectionHeading } from "@/components/ui"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photos from the Epochesque floor — the build, the breakdowns, the 3 a.m. victories.",
}

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("gallery_photos").select("*").order("sort_order", { ascending: true })
  const photos = data ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 pt-28 py-12">
      <SectionHeading
        kicker="ARCHIVE"
        title="Gallery"
        description="The caffeine, the whiteboards, the 3 a.m. demo that somehow worked — straight from the Epochesque floor."
      />
      {photos.length === 0 ? (
        <EmptyState
          icon="◈"
          title="Photos drop after the event"
          description="Our photographers are already roaming the floor. Shots land here once the dust settles."
        />
      ) : (
        <div className="columns-2 gap-4 md:columns-3">
          {photos.map((p) => (
            <figure
              key={p.id}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-slate-800/60"
            >
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/gallery/${p.storage_path}`}
                alt={p.caption || "Photo from Epochesque"}
                loading="lazy"
                decoding="async"
                className="w-full transition-transform duration-500 group-hover:scale-105"
              />
              {p.caption ? (
                <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-8 text-xs text-slate-200 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {p.caption}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
