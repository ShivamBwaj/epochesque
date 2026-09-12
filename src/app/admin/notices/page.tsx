import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { EmptyState, SectionHeading } from "@/components/ui"
import { NoticeManager } from "./notice-manager"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Notices",
}

export default async function AdminNoticesPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data: notices } = await admin
    .from("announcements")
    .select("id, title, body, is_published, published_at")
    .eq("kind", "notice")
    .order("created_at", { ascending: false })

  const rows = (notices ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    text: typeof n.body === "string" ? n.body : "",
    is_published: n.is_published,
  }))

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="BROADCAST"
        title="Notices"
        description="Short announcements shown to signed-in teams on their dashboard. Draft first, publish when ready."
      />
      {rows.length === 0 ? (
        <EmptyState icon="◇" title="No notices yet" description="Create the first one below — teams will see it on their dashboard once published." />
      ) : null}
      <NoticeManager initial={rows} />
    </div>
  )
}
