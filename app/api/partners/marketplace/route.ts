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

  const { data: leads, error } = await admin
    .from("leads")
    .select(
      "id, province, segment, surface_type, surface_area, annual_electricity_bill, credit_cost, marketplace_status, created_at"
    )
    .eq("marketplace_status", "available")
    .order("created_at", { ascending: false })
    .limit(60)

  if (error) {
    console.error("[marketplace] leads query error:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }

  const leadIds = (leads ?? []).map((l) => l.id)

  let purchases: Array<{
    lead_id: string
    partner_id: string
    partners: { company_name: string } | null
  }> = []

  if (leadIds.length > 0) {
    const { data: purchaseData } = await admin
      .from("lead_purchases")
      .select("lead_id, partner_id, partners(company_name)")
      .in("lead_id", leadIds)
    purchases = (purchaseData as typeof purchases) ?? []
  }

  const { data: myPurchases } = await admin
    .from("lead_purchases")
    .select("lead_id")
    .eq("partner_id", partner.id)

  const myPurchasedIds = new Set((myPurchases ?? []).map((p) => p.lead_id))

  const enrichedLeads = (leads ?? []).map((lead) => {
    const lp = purchases.filter((p) => p.lead_id === lead.id)
    const isB2C = lead.segment === "B2C"
    const maxSlots = isB2C ? 3 : 1
    const cost = lead.credit_cost ?? (isB2C ? 2 : 5)
    const powerKwc = Math.round((lead.surface_area ?? 0) * 0.17)
    const revenueEstimate = Math.round((lead.annual_electricity_bill ?? 0) * 0.3)

    return {
      id: lead.id,
      province: lead.province,
      segment: lead.segment,
      surfaceType: lead.surface_type,
      surfaceArea: lead.surface_area,
      annualBill: lead.annual_electricity_bill,
      estimatedPowerKwc: powerKwc,
      estimatedRevenue: revenueEstimate,
      creditCost: cost,
      createdAt: lead.created_at,
      slots: {
        max: maxSlots,
        taken: lp.length,
        buyers: lp.map((p) => ({
          name: p.partners?.company_name ?? "Partenaire",
          isMe: p.partner_id === partner.id,
        })),
      },
      alreadyPurchased: myPurchasedIds.has(lead.id),
    }
  })

  return NextResponse.json({
    leads: enrichedLeads,
    partner: {
      id: partner.id,
      credits: partner.credits,
      companyName: partner.company_name,
    },
  })
}
