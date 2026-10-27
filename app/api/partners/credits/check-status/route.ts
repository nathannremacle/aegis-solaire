import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getMollieClient } from "@/lib/mollie"
import { fulfillPaidCreditOrder } from "@/lib/mollie-fulfillment"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get("order_id")

  if (!orderId) {
    return NextResponse.json({ error: "order_id requis" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  const { data: order, error } = await supabase
    .from("credit_orders")
    .select("*, partners(id, company_name, email, credits)")
    .eq("id", orderId)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
  }

  // Vérifier que la commande appartient bien à ce partenaire
  if (order.partner_id !== partner.id) {
    return NextResponse.json({ error: "Accès refusé à cette commande" }, { status: 403 })
  }

  // Si déjà payée, renvoyer directement le succès
  if (order.status === "paid") {
    return NextResponse.json({
      status: "paid",
      credits: order.credits,
      packName: order.pack_name,
      alreadyValidated: true,
    })
  }

  // Chercher le Payment ID Mollie (dans la colonne payment_id ou les notes)
  const paymentId =
    order.payment_id ||
    order.notes?.match(/tr_[a-zA-Z0-9]+/)?.[0] ||
    null

  if (paymentId && process.env.MOLLIE_API_KEY) {
    try {
      const mollie = getMollieClient()
      const payment = await mollie.payments.get(paymentId)

      if (payment.status === "paid") {
        const result = await fulfillPaidCreditOrder(order.id, payment)
        if (result.success) {
          return NextResponse.json({
            status: "paid",
            credits: order.credits,
            packName: order.pack_name,
            newCredits: result.newCredits,
            freshlyValidated: true,
          })
        }
      } else if (["canceled", "failed", "expired"].includes(payment.status)) {
        const { error: cancelError } = await supabase.rpc("cancel_credit_order", {
          p_order_id: order.id,
          p_notes: `Session abandonnée ou expirée (${payment.status}).`,
        })
        if (cancelError) {
          return NextResponse.json({ error: "Le statut a changé. Veuillez actualiser." }, { status: 409 })
        }

        return NextResponse.json({
          status: "cancelled",
          credits: order.credits,
        })
      }
    } catch (checkErr) {
      console.warn("[Check Status] Erreur consultation Mollie API:", checkErr)
    }
  }

  return NextResponse.json({
    status: order.status,
    credits: order.credits,
    packName: order.pack_name,
  })
}
