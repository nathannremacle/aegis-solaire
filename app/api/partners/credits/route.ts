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

  // 1. Transactions
  const txPromise = admin
    .from("credit_transactions")
    .select("id, amount, type, reference, created_at")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false })
    .limit(50)

  // 2. Achats avec pipeline CRM (avec fallback résilient si colonnes en cours de migration)
  const purchasePromise = (async () => {
    const withPipeline = await admin
      .from("lead_purchases")
      .select(
        "id, credits_spent, purchased_at, pipeline_status, notes, next_action_at, leads(id, first_name, last_name, email, phone, company, company_vat, province, segment, surface_type, surface_area, annual_electricity_bill, grd, project_details, message)"
      )
      .eq("partner_id", partner.id)
      .order("purchased_at", { ascending: false })
      .limit(60)

    if (!withPipeline.error && withPipeline.data) {
      return withPipeline.data
    }

    // Fallback sans colonnes pipeline
    const fallback = await admin
      .from("lead_purchases")
      .select(
        "id, credits_spent, purchased_at, leads(id, first_name, last_name, email, phone, company, company_vat, province, segment, surface_type, surface_area, annual_electricity_bill, grd, project_details, message)"
      )
      .eq("partner_id", partner.id)
      .order("purchased_at", { ascending: false })
      .limit(60)

    return fallback.data ?? []
  })()

  // 3. Réclamations pour ce partenaire
  const disputesPromise = (async () => {
    try {
      const { data } = await admin
        .from("lead_disputes")
        .select("id, purchase_id, lead_id, reason, details, status, admin_notes, credits_refunded, created_at, resolved_at")
        .eq("partner_id", partner.id)
      return data ?? []
    } catch {
      return []
    }
  })()

  const [txRes, purchases, disputes] = await Promise.all([
    txPromise,
    purchasePromise,
    disputesPromise,
  ])

  // Associer les réclamations aux achats correspondants
  const disputeMap = new Map((disputes as any[]).map((d) => [d.purchase_id, d]))
  const enrichedPurchases = (purchases as any[]).map((p) => ({
    ...p,
    dispute: disputeMap.get(p.id) || null,
  }))

  return NextResponse.json({
    partner: {
      id: partner.id,
      companyName: partner.company_name,
      credits: partner.credits,
    },
    transactions: txRes.data ?? [],
    purchases: enrichedPurchases,
    disputes: disputes ?? [],
  })
}
