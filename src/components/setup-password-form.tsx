"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { checkLeaderEmailAction, setInitialPasswordAction, type SetPasswordState } from "@/lib/actions/auth"
import { Input, Label, Alert } from "@/components/ui"
import { SubmitButton } from "@/components/submit-button"

type Stage = "email" | "not_eligible" | "password"

export function SetupPasswordForm() {
  const [stage, setStage] = useState<Stage>("email")
  const [email, setEmail] = useState("")
  const [confirmedEmail, setConfirmedEmail] = useState("")
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [setupState, setupFormAction] = useActionState<SetPasswordState, FormData>(setInitialPasswordAction, {})

  async function onContinue(e: React.FormEvent) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!clean) return
    setChecking(true)
    setCheckError(null)
    try {
      const res = await checkLeaderEmailAction(clean)
      if (res.needsSetup) {
        setConfirmedEmail(clean)
        setStage("password")
      } else {
        setStage("not_eligible")
      }
    } finally {
      setChecking(false)
    }
  }

  if (stage === "not_eligible") {
    return (
      <div className="space-y-4">
        <Alert tone="error">
          That email either already has a password set, or isn&apos;t registered as a team leader. If you&apos;ve
          already set a password, use the normal login. If you think this is a mistake, contact the organizers.
        </Alert>
        <div className="flex flex-col gap-2 text-center text-sm">
          <Link href="/login" className="text-accent-hover underline-offset-4 hover:underline">
            ← Back to login
          </Link>
          <button
            type="button"
            onClick={() => setStage("email")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Try a different email
          </button>
        </div>
      </div>
    )
  }

  if (stage === "password") {
    return (
      <form action={setupFormAction} className="space-y-4">
        {setupState.error ? <Alert tone="error">{setupState.error}</Alert> : null}
        <input type="hidden" name="email" value={confirmedEmail} />
        <div>
          <Label>Leader email</Label>
          <Input value={confirmedEmail} disabled className="opacity-70" />
        </div>
        <div>
          <Label htmlFor="password">Create a password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Setting password…">
          Set password &amp; sign in
        </SubmitButton>
        <button
          type="button"
          onClick={() => {
            setStage("email")
            setConfirmedEmail("")
          }}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Not you? Use a different email
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={onContinue} className="space-y-4">
      {checkError ? <Alert tone="error">{checkError}</Alert> : null}
      <div>
        <Label htmlFor="email">Leader email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="leader@team.edu"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mt-1.5 text-[11px] text-muted/70">
          Use the email the organizers registered your team with.
        </p>
      </div>
      <button
        type="submit"
        disabled={checking}
        className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-accent-hover hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
      >
        {checking ? "Checking…" : "Continue"}
      </button>
      <Link href="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">
        ← Already set your password? Sign in
      </Link>
    </form>
  )
}
