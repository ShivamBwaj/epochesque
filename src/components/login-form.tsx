"use client"

import Link from "next/link"
import { useActionState } from "react"
import { loginAction, type LoginState } from "@/lib/actions/auth"
import { Input, Label, Alert } from "@/components/ui"
import { SubmitButton } from "@/components/submit-button"

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {})
  const error = state.error ?? initialError

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@vitstudent.ac.in" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
      <Link
        href="/login/setup"
        className="block text-center text-xs text-accent-hover underline-offset-4 hover:underline"
      >
        Registered but no account yet? Sign up →
      </Link>
    </div>
  )
}
