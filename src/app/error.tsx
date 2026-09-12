"use client"

import { Button, Card } from "@/components/ui"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4">
      <Card className="w-full p-8 text-center">
        <p className="hud-label">SYSTEM FAULT</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-100">Something broke on our side</h1>
        <p className="mt-2 text-sm text-slate-400">
          The page hit an unexpected error{error?.digest ? ` (ref: ${error.digest})` : ""}. Retry — if it keeps happening, ping the organizers.
        </p>
        <div className="mt-6">
          <Button onClick={reset}>Try again</Button>
        </div>
      </Card>
    </div>
  )
}
