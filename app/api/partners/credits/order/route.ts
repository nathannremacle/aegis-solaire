import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { sendAdminCreditOrderNotification } from "@/lib/admin-sales-emails"

export const dynamic = "force-dynamic"

import { CREDIT_PACKS, PRICING_VERSION, calculateOrderFinancials } from "@/lib/credit-pricing"

const BANK_DETAILS = {
  beneficiary: "INIT42",
  iban: "BE84 0020 3534 7259",
  bic: "GEBABEBB",
  vatNumber: "BE 1039.899.980",
}

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé. Veuillez vous connecter." }, { status: 401 })
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

  const financials = calculateOrderFinancials(pack.credits)
  const shortHex = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
  const transferReference = `AEGIS-${new Date().getFullYear()}-${shortHex}`

  // Enregistrement de la commande en base de données
  try {
    const admin = createServiceRoleClient()
    const { error } = await admin.from("credit_orders").insert({
      partner_id: partner.id,
      pack_id: pack.id,
      pack_name: pack.name,
      credits: pack.credits,
      price_htva: financials.priceHtva,
      vat_amount: financials.vatAmount,
      price_ttc: financials.priceTtc,
      transfer_reference: transferReference,
      status: "pending",
      pricing_version: PRICING_VERSION,
    })
    if (error) throw error
  } catch (err) {
    console.warn("[Credit Order] Erreur insertion credit_orders:", err)
    return NextResponse.json({ error: "Impossible d’enregistrer la commande. Veuillez réessayer." }, { status: 500 })
  }

  // Notification admin par email (si configuré)
  try {
    await sendAdminCreditOrderNotification({
      mode: "bank_transfer_pending",
      partner: {
        id: partner.id,
        company_name: partner.company_name,
        email: partner.email,
        phone: partner.phone,
      },
      packName: pack.name,
      credits: pack.credits,
      priceHtva: financials.priceHtva,
      vatAmount: financials.vatAmount,
      priceTtc: financials.priceTtc,
      transferReference,
    })
  } catch (e) {
    console.error("[Credit Order Email] Erreur notification admin:", e)
  }

  return NextResponse.json({
    success: true,
    message: "Commande enregistrée avec succès. Effectuez votre virement pour activer les crédits.",
    order: {
      packId: pack.id,
      packName: pack.name,
      credits: pack.credits,
      priceHtva: financials.priceHtva,
      vatRate: "21%",
      vatAmount: financials.vatAmount,
      priceTtc: financials.priceTtc,
      transferReference,
      bankDetails: BANK_DETAILS,
    },
  })
}
