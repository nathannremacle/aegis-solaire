export function PartnerDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 animate-pulse">
      {/* Header skeleton */}
      <div className="h-20 rounded-2xl border border-border bg-card" />

      {/* Navigation bar skeleton */}
      <div className="h-14 rounded-2xl border border-border bg-card" />

      {/* Filter bar skeleton */}
      <div className="h-12 rounded-xl border border-border bg-card" />

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  )
}
