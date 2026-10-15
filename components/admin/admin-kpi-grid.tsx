import { 
  Euro, 
  TrendingUp, 
  Calendar, 
  Zap, 
  Users, 
  Building2, 
  ShoppingCart, 
  CreditCard, 
  Coins, 
  Megaphone,
  ArrowUpRight,
  ShieldCheck,
  Activity
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
}

export function AdminKpiGrid({
  leads,
  partners,
  purchases,
  revenue,
  mediaPartners,
}: AdminKpiGridProps) {
  const totalLeads = leads.total_leads || 1
  const b2bPercent = Math.round((leads.leads_b2b / totalLeads) * 100)
  const b2cPercent = 100 - b2bPercent

  return (
    <div className="space-y-6">
      {/* 1. Ligne Principale : Performance Financière & Marketplace */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA Encaissé HTVA */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              CA Validé (Packs)
            </CardTitle>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Euro className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-black text-slate-900">
              {Number(revenue.paid_htva_total || 0).toLocaleString("fr-BE")} € <span className="text-xs font-normal text-slate-500">HTVA</span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="font-semibold text-emerald-600">
                +{Number(revenue.paid_htva_month || 0).toLocaleString("fr-BE")} €
              </span>{" "}
              ce mois-ci
            </p>
          </CardContent>
        </Card>

        {/* Taux d'écoulement Marketplace */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Écoulement Marketplace
            </CardTitle>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-black text-slate-900">
              {purchases.sell_through_rate}%
            </div>
            <p className="text-xs text-slate-500">
              {purchases.distinct_purchased_leads} leads achetés sur le catalogue
            </p>
          </CardContent>
        </Card>

        {/* Stock Disponible en Vente */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Stock en Vente
            </CardTitle>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-black text-slate-900">
              {leads.available_count} <span className="text-sm font-semibold text-slate-500">leads</span>
            </div>
            <p className="text-xs text-slate-500">
              Valeur : <strong className="text-amber-700 font-semibold">{leads.available_credits_pool} crédits</strong> en stock
            </p>
          </CardContent>
        </Card>

        {/* Réseau Installateurs Actifs */}
        <Card className="border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Installateurs Actifs
            </CardTitle>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-black text-slate-900">
              {partners.active_partners_count} <span className="text-xs font-normal text-slate-500">partenaires</span>
            </div>
            <p className="text-xs text-slate-500">
              Solde en circulation : <strong className="text-indigo-600 font-semibold">{partners.total_partner_credits_balance} cr.</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Ligne Secondaire : Métriques Leads & Funnel B2B / B2C */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entrées de Leads */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Flux d'Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900">{leads.total_leads}</span>
                <span className="ml-1.5 text-xs text-slate-500">leads au total</span>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-emerald-600">+{leads.leads_today}</span> aujourd'hui
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>B2B : {leads.leads_b2b} ({b2bPercent}%)</span>
                <span>B2C : {leads.leads_b2c} ({b2cPercent}%)</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                <div style={{ width: `${b2bPercent}%` }} className="bg-[#001D3D]" />
                <div style={{ width: `${b2cPercent}%` }} className="bg-[#FFB800]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commandes SEPA en attente */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Trésorerie SEPA en Cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-black text-slate-900">
              {Number(revenue.pending_htva || 0).toLocaleString("fr-BE")} € <span className="text-xs font-normal text-slate-500">HTVA</span>
            </div>
            <p className="text-xs text-slate-500">
              {revenue.pending_orders_count} virement{revenue.pending_orders_count > 1 ? "s" : ""} en attente de pointage bancaire ({Number(revenue.pending_ttc || 0).toLocaleString("fr-BE")} € TTC).
            </p>
          </CardContent>
        </Card>

        {/* Commissions Apporteurs / Media Partners */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Commissions Affiliés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-black text-slate-900">
              {Number(mediaPartners.total_commissions_due || 0).toLocaleString("fr-BE")} €
            </div>
            <p className="text-xs text-slate-500">
              Dues sur {mediaPartners.breakdown.length} prescripteur{mediaPartners.breakdown.length > 1 ? "s" : ""} actif{mediaPartners.breakdown.length > 1 ? "s" : ""}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
