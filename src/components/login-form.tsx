"use client"

import { useActionState } from "react"
import { loginAction, type LoginState } from "@/lib/actions/auth"
import { Input, Label, Alert } from "@/components/ui"
import { SubmitButton } from "@/components/submit-button"

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {})
  const error = state.error ?? initialError

  return (
    <form action={formAction} className="space-y-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div>
        <Label htmlFor="email">Leader email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="leader@team.edu" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </div>
      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  )
}
