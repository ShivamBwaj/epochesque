import type { Metadata } from "next"
import { SetupPasswordForm } from "@/components/setup-password-form"

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Registered for Epochesque? Create your account.",
}

export default function SetupPasswordPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 pt-28 pb-16">
      <div className="w-full max-w-sm">
        <div className="liquid-glass-strong fade-up rounded-2xl p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="ring-glow mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft font-mono text-xl font-bold text-accent-hover">
              E
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign Up</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Confirm your registration number and email, then create a password.
            </p>
          </div>
          <SetupPasswordForm />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-muted/50">
          Locked out? Ping the OC desk.
        </p>
      </div>
    </div>
  )
}
