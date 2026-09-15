"use client"

import { useActionState } from "react"
import { submitRegistrationAction, type RegisterState } from "@/lib/actions"

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Registering…" : "Register"}
    </button>
  )
}

export function RegisterCard() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(submitRegistrationAction, { ok: false })

  if (state.ok) {
    return (
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--accent-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            fontSize: 26,
          }}
        >
          ✅
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>You&apos;re successfully registered!</h2>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-hover)", margin: "0 0 12px" }}>Epochesque</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
          A 24-hour hackathon where you don&apos;t choose your problem — you roll it. One locked-in problem
          statement, one day, one leaderboard that remembers everything. See you at the event — bring your team,
          your laptop, and your best ideas.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {state.error ? (
        <p style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 13, margin: 0 }}>
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="name" style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
          Full name
        </label>
        <input id="name" name="name" placeholder="Your name" required maxLength={120} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="regNo" style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
          Registration number
        </label>
        <input id="regNo" name="regNo" placeholder="e.g. 23BCE1234" required maxLength={60} />
      </div>
      <div>
        <label htmlFor="phone" style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
          Phone number
        </label>
        <input id="phone" name="phone" type="tel" placeholder="10-digit number" required maxLength={20} autoComplete="tel" />
      </div>
      <div>
        <label htmlFor="email" style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
          VIT email ID
        </label>
        <input id="email" name="email" type="email" placeholder="you@vitstudent.ac.in" required maxLength={160} autoComplete="email" />
      </div>
      <div style={{ marginTop: 4 }}>
        <SubmitButton pending={pending} />
      </div>
    </form>
  )
}
