import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { SectionHeading } from "@/components/ui"
import { PsManager } from "../ps-manager"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Problem Statements",
}

export default async function AdminProblemStatementsPage() {
  await requireAdminPage()
  const admin = createAdminClient()
  const { data } = await admin.from("problem_statements").select("*").order("code")
  const statements = data ?? []

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="ARENA"
        title="Problem statements"
        description="The pool teams roll from. Keep codes short, capacity honest, and inactive the ones that are full or retired."
      />
      <PsManager statements={statements} />
    </div>
  )
}
