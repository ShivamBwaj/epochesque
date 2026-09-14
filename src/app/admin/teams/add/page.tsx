import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { SectionHeading } from "@/components/ui"
import { AddTeamForm } from "./add-team-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Add Team",
}

export default async function AdminAddTeamPage() {
  await requireAdminPage()

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="ON-SPOT REGISTRATION"
        title="Add a team manually"
        description="For walk-in registrations. The leader's email becomes the login — they set their own password at /login on first sign-in."
      />
      <AddTeamForm />
    </div>
  )
}
