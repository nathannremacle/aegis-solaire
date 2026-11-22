import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  calculateLeadComplementFinancials,
  calculateLeadDirectFinancials,
} from "@/lib/credit-pricing"
import {
  createRecurringLeadPayment,
  getMollieClient,
  getValidMollieMandate,
} from "@/lib/mollie"
import { fulfillPaidLeadDirectPurchase } from "@/lib/mollie-fulfillment"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id: rawLeadId } = await params
  const leadId = typeof rawLeadId === "string" ? rawLeadId.trim() : ""
  if (!leadId || !UUID_REGEX.test(leadId) || isShowcaseOnlyLeadId(leadId)) {
    return NextResponse.json({ error: "Dossier non disponible à l'achat." }, { status: 400 })
  }

  let body: { exclusive?: boolean; usePartialCredits?: boolean } = {}
  try {
    const raw = await request.text()
    if (raw) body = JSON.parse(raw)
  } catch {
    body = {}
  }
  const exclusive = Boolean(body?.exclusive)
  const usePartialCredits = Boolean(body?.usePartialCredits)

  const supabase = createServiceRoleClient()

  const { data: partnerBilling, error: billingErr } = await supabase
    .from("partners")
    .select("credits, mollie_customer_id, mollie_mandate_id, mollie_mandate_status")
    .eq("id", partner.id)
    .single()

  if (
    billingErr ||
    !partnerBilling?.mollie_customer_id ||
    partnerBilling.mollie_mandate_status !== "valid"
  ) {
    return NextResponse.json(
      {
        error: "Aucun mandat 1-clic actif. Utilisez le paiement standard en cochant « Mémoriser mon moyen de paiement ».",
        code: "NO_MANDATE",
      },
      { status: 400 }
    )
  }

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select(
      "id, segment, marketplace_status, credit_cost, max_slots, province, city, postal_code, qualification_metadata"
    )
    .eq("id", leadId)
    .single()

  if (
    leadErr ||
    !lead ||
    lead.marketplace_status !== "available" ||
    Boolean((lead.qualification_metadata as Record<string, unknown> | null)?.is_showcase)
  ) {
    return NextResponse.json(
      { error: "Ce dossier n'est plus disponible sur la marketplace." },
      { status: 400 }
    )
  }

  const isB2B = lead.segment === "B2B"
  const maxSlots =
    typeof (lead as { max_slots?: number | null }).max_slots === "number"
      ? Number((lead as { max_slots?: number | null }).max_slots)
      : isB2B
        ? 1
        : 3

  const { data: purchases } = await supabase
    .from("lead_purchases")
    .select("partner_id, partners(is_test, company_name)")
    .eq("lead_id", leadId)

  const alreadyBought = (purchases || []).some((r: any) => r.partner_id === partner.id)
  if (alreadyBought) {
    return NextResponse.json({ error: "Vous avez déjà débloqué ce dossier." }, { status: 400 })
  }

  const realTaken = (purchases || []).filter((r: any) => {
    const pRel = Array.isArray(r.partners) ? r.partners[0] : r.partners
    const isTest =
      pRel?.is_test === true ||
      (typeof pRel?.company_name === "string" && pRel.company_name.toLowerCase().includes("test"))
    return !isTest
  }).length

  if (realTaken >= maxSlots || (exclusive && !isB2B && realTaken > 0)) {
    return NextResponse.json(
      { error: "Les créneaux ou l'exclusivité ne sont plus disponibles pour ce dossier." },
      { status: 400 }
    )
  }

  try {
    const mandateInfo = await getValidMollieMandate(
      partnerBilling.mollie_customer_id,
      partnerBilling.mollie_mandate_id
    )
    if (!mandateInfo.mandateId) {
      return NextResponse.json(
        { error: "Mandat bancaire expiré. Veuillez effectuer un paiement standard.", code: "NO_MANDATE" },
        { status: 400 }
      )
    }

    const livePartnerCredits = Math.max(0, Number((partnerBilling as any)?.credits ?? 0))
    const fullFinancials = calculateLeadDirectFinancials({
      segment: lead.segment,
      credit_cost: lead.credit_cost,
      exclusive,
    })
    const complementFinancials = usePartialCredits
      ? calculateLeadComplementFinancials({
          segment: lead.segment,
          credit_cost: lead.credit_cost,
          exclusive,
          availableCredits: livePartnerCredits,
        })
      : null
    const isHybrid = Boolean(complementFinancials?.isHybrid && complementFinancials.creditsToDebit > 0)
    const financials = isHybrid && complementFinancials
      ? {
          credits: complementFinancials.totalCredits,
          priceHtva: complementFinancials.priceHtva,
          vatAmount: complementFinancials.vatAmount,
          priceTtc: complementFinancials.priceTtc,
          creditsToDebit: complementFinancials.creditsToDebit,
          totalCredits: complementFinancials.totalCredits,
          isHybrid: true,
        }
      : {
          credits: fullFinancials.credits,
          priceHtva: fullFinancials.priceHtva,
          vatAmount: fullFinancials.vatAmount,
          priceTtc: fullFinancials.priceTtc,
          creditsToDebit: 0,
          totalCredits: fullFinancials.credits,
          isHybrid: false,
        }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      "https://www.aegissolaire.com"

    const locationDisplay = lead.city
      ? `${lead.city} (${lead.postal_code || ""})`
      : getProvinceDisplayLabel(lead.province || "")

    const recurring = await createRecurringLeadPayment({
      customerId: partnerBilling.mollie_customer_id,
      mandateId: mandateInfo.mandateId,
      leadId: lead.id,
      leadSegment: lead.segment || "B2C",
      leadLocation: locationDisplay,
      priceTtc: financials.priceTtc,
      priceHtva: financials.priceHtva,
      vatAmount: financials.vatAmount,
      credits: financials.credits,
      creditsToDebit: financials.creditsToDebit,
      totalCredits: financials.totalCredits,
      isHybrid: financials.isHybrid,
      exclusive: exclusive && !isB2B,
      partnerId: partner.id,
      partnerEmail: partner.email,
      partnerCompany: partner.company_name,
      siteUrl,
      channel: "mollie_mandate_one_click",
    })

    const mollie = getMollieClient()
    const fullPayment = await mollie.payments.get(recurring.paymentId)

    if (fullPayment.status === "paid") {
      const fulfilled = await fulfillPaidLeadDirectPurchase(
        lead.id,
        partner.id,
        fullPayment
      )
      if (!fulfilled.success) {
        return NextResponse.json(
          { error: fulfilled.error || "Erreur lors de l'attribution 1-clic." },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        status: "paid",
        purchaseId: fulfilled.purchaseId,
        lead: fulfilled.lead,
        exclusive: fulfilled.exclusive,
        newCredits: fulfilled.newCredits,
      })
    }

    // Cas SEPA Direct Debit : règlement bancaire asynchrone en cours -> fallback checkout classique ou attente webhook
    return NextResponse.json({
      success: true,
      status: fullPayment.status,
      paymentId: recurring.paymentId,
      message:
        "Prélèvement SEPA initié via votre mandat. Le dossier sera débloqué dès confirmation bancaire (ou utilisez vos crédits pour un accès instantané).",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur paiement 1-clic."
    console.error("[One-Click Buy] Erreur:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
