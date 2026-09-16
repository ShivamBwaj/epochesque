"use client"

import { setProjectsPublishedAction } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Badge, Card } from "@/components/ui"

export function ProjectsPublishedCard({ published }: { published: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={published ? "green" : "amber"}>{published ? "PUBLIC" : "ADMIN ONLY"}</Badge>
          <span className="text-sm text-muted-foreground">
            {published
              ? "Anyone with the link can view every team's project page."
              : "Only admins can view project pages (via the leaderboard) until you publish."}
          </span>
        </div>
        <form action={setProjectsPublishedAction}>
          <input type="hidden" name="published" value={(!published).toString()} />
          <SubmitButton variant={published ? "secondary" : "primary"} size="sm" pendingText="…" confirm={published ? undefined : "Make every submitted project page public?"}>
            {published ? "Make admin-only again" : "Make public"}
          </SubmitButton>
        </form>
      </div>
    </Card>
  )
}
