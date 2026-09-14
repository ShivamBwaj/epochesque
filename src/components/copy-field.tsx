"use client"

import { useState } from "react"

export function CopyField({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2">
      {label ? <span className="text-xs text-slate-500">{label}</span> : null}
      <code className="flex-1 min-w-0 break-all rounded-md border border-slate-700/60 bg-slate-950/70 px-3 py-1.5 font-mono text-xs text-cyan-200">{value}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {}
        }}
        className="rounded-md border border-slate-700/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-400 transition hover:border-cyan-400/50 hover:text-cyan-300"
      >
        {copied ? "COPIED" : "COPY"}
      </button>
    </div>
  )
}
