import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import type { Payment } from "@mollie/api-client"

export interface FulfillmentResult {
  success: boolean
  alreadyPaid?: boolean
  newCredits?: number
  error?: string
}

/**
 * Valide une commande de crédits payée via Mollie de manière 100% atomique et idempotente.
 * Cette fonction est partagée entre le webhook Mollie et la route de vérification de statut au retour.
 */
export async function fulfillPaidCreditOrder(
  orderId: string,
  payment: Payment
): Promise<FulfillmentResult> {
  const supabase = createServiceRoleClient()

  // 1. Récupérer la commande avec les infos partenaires
  const { data: order, error: orderErr } = await supabase
    .from("credit_orders")
    .select("*, partners(id, company_name, email, credits)")
    .eq("id", orderId)
    .single()

  if (orderErr || !order) {
    console.error("[Mollie Fulfillment] Commande introuvable:", orderId, orderErr)
    return { success: false, error: "Order not found" }
  }

  const metadata = payment.metadata as { orderId?: string } | null
  if (payment.status !== "paid" || metadata?.orderId !== orderId) {
    return { success: false, error: "Payment does not match order" }
  }
  const { data: result, error: rpcErr } = await supabase.rpc("settle_credit_order", {
    p_order_id: orderId,
    p_provider: "mollie",
    p_payment_id: payment.id,
    p_amount: payment.amount.value,
    p_currency: payment.amount.currency,
    p_notes: `Paiement en ligne validé (${payment.id}).`,
  })
  if (rpcErr || !result) {
    console.error("[Mollie Fulfillment] Settlement failed:", rpcErr)
    return { success: false, error: "Failed to settle order" }
  }
  const newCredits = result.newCredits as number
  if (result.alreadyPaid) return { success: true, alreadyPaid: true, newCredits }

  // 5. Journal d'audit sécurisé
  try {
    await supabase.from("audit_log").insert({
      admin_email: "system:mollie",
      action: "credit_order_paid_mollie",
      entity_type: "credit_order",
      entity_id: order.id,
      details: {
        mollie_payment_id: payment.id,
        method: payment.method,
        amount: payment.amount,
        credits: order.credits,
        partner_id: order.partner_id,
        new_credits: newCredits,
      },
    })
  } catch (e) {
    console.warn("[Mollie Fulfillment] Audit log warning:", e)
  }

  // 6. E-mail de confirmation à l'installateur
  const partnerEmail = order.partners?.email
  if (partnerEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      await resend.emails.send({
        from: fromEmail,
        to: partnerEmail,
        subject: `[Aegis Solaire] Vos ${order.credits} crédits ont été activés immédiatement !`,
        text: `Bonjour ${order.partners?.company_name || ""},\n\nVotre paiement pour le ${order.pack_name} a été validé avec succès.\n\n${order.credits} crédits viennent d'être ajoutés automatiquement à votre compte installateur.\nVotre nouveau solde est de : ${newCredits} crédits.\n\nVous pouvez dès maintenant débloquer vos chantiers prioritaires dans votre espace :\nhttps://www.aegissolaire.com/partenaires/dashboard\n\nBien cordialement,\nL'équipe Aegis Solaire`,
      })
    } catch (emailErr) {
      console.error("[Mollie Fulfillment] Erreur notification email installateur:", emailErr)
    }
  }

  // 7. Notification d'alerte pour l'administrateur
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || "contact@aegissolaire.com"
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `[Aegis Solaire - Trésorerie] Recharge automatique reçue : ${order.partners?.company_name} (+${order.credits} crédits)`,
        text: `Recharge automatique réussie par Mollie (${payment.method || "Bancontact"}) :\n\n- Entreprise : ${order.partners?.company_name}\n- Pack : ${order.pack_name} (${order.credits} crédits)\n- Montant TTC : ${order.price_ttc} €\n- Identifiant Mollie : ${payment.id}\n- Nouveau solde installateur : ${newCredits} crédits\n\nLes crédits ont été alloués instantanément sans action manuelle requise.`,
      })
    } catch {
      /* silent */
    }
  }

  return {
    success: true,
    newCredits,
  }
}
