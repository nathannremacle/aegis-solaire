import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyExpressBuyToken } from "@/lib/express-buy-token"
import { ensurePartnerAuthAccount } from "@/lib/partner-auth-onboarding"
import { calculateLeadDirectFinancials } from "@/lib/credit-pricing"
import { createLeadDirectPayment, ensureMollieCustomer } from "@/lib/mollie"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const leadId = typeof body?.leadId === "string" ? body.leadId.trim() : ""
    const token = typeof body?.token === "string" ? body.token.trim() : ""
    const exclusive = Boolean(body?.exclusive)
    const enableOneClick = Boolean(body?.enableOneClick)
    const useCreditsIfAvailable = Boolean(body?.useCreditsIfAvailable)
    const cgvAccepted = Boolean(body?.cgvAccepted)

    if (!leadId || !token || isShowcaseOnlyLeadId(leadId)) {
      return NextResponse.json({ error: "Lien express invalide ou expiré." }, { status: 400 })
    }

    const tokenPayload = verifyExpressBuyToken(token, leadId)
    if (!tokenPayload) {
      return NextResponse.json({ error: "Jeton d'accès express invalide ou expiré (72h)." }, { status: 401 })
    }

    if (!cgvAccepted) {
      return NextResponse.json({ error: "Veuillez accepter les CGV B2B Aegis Solaire." }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 1. Vérifier la disponibilité du lead
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("id, segment, marketplace_status, credit_cost, max_slots, province, city, postal_code, allocation_mode, qualification_metadata")
      .eq("id", leadId)
      .single()

    if (leadErr || !lead || lead.marketplace_status !== "available") {
      return NextResponse.json({ error: "Ce dossier n'est plus disponible." }, { status: 400 })
    }

    const isB2B = lead.segment === "B2B"
    const maxSlots =
      typeof lead.max_slots === "number" ? lead.max_slots : isB2B ? 2 : 3

    const { data: purchases } = await supabase
      .from("lead_purchases")
      .select("partner_id, partners(is_test, company_name)")
      .eq("lead_id", leadId)

    const realTaken = (purchases || []).filter((r: any) => {
      const pRel = Array.isArray(r.partners) ? r.partners[0] : r.partners
      return !pRel?.is_test && !pRel?.company_name?.toLowerCase().includes("test")
    }).length

    if (realTaken >= maxSlots || (exclusive && realTaken > 0)) {
      return NextResponse.json(
        { error: "Tous les créneaux ou l'exclusivité de ce dossier viennent d'être attribués." },
        { status: 400 }
      )
    }

    // 2. Résoudre ou provisionner le partenaire (si issu du registre RESCERT)
    let partnerId = tokenPayload.partnerId || null
    let partnerRow: any = null

    if (partnerId) {
      const { data } = await supabase
        .from("partners")
        .select("id, company_name, email, credits, mollie_customer_id")
        .eq("id", partnerId)
        .maybeSingle()
      partnerRow = data
    }

    if (!partnerRow && tokenPayload.rescertEmail) {
      const cleanEmail = tokenPayload.rescertEmail.trim().toLowerCase()
      const { data: existingByEmail } = await supabase
        .from("partners")
        .select("id, company_name, email, credits, mollie_customer_id")
        .eq("email", cleanEmail)
        .maybeSingle()

      if (existingByEmail) {
        partnerRow = existingByEmail
        partnerId = existingByEmail.id
      } else {
        const companyName = tokenPayload.rescertCompany || "Installateur RESCERT"
        const { data: insertedPartner, error: insErr } = await supabase
          .from("partners")
          .insert({
            company_name: companyName,
            email: cleanEmail,
            status: "approved",
            credits: 0,
            segment: "BOTH",
            company_vat: tokenPayload.rescertVat || null,
          })
          .select("id, company_name, email, credits, mollie_customer_id")
          .single()

        if (insErr || !insertedPartner) {
          return NextResponse.json(
            { error: "Impossible d'initialiser votre fiche partenaire RESCERT." },
            { status: 500 }
          )
        }
        partnerRow = insertedPartner
        partnerId = insertedPartner.id
        await ensurePartnerAuthAccount(supabase, {
          email: cleanEmail,
          companyName,
          partnerId: insertedPartner.id,
        }).catch(() => {})
      }
    }

    if (!partnerRow || !partnerId) {
      return NextResponse.json({ error: "Identité partenaire introuvable." }, { status: 400 })
    }

    // Vérifier doublon d'achat
    const alreadyBought = (purchases || []).some((r: any) => r.partner_id === partnerId)
    if (alreadyBought) {
      return NextResponse.json({ alreadyPurchased: true, partnerId })
    }

    const financials = calculateLeadDirectFinancials({
      segment: lead.segment,
      credit_cost: lead.credit_cost,
      exclusive,
    })

    // Option 1-clic via solde crédits existant
    if (useCreditsIfAvailable && Number(partnerRow.credits || 0) >= financials.credits) {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("purchase_marketplace_lead", {
        p_lead_id: leadId,
        p_partner_id: partnerId,
        p_exclusive: exclusive,
      })

      if (rpcErr || !rpcRes?.success) {
        return NextResponse.json(
          { error: rpcErr?.message || "Impossible de débloquer par crédits." },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        paidByCredits: true,
        purchaseId: rpcRes.purchase_id,
        creditsSpent: financials.credits,
        partnerId,
      })
    }

    // 3. Paiement express Mollie (Bancontact prioritaire)
    let mollieCustomerId: string | null = partnerRow.mollie_customer_id || null
    if (enableOneClick && !mollieCustomerId) {
      try {
        mollieCustomerId = await ensureMollieCustomer({
          partnerId,
          partnerEmail: partnerRow.email,
          partnerCompany: partnerRow.company_name,
        })
        await supabase
          .from("partners")
          .update({ mollie_customer_id: mollieCustomerId })
          .eq("id", partnerId)
      } catch {
        // Non bloquant
      }
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      "https://www.aegissolaire.com"
    const cleanSiteUrl = siteUrl.replace(/\/$/, "")
    const locationDisplay = lead.city
      ? `${lead.city} (${lead.postal_code || ""})`
      : getProvinceDisplayLabel(lead.province || "")

    const redirectUrlOverride = `${cleanSiteUrl}/partenaires/express/${encodeURIComponent(leadId)}?t=${encodeURIComponent(token)}&payment=return&pid=${encodeURIComponent(partnerId)}`

    const { paymentId, checkoutUrl } = await createLeadDirectPayment({
      leadId,
      leadSegment: lead.segment || "B2C",
      leadLocation: locationDisplay,
      priceTtc: financials.priceTtc,
      priceHtva: financials.priceHtva,
      vatAmount: financials.vatAmount,
      credits: financials.credits,
      exclusive,
      partnerId,
      partnerEmail: partnerRow.email,
      partnerCompany: partnerRow.company_name,
      siteUrl: cleanSiteUrl,
      redirectUrlOverride,
      customerId: mollieCustomerId,
      enableOneClick,
    })

    return NextResponse.json({
      success: true,
      checkoutUrl,
      paymentId,
      partnerId,
      priceHtva: financials.priceHtva,
      priceTtc: financials.priceTtc,
    })
  } catch (err: any) {
    console.error("[Express Checkout] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Erreur lors de l'initialisation Bancontact." },
      { status: 500 }
    )
  }
}
