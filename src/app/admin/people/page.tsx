import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { SectionHeading } from "@/components/ui"
import { PeopleManager } from "./people-manager"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "People",
}

export default async function AdminPeoplePage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data } = await admin.from("people").select("*").order("kind").order("sort_order").order("name")
  const people = data ?? []

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="LINEUP & CREW"
        title="People"
        description="Add speakers and organizing-committee members — with roles and taglines — and they show up on the public Speakers and OC pages instantly."
      />
      <PeopleManager people={people} />
    </div>
  )
}
