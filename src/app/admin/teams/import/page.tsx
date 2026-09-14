import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { Card, Prose, SectionHeading } from "@/components/ui"
import { ImportWizard } from "../../import-wizard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Import Teams",
}

export default async function AdminImportPage() {
  await requireAdminPage()

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="ONBOARDING"
        title="Import teams"
        description="Turn the registration CSV into team logins in three steps: upload, review, create. Nothing touches the database until you confirm."
      />

      <Card className="p-5">
        <p className="hud-label mb-3">CSV FORMAT</p>
        <Prose>
          <p>
            Columns: <strong>Id, Name, Email, Ph_No, College, Payment Status, College Type, Team Id</strong> — headers
            are case-insensitive. One row per member; rows sharing a Team Id become one team. The member you pick as
            leader gets the login (their email — they set their own password at first sign-in).
          </p>
          <p className="mt-2">
            Exporting from Excel? Use <strong>Save As → CSV UTF-8</strong> so names and college names don&apos;t get
            mangled.
          </p>
        </Prose>
      </Card>

      <ImportWizard />
    </div>
  )
}
