import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getAdminUser } from "@/lib/admin-auth"

export async function GET(request: Request, context: any) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const params = await context.params
  const partnerId = params.id

  const supabase = createServiceRoleClient()

  // On récupère les leads achetés par le partenaire
  const { data, error } = await supabase
    .from("lead_purchases")
    .select(`
      purchased_at,
      credits_spent,
      lead: leads(id, first_name, last_name, email, phone, surface_type, surface_area, segment, province)
    `)
    .eq("partner_id", partnerId)
    .order("purchased_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
