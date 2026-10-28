"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Euro, 
  TrendingUp, 
  Building2, 
  ShoppingCart, 
  CreditCard, 
  Megaphone,
  ArrowUpRight,
  Activity,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Layers,
  FileText,
  Clock,
  ChevronRight,
  Info,
  Sparkles,
  BarChart3
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type KpiModalType =
  | "revenue_paid"
  | "marketplace_sellthrough"
  | "marketplace_stock"
  | "active_partners"
  | "acquisition_flow"
  | "sepa_pending"
  | "media_commissions"

interface AdminKpiGridProps {
  leads: {
    total_leads: number
    leads_month: number
    leads_today: number
    leads_b2b: number
    leads_b2c: number
    available_count: number
    available_credits_pool: number
    sold_out_count: number
    pending_review_count: number
    status_new_count: number
    status_qualified_count: number
    publishable_pool_count: number
  }
  partners: {
    active_partners_count: number
    total_partner_credits_balance: number
    b2b_partners_count: number
    b2c_partners_count: number
  }
  purchases: {
    total_purchases: number
    total_credits_spent: number
    distinct_purchased_leads: number
    sell_through_rate: number
  }
  revenue: {
    pending_orders_count: number
    pending_htva: number
    pending_ttc: number
    paid_htva_total: number
    paid_ttc_total: number
    paid_htva_month: number
  }
  mediaPartners: {
    total_commissions_due: number
    breakdown: Array<{
      id: string
      company_name: string
      tracking_code: string
      attributed_leads_count: number
      validated_leads_count: number
      total_commission_due: number
    }>
  }
  lists?: {
    needs_review?: any[]
    recent_leads?: any[]
    pending_orders?: any[]
    pending_disputes?: any[]
    audit_logs?: any[]
    paid_orders?: any[]
    active_partners?: any[]
    available_leads?: any[]
  }
}

export function AdminKpiGrid({
  leads,
  partners,
  purchases,
  revenue,
  mediaPartners,
  lists,
}: AdminKpiGridProps) {
  const [selectedKpi, setSelectedKpi] = useState<KpiModalType | null>(null)

  const totalLeads = leads.total_leads || 1
  const b2bPercent = Math.round((leads.leads_b2b / totalLeads) * 100)
  const b2cPercent = 100 - b2bPercent

  const paidOrders = lists?.paid_orders ?? []
  const activePartnersList = lists?.active_partners ?? []
  const availableLeadsList = lists?.available_leads ?? []
  const pendingOrders = lists?.pending_orders ?? []
  const recentLeads = lists?.recent_leads ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Ligne Principale Bento : Performance Financière & Marketplace Liquidity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Encaissé HTVA */}
        <button
          type="button"
          onClick={() => setSelectedKpi("revenue_paid")}
          className="group text-left rounded-xl border border-border bg-card p-4 shadow-xs hover:border-accent/40 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              CA Validé (Packs)
            </span>
            <div className="rounded-lg bg-secondary p-2 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors border border-border">
              <Euro className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-2xl lg:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
              {Number(revenue.paid_htva_total || 0).toLocaleString("fr-BE")} €{" "}
              <span className="text-xs font-normal text-muted-foreground">HTVA</span>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="font-bold text-accent font-mono tabular-nums">
                +{Number(revenue.paid_htva_month || 0).toLocaleString("fr-BE")} €
              </span>{" "}
              ce mois-ci
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            <span>Détails &amp; commandes</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>

        {/* Taux d'écoulement Marketplace */}
        <button
          type="button"
          onClick={() => setSelectedKpi("marketplace_sellthrough")}
          className="group text-left rounded-xl border border-border bg-card p-4 shadow-xs hover:border-accent/40 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              Écoulement Catalogue
            </span>
            <div className="rounded-lg bg-secondary p-2 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors border border-border">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl lg:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
                {purchases.sell_through_rate}%
              </div>
              <span className="text-xs font-semibold text-muted-foreground font-mono tabular-nums">
                {purchases.distinct_purchased_leads}/{leads.publishable_pool_count || 1} leads
              </span>
            </div>
            {/* Visual Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                style={{ width: `${Math.min(100, Math.max(0, purchases.sell_through_rate))}%` }}
                className="h-full bg-accent rounded-full transition-all duration-500"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {purchases.distinct_purchased_leads}
              </span>{" "}
              leads absorbés sur le catalogue
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            <span>Vélocité &amp; formule</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>

        {/* Stock Disponible en Vente */}
        <button
          type="button"
          onClick={() => setSelectedKpi("marketplace_stock")}
          className="group text-left rounded-xl border border-border bg-card p-4 shadow-xs hover:border-accent/40 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              Stock en Vente
            </span>
            <div className="rounded-lg bg-secondary p-2 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors border border-border">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-2xl lg:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
              {leads.available_count}{" "}
              <span className="text-xs font-normal text-muted-foreground">chantiers</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Valeur :{" "}
              <strong className="font-semibold text-foreground font-mono tabular-nums">
                {leads.available_credits_pool} crédits
              </strong>{" "}
              disponibles
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            <span>Inventaire &amp; valorisation</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>

        {/* Réseau Installateurs Actifs */}
        <button
          type="button"
          onClick={() => setSelectedKpi("active_partners")}
          className="group text-left rounded-xl border border-border bg-card p-4 shadow-xs hover:border-accent/40 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              Installateurs Actifs
            </span>
            <div className="rounded-lg bg-secondary p-2 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors border border-border">
              <Building2 className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-2xl lg:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
              {partners.active_partners_count}{" "}
              <span className="text-xs font-normal text-muted-foreground">certifiés</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Solde en circulation :{" "}
              <strong className="font-semibold text-foreground font-mono tabular-nums">
                {partners.total_partner_credits_balance} cr.
              </strong>
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            <span>Soldes &amp; santé réseau</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* 2. Ligne Secondaire Bento : Métriques Leads & Funnel B2B / B2C */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entrées de Leads */}
        <button
          type="button"
          onClick={() => setSelectedKpi("acquisition_flow")}
          className="group text-left rounded-xl border border-border bg-card p-4 shadow-xs hover:border-accent/40 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              Flux d'Acquisition
            </span>
            <div className="rounded-lg bg-secondary p-2 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors border border-border">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl lg:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
                {leads.total_leads}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">leads au total</span>
            </div>
            <div className="text-right text-xs">
              <span className="font-bold text-accent font-mono tabular-nums">+{leads.leads_today}</span> aujourd'hui
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-semibold text-foreground">
              <span>B2B : <span className="font-mono tabular-nums">{leads.leads_b2b}</span> ({b2bPercent}%)</span>
              <span>B2C : <span className="font-mono tabular-nums">{leads.leads_b2c}</span> ({b2cPercent}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary flex">
              <div style={{ width: `${b2bPercent}%` }} className="bg-primary" title={`B2B : ${b2bPercent}%`} />
              <div style={{ width: `${b2cPercent}%` }} className="bg-accent" title={`B2C : ${b2cPercent}%`} />
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            <span>Origine des formulaires</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>

        {/* Commandes SEPA en attente */}
        <button
          type="button"
          onClick={() => setSelectedKpi("sepa_pending")}
          className="group text-left rounded-xl border border-border bg-card p-4 shadow-xs hover:border-accent/40 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              Trésorerie SEPA en Attente
            </span>
            <div className="rounded-lg bg-secondary p-2 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors border border-border">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-2xl lg:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
              {Number(revenue.pending_htva || 0).toLocaleString("fr-BE")} €{" "}
              <span className="text-xs font-normal text-muted-foreground">HTVA</span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {revenue.pending_orders_count}
              </span>{" "}
              virement{revenue.pending_orders_count > 1 ? "s" : ""} à pointer (
              <span className="font-mono tabular-nums">
                {Number(revenue.pending_ttc || 0).toLocaleString("fr-BE")} € TTC
              </span>).
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            <span>Rapprochement bancaire</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>

        {/* Commissions Apporteurs / Media Partners */}
        <button
          type="button"
          onClick={() => setSelectedKpi("media_commissions")}
          className="group text-left rounded-xl border border-border bg-card p-4 shadow-xs hover:border-accent/40 hover:bg-muted/30 transition-all flex flex-col justify-between gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
              Commissions Affiliés
            </span>
            <div className="rounded-lg bg-secondary p-2 text-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors border border-border">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-2xl lg:text-3xl font-black text-foreground font-mono tabular-nums tracking-tight">
              {Number(mediaPartners.total_commissions_due || 0).toLocaleString("fr-BE")} €
            </div>
            <p className="text-xs text-muted-foreground">
              Dues sur{" "}
              <span className="font-mono tabular-nums font-semibold text-foreground">
                {mediaPartners.breakdown.length}
              </span>{" "}
              prescripteur{mediaPartners.breakdown.length > 1 ? "s" : ""} actif{mediaPartners.breakdown.length > 1 ? "s" : ""}.
            </p>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground group-hover:text-accent transition-colors">
            <span>Détail par prescripteur</span>
            <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* 3. Modale Interactive de Détail & Transparence Algorithmique / Comptable */}
      <Dialog open={!!selectedKpi} onOpenChange={(open) => !open && setSelectedKpi(null)}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-6 border-border bg-card">
          {selectedKpi === "revenue_paid" && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground w-fit mb-1 border border-border">
                  <Euro className="h-3.5 w-3.5 text-accent" />
                  <span>PERFORMANCE FINANCIÈRE ENCAISSÉE</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Origine du Chiffre d'Affaires Validé
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Traçabilité comptable des ventes de packs de crédits aux installateurs certifiés Aegis Solaire.
                </DialogDescription>
              </DialogHeader>

              {/* Bloc Résumé */}
              <div className="rounded-xl border border-border bg-secondary/40 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Net Encaissé</span>
                  <span className="text-3xl font-black font-mono tabular-nums text-foreground">
                    {Number(revenue.paid_htva_total || 0).toLocaleString("fr-BE")} €{" "}
                    <span className="text-sm font-normal text-muted-foreground">HTVA</span>
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-muted-foreground">Total facturé (TVA 21%) :</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {Number(revenue.paid_ttc_total || 0).toLocaleString("fr-BE")} € TTC
                  </span>
                  <Badge variant="outline" className="text-xs font-mono tabular-nums">
                    +{Number(revenue.paid_htva_month || 0).toLocaleString("fr-BE")} € HTVA ce mois-ci
                  </Badge>
                </div>
              </div>

              {/* Règle de Calcul */}
              <div className="rounded-xl border border-border p-4 flex flex-col gap-2.5 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calculator className="h-4 w-4 text-accent" />
                  <span>Règle de Calcul &amp; Formule Comptable</span>
                </div>
                <code className="text-xs font-mono tabular-nums bg-muted p-2 rounded-md border border-border text-foreground">
                  CA Validé = Σ (price_htva) WHERE credit_orders.status = 'paid'
                </code>
                <ul className="text-xs text-muted-foreground list-disc list-inside flex flex-col gap-1 leading-relaxed">
                  <li>Seules les commandes ayant fait l'objet d'un virement SEPA rapproché ou d'un paiement en ligne confirmé sont comptabilisées.</li>
                  <li>
                    Les commandes en attente de virement (<span className="font-mono tabular-nums font-semibold text-foreground">{Number(revenue.pending_htva || 0)} € HTVA</span>) en sont formellement exclues pour garantir une rigueur de trésorerie absolue.
                  </li>
                </ul>
              </div>

              {/* Données Réelles : Commandes Payées */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Commandes Encaissées Rapprochées ({paidOrders.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Historique récent</span>
                </div>

                {paidOrders.length === 0 ? (
                  <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground">
                    Aucune commande validée enregistrée pour le moment.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border text-xs max-h-60 overflow-y-auto">
                    {paidOrders.map((order: any) => (
                      <div key={order.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{order.partner_name}</span>
                            <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                              ({order.transfer_reference})
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {order.pack_name} ·{" "}
                            <strong className="font-mono tabular-nums text-foreground">{order.credits} crédits</strong>
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className="font-bold font-mono tabular-nums text-foreground">
                            {Number(order.price_htva).toLocaleString("fr-BE")} € HTVA
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                            {Number(order.price_ttc).toLocaleString("fr-BE")} € TTC
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 border-border">
                  <Link href="/admin/finance">
                    <span>Accéder à la Gestion Financière &amp; SEPA</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}

          {selectedKpi === "marketplace_sellthrough" && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground w-fit mb-1 border border-border">
                  <TrendingUp className="h-3.5 w-3.5 text-accent" />
                  <span>VÉLOCITÉ &amp; ÉCOULEMENT DU CATALOGUE</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Comprendre le Taux d'Écoulement Marketplace
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Mesure de la liquidité et de l'appétit d'achat des installateurs pour les leads photovoltaïques mis en vente.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Taux d'Écoulement Actuel</span>
                  <span className="text-3xl font-black font-mono tabular-nums text-foreground">
                    {purchases.sell_through_rate} %
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-muted-foreground">Volume total débloqué :</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {purchases.distinct_purchased_leads} lead(s) unique(s)
                  </span>
                  <Badge variant="outline" className="text-xs font-mono tabular-nums">
                    {purchases.total_credits_spent} crédits consommés
                  </Badge>
                </div>
              </div>

              {/* Formule mathématique explicite */}
              <div className="rounded-xl border border-border p-4 flex flex-col gap-2.5 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calculator className="h-4 w-4 text-accent" />
                  <span>Formule Mathématique Appliquée</span>
                </div>
                <code className="text-xs font-mono tabular-nums bg-muted p-2 rounded-md border border-border text-foreground">
                  Taux (%) = (Leads uniques achetés / Vivier total publiable) × 100
                </code>
                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="rounded-lg border border-border p-2.5 flex flex-col gap-1 bg-muted/40">
                    <span className="text-muted-foreground font-semibold">Numérateur</span>
                    <span className="font-mono tabular-nums text-foreground text-sm font-bold">
                      {purchases.distinct_purchased_leads} lead{purchases.distinct_purchased_leads > 1 ? "s" : ""} acheté{purchases.distinct_purchased_leads > 1 ? "s" : ""}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Exclut les transactions des comptes test.</span>
                  </div>
                  <div className="rounded-lg border border-border p-2.5 flex flex-col gap-1 bg-muted/40">
                    <span className="text-muted-foreground font-semibold">Dénominateur</span>
                    <span className="font-mono tabular-nums text-foreground text-sm font-bold">
                      {leads.publishable_pool_count} leads publiables
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {leads.available_count} en vente + {leads.sold_out_count} vendus.
                    </span>
                  </div>
                </div>
              </div>

              {/* Règle métier */}
              <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground leading-relaxed flex flex-col gap-1.5 bg-muted/30">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-accent" />
                  Interprétation Opérationnelle
                </span>
                <p>
                  Un taux élevé (&gt; 70%) indique que l'offre est absorbée rapidement par le réseau d'installateurs partenaires et qu'il faut intensifier l'acquisition de leads. Un taux faible (&lt; 30%) suggère un excédent de stock ou un besoin d'onboarding de nouveaux partenaires dans certaines provinces wallonnes.
                </p>
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 border-border">
                  <Link href="/admin/leads">
                    <span>Consulter le Catalogue des Leads</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}

          {selectedKpi === "marketplace_stock" && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground w-fit mb-1 border border-border">
                  <ShoppingCart className="h-3.5 w-3.5 text-accent" />
                  <span>INVENTAIRE DE VENTE IMMÉDIAT</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Inventaire des Leads en Vente sur le Catalogue
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Leads qualifiés et vérifiés disponibles à l'achat immédiat par les installateurs wallons.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Leads Disponibles</span>
                  <span className="text-3xl font-black font-mono tabular-nums text-foreground">
                    {leads.available_count} leads
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-muted-foreground">Valeur monétisable :</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {leads.available_credits_pool} crédits
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Prêts au déblocage
                  </Badge>
                </div>
              </div>

              {/* Règle de valorisation */}
              <div className="rounded-xl border border-border p-4 flex flex-col gap-2.5 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calculator className="h-4 w-4 text-accent" />
                  <span>Barème de Valorisation en Crédits</span>
                </div>
                <code className="text-xs font-mono tabular-nums bg-muted p-2 rounded-md border border-border text-foreground">
                  Valeur = Σ (credit_cost) WHERE marketplace_status = 'available'
                </code>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span>Lead B2B Professionnel : <strong className="font-mono tabular-nums text-foreground">9 crédits</strong> (103,50 € HTVA)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span>Lead B2C Résidentiel : <strong className="font-mono tabular-nums text-foreground">3 crédits</strong> (34,50 € HTVA)</span>
                  </div>
                </div>
              </div>

              {/* Échantillon des leads en vente */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Leads Actuellement Disponibles ({availableLeadsList.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Catalogue live</span>
                </div>

                {availableLeadsList.length === 0 ? (
                  <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground">
                    Aucun lead actuellement en vente sur le catalogue.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border text-xs max-h-60 overflow-y-auto">
                    {availableLeadsList.map((lead: any) => (
                      <div key={lead.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {lead.company || `${lead.first_name} ${lead.last_name}`}
                            </span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {lead.segment}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {lead.city || lead.province} {lead.postal_code ? `(${lead.postal_code})` : ""} ·{" "}
                            {lead.surface_area ? `${lead.surface_area} m²` : ""}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className="font-bold font-mono tabular-nums text-foreground">
                            {lead.credit_cost || (lead.segment === "B2B" ? 5 : 2)} cr.
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                            {new Date(lead.created_at).toLocaleDateString("fr-BE")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 border-border">
                  <Link href="/admin/leads?marketplace_status=available">
                    <span>Voir Tout le Vivier Disponible</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}

          {selectedKpi === "active_partners" && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground w-fit mb-1 border border-border">
                  <Building2 className="h-3.5 w-3.5 text-accent" />
                  <span>RÉSEAU DES INSTALLATEURS AGRÉÉS</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Installateurs Actifs &amp; Crédits en Circulation
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  État des comptes installateurs RESCERT, répartition géographique et soldes prépayés.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Installateurs Certifiés</span>
                  <span className="text-3xl font-black font-mono tabular-nums text-foreground">
                    {partners.active_partners_count} partenaires
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-muted-foreground">Solde cumulé en circulation :</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {partners.total_partner_credits_balance} crédits
                  </span>
                  <Badge variant="outline" className="text-xs font-mono tabular-nums">
                    {partners.b2b_partners_count} B2B · {partners.b2c_partners_count} B2C
                  </Badge>
                </div>
              </div>

              {/* Règle de calcul */}
              <div className="rounded-xl border border-border p-4 flex flex-col gap-2.5 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calculator className="h-4 w-4 text-accent" />
                  <span>Règle d'Inclusion &amp; Contrôle de Santé</span>
                </div>
                <code className="text-xs font-mono tabular-nums bg-muted p-2 rounded-md border border-border text-foreground">
                  Partenaires Actifs = COUNT(*) WHERE is_test = false AND name NOT LIKE '%test%'
                </code>
                <ul className="text-xs text-muted-foreground list-disc list-inside flex flex-col gap-1 leading-relaxed">
                  <li>Les comptes de démonstration interne sont strictement exclus des métriques de reporting.</li>
                  <li>
                    Tout partenaire dont le solde est strictement inférieur à <strong className="text-foreground">5 crédits</strong> est classé <em>"À risque"</em> afin d'inciter l'équipe admin à lui proposer un pack de réapprovisionnement.
                  </li>
                </ul>
              </div>

              {/* Liste détaillée des partenaires */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Répertoire des Installateurs ({activePartnersList.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Soldes en direct</span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border text-xs max-h-60 overflow-y-auto">
                  {activePartnersList.map((p: any) => {
                    const isLow = Number(p.credits || 0) < 5
                    return (
                      <div key={p.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{p.company_name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                              {p.segment}
                            </Badge>
                            {isLow && (
                              <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Solde bas</span>
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {p.email} · Provinces :{" "}
                            {Array.isArray(p.target_provinces) && p.target_provinces.length > 0
                              ? p.target_provinces.join(", ")
                              : "Toute la Wallonie"}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className={cn(
                            "font-bold font-mono tabular-nums text-base",
                            isLow ? "text-destructive" : "text-foreground"
                          )}>
                            {p.credits} cr.
                          </span>
                          <span className="text-[10px] text-muted-foreground">disponibles</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 border-border">
                  <Link href="/admin/partners">
                    <span>Gérer le Réseau des Partenaires</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}

          {selectedKpi === "acquisition_flow" && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground w-fit mb-1 border border-border">
                  <Activity className="h-3.5 w-3.5 text-accent" />
                  <span>FLUX &amp; ENTRÉES MULTICANALES</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Comprendre le Flux d'Acquisition de Leads
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Ventilation des leads captés par canal (Simulateur B2B, Devis Landing B2C, Webinaire RSE).
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Total Leads Captés</span>
                  <span className="text-3xl font-black font-mono tabular-nums text-foreground">
                    {leads.total_leads}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-muted-foreground">Dynamique récente :</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-accent">
                    +{leads.leads_today} aujourd'hui
                  </span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {leads.leads_month} ce mois-ci
                  </span>
                </div>
              </div>

              {/* Répartition Funnel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg border border-border p-3 flex flex-col gap-0.5 bg-card">
                  <span className="text-muted-foreground">En Triage</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-foreground">{leads.pending_review_count}</span>
                </div>
                <div className="rounded-lg border border-border p-3 flex flex-col gap-0.5 bg-card">
                  <span className="text-muted-foreground">Qualifiés</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-foreground">{leads.status_qualified_count}</span>
                </div>
                <div className="rounded-lg border border-border p-3 flex flex-col gap-0.5 bg-card">
                  <span className="text-muted-foreground">En Vente</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-foreground">{leads.available_count}</span>
                </div>
                <div className="rounded-lg border border-border p-3 flex flex-col gap-0.5 bg-card">
                  <span className="text-muted-foreground">Vendus</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-foreground">{leads.sold_out_count}</span>
                </div>
              </div>

              {/* Échantillon des derniers leads entrants */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Dernières Entrées en Base ({recentLeads.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Direct Supabase</span>
                </div>

                <div className="rounded-xl border border-border overflow-hidden divide-y divide-border text-xs max-h-56 overflow-y-auto">
                  {recentLeads.map((l: any) => (
                    <div key={l.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {l.first_name} {l.last_name} {l.company ? `(${l.company})` : ""}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {l.segment}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {l.city || l.province} · {l.surface_area ? `${l.surface_area} m²` : ""} · Score :{" "}
                          <strong className="font-mono tabular-nums text-foreground">{l.lead_score || "N/A"}/100</strong>
                        </span>
                      </div>
                      <div className="text-right flex flex-col items-end gap-0.5">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {l.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                          {new Date(l.created_at).toLocaleDateString("fr-BE")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 border-border">
                  <Link href="/admin/leads?view=triage">
                    <span>Ouvrir la File de Triage &amp; Qualification</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}

          {selectedKpi === "sepa_pending" && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground w-fit mb-1 border border-border">
                  <CreditCard className="h-3.5 w-3.5 text-accent" />
                  <span>TRÉSORERIE EN ATTENTE DE POINTAGE</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Trésorerie SEPA en Cours de Rapprochement
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Commandes de crédits initiées par les installateurs, en attente de validation du virement bancaire.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Montant en Attente</span>
                  <span className="text-3xl font-black font-mono tabular-nums text-foreground">
                    {Number(revenue.pending_htva || 0).toLocaleString("fr-BE")} €{" "}
                    <span className="text-sm font-normal text-muted-foreground">HTVA</span>
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-muted-foreground">Montant TTC exigible :</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {Number(revenue.pending_ttc || 0).toLocaleString("fr-BE")} € TTC
                  </span>
                  <Badge variant="outline" className="text-xs font-mono tabular-nums">
                    {revenue.pending_orders_count} virement{revenue.pending_orders_count > 1 ? "s" : ""} à pointer
                  </Badge>
                </div>
              </div>

              {/* Règle métier de pointage */}
              <div className="rounded-xl border border-border p-4 flex flex-col gap-2.5 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calculator className="h-4 w-4 text-accent" />
                  <span>Processus de Validation Bancaire</span>
                </div>
                <code className="text-xs font-mono tabular-nums bg-muted p-2 rounded-md border border-border text-foreground">
                  Trésorerie SEPA = Σ (price_htva) WHERE credit_orders.status = 'pending'
                </code>
                <ul className="text-xs text-muted-foreground list-disc list-inside flex flex-col gap-1 leading-relaxed">
                  <li>L'installateur a validé son bon de commande et a reçu les coordonnées bancaires (IBAN Aegis + Référence de virement).</li>
                  <li>Dès réception sur l'extrait bancaire, un clic sur <em>"Valider le virement"</em> crédite automatiquement le solde du partenaire en direct.</li>
                </ul>
              </div>

              {/* Liste des commandes en attente */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Virements Attendus ({pendingOrders.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Références bancaires</span>
                </div>

                {pendingOrders.length === 0 ? (
                  <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground">
                    Aucun virement en attente actuellement. Toutes les commandes sont pointées !
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border text-xs max-h-60 overflow-y-auto">
                    {pendingOrders.map((order: any) => (
                      <div key={order.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{order.partner_name}</span>
                            <span className="font-mono tabular-nums text-xs font-bold text-accent">
                              {order.transfer_reference}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {order.pack_name} · <strong className="font-mono tabular-nums text-foreground">{order.credits} crédits</strong>
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className="font-bold font-mono tabular-nums text-foreground">
                            {Number(order.price_htva).toLocaleString("fr-BE")} € HTVA
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                            {Number(order.price_ttc).toLocaleString("fr-BE")} € TTC
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button size="sm" asChild className="text-xs gap-1.5 shadow-2xs">
                  <Link href="/admin/finance">
                    <span>Valider les Virements dans la Console Finance</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}

          {selectedKpi === "media_commissions" && (
            <div className="flex flex-col gap-5">
              <DialogHeader>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground w-fit mb-1 border border-border">
                  <Megaphone className="h-3.5 w-3.5 text-accent" />
                  <span>AFFILIATION &amp; APPORTEURS D'AFFAIRES</span>
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Commissions des Partenaires Prescripteurs
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Rémunérations contractuelles dues aux apporteurs de trafic pour les leads vérifiés en Wallonie.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground uppercase font-semibold">Commissions Cumulées</span>
                  <span className="text-3xl font-black font-mono tabular-nums text-foreground">
                    {Number(mediaPartners.total_commissions_due || 0).toLocaleString("fr-BE")} €
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="text-xs text-muted-foreground">Prescripteurs sous contrat :</span>
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {mediaPartners.breakdown.length} partenaire(s)
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Programme Partenaires Média
                  </Badge>
                </div>
              </div>

              {/* Règle de calcul */}
              <div className="rounded-xl border border-border p-4 flex flex-col gap-2.5 bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calculator className="h-4 w-4 text-accent" />
                  <span>Règle d'Attribution &amp; Rémunération</span>
                </div>
                <code className="text-xs font-mono tabular-nums bg-muted p-2 rounded-md border border-border text-foreground">
                  Commission = (Leads B2B validés × Comm. B2B) + (Leads B2C validés × Comm. B2C)
                </code>
                <ul className="text-xs text-muted-foreground list-disc list-inside flex flex-col gap-1 leading-relaxed">
                  <li>
                    L'attribution se fait automatiquement au moment de la soumission du formulaire via le paramètre URL <code className="text-foreground">?ref=CODE_PARTENAIRE</code>.
                  </li>
                  <li>
                    La commission n'est débloquée que lorsque le lead franchit avec succès la qualification technique et géographique.
                  </li>
                </ul>
              </div>

              {/* Liste des partenaires médias */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Décomposition par Prescripteur ({mediaPartners.breakdown.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">Codes de tracking</span>
                </div>

                {mediaPartners.breakdown.length === 0 ? (
                  <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground">
                    Aucun partenaire prescripteur actif pour le moment.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden divide-y divide-border text-xs max-h-60 overflow-y-auto">
                    {mediaPartners.breakdown.map((mp: any) => (
                      <div key={mp.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{mp.company_name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {mp.tracking_code}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            <strong className="font-mono tabular-nums text-foreground">{mp.attributed_leads_count}</strong> leads sourcés ·{" "}
                            <strong className="font-mono tabular-nums text-foreground">{mp.validated_leads_count}</strong> validés
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                          <span className="font-bold font-mono tabular-nums text-foreground text-sm">
                            {Number(mp.total_commission_due || 0).toLocaleString("fr-BE")} €
                          </span>
                          <span className="text-[10px] text-muted-foreground">due au prescripteur</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" size="sm" asChild className="text-xs gap-1.5 border-border">
                  <Link href="/admin/media-partners">
                    <span>Gérer les Partenaires Médias &amp; Affiliés</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
