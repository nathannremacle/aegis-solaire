import { NextRequest, NextResponse } from "next/server"
import { getMollieClient } from "@/lib/mollie"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

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

    // 1. Récupérer la commande
    const { data: order, error: orderErr } = await supabase
      .from("credit_orders")
      .select("*, partners(id, company_name, email, credits)")
      .eq("id", orderId)
      .single()

    if (orderErr || !order) {
      console.error("[Mollie Webhook] Commande introuvable:", orderId, orderErr)
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // 2. Gestion du paiement réussi
    if (payment.status === "paid") {
      // Idempotence : si la commande est déjà marquée payée, ne rien faire
      if (order.status === "paid") {
        return NextResponse.json({ received: true, already_paid: true }, { status: 200 })
      }

      // 3. Attribution atomique des crédits
      const { data: newCredits, error: rpcErr } = await supabase.rpc("add_credits", {
        p_partner_id: order.partner_id,
        p_amount: order.credits,
        p_type: "topup",
        p_reference: `MOLLIE-${payment.id}`,
      })

      if (rpcErr) {
        console.error("[Mollie Webhook] Erreur RPC add_credits:", rpcErr)
        return NextResponse.json({ error: "Failed to allocate credits" }, { status: 500 })
      }

      // 4. Mettre à jour le statut de la commande en base
      await supabase
        .from("credit_orders")
        .update({
          status: "paid",
          validated_at: new Date().toISOString(),
          notes: `Paiement en ligne validé automatiquement via Mollie (${payment.id} / ${payment.method || "bancontact"}).`,
        })
        .eq("id", order.id)

      // 5. Audit log
      try {
        await supabase.from("audit_log").insert({
          admin_email: "system:mollie_webhook",
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
        console.warn("[Mollie Webhook] Audit log warning:", e)
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
            text: `Bonjour ${order.partners?.company_name || ""},\n\nVotre paiement Bancontact pour le ${order.pack_name} a été validé avec succès.\n\n${order.credits} crédits viennent d'être ajoutés automatiquement à votre compte installateur.\nVotre nouveau solde est de : ${newCredits} crédits.\n\nVous pouvez dès maintenant débloquer vos chantiers prioritaires dans votre espace :\nhttps://www.aegissolaire.com/partenaires/dashboard\n\nBien cordialement,\nL'équipe Aegis Solaire`,
          })
        } catch (emailErr) {
          console.error("[Mollie Webhook] Erreur notification email installateur:", emailErr)
        }
      }

      // 7. Notification alerte admin
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || "contact@aegissolaire.com"
      if (process.env.RESEND_API_KEY) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY)
          const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
          await resend.emails.send({
            from: fromEmail,
            to: adminEmail,
            subject: `[Aegis Solaire - Trésorerie] Recharge automatique reçue : ${order.partners?.company_name} (+${order.credits} crédits)`,
            text: `Recharge automatique réussie par Bancontact/Mollie :\n\n- Entreprise : ${order.partners?.company_name}\n- Pack : ${order.pack_name} (${order.credits} crédits)\n- Montant TTC : ${order.price_ttc} €\n- Identifiant Mollie : ${payment.id}\n- Nouveau solde installateur : ${newCredits} crédits\n\nLes crédits ont été alloués instantanément sans action manuelle requise.`,
          })
        } catch { /* silent */ }
      }

      return NextResponse.json({ success: true, status: "paid" }, { status: 200 })
    }

    // 8. Paiement échoué, annulé ou expiré
    if (["canceled", "failed", "expired"].includes(payment.status)) {
      if (order.status === "pending") {
        await supabase
          .from("credit_orders")
          .update({
            status: "cancelled",
            notes: `Session de paiement Mollie abandonnée ou expirée (${payment.status}).`,
          })
          .eq("id", order.id)
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
