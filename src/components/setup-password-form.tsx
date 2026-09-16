"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { checkRegistrationAction, signupAction, type SignupState } from "@/lib/actions/auth"
import { Input, Label, Alert } from "@/components/ui"
import { SubmitButton } from "@/components/submit-button"

type Stage = "details" | "not_eligible" | "password"

export function SetupPasswordForm() {
  const [stage, setStage] = useState<Stage>("details")
  const [regNo, setRegNo] = useState("")
  const [email, setEmail] = useState("")
  const [confirmed, setConfirmed] = useState<{ regNo: string; email: string; name?: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [signupState, signupFormAction] = useActionState<SignupState, FormData>(signupAction, {})

  async function onContinue(e: React.FormEvent) {
    e.preventDefault()
    const cleanRegNo = regNo.trim().toUpperCase()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanRegNo || !cleanEmail) return
    setChecking(true)
    try {
      const res = await checkRegistrationAction(cleanRegNo, cleanEmail)
      if (res.eligible) {
        setConfirmed({ regNo: cleanRegNo, email: cleanEmail, name: res.name })
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
          We couldn&apos;t match that registration number and email, or this registration already has an account. If
          you&apos;ve already signed up, use the normal login. If you registered recently, it can take a few minutes
          to show up — or contact the organizers.
        </Alert>
        <div className="flex flex-col gap-2 text-center text-sm">
          <Link href="/login" className="text-accent-hover underline-offset-4 hover:underline">
            ← Back to login
          </Link>
          <button
            type="button"
            onClick={() => setStage("details")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (stage === "password" && confirmed) {
    return (
      <form action={signupFormAction} className="space-y-4">
        {signupState.error ? <Alert tone="error">{signupState.error}</Alert> : null}
        <input type="hidden" name="regNo" value={confirmed.regNo} />
        <input type="hidden" name="email" value={confirmed.email} />
        {confirmed.name ? (
          <Alert tone="success">Welcome, {confirmed.name} — create a password to finish setting up your account.</Alert>
        ) : null}
        <div>
          <Label>Registration number</Label>
          <Input value={confirmed.regNo} disabled className="opacity-70" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={confirmed.email} disabled className="opacity-70" />
        </div>
        <div>
          <Label htmlFor="password">Create a password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" required minLength={8} />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" required minLength={8} />
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Creating account…">
          Create account &amp; sign in
        </SubmitButton>
        <button
          type="button"
          onClick={() => setStage("details")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Not you? Start over
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={onContinue} className="space-y-4">
      <div>
        <Label htmlFor="regNo">Registration number</Label>
        <Input
          id="regNo"
          type="text"
          autoComplete="off"
          placeholder="25BCE1234"
          required
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="signupEmail">Email</Label>
        <Input
          id="signupEmail"
          type="email"
          autoComplete="email"
          placeholder="you@vitstudent.ac.in"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mt-1.5 text-[11px] text-muted/70">
          Must match what you used when you registered.
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
        ← Already have an account? Sign in
      </Link>
    </form>
  )
}
