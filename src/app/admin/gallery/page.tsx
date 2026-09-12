import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { galleryDeleteAction } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Card, EmptyState, SectionHeading } from "@/components/ui"
import { GalleryUpload } from "../gallery-upload"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Gallery",
}

export default async function AdminGalleryPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data: photos } = await admin.from("gallery_photos").select("*").order("sort_order")
  const rows = photos ?? []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MOMENTS"
        title="Gallery"
        description="Upload event photos — they go live on the public gallery the moment they land."
      />

      <GalleryUpload />

      {rows.length === 0 ? (
        <EmptyState icon="◈" title="No photos yet" description="The wall is bare. Upload the first shots." />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => {
            const url = `${supabaseUrl}/storage/v1/object/public/gallery/${p.storage_path}`
            return (
              <Card key={p.id} className="overflow-hidden">
                <img src={url} alt={p.caption || "Epoch event photo"} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <div className="space-y-3 p-3">
                  <p className="truncate text-xs text-slate-400" title={p.caption}>
                    {p.caption || "—"}
                  </p>
                  <form action={galleryDeleteAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton variant="danger" size="sm" confirm="Delete this photo? It disappears from the public gallery too." className="w-full">
                      Delete
                    </SubmitButton>
                  </form>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
