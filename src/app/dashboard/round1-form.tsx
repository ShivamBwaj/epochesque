"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { submitRound1Action, type SubmitState } from "@/lib/actions/team"
import { Alert, Input, Label } from "@/components/ui"
import { SubmitButton } from "@/components/submit-button"

const MAX_BYTES = 25 * 1024 * 1024

export function Round1Form() {
  const [state, formAction] = useActionState<SubmitState, FormData>(submitRound1Action, {})
  const [fileError, setFileError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state, router])

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (fileError) e.preventDefault()
      }}
      className="space-y-4"
    >
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      {fileError ? <Alert tone="error">{fileError}</Alert> : null}
      <div>
        <Label htmlFor="file">Pitch deck (.ppt, .pptx or .pdf — max 25 MB)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".ppt,.pptx,.pdf"
          required
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && f.size > MAX_BYTES) {
              setFileError(`"${f.name}" is ${(f.size / 1048576).toFixed(1)} MB — the limit is 25 MB.`)
            } else {
              setFileError(null)
            }
          }}
        />
      </div>
      <SubmitButton pendingText="Uploading…">Upload deck</SubmitButton>
    </form>
  )
}
