import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Sparkles, ArrowRight, Flame, Coins } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAdminUser } from "@/lib/admin-auth"
import { getAdminDashboardData } from "@/lib/admin/queries"
import { AdminInviteGenerator } from "@/components/admin/admin-invite-generator"
import { ActionRequiredTray } from "@/components/admin/action-required-tray"
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid"
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity"
import { DashboardSkeleton } from "@/components/admin/dashboard-skeleton"

export const metadata = {
  title: "Cockpit Opérationnel | Aegis Solaire Admin",
  description: "Tour de contrôle administrative et supervision de la marketplace photovoltaïque en Wallonie",
}

export default async function AdminDashboardPage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* 1. Header Opérationnel Sobre */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md bg-secondary border border-border px-2.5 py-1 text-xs font-semibold text-foreground w-fit">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Console de Contrôle Opérationnel &amp; Financier</span>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Cockpit &amp; Supervision Aegis Solaire
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Supervision des flux de leads entrants, validation des transactions de crédits et arbitrage de conformité en Wallonie.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
              <Link href="/admin/leads?view=triage">
                <Flame className="h-3.5 w-3.5 text-primary" />
                <span>Triage Leads</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5">
              <Link href="/admin/finance">
                <Coins className="h-3.5 w-3.5 text-foreground" />
                <span>Finances SEPA</span>
              </Link>
            </Button>
            <Button size="sm" asChild className="h-8 text-xs gap-1.5">
              <Link href="/admin/partners">
                <span>Réseau Installateurs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Outil Rapide : Générateur d'Invitation Installateur */}
      <AdminInviteGenerator />

      {/* 3. Données Dashboard en Suspense Streaming */}
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </div>
  )
}

async function AdminDashboardContent() {
  const data = await getAdminDashboardData()

  return (
    <div className="flex flex-col gap-6">
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
        lists={data.lists}
      />

      {/* Flux récents & Journal d'Audit */}
      <AdminRecentActivity
        recentLeads={data.lists.recent_leads}
        auditLogs={data.lists.audit_logs}
      />
    </div>
  )
}
