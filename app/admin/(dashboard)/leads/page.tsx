import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { LeadsTable } from "./leads-table"

async function getLeads(page: number, limit: number, status: string, search: string) {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const from = (page - 1) * limit

  let query = supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, job_title, company, surface_type, surface_area, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1)

  if (status) {
    query = query.eq("status", status)
  }
  if (search.trim()) {
    query = query.ilike("email", `%${search.trim()}%`)
  }

  const { data, error, count } = await query

  if (error) {
    console.error("Admin leads error:", error)
    return { leads: [], total: 0, page, limit }
  }

  return { leads: data ?? [], total: count ?? 0, page, limit }
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>
}) {
  const { page: pageParam, status, search: searchParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const limit = 20

  const { leads, total, page: currentPage } = await getLeads(page, limit, status ?? "", searchParam ?? "")

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Leads</h1>
      <LeadsTable
        leads={leads}
        total={total}
        page={currentPage}
        limit={limit}
        statusFilter={status ?? ""}
        searchDefault={searchParam ?? ""}
      />
    </div>
  )
}
