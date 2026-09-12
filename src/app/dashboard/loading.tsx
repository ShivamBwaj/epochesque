export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-800/60" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/40" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-slate-800/40" />
    </div>
  )
}
