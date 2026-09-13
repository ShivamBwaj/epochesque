import Link from "next/link"
import Image from "next/image"

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-12 mt-8">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-2.5">
          <Image
            src="/hackclub-logo.jpg"
            alt="HackClub VITC"
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
          />
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              Epochesque
            </span>{" "}
            by <span className="font-semibold text-foreground">HackClub</span>
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
