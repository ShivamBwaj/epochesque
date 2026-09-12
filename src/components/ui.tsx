import Link from "next/link"
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react"

export function buttonClass(variant: "primary" | "secondary" | "danger" | "ghost" = "primary", size: "sm" | "md" | "lg" = "md") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-50 disabled:pointer-events-none"
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" }
  const variants = {
    primary:
      "bg-gradient-to-r from-indigo-500 to-cyan-400 text-slate-950 font-semibold hover:brightness-110 shadow-lg shadow-cyan-500/20",
    secondary: "border border-slate-600/60 bg-slate-900/60 text-slate-200 hover:border-cyan-400/50 hover:text-cyan-200",
    danger: "border border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-900/40",
    ghost: "text-slate-300 hover:text-cyan-300 hover:bg-slate-800/40",
  }
  return `${base} ${sizes[size]} ${variants[variant]}`
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" | "lg" }) {
  return <button className={`${buttonClass(variant, size)} ${className}`} {...props} />
}

export function LinkButton({ href, variant = "primary", size = "md", className = "", children }: { href: string; variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" | "lg"; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${buttonClass(variant, size)} ${className}`}>
      {children}
    </Link>
  )
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function Badge({ tone = "slate", children }: { tone?: "slate" | "cyan" | "green" | "amber" | "red" | "indigo"; children: ReactNode }) {
  const tones = {
    slate: "border-slate-600/50 bg-slate-800/50 text-slate-300",
    cyan: "border-cyan-500/40 bg-cyan-950/40 text-cyan-300",
    green: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300",
    amber: "border-amber-500/40 bg-amber-950/30 text-amber-300",
    red: "border-red-500/40 bg-red-950/40 text-red-300",
    indigo: "border-indigo-500/40 bg-indigo-950/40 text-indigo-300",
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[11px] tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "slate" | "cyan" | "green" | "amber" | "red" | "indigo"> = {
    registered: "slate",
    round1: "cyan",
    advanced: "indigo",
    finalist: "green",
    eliminated: "red",
  }
  return <Badge tone={map[status] ?? "slate"}>{status}</Badge>
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium tracking-wide text-slate-400">
      {children}
    </label>
  )
}

const fieldClass =
  "w-full rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClass} ${className}`} {...props} />
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldClass} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClass} min-h-24 ${className}`} {...props} />
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-red-500/40 bg-red-950/30 text-red-200",
    success: "border-emerald-500/40 bg-emerald-950/30 text-emerald-200",
    info: "border-cyan-500/40 bg-cyan-950/30 text-cyan-100",
  }
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
}

export function SectionHeading({ kicker, title, description }: { kicker?: string; title: string; description?: string }) {
  return (
    <div className="mb-8">
      {kicker ? <p className="hud-label mb-2">{kicker}</p> : null}
      <h2 className="text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p> : null}
    </div>
  )
}

export function EmptyState({ icon = "◇", title, description }: { icon?: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700/60 px-6 py-14 text-center">
      <span className="mb-3 text-3xl text-slate-600">{icon}</span>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p> : null}
    </div>
  )
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="hud-label">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-slate-100">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </Card>
  )
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-none text-sm leading-relaxed text-slate-300 [&_strong]:text-slate-100">{children}</div>
}
