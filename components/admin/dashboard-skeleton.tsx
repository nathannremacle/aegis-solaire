export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tour de contrôle skeleton */}
      <div className="h-28 rounded-2xl bg-slate-200/70" />

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/60" />
        ))}
      </div>

      {/* Secondary metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-slate-200/50" />
        ))}
      </div>

      {/* Activity tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-72 rounded-2xl bg-slate-200/40" />
        <div className="h-72 rounded-2xl bg-slate-200/40" />
      </div>
    </div>
  )
}
