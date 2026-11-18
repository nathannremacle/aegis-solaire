import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getAdminUser } from "@/lib/admin-auth"
import {
  computeLeadPurchaseFinancials,
  createEmptyPipelineCounts,
  normalizePipelineStatus,
  type PartnerPurchaseLeadItem,
  type PartnerPurchasesResponse,
  type PartnerPurchasesSummary,
} from "@/lib/admin/partner-purchases"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id: partnerId } = await context.params
  if (!partnerId || !UUID_REGEX.test(partnerId)) {
    return NextResponse.json({ error: "Identifiant installateur invalide" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const leadFields =
    "id, first_name, last_name, email, phone, company, company_vat, segment, province, city, postal_code, site_address, surface_type, surface_area, estimated_power_kwc, annual_electricity_bill, lead_score, pricing_version, created_at"

  const [partnerRes, purchasesRes, disputesRes, mollieAuditRes, ordersRes] = await Promise.all([
    supabase
      .from("partners")
      .select("id, company_name, email, phone, credits, segment, target_provinces, created_at, is_test")
      .eq("id", partnerId)
      .maybeSingle(),

    (async () => {
      const fullRes = await supabase
        .from("lead_purchases")
        .select(
          `id, lead_id, partner_id, purchased_at, updated_at, credits_spent, pipeline_status, notes, lead:leads(${leadFields})`
        )
        .eq("partner_id", partnerId)
        .order("purchased_at", { ascending: false })
        .limit(5000)

      if (!fullRes.error) return fullRes

      // Fallback si la colonne pricing_version ou pipeline_status diffère sur l'instance
      return supabase
        .from("lead_purchases")
        .select(
          "id, lead_id, partner_id, purchased_at, credits_spent, notes, lead:leads(id, first_name, last_name, email, phone, company, segment, province, city, postal_code, surface_type, surface_area, estimated_power_kwc, annual_electricity_bill, lead_score, created_at)"
        )
        .eq("partner_id", partnerId)
        .order("purchased_at", { ascending: false })
        .limit(5000)
    })(),

    supabase
      .from("lead_disputes")
      .select("id, purchase_id, lead_id, reason, status, credits_refunded, created_at, resolved_at")
      .eq("partner_id", partnerId),

    supabase
      .from("audit_log")
      .select("entity_id, details, created_at")
      .eq("entity_type", "lead_purchase")
      .eq("action", "lead_direct_paid_mollie")
      .filter("details->>partner_id", "eq", partnerId)
      .limit(1000),

    supabase
      .from("credit_orders")
      .select("id, credits, price_htva, price_ttc, status")
      .eq("partner_id", partnerId)
      .eq("status", "paid"),
  ])

  if (partnerRes.error || !partnerRes.data) {
    return NextResponse.json({ error: "Installateur introuvable" }, { status: 404 })
  }

  if (purchasesRes.error) {
    return NextResponse.json({ error: purchasesRes.error.message }, { status: 500 })
  }

  const disputeByPurchaseId = new Map<string, any>()
  for (const d of disputesRes.data ?? []) {
    if (d.purchase_id) disputeByPurchaseId.set(d.purchase_id, d)
  }

  const mollieByPurchaseId = new Map<string, Record<string, unknown>>()
  for (const a of mollieAuditRes.data ?? []) {
    if (a.entity_id && a.details && typeof a.details === "object") {
      mollieByPurchaseId.set(a.entity_id, a.details as Record<string, unknown>)
    }
  }

  const rawPurchases = (purchasesRes.data ?? []) as any[]

  const items: PartnerPurchaseLeadItem[] = rawPurchases.map((row) => {
    const rawLead = Array.isArray(row.lead) ? row.lead[0] : row.lead
    const mollieDetails = mollieByPurchaseId.get(row.id) ?? null
    const financials = computeLeadPurchaseFinancials({
      creditsSpent: row.credits_spent,
      notes: row.notes,
      purchasedAt: row.purchased_at,
      leadPricingVersion: rawLead?.pricing_version ?? null,
      mollieAuditDetails: mollieDetails,
    })

    const disputeRow = disputeByPurchaseId.get(row.id) ?? null

    return {
      purchaseId: row.id,
      leadId: row.lead_id,
      purchasedAt: row.purchased_at,
      crmUpdatedAt: row.updated_at ?? null,
      creditsSpent: Number(row.credits_spent ?? 0),
      amountHtva: financials.amountHtva,
      amountTtc: financials.amountTtc,
      paymentMode: financials.paymentMode,
      paymentMethod: financials.paymentMethod,
      molliePaymentId: financials.molliePaymentId,
      pipelineStatus: normalizePipelineStatus(row.pipeline_status),
      notes: row.notes ?? null,
      dispute: disputeRow
        ? {
            id: disputeRow.id,
            status: disputeRow.status,
            reason: disputeRow.reason,
            creditsRefunded: disputeRow.credits_refunded ?? null,
            createdAt: disputeRow.created_at,
            resolvedAt: disputeRow.resolved_at ?? null,
          }
        : null,
      lead: rawLead
        ? {
            id: rawLead.id,
            firstName: rawLead.first_name ?? null,
            lastName: rawLead.last_name ?? null,
            company: rawLead.company ?? null,
            email: rawLead.email ?? null,
            phone: rawLead.phone ?? null,
            segment: rawLead.segment ?? null,
            province: rawLead.province ?? null,
            city: rawLead.city ?? null,
            postalCode: rawLead.postal_code ?? null,
            surfaceType: rawLead.surface_type ?? null,
            surfaceArea: rawLead.surface_area ?? null,
            estimatedPowerKwc: rawLead.estimated_power_kwc ?? null,
            annualElectricityBill: rawLead.annual_electricity_bill ?? null,
            leadScore: rawLead.lead_score ?? null,
            pricingVersion: rawLead.pricing_version ?? null,
            createdAt: rawLead.created_at ?? null,
          }
        : null,
    }
  })

  let refundedCount = 0
  let totalCreditsSpent = 0
  let creditsDebitedCount = 0
  let totalAmountHtva = 0
  let totalAmountTtc = 0
  let directMollieCount = 0
  let directMollieHtva = 0
  let creditPurchasesCount = 0
  let freeAssignedCount = 0
  let b2bCount = 0
  let b2cCount = 0
  const pipelineCounts = createEmptyPipelineCounts()

  for (const item of items) {
    pipelineCounts[item.pipelineStatus] += 1
    const isRefunded = item.dispute?.status === "approved"
    if (isRefunded) refundedCount += 1

    if (item.lead?.segment === "B2B") b2bCount += 1
    else if (item.lead?.segment === "B2C") b2cCount += 1

    if (item.paymentMode === "direct_mollie") {
      directMollieCount += 1
      directMollieHtva += item.amountHtva
    } else if (item.paymentMode === "credits") {
      creditPurchasesCount += 1
      creditsDebitedCount += item.creditsSpent
    } else {
      freeAssignedCount += 1
    }

    totalCreditsSpent += item.creditsSpent
    totalAmountHtva += item.amountHtva
    totalAmountTtc += item.amountTtc
  }

  const paidOrders = ordersRes.data ?? []
  const totalOrdersPaidHtva = paidOrders.reduce(
    (sum, o) => sum + (Number(o.price_htva) || 0),
    0
  )
  const totalOrdersPaidTtc = paidOrders.reduce(
    (sum, o) => sum + (Number(o.price_ttc) || 0),
    0
  )
  const totalCreditsOrdered = paidOrders.reduce(
    (sum, o) => sum + (Number(o.credits) || 0),
    0
  )

  const summary: PartnerPurchasesSummary = {
    totalLeadsPurchased: items.length,
    activeLeadsCount: items.length - refundedCount,
    refundedCount,
    totalCreditsSpent,
    creditsDebitedCount,
    totalAmountHtva: Number(totalAmountHtva.toFixed(2)),
    totalAmountTtc: Number(totalAmountTtc.toFixed(2)),
    directMollieCount,
    directMollieHtva: Number(directMollieHtva.toFixed(2)),
    creditPurchasesCount,
    freeAssignedCount,
    b2bCount,
    b2cCount,
    totalOrdersPaidHtva: Number(totalOrdersPaidHtva.toFixed(2)),
    totalOrdersPaidTtc: Number(totalOrdersPaidTtc.toFixed(2)),
    totalCreditsOrdered,
    firstPurchaseAt: items.length > 0 ? items[items.length - 1].purchasedAt : null,
    lastPurchaseAt: items.length > 0 ? items[0].purchasedAt : null,
    pipelineCounts,
  }

  const response: PartnerPurchasesResponse = {
    partner: {
      id: partnerRes.data.id,
      company_name: partnerRes.data.company_name,
      email: partnerRes.data.email,
      phone: partnerRes.data.phone ?? null,
      credits: Number(partnerRes.data.credits ?? 0),
      segment: partnerRes.data.segment ?? null,
      target_provinces: partnerRes.data.target_provinces ?? null,
      created_at: partnerRes.data.created_at,
      is_test: Boolean(partnerRes.data.is_test),
    },
    summary,
    purchases: items,
  }

  return NextResponse.json(response)
}
