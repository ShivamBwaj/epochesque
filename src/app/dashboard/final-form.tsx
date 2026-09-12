"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { submitFinalAction, type SubmitState } from "@/lib/actions/team"
import { Alert, Input, Label } from "@/components/ui"
import { SubmitButton } from "@/components/submit-button"

export function FinalForm() {
  const [state, formAction] = useActionState<SubmitState, FormData>(submitFinalAction, {})
  const router = useRouter()

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state, router])

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok && state.message ? <Alert tone="success">{state.message}</Alert> : null}
      <div>
        <Label htmlFor="url">GitHub repository URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://github.com/team/project"
          autoComplete="url"
          required
        />
      </div>
      <SubmitButton pendingText="Submitting…">Submit repo</SubmitButton>
    </form>
  )
}
