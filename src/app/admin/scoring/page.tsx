import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { LinkButton, SectionHeading } from "@/components/ui"
import { ScoringGrid } from "../scoring-grid"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Scoring",
}

const ROUNDS: { key: string; label: string }[] = [
  { key: "round1", label: "OC Round 1" },
  { key: "round2", label: "Quiz Round" },
  { key: "final", label: "Senior Final" },
]

export default async function AdminScoringPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  await requireAdminPage()
  const sp = await searchParams
  const round = ROUNDS.some((r) => r.key === sp.round) ? sp.round! : "round1"

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
        description="Scores per round per team. The final leaderboard is weighted: 20% OC Round 1 + 10% Quiz + 70% Senior Final Evaluation. Several people can score different teams at the same time — only edited rows are saved."
      />
      <div className="flex flex-wrap gap-2">
        {ROUNDS.map((r) => (
          <LinkButton key={r.key} href={`/admin/scoring?round=${r.key}`} variant={round === r.key ? "primary" : "secondary"} size="sm">
            {r.label}
          </LinkButton>
        ))}
      </div>
      <ScoringGrid teams={teams ?? []} existing={existing} round={round} isPublished={!!visibility?.is_published} />
    </div>
  )
}
