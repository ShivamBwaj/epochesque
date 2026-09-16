"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { uploadPptTemplateAction, type UploadPptTemplateResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Badge, Card } from "@/components/ui"

export function PptTemplateCard({ templateUrl, fileName }: { templateUrl: string | null; fileName: string | null }) {
  const [state, formAction] = useActionState<UploadPptTemplateResult, FormData>(uploadPptTemplateAction, { ok: false })
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state, router])

  return (
    <Card className="p-5">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {templateUrl ? <Badge tone="green">SET</Badge> : <Badge tone="amber">NOT SET</Badge>}
          <span className="text-sm text-muted-foreground">
            {templateUrl ? (
              <>
                Teams see a link to <span className="font-mono text-xs text-foreground">{fileName}</span> on the OC Round
                submission page.
              </>
            ) : (
              "No template uploaded yet — teams won't see a template link."
            )}
          </span>
        </div>
        {templateUrl ? (
          <a href={templateUrl} target="_blank" rel="noreferrer" className="text-xs text-accent-hover hover:underline">
            View current →
          </a>
        ) : null}
      </div>

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".ppt,.pptx,.pdf"
          required
          className="max-w-full text-sm text-foreground"
        />
        <SubmitButton size="sm" pendingText="Uploading…">
          {templateUrl ? "Replace template" : "Upload template"}
        </SubmitButton>
      </form>
      <p className="mt-2 text-xs text-muted/60">.ppt, .pptx or .pdf — max 30 MB. Replacing it updates the link for every team instantly.</p>
    </Card>
  )
}
