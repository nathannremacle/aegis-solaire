import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

const CREDIT_PACKS: Record<
  string,
  { id: string; name: string; credits: number; priceHtva: number }
> = {
  pack_10: { id: "pack_10", name: "Pack Découverte", credits: 10, priceHtva: 149 },
  pack_50: { id: "pack_50", name: "Pack Croissance", credits: 50, priceHtva: 599 },
  pack_100: { id: "pack_100", name: "Pack Entreprise", credits: 100, priceHtva: 999 },
}

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

  const vatRate = 0.21
  const vatAmount = Math.round(pack.priceHtva * vatRate * 100) / 100
  const priceTtc = Math.round((pack.priceHtva + vatAmount) * 100) / 100

  const cleanCompanyName = partner.company_name
    .slice(0, 6)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  const timestamp = Date.now().toString().slice(-4)
  const transferReference = `AEGIS-${cleanCompanyName || "PART"}-${pack.credits}CR-${timestamp}`

  // Enregistrement de la commande en base de données
  try {
    const admin = createServiceRoleClient()
    await admin.from("credit_orders").insert({
      partner_id: partner.id,
      pack_id: pack.id,
      pack_name: pack.name,
      credits: pack.credits,
      price_htva: pack.priceHtva,
      vat_amount: vatAmount,
      price_ttc: priceTtc,
      transfer_reference: transferReference,
      status: "pending",
    })
  } catch (err) {
    console.warn("[Credit Order] Erreur insertion credit_orders:", err)
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
        text: `Nouvelle commande de crédits partenaires :\n\n- Entreprise : ${partner.company_name}\n- Email : ${partner.email}\n- Pack : ${pack.name} (${pack.credits} crédits)\n- Montant HTVA : ${pack.priceHtva} €\n- Montant TTC (21%) : ${priceTtc} €\n- Référence virement : ${transferReference}\n\nActiver les crédits dans le panel admin une fois le virement reçu sur le compte INIT42 (BE84 0020 3534 7259).`,
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
      priceHtva: pack.priceHtva,
      vatRate: "21%",
      vatAmount,
      priceTtc,
      transferReference,
      bankDetails: BANK_DETAILS,
    },
  })
}
