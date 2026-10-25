import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getMollieClient } from "@/lib/mollie"

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

  // Si en attente et qu'un Mollie Payment ID est trouvé dans les notes
  const paymentIdMatch = order.notes?.match(/tr_[a-zA-Z0-9]+/)
  const paymentId = paymentIdMatch ? paymentIdMatch[0] : null

  if (paymentId && process.env.MOLLIE_API_KEY) {
    try {
      const mollie = getMollieClient()
      const payment = await mollie.payments.get(paymentId)

      if (payment.status === "paid") {
        // Validation synchrone si le webhook a eu un léger délai
        const { data: newCredits, error: rpcErr } = await supabase.rpc("add_credits", {
          p_partner_id: order.partner_id,
          p_amount: order.credits,
          p_type: "topup",
          p_reference: `MOLLIE-${payment.id}`,
        })

        if (!rpcErr) {
          await supabase
            .from("credit_orders")
            .update({
              status: "paid",
              validated_at: new Date().toISOString(),
              notes: `Paiement Bancontact synchronisé via vérification directe (${payment.id}).`,
            })
            .eq("id", order.id)

          return NextResponse.json({
            status: "paid",
            credits: order.credits,
            packName: order.pack_name,
            newCredits,
            freshlyValidated: true,
          })
        }
      } else if (["canceled", "failed", "expired"].includes(payment.status)) {
        await supabase
          .from("credit_orders")
          .update({
            status: "cancelled",
            notes: `Session abandonnée ou expirée (${payment.status}).`,
          })
          .eq("id", order.id)

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
