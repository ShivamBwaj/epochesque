import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Epochesque dashboard.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const initialError =
    sp.error === "not_linked" ? "Your account isn't linked to a registration. Contact the organizers." : undefined

  return (
    <div className="flex flex-1 items-center justify-center px-4 pt-28 pb-16">
      <div className="w-full max-w-sm">
        <div className="liquid-glass-strong fade-up rounded-2xl p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="ring-glow mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent-soft font-mono text-xl font-bold text-accent-hover">
              E
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Team Login</h1>
            <p className="mt-1.5 text-xs text-muted-foreground">Use the credentials given to your team leader.</p>
          </div>
          <LoginForm initialError={initialError} />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-muted/50">
          Locked out? Ping the OC desk.
        </p>
      </div>
    </div>
  )
}
