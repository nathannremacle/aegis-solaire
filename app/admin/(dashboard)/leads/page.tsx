import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { LeadsTable } from "./leads-table"

async function getLeads(
  page: number,
  limit: number,
  filters: {
    status: string
    search: string
    installateurId: string
    dateFrom: string
    dateTo: string
    surfaceMin: string
    surfaceType: string
    region: string
  }
) {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const from = (page - 1) * limit

  let query = supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, job_title, company, message, surface_type, surface_area, project_timeline, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, lead_score, installateur_id, wants_irve, segment, province, media_partner_code, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1)

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }
  if (filters.search.trim()) {
    query = query.ilike("email", `%${filters.search.trim()}%`)
  }
  if (filters.installateurId && filters.installateurId !== "all") {
    query = query.eq("installateur_id", filters.installateurId)
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59.999Z")
  }
  const surfaceMinNum = parseInt(filters.surfaceMin, 10)
  if (!Number.isNaN(surfaceMinNum) && surfaceMinNum > 0) {
    query = query.gte("surface_area", surfaceMinNum)
  }
  if (filters.surfaceType && ["toiture", "parking", "friche"].includes(filters.surfaceType)) {
    query = query.eq("surface_type", filters.surfaceType)
  }
  if (filters.region) {
    const { data: instIds } = await supabase.from("installateurs").select("id").eq("region", filters.region)
    const ids = (instIds ?? []).map((i) => i.id)
    if (ids.length > 0) {
      query = query.in("installateur_id", ids)
    } else {
      query = query.eq("installateur_id", "never-match")
    }
  }

  const { data, error, count } = await query

  if (error) {
    console.error("Admin leads error:", error)
    return { leads: [], total: 0, page, limit }
  }

  return { leads: data ?? [], total: count ?? 0, page, limit }
}

async function getInstallateurs() {
  const user = await getAdminUser()
  if (!user) return []
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from("installateurs").select("id, name, actif, region").order("name")
  return data ?? []
}

async function getRegions() {
  const user = await getAdminUser()
  if (!user) return []
  const supabase = createServiceRoleClient()
  const { data } = await supabase.from("installateurs").select("region").not("region", "is", null)
  const regions = [...new Set((data ?? []).map((r) => r.region).filter(Boolean))] as string[]
  return regions.sort()
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    status?: string
    search?: string
    installateur?: string
    leadId?: string
    date_from?: string
    date_to?: string
    surface_min?: string
    surface_type?: string
    region?: string
  }>
}) {
  const params = await searchParams
  const { page: pageParam, status, search: searchParam, installateur: installateurParam, leadId, date_from: dateFromParam, date_to: dateToParam, surface_min: surfaceMinParam, surface_type: surfaceTypeParam, region: regionParam } = params
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const limit = 20

  const filters = {
    status: status ?? "",
    search: searchParam ?? "",
    installateurId: installateurParam ?? "",
    dateFrom: dateFromParam ?? "",
    dateTo: dateToParam ?? "",
    surfaceMin: surfaceMinParam ?? "",
    surfaceType: surfaceTypeParam ?? "",
    region: regionParam ?? "",
  }

  const [leadsResult, installateurs, regions] = await Promise.all([
    getLeads(page, limit, filters),
    getInstallateurs(),
    getRegions(),
  ])
  const { leads, total, page: currentPage } = leadsResult
  const currentLeadFromList = leadId ? leads.find((l) => l.id === leadId) ?? null : null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Leads</h1>
      <LeadsTable
        leads={leads}
        total={total}
        page={currentPage}
        limit={limit}
        installateurs={installateurs}
        regions={regions}
        filters={filters}
        leadId={leadId ?? null}
        currentLeadFromList={currentLeadFromList}
      />
    </div>
  )
}
