import type { Metadata } from "next"
import { LinkButton } from "@/components/ui"

export const metadata: Metadata = {
  title: "404",
}

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="hud-label mb-4">SIGNAL LOST</p>
      <h1
        aria-label="404"
        className="relative select-none font-mono text-8xl font-black tracking-tighter text-slate-100 md:text-9xl"
      >
        <span aria-hidden className="absolute inset-0 -translate-x-2 text-cyan-400/50 blur-[2px]">
          404
        </span>
        <span aria-hidden className="absolute inset-0 translate-x-2 text-indigo-400/50 blur-[2px]">
          404
        </span>
        <span className="relative">404</span>
      </h1>
      <p className="mt-6 max-w-sm text-sm leading-relaxed text-slate-400">
        This page rolled off the timeline. The dice giveth, the router taketh away.
      </p>
      <LinkButton href="/" className="mt-8">
        Back to base
      </LinkButton>
    </div>
  )
}
