const ACCENTS = [
  { role: "text-cyan-400", hover: "hover:border-cyan-500/30 hover:shadow-[0_10px_40px_-10px_rgba(34,211,238,0.25)]", chip: "bg-cyan-500/15 text-cyan-300" },
  { role: "text-violet-400", hover: "hover:border-violet-500/30 hover:shadow-[0_10px_40px_-10px_rgba(167,139,250,0.25)]", chip: "bg-violet-500/15 text-violet-300" },
  { role: "text-amber-400", hover: "hover:border-amber-500/30 hover:shadow-[0_10px_40px_-10px_rgba(251,191,36,0.25)]", chip: "bg-amber-500/15 text-amber-300" },
  { role: "text-rose-400", hover: "hover:border-rose-500/30 hover:shadow-[0_10px_40px_-10px_rgba(251,113,133,0.25)]", chip: "bg-rose-500/15 text-rose-300" },
  { role: "text-emerald-400", hover: "hover:border-emerald-500/30 hover:shadow-[0_10px_40px_-10px_rgba(52,211,153,0.25)]", chip: "bg-emerald-500/15 text-emerald-300" },
  { role: "text-sky-400", hover: "hover:border-sky-500/30 hover:shadow-[0_10px_40px_-10px_rgba(56,189,248,0.25)]", chip: "bg-sky-500/15 text-sky-300" },
  { role: "text-fuchsia-400", hover: "hover:border-fuchsia-500/30 hover:shadow-[0_10px_40px_-10px_rgba(232,121,249,0.25)]", chip: "bg-fuchsia-500/15 text-fuchsia-300" },
  { role: "text-orange-400", hover: "hover:border-orange-500/30 hover:shadow-[0_10px_40px_-10px_rgba(251,146,60,0.25)]", chip: "bg-orange-500/15 text-orange-300" },
  { role: "text-indigo-400", hover: "hover:border-indigo-500/30 hover:shadow-[0_10px_40px_-10px_rgba(129,140,248,0.25)]", chip: "bg-indigo-500/15 text-indigo-300" },
  { role: "text-lime-400", hover: "hover:border-lime-500/30 hover:shadow-[0_10px_40px_-10px_rgba(163,230,53,0.25)]", chip: "bg-lime-500/15 text-lime-300" },
  { role: "text-teal-400", hover: "hover:border-teal-500/30 hover:shadow-[0_10px_40px_-10px_rgba(45,212,191,0.25)]", chip: "bg-teal-500/15 text-teal-300" },
  { role: "text-blue-400", hover: "hover:border-blue-500/30 hover:shadow-[0_10px_40px_-10px_rgba(96,165,250,0.25)]", chip: "bg-blue-500/15 text-blue-300" },
]

export function PersonCard({
  name,
  role,
  tagline,
  photoUrl,
  accentIndex = 0,
  feature = false,
}: {
  name: string
  role?: string
  tagline?: string
  photoUrl?: string | null
  accentIndex?: number
  feature?: boolean
}) {
  const accent = ACCENTS[accentIndex % ACCENTS.length]

  return (
    <div
      className={`team-card group relative cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] transition-all duration-500 hover:-translate-y-2 ${accent.hover} ${
        feature ? "mx-auto max-w-sm" : ""
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt={name}
            loading="lazy"
            draggable={false}
            className="h-full w-full object-cover filter grayscale-[20%] transition-all duration-700 ease-out group-hover:scale-110 group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <span className="font-mono text-6xl font-black tracking-tight text-white/80">
              {name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 z-20 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-5 md:p-6">
        <h3 className="mb-1 text-xl font-semibold uppercase tracking-wide text-white drop-shadow-md md:text-2xl">
          {name}
        </h3>
        {role ? (
          <p className={`font-mono text-[11px] uppercase tracking-[0.15em] md:text-xs ${accent.role}`}>{role}</p>
        ) : null}
        {tagline ? (
          <p className="mt-2 line-clamp-2 text-xs italic text-gray-400 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            &ldquo;{tagline}&rdquo;
          </p>
        ) : null}
      </div>
    </div>
  )
}
