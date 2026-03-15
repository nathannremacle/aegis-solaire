import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "20", 10)))
  const status = searchParams.get("status") ?? ""
  const search = searchParams.get("search") ?? ""
  const from = (page - 1) * limit

  const supabase = createServiceRoleClient()
  let query = supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, job_title, company, message, surface_type, surface_area, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, lead_score, created_at", { count: "exact" })
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
    return NextResponse.json({ error: "Erreur lors de la récupération des leads" }, { status: 500 })
  }

  return NextResponse.json({
    leads: data ?? [],
    total: count ?? 0,
    page,
    limit,
  })
}
