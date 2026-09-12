export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-800/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/40" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-slate-800/40" />
    </div>
  )
}
