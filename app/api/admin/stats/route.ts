import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

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

  return NextResponse.json({
    total: total ?? 0,
    thisMonth: thisMonth ?? 0,
    today: today ?? 0,
    recent: recent ?? [],
  })
}
