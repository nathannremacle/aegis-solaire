import Link from "next/link"
import { FileText, TrendingUp, Calendar, Zap, Users, Euro, Building2, Megaphone, ClipboardCheck, ArrowRight, Eye, AlertTriangle, ShoppingCart, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

import { unstable_cache } from "next/cache"

const getStatsCached = unstable_cache(
  async () => {
    // Note: We don't check for user here because unstable_cache should only contain public/safe data 
    // OR we use the user as part of the key if it depends on the user. 
    // Here, stats are global for all admins.
    
    const supabase = createServiceRoleClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      { count: total },
      { count: thisMonth },
      { count: today },
      { count: b2bCount },
      { count: b2cCount },
      { data: recent },
      { count: pendingApps },
      { count: activePartners },
      { count: totalPurchases },
      { data: mpData },
      { data: attributedLeads },
      { data: needsReviewLeads },
      { data: auditLogs }
    ] = await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
      supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString()),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("segment", "B2B"),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("segment", "B2C"),
      supabase.from("leads").select("id, first_name, last_name, email, surface_type, surface_area, estimated_roi_years, status, segment, province, media_partner_code, created_at").order("created_at", { ascending: false }).limit(10),
      supabase.from("installer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("partners").select("*", { count: "exact", head: true }),
      supabase.from("lead_purchases").select("*", { count: "exact", head: true }),
      supabase.from("media_partners").select("id, tracking_code, commission_b2b, commission_b2c"),
      supabase.from("leads").select("media_partner_code, segment, status").not("media_partner_code", "is", null),
      supabase.from("leads").select("id, first_name, last_name, email, created_at").eq("status", "NEEDS_HUMAN_REVIEW"),
      supabase.from("audit_log").select("id, admin_email, action, entity_type, created_at").order("created_at", { ascending: false }).limit(15),
    ])

    let commissionsDue = 0
    const mpList = mpData ?? []
    const attrLeads = attributedLeads ?? []
    const qualifiedStatuses = ["qualified", "converted", "HOT_LEAD"]
    
    for (const mp of mpList) {
      const myLeads = attrLeads.filter((l) => l.media_partner_code === mp.tracking_code)
      const qualified = myLeads.filter((l) => qualifiedStatuses.includes(l.status))
      commissionsDue +=
        qualified.filter((l) => l.segment === "B2B").length * (mp.commission_b2b ?? 100) +
        qualified.filter((l) => l.segment === "B2C").length * (mp.commission_b2c ?? 25)
    }

    return {
      total: total ?? 0,
      thisMonth: thisMonth ?? 0,
      today: today ?? 0,
      b2b: b2bCount ?? 0,
      b2c: b2cCount ?? 0,
      recent: recent ?? [],
      pendingApps: pendingApps ?? 0,
      activePartners: activePartners ?? 0,
      totalPurchases: totalPurchases ?? 0,
      mediaPartners: mpList.length,
      attributedLeads: attrLeads.length,
      commissionsDue,
      needsReviewLeads: needsReviewLeads ?? [],
      auditLogs: auditLogs ?? [],
    }
  },
  ["admin-dashboard-stats"],
  { revalidate: 300, tags: ["admin-dashboard-stats"] }
)

export default async function AdminDashboardPage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")
  
  const stats = await getStatsCached()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>

      {stats.needsReviewLeads.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-bold text-base">Leads à contrôler urgemment</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.needsReviewLeads.map((l: any) => (
              <Link key={l.id} href={`/admin/leads?leadId=${l.id}`}>
                <Button variant="outline" size="sm" className="bg-white border-orange-200 text-orange-800 hover:bg-orange-100 hover:text-orange-900 shadow-sm transition-all hover:scale-[1.02]">
                  {l.first_name} {l.last_name || l.email} <Eye className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Cockpit Actions */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <Link href="/admin/leads?status=new">
          <Button variant="secondary" className="h-14 gap-3 px-6 shadow-sm border border-border/50 bg-white hover:bg-muted/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nouveaux leads</div>
              <div className="text-lg font-bold">Traiter la file</div>
            </div>
          </Button>
        </Link>
        <Link href="/admin/leads?installateur=all">
          <Button variant="secondary" className="h-14 gap-3 px-6 shadow-sm border border-border/50 bg-white hover:bg-muted/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attribution</div>
              <div className="text-lg font-bold">Assigner les non-attribués</div>
            </div>
          </Button>
        </Link>
        <Link href="/admin/applications">
          <Button variant="secondary" className="h-14 gap-3 px-6 shadow-sm border border-border/50 bg-white hover:bg-muted/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Installer Hub</div>
              <div className="text-lg font-bold">Gérer les candidatures</div>
            </div>
          </Button>
        </Link>
      </div>

      {/* Row 1: Core leads KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-5 w-5" />
              <span className="text-sm font-medium">Total leads</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">B2B : {stats.b2b} · B2C : {stats.b2c}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span className="text-sm font-medium">Ce mois</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.thisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-5 w-5" />
              <span className="text-sm font-medium">Aujourd&apos;hui</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.today}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">Bilan global</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col justify-end h-[68px] pb-1">
              <Link href="/admin/leads">
                <Button className="w-full gap-2" variant="outline">
                  <FileText className="h-4 w-4" />
                  Accéder au registre
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Business KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-5 w-5" />
              <span className="text-sm font-medium">Marketplace</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.activePartners}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.totalPurchases} leads achetés</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Megaphone className="h-5 w-5" />
              <span className="text-sm font-medium">Marketeurs</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.mediaPartners}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stats.attributedLeads} leads attribués</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Euro className="h-5 w-5" />
              <span className="text-sm font-medium">Commissions dues</span>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/admin/media-partners" className="group flex items-center justify-between">
              <p className="text-3xl font-bold text-amber-600 transition-colors group-hover:text-amber-700">
                {stats.commissionsDue.toLocaleString("fr-BE")} €
              </p>
              <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardCheck className="h-5 w-5" />
              <span className="text-sm font-medium">Candidatures</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{stats.pendingApps}</p>
              {stats.pendingApps > 0 && (
                <Badge variant="destructive" className="text-xs">À traiter</Badge>
              )}
            </div>
            <Link href="/admin/applications" className="mt-1 text-xs text-primary hover:underline">
              Voir les candidatures →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Recent Leads */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border">
            <h2 className="font-semibold text-foreground">Derniers leads</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Nom</th>
                  <th className="px-4 py-3 text-left font-medium">Segment</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(stats.recent) && stats.recent.length > 0 ? (
                  stats.recent.map((lead: { id: string; first_name: string; last_name: string; email: string; status: string; segment: string | null; media_partner_code: string | null; created_at: string }) => (
                    <tr key={lead.id} className="border-b border-border transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        <Link href={`/admin/leads?leadId=${lead.id}`} className="block">
                          {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/admin/leads?leadId=${lead.id}`} className="hover:underline">
                          {lead.first_name} {lead.last_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={lead.segment === "B2C" ? "secondary" : "default"} className="text-xs">
                          {lead.segment ?? "B2B"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {lead.media_partner_code ? (
                          <Badge variant="outline" className="text-[10px]">ref:{lead.media_partner_code}</Badge>
                        ) : "Direct"}
                      </td>
                      <td className="px-4 py-3">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      Aucun lead pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <CardContent className="border-t border-border py-3">
            <Link href="/admin/leads">
              <Button variant="ghost" size="sm">Voir toute la liste</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Audit Log / Activity Feed */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <h2 className="font-semibold text-foreground">Fil d'activité</h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col divide-y divide-border">
              {stats.auditLogs.map((log: any) => {
                const isInstall = log.entity_type === 'application' || log.entity_type === 'installateur'
                const isPartner = log.entity_type === 'partner' || log.entity_type === 'media_partner'
                
                let Icon = FileText
                let color = "text-blue-500 bg-blue-50"
                let actionText = log.action

                if (log.action === "lead_updated") {
                  Icon = Zap
                  color = "text-amber-500 bg-amber-50"
                  actionText = "Mise à jour d'un lead"
                } else if (log.action === "lead_purchased") {
                  Icon = ShoppingCart
                  color = "text-indigo-500 bg-indigo-50"
                  actionText = "Achat d'un lead"
                } else if (isInstall) {
                  Icon = Users
                  color = "text-emerald-500 bg-emerald-50"
                  actionText = log.action === "installer_approved" ? "Installateur approuvé" : "Nouvel installateur"
                } else if (isPartner) {
                  Icon = Building2
                  color = "text-purple-500 bg-purple-50"
                  actionText = "Action partenaire"
                } else if (log.action.includes('clean') || log.action.includes('delete')) {
                  Icon = AlertTriangle
                  color = "text-red-500 bg-red-50"
                  actionText = "Nettoyage de données"
                }

                return (
                  <div key={log.id} className="flex gap-3 px-4 py-3 text-sm">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{actionText}</p>
                      <p className="text-xs text-muted-foreground lowercase">
                        {log.admin_email.split('@')[0]} · {new Date(log.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {stats.auditLogs.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucune activité récente.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
