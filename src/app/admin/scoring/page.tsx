import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { LinkButton, SectionHeading } from "@/components/ui"
import { ScoringGrid } from "../scoring-grid"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Scoring",
}

export default async function AdminScoringPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  await requireAdminPage()
  const sp = await searchParams
  const round = sp.round === "final" ? "final" : "round1"

  const admin = createAdminClient()
  const { data: teams } = await admin.from("teams").select("id, team_code, team_name").order("team_code")
  const { data: scores } = await admin.from("scores").select("team_id, total_score, notes").eq("round", round)
  const { data: visibility } = await admin
    .from("leaderboard_visibility")
    .select("is_published")
    .eq("round", round)
    .maybeSingle()

  const existing: Record<string, { total_score: number; notes: string }> = {}
  for (const s of scores ?? []) {
    existing[s.team_id] = { total_score: s.total_score, notes: s.notes ?? "" }
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="JUDGING"
        title="Scoring"
        description="Enter judge scores per team, then publish the round to the live leaderboard when results are settled."
      />
      <div className="flex gap-2">
        <LinkButton href="/admin/scoring?round=round1" variant={round === "round1" ? "primary" : "secondary"} size="sm">
          Round 1
        </LinkButton>
        <LinkButton href="/admin/scoring?round=final" variant={round === "final" ? "primary" : "secondary"} size="sm">
          Final
        </LinkButton>
      </div>
      <ScoringGrid teams={teams ?? []} existing={existing} round={round} isPublished={!!visibility?.is_published} />
    </div>
  )
}
