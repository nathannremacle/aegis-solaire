import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  Sparkles, 
  ArrowRight, 
  Flame, 
  Coins, 
  Building2, 
  Users, 
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  SendHorizonal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAdminUser } from "@/lib/admin-auth"
import { getAdminDashboardData } from "@/lib/admin/queries"
import { AdminNetworkInviteHub } from "@/components/admin/admin-network-invite-hub"
import { ActionRequiredTray } from "@/components/admin/action-required-tray"
import { AdminKpiGrid } from "@/components/admin/admin-kpi-grid"
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity"
import { AdminRelancesCockpitWidget } from "@/components/admin/admin-relances-cockpit-widget"
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
      {/* 1. Header Opérationnel Haute Densité Bento */}
      <header className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary border border-border px-2.5 py-1 text-xs font-semibold text-foreground w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                <span>Console de Contrôle Opérationnel &amp; Financier</span>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono tabular-nums">
                Région Wallonne • CWaPE
              </Badge>
            </div>

            <h1 className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Cockpit &amp; Supervision Aegis Solaire
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Supervision des flux de leads entrants, validation des transactions de crédits et arbitrage de conformité en Wallonie.
            </p>
          </div>

          {/* Actions Rapides Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5 border-border">
              <Link href="/admin/leads?view=triage">
                <Flame className="h-3.5 w-3.5 text-accent" />
                <span>Triage Leads</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5 border-border">
              <Link href="/admin/relances">
                <SendHorizonal className="h-3.5 w-3.5 text-primary" />
                <span>Relances Mails</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5 border-border">
              <Link href="/admin/finance">
                <Coins className="h-3.5 w-3.5 text-foreground" />
                <span>Finances SEPA</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1.5 border-border">
              <Link href="/partenaires" target="_blank" rel="noopener noreferrer">
                <span>Catalogue Live</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </Link>
            </Button>
            <Button size="sm" asChild className="h-8 text-xs gap-1.5 shadow-2xs font-semibold">
              <Link href="/admin/partners">
                <span>Réseau Installateurs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. Données Dashboard en Suspense Streaming (Priorité 1 : Tour de Contrôle & KPIs) */}
      <Suspense fallback={<DashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>

      {/* 3. Hub d'Invitation Réseau Grossiste — Fabrice Remacle */}
      <section aria-label="Hub d'invitation réseau partenaires">
        <AdminNetworkInviteHub />
      </section>
    </div>
  )
}

async function AdminDashboardContent() {
  const data = await getAdminDashboardData()

  return (
    <div className="flex flex-col gap-6">
      {/* Tour de Contrôle : Actions Requises en 1 clic (Litiges, SEPA, Leads) */}
      <ActionRequiredTray
        badges={data.badges}
        needsReviewLeads={data.lists.needs_review}
        pendingOrders={data.lists.pending_orders}
        pendingDisputes={data.lists.pending_disputes}
      />

      {/* Grille Bento KPI Financiers, Sell-Through Rate & Commissions */}
      <AdminKpiGrid
        leads={data.leads}
        partners={data.partners}
        purchases={data.purchases}
        revenue={data.revenue}
        mediaPartners={data.media_partners}
        lists={data.lists}
      />

      {/* Widget Moteur de Relances & Cascades Automatiques */}
      <AdminRelancesCockpitWidget />

      {/* Flux récents de leads & Journal d'Audit */}
      <AdminRecentActivity
        recentLeads={data.lists.recent_leads}
        auditLogs={data.lists.audit_logs}
      />
    </div>
  )
}
