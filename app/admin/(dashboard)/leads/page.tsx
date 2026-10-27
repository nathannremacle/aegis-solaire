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
    segment: string
    view?: string
  }
) {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const from = (page - 1) * limit
  const isTriage = filters.view === "triage"

  const hasActiveFilters = Boolean(
    filters.search.trim() ||
      filters.status ||
      filters.segment ||
      filters.region ||
      filters.installateurId ||
      filters.surfaceMin ||
      filters.surfaceType ||
      isTriage
  )

  const buildQuery = (useSearchText: boolean) => {
    let q = supabase
      .from("leads")
      .select(
        "id, first_name, last_name, email, phone, job_title, company, company_vat, message, surface_type, surface_area, roof_material, ownership_status, project_timeline, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, lead_score, installateur_id, wants_irve, segment, province, postal_code, city, site_address, grd, media_partner_code, marketplace_status, credit_cost, admin_notes, created_at, lead_purchases(id, partner_id, purchased_at, partners(id, company_name, email, is_test))",
        { count: hasActiveFilters ? "exact" : "planned" }
      )

    // En mode Triage, ordonnancement FIFO (du plus ancien au plus récent)
    if (isTriage) {
      q = q.or("status.eq.NEEDS_HUMAN_REVIEW,marketplace_status.eq.pending_review,status.eq.new")
      q = q.order("created_at", { ascending: true })
    } else {
      q = q.order("created_at", { ascending: false })
    }

    q = q.range(from, from + limit - 1)

    if (filters.status && filters.status !== "all") {
      q = q.eq("status", filters.status)
    }
    if (filters.segment && filters.segment !== "all") {
      q = q.eq("segment", filters.segment)
    }
    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase()
      if (useSearchText) {
        q = q.ilike("search_text", `%${term}%`)
      } else {
        const pattern = `%${filters.search.trim()}%`
        q = q.or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},company.ilike.${pattern},company_vat.ilike.${pattern}`)
      }
    }
    if (filters.installateurId && filters.installateurId !== "all") {
      q = q.eq("installateur_id", filters.installateurId)
    }
    if (filters.dateFrom) {
      q = q.gte("created_at", filters.dateFrom)
    }
    if (filters.dateTo) {
      q = q.lte("created_at", filters.dateTo + "T23:59:59.999Z")
    }
    const surfaceMinNum = parseInt(filters.surfaceMin, 10)
    if (!Number.isNaN(surfaceMinNum) && surfaceMinNum > 0) {
      q = q.gte("surface_area", surfaceMinNum)
    }
    if (filters.surfaceType && ["toiture", "parking", "friche"].includes(filters.surfaceType)) {
      q = q.eq("surface_type", filters.surfaceType)
    }
    if (filters.region) {
      q = q.or(`province.eq.${filters.region},province.ilike.%${filters.region}%`)
    }

    return q
  }

  let { data, error, count } = await buildQuery(true)

  if (error && (error.code === "42703" || error.message?.includes("search_text"))) {
    const fallbackRes = await buildQuery(false)
    data = fallbackRes.data
    error = fallbackRes.error
    count = fallbackRes.count
  }

  if (error) {
    console.error("Admin leads error:", error)
    return { leads: [], total: 0, page, limit }
  }

  return { leads: data ?? [], total: count ?? 0, page, limit }
}

async function getPartners() {
  const user = await getAdminUser()
  if (!user) return []
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from("partners")
    .select("id, company_name, email, credits, segment, target_provinces")
    .order("company_name")
  return data ?? []
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
    segment?: string
    view?: string
  }>
}) {
  const params = await searchParams
  const {
    page: pageParam,
    status,
    search: searchParam,
    installateur: installateurParam,
    leadId,
    date_from: dateFromParam,
    date_to: dateToParam,
    surface_min: surfaceMinParam,
    surface_type: surfaceTypeParam,
    region: regionParam,
    view: viewParam,
  } = params

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
    segment: params.segment ?? "",
    view: viewParam ?? "",
  }

  const [leadsResult, partners] = await Promise.all([
    getLeads(page, limit, filters),
    getPartners(),
  ])

  const { leads, total, page: currentPage } = leadsResult
  const currentLeadFromList = leadId ? leads.find((l) => l.id === leadId) ?? null : null

  return (
    <div className="flex flex-col gap-6">
      <LeadsTable
        leads={leads as any}
        total={total}
        page={currentPage}
        limit={limit}
        partners={partners}
        filters={filters}
        leadId={leadId ?? null}
        currentLeadFromList={currentLeadFromList as any}
      />
    </div>
  )
}
