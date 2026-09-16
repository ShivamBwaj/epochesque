"use client"

import { setCertificatesPublishedAction } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Badge, Card } from "@/components/ui"

export function CertificatesCard({ published }: { published: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={published ? "green" : "amber"}>{published ? "PUBLISHED" : "NOT PUBLISHED"}</Badge>
          <span className="text-sm text-muted-foreground">
            {published ? "Participants can download their certificate from their dashboard." : "Hidden from participants until you publish."}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin/certificates/download-all"
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
          >
            ⬇ Download all (one PDF)
          </a>
          <form action={setCertificatesPublishedAction}>
            <input type="hidden" name="published" value={(!published).toString()} />
            <SubmitButton variant={published ? "secondary" : "primary"} size="sm" pendingText="…">
              {published ? "Unpublish" : "Publish"}
            </SubmitButton>
          </form>
        </div>
      </div>
    </Card>
  )
}
