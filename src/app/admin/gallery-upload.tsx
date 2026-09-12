"use client"

import { useActionState } from "react"
import { galleryUploadAction } from "@/lib/actions/admin"
import type { ActionResult } from "@/lib/actions/admin"
import { SubmitButton } from "@/components/submit-button"
import { Alert, Card, Input, Label } from "@/components/ui"

export function GalleryUpload() {
  const [state, formAction] = useActionState<ActionResult, FormData>(galleryUploadAction, { ok: false })

  return (
    <Card className="p-5 md:p-6">
      <p className="hud-label mb-4">UPLOAD</p>
      <form action={formAction} className="space-y-4">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}
        {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
        <div>
          <Label htmlFor="files">Images (up to 20 at a time, 10 MB each)</Label>
          <Input id="files" name="files" type="file" accept="image/*" multiple required />
        </div>
        <div>
          <Label htmlFor="caption">Caption (optional, applies to all in this batch)</Label>
          <Input id="caption" name="caption" maxLength={200} placeholder="Day 1 kickoff" />
        </div>
        <SubmitButton pendingText="Uploading…">Upload photos</SubmitButton>
      </form>
    </Card>
  )
}
