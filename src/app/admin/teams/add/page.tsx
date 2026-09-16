import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { SectionHeading } from "@/components/ui"
import { AddTeamForm } from "./add-team-form"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Walk-in Team",
}

export default async function AdminAddTeamPage() {
  await requireAdminPage()

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="ON-SPOT REGISTRATION"
        title="Add a walk-in team"
        description="For people who show up on the day with no prior registration. Registers each of them (or reuses their row if they already registered) and forms a 2-4 person team from them in one step."
      />
      <AddTeamForm />
    </div>
  )
}
