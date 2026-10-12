import Link from "next/link"
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  Zap, 
  Users, 
  Euro, 
  Building2, 
  Megaphone, 
  ClipboardCheck, 
  ArrowRight, 
  Eye, 
  AlertTriangle, 
  ShoppingCart, 
  UserPlus, 
  CreditCard, 
  Coins, 
  Clock,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Layers,
  Activity,
  BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { unstable_cache } from "next/cache"

const getStatsCached = unstable_cache(
  async () => {
    const supabase = createServiceRoleClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      leadsRes,
      installerAppsRes,
      partnersRes,
      purchasesRes,
      mediaPartnersRes,
      auditLogsRes,
      creditOrdersRes
    ] = await Promise.all([
      // 1 requête consolidée pour tous les leads récents et calculs statistiques (au lieu de 11 requêtes séparées !)
      supabase
        .from("leads")
        .select("id, first_name, last_name, email, surface_type, surface_area, estimated_roi_years, status, marketplace_status, segment, province, media_partner_code, created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      // Candidatures installateurs en attente
      supabase.from("installer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      // Partenaires et soldes de crédits en 1 seule requête
      supabase.from("partners").select("id, credits_balance"),
      // Achats de leads totaux
      supabase.from("lead_purchases").select("*", { count: "exact", head: true }),
      // Apporteurs d'affaires
      supabase.from("media_partners").select("id, tracking_code, commission_b2b, commission_b2c"),
      // Journal d'audit récent
      supabase.from("audit_log").select("id, admin_email, action, entity_type, created_at").order("created_at", { ascending: false }).limit(10),
      // Commandes de crédits en attente
      Promise.resolve(
        supabase.from("credit_orders").select("id, credits, price_ttc, price_htva, transfer_reference, created_at, status, partners(company_name)").eq("status", "pending").order("created_at", { ascending: false }).limit(5)
      ).catch(() => ({ data: [] as any[], error: null })),
    ])

    const allLeads: any[] = (leadsRes.data ?? []) as any[]
    const total = allLeads.length
    const thisMonth = allLeads.filter(l => new Date(l.created_at) >= startOfMonth).length
    const today = allLeads.filter(l => new Date(l.created_at) >= startOfDay).length
    const b2bCount = allLeads.filter(l => l.segment === "B2B").length
    const b2cCount = allLeads.filter(l => l.segment === "B2C").length
    const newStatusCount = allLeads.filter(l => l.status === "new").length
    const qualifiedCount = allLeads.filter(l => ["qualified", "converted", "HOT_LEAD"].includes(l.status)).length
    const availableCount = allLeads.filter(l => l.marketplace_status === "available").length
    const soldCount = allLeads.filter(l => l.marketplace_status === "sold_out").length
    const needsReviewLeads = allLeads.filter(l => l.status === "NEEDS_HUMAN_REVIEW")
    const recent = allLeads.slice(0, 10)
    const attrLeads = allLeads.filter(l => Boolean(l.media_partner_code))

    // Partenaires & crédits
    const partnersList: any[] = (partnersRes.data ?? []) as any[]
    const activePartners = partnersList.length
    const totalCreditsInCirculation = partnersList.reduce((acc, p) => acc + (p.credits_balance || 0), 0)

    // Commissions apporteurs
    let commissionsDue = 0
    const mpList: any[] = (mediaPartnersRes.data ?? []) as any[]
    const qualifiedStatuses = ["qualified", "converted", "HOT_LEAD"]
    
    for (const mp of mpList) {
      const myLeads = attrLeads.filter((l) => l.media_partner_code === mp.tracking_code)
      const qualified = myLeads.filter((l) => qualifiedStatuses.includes(l.status))
      commissionsDue +=
        qualified.filter((l) => l.segment === "B2B").length * (mp.commission_b2b ?? 100) +
        qualified.filter((l) => l.segment === "B2C").length * (mp.commission_b2c ?? 25)
    }

    return {
      total,
      thisMonth,
      today,
      b2b: b2bCount,
      b2c: b2cCount,
      newStatusCount,
      qualifiedCount,
      availableCount,
      soldCount,
      recent,
      pendingApps: installerAppsRes.count ?? 0,
      activePartners,
      totalCreditsInCirculation,
      totalPurchases: purchasesRes.count ?? 0,
      mediaPartners: mpList.length,
      attributedLeads: attrLeads.length,
      commissionsDue,
      needsReviewLeads,
      auditLogs: auditLogsRes.data ?? [],
      pendingCreditOrders: creditOrdersRes?.data ?? [],
    }
  },
  ["admin-dashboard-stats-v3"],
  { revalidate: 30, tags: ["admin-dashboard-stats-v3"] }
)

export default async function AdminDashboardPage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")
  
  const stats = await getStatsCached()

  // Calculate pending credit orders total TTC
  const pendingOrdersTotalTTC = (stats.pendingCreditOrders || []).reduce(
    (acc: number, o: any) => acc + (Number(o.price_ttc) || 0), 
    0
  )

  // Calculate Lead Funnel Percentages
  const totalLeadsCount = stats.total || 1
  const b2bPercent = Math.round((stats.b2b / totalLeadsCount) * 100)
  const b2cPercent = 100 - b2bPercent

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Hero Executive Header (Light Theme) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50/60 to-blue-50/30 p-6 sm:p-8 shadow-2xs">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Console de Contrôle Opérationnel &amp; Financier</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Aegis Admin — Tableau de bord
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Supervision en temps réel des leads solaires qualifiés B2B/B2C, des commandes de crédits installateurs et des flux de commissions partenaires en Belgique.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link href="/admin/partners">
              <Button className="h-10 px-4 bg-[#001D3D] hover:bg-[#002B54] text-white font-extrabold text-xs gap-2 rounded-xl shadow-xs transition-all hover:scale-[1.02] border-0">
                <Coins className="h-4 w-4 text-amber-400" />
                <span>Gérer les Crédits &amp; Virements</span>
                {stats.pendingCreditOrders.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-[#001D3D] ml-1">
                    {stats.pendingCreditOrders.length}
                  </span>
                )}
              </Button>
            </Link>

            <Link href="/admin/leads">
              <Button variant="outline" className="h-10 px-4 bg-white hover:bg-slate-50 text-slate-800 border-slate-200 font-bold text-xs gap-2 rounded-xl transition-all hover:scale-[1.02] shadow-2xs">
                <FileText className="h-4 w-4 text-slate-500" />
                <span>Registre des Leads</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Alerte Prioritaire : Virements de crédits en attente */}
      {Array.isArray(stats.pendingCreditOrders) && stats.pendingCreditOrders.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 p-5 shadow-md shadow-amber-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-[#001D3D] shadow-sm">
                <CreditCard className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-amber-950 text-base">
                    {stats.pendingCreditOrders.length} commande{stats.pendingCreditOrders.length > 1 ? "s" : ""} de crédits en attente de validation bancaire
                  </h2>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-black text-[#001D3D]">
                    {pendingOrdersTotalTTC.toFixed(2)} € TTC
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  Les installateurs attendent l'approbation de leur virement pour débloquer leurs crédits sur la marketplace.
                </p>
              </div>
            </div>

            <Link href="/admin/partners">
              <Button size="sm" className="bg-[#001D3D] hover:bg-[#002D5A] text-white font-extrabold text-xs gap-2 rounded-xl shadow-xs shrink-0">
                <span>Examiner les virements</span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
              </Button>
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 pt-1 border-t border-amber-200/60">
            {stats.pendingCreditOrders.map((o: any) => (
              <Link key={o.id} href="/admin/partners">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white border border-amber-200/80 px-3 py-2 text-xs shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all">
                  <span className="font-bold text-slate-800">{o.partners?.company_name || "Installateur"}</span>
                  <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-black text-[#001D3D]">+{o.credits} cr</span>
                  <span className="font-mono text-slate-600 font-bold">{Number(o.price_ttc).toFixed(2)} €</span>
                  <span className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600">Réf: {o.transfer_reference}</span>
                  <span className="text-amber-600 font-extrabold text-[11px] ml-1">Valider →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 3. Alerte Leads à contrôler d'urgence */}
      {stats.needsReviewLeads.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50/70 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-rose-950 text-base">
                  {stats.needsReviewLeads.length} lead{stats.needsReviewLeads.length > 1 ? "s" : ""} requièrent un contrôle humain
                </h2>
                <p className="text-xs text-rose-800">
                  Vérifiez les données de contact et d'éligibilité avant mise à disposition des installateurs.
                </p>
              </div>
            </div>
            <Link href="/admin/leads?status=NEEDS_HUMAN_REVIEW">
              <Button size="sm" variant="outline" className="border-rose-300 text-rose-900 bg-white hover:bg-rose-100 font-bold text-xs gap-1.5 rounded-xl">
                <span>Traiter les leads urgents</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Cockpit Quick Actions Hub (4 Piliers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pilier 1 : Leads */}
        <Link href="/admin/leads?status=new" className="group">
          <Card className="h-full border border-slate-200/80 bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition-transform">
                <Zap className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Flux Entrant</span>
                  {stats.newStatusCount > 0 && (
                    <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[10px] font-black text-white">
                      {stats.newStatusCount}
                    </span>
                  )}
                </div>
                <p className="font-extrabold text-sm text-slate-900 truncate">Nouveaux Leads</p>
                <p className="text-[11px] text-slate-500 truncate">À qualifier &amp; vérifier</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pilier 2 : Virements & Crédits */}
        <Link href="/admin/partners" className="group">
          <Card className="h-full border border-slate-200/80 bg-white hover:border-amber-300 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition-transform">
                <Coins className="h-5 w-5" />
                {stats.pendingCreditOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-[#001D3D] ring-2 ring-white">
                    {stats.pendingCreditOrders.length}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Finances</span>
                  <span className="text-[10px] font-bold text-amber-600">{stats.totalCreditsInCirculation} cr en circ.</span>
                </div>
                <p className="font-extrabold text-sm text-slate-900 truncate">Packs &amp; Crédits</p>
                <p className="text-[11px] text-slate-500 truncate">Virements ({stats.pendingCreditOrders.length} en attente)</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pilier 3 : Installer Hub */}
        <Link href="/admin/applications" className="group">
          <Card className="h-full border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition-transform">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Réseau Pros</span>
                  {stats.pendingApps > 0 && (
                    <span className="rounded-full bg-blue-600 px-1.5 py-0.2 text-[10px] font-black text-white">
                      {stats.pendingApps}
                    </span>
                  )}
                </div>
                <p className="font-extrabold text-sm text-slate-900 truncate">Candidatures</p>
                <p className="text-[11px] text-slate-500 truncate">{stats.activePartners} installateurs certifiés</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pilier 4 : Apporteurs & Commissions */}
        <Link href="/admin/media-partners" className="group">
          <Card className="h-full border border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-105 transition-transform">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Marketing</span>
                  <span className="text-[10px] font-bold text-purple-600">{stats.commissionsDue} € dues</span>
                </div>
                <p className="font-extrabold text-sm text-slate-900 truncate">Apporteurs</p>
                <p className="text-[11px] text-slate-500 truncate">{stats.mediaPartners} partenaires actifs</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 5. Key Executive Metric Cards (6 KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Total Leads & Répartition */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Volume Total des Leads</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.total}</span>
              <span className="text-xs font-semibold text-emerald-600">+{stats.thisMonth} ce mois</span>
            </div>
            
            {/* Visual B2B / B2C split bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-slate-700">B2B Pro : {stats.b2b} ({b2bPercent}%)</span>
                <span className="text-slate-500">B2C : {stats.b2c} ({b2cPercent}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div 
                  className="bg-[#001D3D] transition-all" 
                  style={{ width: `${b2bPercent}%` }} 
                  title={`B2B : ${b2bPercent}%`}
                />
                <div 
                  className="bg-emerald-500 transition-all" 
                  style={{ width: `${b2cPercent}%` }} 
                  title={`B2C : ${b2cPercent}%`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Activité du Jour & Flux */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Activité Récente</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Calendar className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.today}</span>
              <span className="text-xs font-medium text-slate-500">lead{stats.today > 1 ? "s" : ""} aujourd'hui</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3">
              <span>Mois en cours :</span>
              <span className="font-extrabold text-slate-900">{stats.thisMonth} leads</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Marketplace & Ventes */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Marketplace &amp; Ventes</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.totalPurchases}</span>
              <span className="text-xs font-medium text-slate-500">achats de leads confirmés</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3">
              <span>Installateurs acheteurs :</span>
              <span className="font-extrabold text-indigo-600">{stats.activePartners} partenaires</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Crédits en circulation */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Solde de Crédits Réseau</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600">{stats.totalCreditsInCirculation}</span>
              <span className="text-xs font-medium text-slate-500">crédits en portefeuille</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3">
              <span>Commandes en attente :</span>
              <span className="font-extrabold text-amber-700">{stats.pendingCreditOrders.length} virement(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Commissions Apporteurs */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Commissions Partenaires</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Euro className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.commissionsDue.toLocaleString("fr-BE")} €</span>
              <span className="text-xs font-medium text-slate-500">en attente de règlement</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3">
              <span>Leads affiliés qualifiés :</span>
              <span className="font-extrabold text-slate-900">{stats.attributedLeads}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Réseau Installateurs & Candidatures */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Couverture Installateurs</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.activePartners}</span>
              <span className="text-xs font-medium text-slate-500">entreprises agréées</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-3">
              <span>Candidatures à traiter :</span>
              <span className="font-extrabold text-rose-600">{stats.pendingApps} dossier(s)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. Tunnel de Conversion des Leads (Visual Funnel) */}
      <Card className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#001D3D]" />
              <CardTitle className="text-sm font-extrabold text-slate-900">
                Tunnel de Conversion &amp; Cycle de Vie des Leads
              </CardTitle>
            </div>
            <span className="text-xs text-slate-500 font-medium">Flux d'attribution temps réel</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Étape 1 : Entrants */}
            <Link href="/admin/leads?status=new" className="group">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all group-hover:border-blue-300 group-hover:bg-blue-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-blue-600">Étape 1 · Entrants</span>
                  <span className="text-xs font-extrabold text-slate-400">01</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-900">{stats.newStatusCount}</span>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">Nouveaux leads reçus</p>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Formulaires web, webinaire ou partenaires</p>
              </div>
            </Link>

            {/* Étape 2 : Qualifiés */}
            <Link href="/admin/leads?status=qualified" className="group">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all group-hover:border-emerald-300 group-hover:bg-emerald-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-600">Étape 2 · Qualifiés</span>
                  <span className="text-xs font-extrabold text-slate-400">02</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-900">{stats.qualifiedCount}</span>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">Audités &amp; Vérifiés</p>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Numéro vérifié, toiture &amp; ROI validés</p>
              </div>
            </Link>

            {/* Étape 3 : Marketplace */}
            <Link href="/admin/leads?marketplace_status=available" className="group">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all group-hover:border-amber-300 group-hover:bg-amber-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-600">Étape 3 · Marketplace</span>
                  <span className="text-xs font-extrabold text-slate-400">03</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-900">{stats.availableCount}</span>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">Disponibles à l'achat</p>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Exclusifs ou partagés (max 3 installateurs)</p>
              </div>
            </Link>

            {/* Étape 4 : Vendus / Déployés */}
            <Link href="/admin/leads?marketplace_status=sold_out" className="group">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all group-hover:border-indigo-300 group-hover:bg-indigo-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-indigo-600">Étape 4 · Déployés</span>
                  <span className="text-xs font-extrabold text-slate-400">04</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-900">{stats.soldCount}</span>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">Vendus aux installateurs</p>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">Chantiers en cours d'attribution</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 7. Grid : Table des Derniers Leads & Fil d'activité */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Table des Derniers Leads (2 colonnes) */}
        <Card className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-extrabold text-slate-900">Derniers Leads Enregistrés</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Les 10 demandes les plus récentes sur la plateforme</p>
            </div>
            <Link href="/admin/leads">
              <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl gap-1.5 border-slate-200">
                <span>Voir tout le registre</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-500">
                  <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Contact</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Segment</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Projet</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Source</th>
                  <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Statut</th>
                  <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.isArray(stats.recent) && stats.recent.length > 0 ? (
                  stats.recent.map((lead: any) => {
                    const fullName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.email
                    const initials = (lead.first_name?.[0] || "") + (lead.last_name?.[0] || "L")

                    return (
                      <tr key={lead.id} className="transition-colors hover:bg-slate-50/70">
                        {/* Contact */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#001D3D] to-[#002D5A] text-amber-400 font-extrabold text-[11px] shadow-2xs">
                              {initials.toUpperCase() || "L"}
                            </div>
                            <div>
                              <Link href={`/admin/leads?leadId=${lead.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                {fullName}
                              </Link>
                              <div className="text-[11px] text-slate-500 font-mono">{lead.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Segment */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            lead.segment === "B2B" 
                              ? "bg-[#001D3D] text-white" 
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {lead.segment ?? "B2B"}
                          </span>
                        </td>

                        {/* Projet / Surface */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {lead.surface_area ? `${lead.surface_area} m²` : "Surface N/C"}
                          </div>
                          <div className="text-[10px] text-slate-500 capitalize">
                            {lead.surface_type || "Toiture"} {lead.province ? `· ${lead.province}` : ""}
                          </div>
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {lead.media_partner_code ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                              ref:{lead.media_partner_code}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">Direct Web</span>
                          )}
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <LeadStatusBadge status={lead.status} />
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link href={`/admin/leads?leadId=${lead.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg">
                              <span>Examiner</span>
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      Aucun lead enregistré pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Fil d'Activité / Audit Logs (1 colonne) */}
        <Card className="rounded-3xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-extrabold text-slate-900">Journal d'Activité</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Événements récents sur le système</p>
            </div>
            <Link href="/admin/audit">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900">
                Tout voir
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4">
            <div className="relative pl-6 space-y-4 before:absolute before:bottom-2 before:top-2 before:left-2.5 before:w-0.5 before:bg-slate-200">
              {stats.auditLogs.map((log: any) => {
                const isInstall = log.entity_type === 'application' || log.entity_type === 'installateur'
                const isPartner = log.entity_type === 'partner' || log.entity_type === 'media_partner'
                
                let Icon = FileText
                let dotColor = "bg-blue-500 ring-blue-100"
                let actionText = log.action

                if (log.action === "lead_updated") {
                  Icon = Zap
                  dotColor = "bg-amber-500 ring-amber-100"
                  actionText = "Mise à jour d'un lead"
                } else if (log.action === "lead_purchased") {
                  Icon = ShoppingCart
                  dotColor = "bg-indigo-500 ring-indigo-100"
                  actionText = "Achat d'un lead sur marketplace"
                } else if (log.action === "credits_added" || log.action === "credit_order_validated") {
                  Icon = Coins
                  dotColor = "bg-emerald-500 ring-emerald-100"
                  actionText = "Crédits ajoutés à un installateur"
                } else if (isInstall) {
                  Icon = Users
                  dotColor = "bg-teal-500 ring-teal-100"
                  actionText = log.action === "installer_approved" ? "Installateur approuvé" : "Nouvel installateur"
                } else if (isPartner) {
                  Icon = Building2
                  dotColor = "bg-purple-500 ring-purple-100"
                  actionText = "Action partenaire"
                } else if (log.action.includes('clean') || log.action.includes('delete')) {
                  Icon = AlertTriangle
                  dotColor = "bg-rose-500 ring-rose-100"
                  actionText = "Nettoyage de données"
                }

                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className={`absolute -left-6 top-1 h-3 w-3 rounded-full ${dotColor} ring-4 bg-white`} />
                    
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-800 leading-snug">{actionText}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-600">{log.admin_email ? log.admin_email.split('@')[0] : 'Système'}</span>
                        <span>·</span>
                        <span className="font-mono">
                          {new Date(log.created_at).toLocaleString("fr-FR", { 
                            hour: "2-digit", 
                            minute: "2-digit", 
                            day: "2-digit", 
                            month: "short" 
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}

              {stats.auditLogs.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  Aucune activité récente enregistrée.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
