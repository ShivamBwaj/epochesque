import Link from "next/link"
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react"

export function buttonClass(variant: "primary" | "secondary" | "danger" | "ghost" = "primary", size: "sm" | "md" | "lg" = "md") {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none"
  const sizes = { sm: "px-3.5 py-1.5 text-xs", md: "px-5 py-2 text-sm", lg: "px-6 py-3 text-base" }
  const variants = {
    primary: "bg-accent text-white hover:bg-accent-hover hover:scale-[1.02] shadow-[0_0_20px_rgba(194,112,62,0.25)]",
    secondary:
      "bg-white/[0.04] border border-white/[0.08] text-foreground hover:bg-white/[0.07] hover:border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
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
    slate: "border-white/[0.10] bg-white/[0.05] text-muted-foreground",
    cyan: "border-accent/30 bg-accent-soft text-accent-hover",
    green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
    indigo: "border-violet-500/30 bg-violet-500/10 text-violet-300",
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
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium tracking-wide text-muted-foreground">
      {children}
    </label>
  )
}

const fieldClass =
  "w-full rounded-lg border border-white/[0.08] bg-surface/80 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"

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
    error: "border-red-500/30 bg-red-500/10 text-red-200",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    info: "border-accent/30 bg-accent-soft text-accent-hover",
  }
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>
}

export function SectionHeading({ kicker, title, description }: { kicker?: string; title: string; description?: string }) {
  return (
    <div className="mb-8">
      {kicker ? <p className="hud-label mb-2">{kicker}</p> : null}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  )
}

export function EmptyState({ icon = "◇", title, description }: { icon?: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.10] px-6 py-14 text-center">
      <span className="mb-3 text-3xl text-muted/50">{icon}</span>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-xs text-muted">{description}</p> : null}
    </div>
  )
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-5">
      <p className="hud-label">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-foreground">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </Card>
  )
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="max-w-none text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground">{children}</div>
}
