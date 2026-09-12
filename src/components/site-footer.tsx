import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-12 mt-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="24" rx="5" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="11" cy="11" r="2.2" fill="#c2703e" />
            <circle cx="21" cy="11" r="2.2" fill="currentColor" />
            <circle cx="16" cy="16" r="2.2" fill="#c2703e" />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Epoch
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-5 text-xs text-muted-foreground">
          <Link href="/speakers" className="hover:text-foreground transition-colors">Speakers</Link>
          <Link href="/oc" className="hover:text-foreground transition-colors">Organizing Committee</Link>
          <Link href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link>
          <Link href="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
          <Link href="/login" className="hover:text-foreground transition-colors">Team Login</Link>
        </nav>
        <p className="font-mono text-[11px] text-muted/50">
          built for the hack · <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>may the dice favor you</span>
        </p>
      </div>
    </footer>
  )
}
