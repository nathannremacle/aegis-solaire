import { NextRequest, NextResponse } from "next/server"
import { getMollieClient } from "@/lib/mollie"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { fulfillPaidCreditOrder } from "@/lib/mollie-fulfillment"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    // Mollie envoie application/x-www-form-urlencoded avec id=tr_xxx
    let paymentId: string | null = null

    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      paymentId = (formData.get("id") as string) || null
    } else {
      try {
        const json = await request.json()
        paymentId = json.id || null
      } catch {
        const text = await request.text()
        const params = new URLSearchParams(text)
        paymentId = params.get("id")
      }
    }

    if (!paymentId) {
      console.warn("[Mollie Webhook] Requête sans paramètre id")
      return NextResponse.json({ error: "Missing payment id" }, { status: 400 })
    }

    const mollie = getMollieClient()
    const payment = await mollie.payments.get(paymentId)

    const metadata = (payment.metadata as any) || {}
    const orderId = (metadata.orderId as string | undefined) || undefined
    if (!orderId) {
      console.warn("[Mollie Webhook] Aucune commande associée dans payment.metadata:", paymentId)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const supabase = createServiceRoleClient()

    // 1. Gestion du paiement réussi
    if (payment.status === "paid") {
      const result = await fulfillPaidCreditOrder(orderId, payment)
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Fulfillment failed" }, { status: 500 })
      }
      return NextResponse.json({ received: true, status: "paid", already_paid: result.alreadyPaid }, { status: 200 })
    }

    // 2. Paiement échoué, annulé ou expiré
    if (["canceled", "failed", "expired"].includes(payment.status)) {
      const { data: order } = await supabase
        .from("credit_orders")
        .select("status")
        .eq("id", orderId)
        .single()

      if (order && order.status === "pending") {
        const { error: cancelError } = await supabase.rpc("cancel_credit_order", {
          p_order_id: orderId,
          p_notes: `Session de paiement abandonnée (${payment.status}).`,
        })
        if (cancelError) {
          return NextResponse.json({ error: "Unable to cancel order" }, { status: 409 })
        }
      }
    }

    return NextResponse.json({ received: true, status: payment.status }, { status: 200 })
  } catch (error: any) {
    console.error("[Mollie Webhook] Erreur serveur globale:", error)
    return NextResponse.json(
      { error: error.message || "Internal webhook error" },
      { status: 500 }
    )
  }
}
