import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  const [txRes, purchaseRes] = await Promise.all([
    admin
      .from("credit_transactions")
      .select("id, amount, type, reference, created_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("lead_purchases")
      .select(
        "id, credits_spent, purchased_at, leads(id, first_name, last_name, email, phone, company, company_vat, province, segment, surface_type, surface_area, annual_electricity_bill, grd)"
      )
      .eq("partner_id", partner.id)
      .order("purchased_at", { ascending: false })
      .limit(50),
  ])

  return NextResponse.json({
    partner: {
      id: partner.id,
      companyName: partner.company_name,
      credits: partner.credits,
    },
    transactions: txRes.data ?? [],
    purchases: purchaseRes.data ?? [],
  })
}
