import Link from "next/link"
import { FileText, TrendingUp, Calendar, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
    { data: recent },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString()),
    supabase.from("leads").select("id, first_name, last_name, email, surface_type, surface_area, estimated_roi_years, status, created_at").order("created_at", { ascending: false }).limit(10),
  ])

  return {
    total: total ?? 0,
    thisMonth: thisMonth ?? 0,
    today: today ?? 0,
    recent: recent ?? [],
  }
}

export default async function AdminDashboardPage() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>

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
              <span className="text-sm font-medium">Aujourd'hui</span>
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

      <Card>
        <CardHeader className="border-b border-border">
          <h2 className="font-semibold text-foreground">Derniers leads</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Surface</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">ROI</th>
                <th className="px-4 py-3 text-left font-medium text-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(stats.recent) && stats.recent.length > 0 ? (
                stats.recent.map((lead: { id: string; first_name: string; last_name: string; email: string; surface_type: string; surface_area: number; estimated_roi_years: number | null; status: string; created_at: string }) => (
                  <tr key={lead.id} className="border-b border-border transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="block">
                        {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="hover:underline">
                        {lead.first_name} {lead.last_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="block hover:underline">
                        {lead.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="block">
                        {lead.surface_area} m² ({lead.surface_type})
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="block">
                        {lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads?leadId=${lead.id}`} className="inline-block">
                        <LeadStatusBadge status={lead.status} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun lead pour le moment. Les leads du simulateur apparaîtront ici.
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
