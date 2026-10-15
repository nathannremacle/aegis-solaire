import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAdminUser } from "@/lib/admin-auth"
import { getAdminDashboardData } from "@/lib/admin/queries"
import { ActionRequiredTray } from "@/components/admin/action-required-tray"
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid"
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity"
import { DashboardSkeleton } from "@/components/admin/dashboard-skeleton"

export default async function AdminDashboardPage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Hero Executive Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50/60 to-blue-50/30 p-6 sm:p-8 shadow-2xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Console de Contrôle Opérationnel &amp; Financier</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Vue Globale Aegis Solaire
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Supervision des flux de leads entrants, validation des transactions de crédits et arbitrage de conformité en Wallonie.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/leads">
                <span>Tous les Leads</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="accent" size="sm" asChild>
              <Link href="/admin/partners">
                <span>Partenaires &amp; Crédits</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Données Dashboard en Suspense Streaming */}
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </div>
  )
}

async function AdminDashboardContent() {
  const data = await getAdminDashboardData()

  return (
    <div className="space-y-6">
      {/* Tour de Contrôle : Actions Requises en 1 clic */}
      <ActionRequiredTray
        badges={data.badges}
        needsReviewLeads={data.lists.needs_review}
        pendingOrders={data.lists.pending_orders}
        pendingDisputes={data.lists.pending_disputes}
      />

      {/* Grille KPI Financiers, Sell-Through Rate & Commissions */}
      <AdminKpiGrid
        leads={data.leads}
        partners={data.partners}
        purchases={data.purchases}
        revenue={data.revenue}
        mediaPartners={data.media_partners}
      />

      {/* Flux récents & Journal d'Audit */}
      <AdminRecentActivity
        recentLeads={data.lists.recent_leads}
        auditLogs={data.lists.audit_logs}
      />
    </div>
  )
}
