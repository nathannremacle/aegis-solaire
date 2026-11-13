import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { LeadsTable } from "./leads-table"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata = {
  title: "Gestion des Leads",
}

async function getPartialPurchasedLeadIds(supabase: ReturnType<typeof createServiceRoleClient>): Promise<string[]> {
  const { data } = await supabase
    .from("lead_purchases")
    .select("lead_id, leads(marketplace_status, status)")

  const ids = new Set<string>()
  for (const row of (data as any[]) || []) {
    const leadObj = Array.isArray(row.leads) ? row.leads[0] : row.leads
    if (
      row.lead_id &&
      leadObj?.marketplace_status !== "sold_out" &&
      leadObj?.status !== "converted"
    ) {
      ids.add(row.lead_id)
    }
  }
  return Array.from(ids)
}

async function getLeadCounts() {
  const supabase = createServiceRoleClient()
  const partialPurchasedIds = await getPartialPurchasedLeadIds(supabase)
  const assignedOrFilter =
    partialPurchasedIds.length > 0
      ? `marketplace_status.eq.sold_out,status.eq.converted,id.in.(${partialPurchasedIds.join(",")})`
      : "marketplace_status.eq.sold_out,status.eq.converted"

  const [triageRes, marketplaceRes, soldOutRes, totalRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .or("status.eq.NEEDS_HUMAN_REVIEW,marketplace_status.eq.pending_review,status.eq.new"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("marketplace_status", "available"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .or(assignedOrFilter),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true }),
  ])

  return {
    triage: triageRes.count ?? 0,
    marketplace: marketplaceRes.count ?? 0,
    assigned: soldOutRes.count ?? 0,
    total: totalRes.count ?? 0,
  }
}

async function getLeads(
  page: number,
  limit: number,
  filters: {
    status: string
    marketplaceStatus?: string
    search: string
    installateurId: string
    dateFrom: string
    dateTo: string
    surfaceMin: string
    surfaceType: string
    region: string
    segment: string
    view?: string
    leadId?: string
  }
) {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const from = (page - 1) * limit
  const view = filters.view || "all"

  const partialPurchasedIds = view === "assigned" ? await getPartialPurchasedLeadIds(supabase) : []

  let purchasedLeadIdsForPartner: string[] | null = null
  if (filters.installateurId && filters.installateurId !== "all") {
    const { data: lp } = await supabase
      .from("lead_purchases")
      .select("lead_id")
      .eq("partner_id", filters.installateurId)
    purchasedLeadIdsForPartner = (lp || []).map((p) => p.lead_id)
  }

  const buildQuery = (useSearchText: boolean) => {
    let q = supabase
      .from("leads")
      .select(
        "id, first_name, last_name, email, phone, job_title, company, company_vat, message, surface_type, surface_area, roof_material, ownership_status, project_timeline, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, lead_score, installateur_id, wants_irve, segment, province, postal_code, city, site_address, grd, media_partner_code, marketplace_status, credit_cost, admin_notes, qualification_metadata, created_at, lead_purchases(id, partner_id, credits_spent, purchased_at, partners(id, company_name, email, is_test))",
        { count: "exact" }
      )

    // Vues principales : Triage, Marketplace live, Attribués / Vendus, ou Tous
    if (view === "triage") {
      q = q.or("status.eq.NEEDS_HUMAN_REVIEW,marketplace_status.eq.pending_review,status.eq.new")
      q = q.order("created_at", { ascending: true })
    } else if (view === "marketplace") {
      q = q.eq("marketplace_status", "available")
      q = q.order("created_at", { ascending: false })
    } else if (view === "assigned") {
      const assignedOrFilter =
        partialPurchasedIds.length > 0
          ? `marketplace_status.eq.sold_out,status.eq.converted,id.in.(${partialPurchasedIds.join(",")})`
          : "marketplace_status.eq.sold_out,status.eq.converted"
      q = q.or(assignedOrFilter)
      q = q.order("created_at", { ascending: false })
    } else {
      q = q.order("created_at", { ascending: false })
    }

    q = q.range(from, from + limit - 1)

    if (filters.leadId) {
      q = q.eq("id", filters.leadId)
    }

    if (filters.status && filters.status !== "all") {
      q = q.eq("status", filters.status)
    }

    if (filters.marketplaceStatus && filters.marketplaceStatus !== "all") {
      q = q.eq("marketplace_status", filters.marketplaceStatus)
    }

    if (filters.segment && filters.segment !== "all") {
      q = q.eq("segment", filters.segment)
    }

    if (filters.search.trim()) {
      const term = filters.search.trim().toLowerCase()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)
      if (isUuid) {
        q = q.eq("id", term)
      } else if (useSearchText) {
        q = q.ilike("search_text", `%${term}%`)
      } else {
        const pattern = `%${filters.search.trim()}%`
        q = q.or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern},company.ilike.${pattern},company_vat.ilike.${pattern}`)
      }
    }

    if (purchasedLeadIdsForPartner !== null) {
      if (purchasedLeadIdsForPartner.length > 0) {
        q = q.in("id", purchasedLeadIdsForPartner)
      } else {
        q = q.eq("id", "00000000-0000-0000-0000-000000000000")
      }
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
    marketplace_status?: string
    marketplaceStatus?: string
    search?: string
    installateur?: string
    installateurId?: string
    leadId?: string
    focus?: string
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
    marketplace_status: mStatus1,
    marketplaceStatus: mStatus2,
    search: searchParam,
    installateur: installateurParam1,
    installateurId: installateurParam2,
    leadId: leadIdParam,
    focus: focusParam,
    date_from: dateFromParam,
    date_to: dateToParam,
    surface_min: surfaceMinParam,
    surface_type: surfaceTypeParam,
    region: regionParam,
    view: viewParam,
  } = params

  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const limit = 20

  const resolvedLeadId = leadIdParam || focusParam || ""
  const resolvedInstallateur = installateurParam1 || installateurParam2 || ""
  const resolvedMarketplaceStatus = mStatus1 || mStatus2 || ""

  const filters = {
    status: status ?? "",
    marketplaceStatus: resolvedMarketplaceStatus,
    search: searchParam ?? "",
    installateurId: resolvedInstallateur,
    dateFrom: dateFromParam ?? "",
    dateTo: dateToParam ?? "",
    surfaceMin: surfaceMinParam ?? "",
    surfaceType: surfaceTypeParam ?? "",
    region: regionParam ?? "",
    segment: params.segment ?? "",
    view: viewParam ?? "",
    leadId: resolvedLeadId,
  }

  const [leadsResult, partners, tabCounts] = await Promise.all([
    getLeads(page, limit, filters),
    getPartners(),
    getLeadCounts(),
  ])

  const { leads, total, page: currentPage } = leadsResult
  const currentLeadFromList = resolvedLeadId ? leads.find((l) => l.id === resolvedLeadId) ?? null : null

  return (
    <div className="flex flex-col gap-6">
      <LeadsTable
        leads={leads as any}
        total={total}
        page={currentPage}
        limit={limit}
        partners={partners}
        filters={filters}
        leadId={resolvedLeadId || null}
        currentLeadFromList={currentLeadFromList as any}
        tabCounts={tabCounts}
      />
    </div>
  )
}
