import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-indigo-500 to-cyan-400 font-mono text-[10px] font-black text-slate-950">
            E
          </span>
          <span className="font-mono text-sm tracking-[0.2em] text-slate-400">EPOCH</span>
        </div>
        <nav className="flex gap-5 text-xs text-slate-500">
          <Link href="/speakers" className="hover:text-slate-300">Speakers</Link>
          <Link href="/oc" className="hover:text-slate-300">Organizing Committee</Link>
          <Link href="/leaderboard" className="hover:text-slate-300">Leaderboard</Link>
          <Link href="/login" className="hover:text-slate-300">Team Login</Link>
        </nav>
        <p className="font-mono text-[11px] text-slate-600">built for the hack · MMXXVI</p>
      </div>
    </footer>
  )
}
