import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LeadsTable } from "./leads-table"

async function getLeads(
  page: number,
  limit: number,
  status: string,
  search: string,
  installateurId: string
) {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const from = (page - 1) * limit

  let query = supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, job_title, company, message, surface_type, surface_area, project_timeline, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, lead_score, installateur_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1)

  if (status && status !== "all") {
    query = query.eq("status", status)
  }
  if (search.trim()) {
    query = query.ilike("email", `%${search.trim()}%`)
  }
  if (installateurId && installateurId !== "all") {
    query = query.eq("installateur_id", installateurId)
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
  const { data } = await supabase.from("installateurs").select("id, name, actif").order("name")
  return data ?? []
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string; installateur?: string; leadId?: string }>
}) {
  const { page: pageParam, status, search: searchParam, installateur: installateurParam, leadId } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const limit = 20

  const [leadsResult, installateurs] = await Promise.all([
    getLeads(page, limit, status ?? "", searchParam ?? "", installateurParam ?? ""),
    getInstallateurs(),
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
        statusFilter={status ?? ""}
        searchDefault={searchParam ?? ""}
        installateurFilter={installateurParam ?? ""}
        leadId={leadId ?? null}
        currentLeadFromList={currentLeadFromList}
      />
    </div>
  )
}
