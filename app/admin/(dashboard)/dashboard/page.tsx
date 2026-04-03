import Link from "next/link"
import { FileText, TrendingUp, Calendar, Zap, Users, Euro, Building2, Megaphone, ClipboardCheck, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LeadStatusBadge } from "@/components/admin-lead-status-badge"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

async function getStats() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

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
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>

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
        <Card className="flex flex-col justify-center">
          <CardContent className="pt-6">
            <Link href="/admin/leads">
              <Button className="w-full gap-2" size="lg">
                <TrendingUp className="h-4 w-4" />
                Voir tous les leads
              </Button>
            </Link>
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
            <p className="text-3xl font-bold text-amber-600">{stats.commissionsDue.toLocaleString("fr-BE")} €</p>
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

      {/* Recent Leads */}
      <Card>
        <CardHeader className="border-b border-border">
          <h2 className="font-semibold text-foreground">Derniers leads</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Nom</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Segment</th>
                <th className="px-4 py-3 text-left font-medium">Province</th>
                <th className="px-4 py-3 text-left font-medium">Surface</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(stats.recent) && stats.recent.length > 0 ? (
                stats.recent.map((lead: { id: string; first_name: string; last_name: string; email: string; surface_type: string; surface_area: number; estimated_roi_years: number | null; status: string; segment: string | null; province: string | null; media_partner_code: string | null; created_at: string }) => (
                  <tr key={lead.id} className="border-b border-border transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="block">
                        {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="hover:underline">
                        {lead.first_name} {lead.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={lead.segment === "B2C" ? "secondary" : "default"} className="text-xs">
                        {lead.segment ?? "B2B"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{lead.province?.replace("_", " ") ?? "—"}</td>
                    <td className="px-4 py-3">{lead.surface_area} m²</td>
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
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
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
    </div>
  )
}
