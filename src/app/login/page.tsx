import type { Metadata } from "next"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = {
  title: "Team Login",
  description: "Sign in to your Epoch team dashboard with your leader credentials.",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const initialError =
    sp.error === "not_linked" ? "Your account is not linked to a team. Contact the organizers." : undefined

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="card fade-up p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="ring-glow mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 font-mono text-xl font-black text-slate-950">
              E
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">Team Login</h1>
            <p className="mt-1.5 text-xs text-slate-500">Use the credentials given to your team leader.</p>
          </div>
          <LoginForm initialError={initialError} />
        </div>
        <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-slate-600">
          Locked out? Ping the OC desk.
        </p>
      </div>
    </div>
  )
}
