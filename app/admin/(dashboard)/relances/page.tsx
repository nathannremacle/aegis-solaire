import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import {
  getRelancesOverviewStats,
  getUpcomingRelancesSchedule,
  getSentRelancesHistory,
} from "@/lib/lead-relance-engine"
import { AdminRelancesDashboard } from "@/components/admin/relances/admin-relances-dashboard"

export const metadata = {
  title: "Supervision Relances Mails | Aegis Solaire Admin",
  description: "Tour de contrôle des notifications et relances automatiques par e-mail en Wallonie",
}

export const dynamic = "force-dynamic"

export default async function AdminRelancesPage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  return (
    <Suspense fallback={<RelancesDashboardSkeleton />}>
      <AdminRelancesDataLoader />
    </Suspense>
  )
}

async function AdminRelancesDataLoader() {
  const [stats, upcoming, sent] = await Promise.all([
    getRelancesOverviewStats(),
    getUpcomingRelancesSchedule(),
    getSentRelancesHistory(100),
  ])

  return (
    <AdminRelancesDashboard
      initialStats={stats}
      initialUpcoming={upcoming}
      initialSent={sent}
    />
  )
}

function RelancesDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse pb-12">
      <div className="h-28 rounded-xl border border-border bg-card/60" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 rounded-xl border border-border bg-card/60" />
        <div className="h-28 rounded-xl border border-border bg-card/60" />
        <div className="h-28 rounded-xl border border-border bg-card/60" />
        <div className="h-28 rounded-xl border border-border bg-card/60" />
      </div>
      <div className="h-12 rounded-xl border border-border bg-card/60" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 rounded-xl border border-border bg-card/60" />
        <div className="h-64 rounded-xl border border-border bg-card/60" />
      </div>
    </div>
  )
}
