import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: { leadId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 })
  }

  if (!body.leadId) {
    return NextResponse.json({ error: "leadId requis" }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  const { data, error } = await admin.rpc("purchase_lead", {
    p_lead_id: body.leadId,
    p_partner_id: partner.id,
  })

  if (error) {
    console.error("[purchase] rpc error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = data as Record<string, unknown> | null
  if (result?.error) {
    return NextResponse.json(result, { status: 400 })
  }

  const { data: lead } = await admin
    .from("leads")
    .select(
      "id, first_name, last_name, email, phone, company, company_vat, province, segment, surface_type, surface_area, annual_electricity_bill, grd"
    )
    .eq("id", body.leadId)
    .single()

  return NextResponse.json({
    success: true,
    creditsSpent: result?.credits_spent,
    creditsRemaining: result?.credits_remaining,
    lead,
  })
}
