import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { getEventTiming } from "@/lib/settings"
import { SectionHeading } from "@/components/ui"
import { SettingsForm } from "../settings-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function AdminSettingsPage() {
  await requireAdminPage()
  const timing = await getEventTiming()

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MISSION CLOCK"
        title="Event timing"
        description="The gates every page reads: the landing countdown, the problem roll, and both submission windows. Empty a field to clear it."
      />
      <SettingsForm timing={timing} />
    </div>
  )
}
