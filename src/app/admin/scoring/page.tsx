import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { scoresSheetsWebhookConfigured } from "@/lib/sheets"
import { LinkButton, SectionHeading } from "@/components/ui"
import { ScoringGrid } from "../scoring-grid"
import { ScoringSheetConnect } from "../scoring-sheet-connect"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Scoring",
}

const ROUNDS: { key: string; label: string }[] = [
  { key: "round2", label: "Round 1 — Quiz" },
  { key: "round1", label: "Round 2 — OC Round" },
  { key: "final", label: "Senior Final" },
]

export default async function AdminScoringPage({ searchParams }: { searchParams: Promise<{ round?: string }> }) {
  await requireAdminPage()
  const sp = await searchParams
  const round = ROUNDS.some((r) => r.key === sp.round) ? sp.round! : "round2"

  const admin = createAdminClient()
  const [{ data: teams }, { data: scores }, { data: visibility }, sheetConnected] = await Promise.all([
    admin.from("teams").select("id, team_code, team_name").order("team_code"),
    admin.from("scores").select("team_id, total_score, notes").eq("round", round),
    admin.from("leaderboard_visibility").select("is_published").eq("round", round).maybeSingle(),
    scoresSheetsWebhookConfigured(),
  ])

  const existing: Record<string, { total_score: number; notes: string }> = {}
  for (const s of scores ?? []) {
    existing[s.team_id] = { total_score: s.total_score, notes: s.notes ?? "" }
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="JUDGING"
        title="Scoring"
        description="Scores per round per team. The final leaderboard is weighted: 10% Round 1 (Quiz) + 20% Round 2 (OC Round) + 70% Senior Final Evaluation. Several people can score different teams at the same time — only edited rows are saved."
      />
      <div className="flex flex-wrap gap-2">
        {ROUNDS.map((r) => (
          <LinkButton key={r.key} href={`/admin/scoring?round=${r.key}`} variant={round === r.key ? "primary" : "secondary"} size="sm">
            {r.label}
          </LinkButton>
        ))}
      </div>
      <ScoringSheetConnect round={round} connected={sheetConnected} />
      <ScoringGrid teams={teams ?? []} existing={existing} round={round} isPublished={!!visibility?.is_published} />
    </div>
  )
}
