export function PartnerDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 animate-pulse">
      {/* Top bar skeleton */}
      <div className="h-16 rounded-2xl bg-slate-200/80" />

      {/* Filter bar skeleton */}
      <div className="h-12 rounded-xl bg-slate-200/60" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-slate-200/50" />
        ))}
      </div>
    </div>
  )
}
