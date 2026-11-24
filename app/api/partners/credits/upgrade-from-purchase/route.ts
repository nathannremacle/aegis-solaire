import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  BELGIAN_VAT_RATE,
  CREDIT_PACKS,
  PRICING_VERSION,
  calculateOrderFinancials,
} from "@/lib/credit-pricing"
import { createCreditOrderPayment } from "@/lib/mollie"

export const dynamic = "force-dynamic"

/**
 * Effet Tremplin Post-Achat : convertit un achat direct en euros effectué il y a < 24h
 * en acompte intégralement déduit d'un Pack Accélération (24 cr.) ou Pack Régie (60 cr.).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const purchaseId = typeof body?.purchaseId === "string" ? body.purchaseId.trim() : ""
    const packId = body?.packId === "pack_60" ? "pack_60" : "pack_24"
    const partnerFromAuth = await getPartner()

    const supabase = createServiceRoleClient()
    if (!purchaseId) {
      return NextResponse.json({ error: "purchaseId requis." }, { status: 400 })
    }

    const { data: purchase, error: purErr } = await supabase
      .from("lead_purchases")
      .select("id, partner_id, credits_spent, purchased_at, notes")
      .eq("id", purchaseId)
      .single()

    if (purErr || !purchase) {
      return NextResponse.json({ error: "Achat introuvable." }, { status: 404 })
    }

    if (partnerFromAuth && partnerFromAuth.id !== purchase.partner_id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 403 })
    }

    const purchasedMs = new Date(purchase.purchased_at).getTime()
    if (Date.now() - purchasedMs > 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Le délai de 24h pour l'offre Tremplin déductible est expiré." },
        { status: 400 }
      )
    }

    const { data: partner } = await supabase
      .from("partners")
      .select("id, company_name, email, mollie_customer_id")
      .eq("id", purchase.partner_id)
      .single()

    if (!partner) {
      return NextResponse.json({ error: "Partenaire introuvable." }, { status: 404 })
    }

    const pack = CREDIT_PACKS[packId]
    const creditsAlreadyUsed = Math.max(1, Number(purchase.credits_spent) || 3)
    if (creditsAlreadyUsed >= pack.credits) {
      return NextResponse.json(
        { error: "Le pack sélectionné doit contenir plus de crédits que le dossier acheté." },
        { status: 400 }
      )
    }

    const initialFin = calculateOrderFinancials(creditsAlreadyUsed)
    const netHtvaCentimes = Math.max(100, pack.priceHtvaCentimes - initialFin.priceHtvaCentimes)
    const netHtva = netHtvaCentimes / 100
    const vatAmount = Math.round(netHtvaCentimes * BELGIAN_VAT_RATE) / 100
    const priceTtc = (netHtvaCentimes + Math.round(netHtvaCentimes * BELGIAN_VAT_RATE)) / 100
    const netCreditsToGrant = pack.credits - creditsAlreadyUsed

    const shortHex = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
    const transferReference = `AEGIS-UPG-${new Date().getFullYear()}-${shortHex}`

    const { data: order, error: insErr } = await supabase
      .from("credit_orders")
      .insert({
        partner_id: partner.id,
        pack_id: pack.id,
        pack_name: `${pack.name} (Tremplin -${initialFin.priceHtva.toFixed(2)} € déduit)`,
        credits: netCreditsToGrant,
        price_htva: netHtva,
        vat_amount: vatAmount,
        price_ttc: priceTtc,
        transfer_reference: transferReference,
        status: "pending",
        pricing_version: PRICING_VERSION,
        notes: `Offre Tremplin post-achat ${purchase.id} (${creditsAlreadyUsed} cr. déduits -> +${netCreditsToGrant} cr. nets).`,
      })
      .select("id")
      .single()

    if (insErr || !order) {
      return NextResponse.json({ error: "Erreur création commande Tremplin." }, { status: 500 })
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.headers.get("origin") ||
      "https://www.aegissolaire.com"

    const { paymentId, checkoutUrl } = await createCreditOrderPayment({
      orderId: order.id,
      packName: `${pack.name} Tremplin (+${netCreditsToGrant} cr.)`,
      credits: netCreditsToGrant,
      priceTtc,
      partnerId: partner.id,
      partnerEmail: partner.email,
      partnerCompany: partner.company_name,
      siteUrl,
      customerId: partner.mollie_customer_id,
      enableOneClick: true,
    })

    await supabase
      .from("credit_orders")
      .update({
        payment_provider: "mollie",
        payment_id: paymentId,
        checkout_url: checkoutUrl,
      })
      .eq("id", order.id)

    return NextResponse.json({
      success: true,
      checkoutUrl,
      orderId: order.id,
      netCreditsToGrant,
      netPriceHtva: netHtva,
      priceTtc,
    })
  } catch (err: any) {
    console.error("[Upgrade From Purchase] Error:", err)
    return NextResponse.json(
      { error: err?.message || "Erreur lors de l'upgrade Tremplin." },
      { status: 500 }
    )
  }
}
