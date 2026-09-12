import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import type { WinnersEntry } from "@/lib/database.types"
import { SectionHeading } from "@/components/ui"
import { WinnersForm } from "../winners-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Announce Winners",
}

export default async function AdminWinnersPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data: announcement } = await admin.from("announcements").select("*").eq("kind", "winners").maybeSingle()

  const body = announcement?.body
  const entries: WinnersEntry[] = Array.isArray(body) ? (body as unknown as WinnersEntry[]) : []

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="PODIUM"
        title="Announce winners"
        description="Build the final podium. Keep it as a draft while judging is contested, publish it when it's settled — it lands on the public leaderboard."
      />
      <WinnersForm
        initialTitle={announcement?.title ?? "Winners"}
        initialEntries={entries}
        isPublished={!!announcement?.is_published}
      />
    </div>
  )
}
