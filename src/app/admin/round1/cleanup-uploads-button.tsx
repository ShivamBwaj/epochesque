"use client"

import { useState, useTransition } from "react"
import { cleanupOrphanedUploadsAction } from "@/lib/actions/admin"

export function CleanupUploadsButton() {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run() {
    setMsg(null)
    startTransition(async () => {
      const res = await cleanupOrphanedUploadsAction()
      setMsg(res.ok ? res.message ?? "Done." : res.error ?? "Cleanup failed.")
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        title="Deletes deck files in storage that no submission row points to — e.g. a team closed the tab right after uploading but before hitting Submit"
      >
        {pending ? "Scanning…" : "🧹 Clean up orphaned uploads"}
      </button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  )
}
