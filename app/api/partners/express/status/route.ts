import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyExpressBuyToken } from "@/lib/express-buy-token"
import { getMollieClient } from "@/lib/mollie"
import { fulfillPaidLeadDirectPurchase } from "@/lib/mollie-fulfillment"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const leadId = searchParams.get("leadId") || ""
  const token = searchParams.get("t") || ""
  const paymentId = searchParams.get("paymentId") || ""
  const partnerIdParam = searchParams.get("pid") || ""

  const tokenPayload = verifyExpressBuyToken(token, leadId)
  if (!tokenPayload) {
    return NextResponse.json({ error: "Jeton invalide" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  let resolvedPartnerId = partnerIdParam || tokenPayload.partnerId || null

  if (!resolvedPartnerId && tokenPayload.rescertEmail) {
    const { data } = await supabase
      .from("partners")
      .select("id")
      .eq("email", tokenPayload.rescertEmail.trim().toLowerCase())
      .maybeSingle()
    resolvedPartnerId = data?.id || null
  }

  let resolvedPaymentId = paymentId
  if (!resolvedPaymentId && resolvedPartnerId) {
    const { data: auditRows } = await supabase
      .from("audit_log")
      .select("details")
      .eq("action", "express_checkout_initiated")
      .eq("entity_id", leadId)
      .order("created_at", { ascending: false })
      .limit(5)

    const matching = (auditRows || []).find(
      (r: any) => r?.details?.partner_id === resolvedPartnerId && r?.details?.payment_id
    )
    if (matching?.details?.payment_id) {
      resolvedPaymentId = String(matching.details.payment_id)
    }
  }

  if (resolvedPaymentId && resolvedPartnerId) {
    try {
      const mollie = getMollieClient()
      const payment = await mollie.payments.get(resolvedPaymentId)
      if (payment.status === "paid") {
        await fulfillPaidLeadDirectPurchase(leadId, resolvedPartnerId, payment)
      }
    } catch {
      // Le webhook Mollie traitera le paiement si besoin
    }
  }

  if (!resolvedPartnerId) {
    return NextResponse.json({ unlocked: false })
  }

  const { data: purchase } = await supabase
    .from("lead_purchases")
    .select("id, credits_spent, purchased_at, notes")
    .eq("lead_id", leadId)
    .eq("partner_id", resolvedPartnerId)
    .maybeSingle()

  if (!purchase) {
    return NextResponse.json({ unlocked: false })
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, company, company_vat, city, postal_code, site_address, segment, estimated_power_kwc, annual_electricity_bill, contact_preference")
    .eq("id", leadId)
    .single()

  return NextResponse.json({
    unlocked: true,
    partnerId: resolvedPartnerId,
    purchase,
    lead,
  })
}
