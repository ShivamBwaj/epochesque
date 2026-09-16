import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { getEventTiming, getEventFlags, getPptTemplatePath } from "@/lib/settings"
import { SectionHeading } from "@/components/ui"
import { SettingsForm } from "../settings-form"
import { CertificatesCard } from "./certificates-card"
import { PptTemplateCard } from "./ppt-template-card"
import { ProjectsPublishedCard } from "./projects-published-card"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function AdminSettingsPage() {
  await requireAdminPage()
  const [timing, flags, templatePath] = await Promise.all([getEventTiming(), getEventFlags(), getPptTemplatePath()])
  const templateUrl = templatePath ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${templatePath}` : null

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="MISSION CLOCK"
        title="Event timing"
        description="The gates every page reads: the landing countdown, the problem roll, and both submission windows. Empty a field to clear it."
      />
      <SettingsForm timing={timing} />

      <SectionHeading
        kicker="OC ROUND"
        title="Pitch deck template"
        description="The template teams see a link to on the OC Round submission page. Swap it any time — the link updates instantly for every team."
      />
      <PptTemplateCard templateUrl={templateUrl} fileName={templatePath} />

      <SectionHeading
        kicker="LEADERBOARD"
        title="Project pages"
        description="Each submitted project (title, description, repo) gets a page linked from the leaderboard. Admin-only until you make them public."
      />
      <ProjectsPublishedCard published={flags.projectsPublished} />

      <SectionHeading
        kicker="POST-EVENT"
        title="Certificates"
        description="Participation certificates, generated on demand from the Canva template with each person's name."
      />
      <CertificatesCard published={flags.certificatesPublished} />
    </div>
  )
}
