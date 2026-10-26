export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse" aria-busy="true" aria-label="Chargement du cockpit opérationnel">
      {/* Tour de contrôle skeleton */}
      <div className="h-28 rounded-xl bg-muted/60 border border-border" />

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/60 border border-border" />
        ))}
      </div>

      {/* Secondary metrics skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-muted/60 border border-border" />
        ))}
      </div>

      {/* Activity tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 rounded-xl bg-muted/60 border border-border" />
        <div className="h-80 rounded-xl bg-muted/60 border border-border" />
      </div>
    </div>
  )
}
