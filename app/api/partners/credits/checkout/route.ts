import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { createCreditOrderPayment } from "@/lib/mollie"

export const dynamic = "force-dynamic"

const CREDIT_PACKS: Record<
  string,
  { id: string; name: string; credits: number; priceHtva: number }
> = {
  pack_10: { id: "pack_10", name: "Pack Découverte", credits: 10, priceHtva: 149 },
  pack_50: { id: "pack_50", name: "Pack Croissance", credits: 50, priceHtva: 599 },
  pack_100: { id: "pack_100", name: "Pack Entreprise", credits: 100, priceHtva: 999 },
}

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json(
      { error: "Non autorisé. Veuillez vous connecter." },
      { status: 401 }
    )
  }

  let body: { packId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const pack = body.packId ? CREDIT_PACKS[body.packId] : null
  if (!pack) {
    return NextResponse.json({ error: "Pack de crédits introuvable" }, { status: 400 })
  }

  const vatRate = 0.21
  const vatAmount = Math.round(pack.priceHtva * vatRate * 100) / 100
  const priceTtc = Math.round((pack.priceHtva + vatAmount) * 100) / 100

  const transferReference = `AEGIS-${randomUUID()}`

  const admin = createServiceRoleClient()

  // 1. Enregistrement initial de la commande
  const { data: order, error: insertError } = await admin
    .from("credit_orders")
    .insert({
      partner_id: partner.id,
      pack_id: pack.id,
      pack_name: pack.name,
      credits: pack.credits,
      price_htva: pack.priceHtva,
      vat_amount: vatAmount,
      price_ttc: priceTtc,
      transfer_reference: transferReference,
      status: "pending",
      notes: "Paiement Bancontact en cours d'initialisation...",
    })
    .select("id")
    .single()

  if (insertError || !order) {
    console.error("[Mollie Checkout] Erreur insertion credit_orders:", insertError)
    return NextResponse.json(
      { error: "Impossible de créer la commande de crédits." },
      { status: 500 }
    )
  }

  // 2. Création de la session de paiement Mollie (Bancontact / Payconiq)
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.headers.get("origin") ||
    "https://www.aegissolaire.com"

  try {
    const { paymentId, checkoutUrl } = await createCreditOrderPayment({
      orderId: order.id,
      packName: pack.name,
      credits: pack.credits,
      priceTtc,
      partnerId: partner.id,
      partnerEmail: partner.email,
      partnerCompany: partner.company_name,
      siteUrl,
    })

    // 3. Mise à jour de la commande avec l'identifiant de paiement Mollie
    const { error: fullUpdateErr } = await admin
      .from("credit_orders")
      .update({
        payment_provider: "mollie",
        payment_id: paymentId,
        checkout_url: checkoutUrl,
        notes: `Mollie Payment ID: ${paymentId} | Méthode: Bancontact / Payconiq`,
      })
      .eq("id", order.id)

    // Si les colonnes optionnelles n'ont pas encore été créées dans Supabase, repli sur notes
    if (fullUpdateErr) {
      await admin
        .from("credit_orders")
        .update({
          notes: `Mollie Payment ID: ${paymentId} | Méthode: Bancontact / Payconiq`,
        })
        .eq("id", order.id)
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      orderId: order.id,
      paymentId,
    })
  } catch (mollieError: any) {
    console.error("[Mollie Checkout] Erreur API Mollie:", mollieError)

    // Si Mollie n'est pas encore configuré (ex: pas de clé API dans .env.local)
    const isApiKeyMissing =
      !process.env.MOLLIE_API_KEY ||
      mollieError.message?.includes("MOLLIE_API_KEY")

    return NextResponse.json(
      {
        error: isApiKeyMissing
          ? "Le paiement en ligne instantané est en cours de configuration finale (Clé API Mollie requise)."
          : mollieError.message || "Erreur lors de la création du paiement en ligne.",
        requiresConfig: isApiKeyMissing,
      },
      { status: isApiKeyMissing ? 503 : 500 }
    )
  }
}
