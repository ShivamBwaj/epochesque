"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { submitFinalAction, type SubmitState } from "@/lib/actions/team"
import { Alert, Input, Label, Textarea } from "@/components/ui"
import { SubmitButton } from "@/components/submit-button"

export function FinalForm({
  initial,
}: {
  initial?: { url: string; projectTitle: string; projectDescription: string }
}) {
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
        <Label htmlFor="project_title">Project title</Label>
        <Input
          id="project_title"
          name="project_title"
          maxLength={120}
          placeholder="Epochesque Copilot"
          defaultValue={initial?.projectTitle}
          required
        />
      </div>
      <div>
        <Label htmlFor="project_description">Project description</Label>
        <Textarea
          id="project_description"
          name="project_description"
          maxLength={2000}
          rows={5}
          placeholder="What you built, why it matters, how it works — this shows up on your public project page."
          defaultValue={initial?.projectDescription}
          required
        />
      </div>
      <div>
        <Label htmlFor="url">GitHub repository URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder="https://github.com/team/project"
          autoComplete="url"
          defaultValue={initial?.url}
          required
        />
      </div>
      <SubmitButton pendingText="Submitting…">Submit project</SubmitButton>
    </form>
  )
}
