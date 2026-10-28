import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

import { CREDIT_PACKS, PRICING_VERSION, calculateOrderFinancials } from "@/lib/credit-pricing"

const BANK_DETAILS = {
  beneficiary: "INIT42 (Nathan Remacle)",
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
  const transferReference = `AEGIS-${randomUUID()}`

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
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey)
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || "contact@aegissolaire.com"
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
        to: adminEmail,
        subject: `[Aegis Solaire] Nouvelle commande de crédits : ${partner.company_name} (${pack.credits} crédits)`,
        text: `Nouvelle commande de crédits partenaires :\n\n- Entreprise : ${partner.company_name}\n- Email : ${partner.email}\n- Pack : ${pack.name} (${pack.credits} crédits)\n- Montant HTVA : ${financials.priceHtva.toFixed(2)} €\n- Montant TTC (21%) : ${financials.priceTtc.toFixed(2)} €\n- Référence virement : ${transferReference}\n\nActiver les crédits dans le panel admin une fois le virement reçu sur le compte INIT42 (BE84 0020 3534 7259).`,
      })
    } catch (e) {
      console.error("[Credit Order Email] Erreur notification admin:", e)
    }
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
