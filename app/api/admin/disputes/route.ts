import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  try {
    const { data: disputes, error } = await supabase
      .from("lead_disputes")
      .select("*, partners(id, company_name, email), leads(id, first_name, last_name, segment, province, surface_type, surface_area), lead_purchases(credits_spent, purchased_at)")
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      // Table might not exist yet if migration 023 hasn't been executed
      return NextResponse.json({ disputes: [] })
    }

    return NextResponse.json({ disputes: disputes ?? [] })
  } catch {
    return NextResponse.json({ disputes: [] })
  }
}
