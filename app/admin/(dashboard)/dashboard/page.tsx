import Link from "next/link"
import { FileText, TrendingUp, Calendar, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
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
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">Total leads</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-5 w-5" />
            <span className="text-sm font-medium">Ce mois</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.thisMonth}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-5 w-5" />
            <span className="text-sm font-medium">Aujourd'hui</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.today}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Link href="/admin/leads">
            <Button variant="outline" className="w-full gap-2">
              <TrendingUp className="h-4 w-4" />
              Voir tous les leads
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold text-foreground">Derniers leads</h2>
        </div>
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
                  <tr key={lead.id} className="border-b border-border">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-medium">{lead.first_name} {lead.last_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                    <td className="px-4 py-3">{lead.surface_area} m² ({lead.surface_type})</td>
                    <td className="px-4 py-3">{lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "–"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{lead.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Aucun lead pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2">
          <Link href="/admin/leads">
            <Button variant="ghost" size="sm">Voir toute la liste</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
