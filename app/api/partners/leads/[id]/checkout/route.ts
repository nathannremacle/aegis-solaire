import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { createLeadDirectPayment, ensureMollieCustomer } from "@/lib/mollie"
import {
  calculateLeadComplementFinancials,
  calculateLeadDirectFinancials,
} from "@/lib/credit-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"

export const dynamic = "force-dynamic"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json(
      { error: "Non autorisé. Veuillez vous connecter à votre espace installateur." },
      { status: 401 }
    )
  }

  const { id: rawLeadId } = await params
  const leadId = typeof rawLeadId === "string" ? rawLeadId.trim() : ""
  if (!leadId) {
    return NextResponse.json({ error: "leadId manquant" }, { status: 400 })
  }

  if (isShowcaseOnlyLeadId(leadId)) {
    return NextResponse.json(
      { error: "Ce dossier a déjà atteint son quota maximum d'installateurs et n'est plus disponible à l'achat." },
      { status: 400 }
    )
  }

  if (!UUID_REGEX.test(leadId)) {
    return NextResponse.json(
      { error: "Ce dossier n'est pas disponible à l'achat." },
      { status: 400 }
    )
  }

  let body: { exclusive?: boolean; enableOneClick?: boolean; usePartialCredits?: boolean } = {}
  try {
    const raw = await request.text()
    if (raw) body = JSON.parse(raw)
  } catch {
    body = {}
  }
  const exclusive = Boolean(body?.exclusive)
  const enableOneClick = Boolean(body?.enableOneClick)
  const usePartialCredits = Boolean(body?.usePartialCredits)

  const supabase = createServiceRoleClient()

  // 1. Récupérer le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, segment, marketplace_status, credit_cost, max_slots, province, city, postal_code, surface_area, annual_electricity_bill, qualification_metadata")
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 })
  }

  if (
    lead.marketplace_status !== "available" ||
    Boolean((lead.qualification_metadata as Record<string, unknown> | null)?.is_showcase)
  ) {
    return NextResponse.json(
      { error: "Ce dossier n'est plus disponible sur la marketplace." },
      { status: 400 }
    )
  }

  // 2. Vérifier si le partenaire a déjà acheté ce lead
  const { data: existingPurchase } = await supabase
    .from("lead_purchases")
    .select("id")
    .eq("lead_id", leadId)
    .eq("partner_id", partner.id)
    .maybeSingle()

  if (existingPurchase) {
    return NextResponse.json(
      { error: "Vous avez déjà débloqué ce dossier. Il est présent dans votre CRM." },
      { status: 400 }
    )
  }

  // 3. Vérifier les créneaux disponibles (hors comptes de test)
  const isB2B = lead.segment === "B2B"
  const maxSlots =
    typeof (lead as { max_slots?: number | null }).max_slots === "number"
      ? Number((lead as { max_slots?: number | null }).max_slots)
      : isB2B
        ? 2
        : 3

  const { data: existingPurchases } = await supabase
    .from("lead_purchases")
    .select("partner_id, partners(is_test, company_name)")
    .eq("lead_id", leadId)

  const realTakenCount = (existingPurchases || []).filter((row: any) => {
    const pRel = Array.isArray(row.partners) ? row.partners[0] : row.partners
    const isTest =
      pRel?.is_test === true ||
      (typeof pRel?.company_name === "string" && pRel.company_name.toLowerCase().includes("test"))
    return !isTest
  }).length

  if (realTakenCount >= maxSlots) {
    await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", leadId)
    return NextResponse.json(
      { error: "Tous les créneaux pour ce dossier sont désormais réservés." },
      { status: 400 }
    )
  }

  if (exclusive && realTakenCount > 0) {
    return NextResponse.json(
      { error: "Ce dossier a déjà été partiellement attribué et ne peut plus être acheté en exclusivité." },
      { status: 400 }
    )
  }

  // 4. Récupérer le solde live & calculer le montant (plein ou complément hybride)
  const { data: partnerRow } = await supabase
    .from("partners")
    .select("credits, mollie_customer_id")
    .eq("id", partner.id)
    .maybeSingle()

  const livePartnerCredits = Math.max(0, Number((partnerRow as any)?.credits ?? 0))
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

  let mollieCustomerId: string | null = null
  if (enableOneClick) {
    try {
      mollieCustomerId = await ensureMollieCustomer({
        partnerId: partner.id,
        partnerEmail: partner.email,
        partnerCompany: partner.company_name,
        existingCustomerId: (partnerRow as any)?.mollie_customer_id || null,
      })

      if (mollieCustomerId && !(partnerRow as any)?.mollie_customer_id) {
        await supabase
          .from("partners")
          .update({ mollie_customer_id: mollieCustomerId })
          .eq("id", partner.id)
      }
    } catch (custErr) {
      console.warn("[Lead Direct Checkout] Provisionnement client Mollie ignoré:", custErr)
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.headers.get("origin") ||
    "https://www.aegissolaire.com"

  const locationDisplay = lead.city
    ? `${lead.city} (${lead.postal_code || ""})`
    : getProvinceDisplayLabel(lead.province || "")

  // 5. Créer la session de paiement direct Mollie
  try {
    const { paymentId, checkoutUrl } = await createLeadDirectPayment({
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
      exclusive: Boolean(exclusive),
      partnerId: partner.id,
      partnerEmail: partner.email,
      partnerCompany: partner.company_name,
      siteUrl,
      customerId: mollieCustomerId,
      enableOneClick,
    })

    return NextResponse.json({
      success: true,
      checkoutUrl,
      paymentId,
      leadId: lead.id,
      financials,
    })
  } catch (mollieErr: any) {
    console.error("[Lead Direct Checkout] Erreur Mollie:", mollieErr)
    const isApiKeyMissing =
      !process.env.MOLLIE_API_KEY || mollieErr.message?.includes("MOLLIE_API_KEY")

    return NextResponse.json(
      {
        error: isApiKeyMissing
          ? "Le paiement direct par carte / Bancontact est en cours de paramétrage (Clé API Mollie requise)."
          : mollieErr.message || "Erreur lors de la création de la session de paiement.",
        requiresConfig: isApiKeyMissing,
      },
      { status: isApiKeyMissing ? 503 : 500 }
    )
  }
}

