import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { createLeadDirectPayment } from "@/lib/mollie"
import { calculateLeadDirectFinancials } from "@/lib/credit-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

export const dynamic = "force-dynamic"

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

  const { id: leadId } = await params
  if (!leadId) {
    return NextResponse.json({ error: "leadId manquant" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // 1. Récupérer le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, segment, marketplace_status, credit_cost, province, city, postal_code, surface_area, annual_electricity_bill")
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Dossier introuvable." }, { status: 404 })
  }

  if (lead.marketplace_status !== "available") {
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

  // 3. Vérifier les créneaux disponibles
  const isB2B = lead.segment === "B2B"
  const maxSlots = isB2B ? 1 : 3

  const { count: takenCount } = await supabase
    .from("lead_purchases")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", leadId)

  if (Number(takenCount || 0) >= maxSlots) {
    await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", leadId)
    return NextResponse.json(
      { error: "Tous les créneaux pour ce dossier sont désormais réservés." },
      { status: 400 }
    )
  }

  // 4. Calcul arithmétique exact du montant en euros
  const financials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: lead.credit_cost,
  })

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
      partnerId: partner.id,
      partnerEmail: partner.email,
      partnerCompany: partner.company_name,
      siteUrl,
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
