import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const supabase = createServiceRoleClient()

  // 1. Récupérer la commande
  const { data: order, error: orderErr } = await supabase
    .from("credit_orders")
    .select("*, partners(id, company_name, email, credits)")
    .eq("id", id)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
  }

  const action = body.action // 'validate' | 'cancel'

  if (action === "validate") {
    if (order.status === "paid") {
      return NextResponse.json({ error: "Cette commande a déjà été validée" }, { status: 400 })
    }

    // 2. Créditer le compte via RPC atomique
    const { data: newCredits, error: rpcErr } = await supabase.rpc("add_credits", {
      p_partner_id: order.partner_id,
      p_amount: order.credits,
      p_type: "topup",
      p_reference: order.transfer_reference || `order:${order.id.slice(0, 8)}`,
    })

    if (rpcErr) {
      console.error("[validate-order] RPC add_credits error:", rpcErr)
      return NextResponse.json({ error: "Erreur lors du crédit : " + rpcErr.message }, { status: 500 })
    }

    // 3. Mettre à jour le statut de la commande
    const { error: updateErr } = await supabase
      .from("credit_orders")
      .update({
        status: "paid",
        validated_at: new Date().toISOString(),
        notes: body.notes ?? order.notes,
      })
      .eq("id", id)

    if (updateErr) {
      console.error("[validate-order] update error:", updateErr)
    }

    // 4. Log d'audit
    try {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "credit_order_validated",
        entity_type: "credit_order",
        entity_id: id,
        details: {
          credits: order.credits,
          partner_id: order.partner_id,
          reference: order.transfer_reference,
          newCredits,
        },
      })
    } catch { /* silent */ }

    // 5. Email de notification au partenaire (en tâche de fond non bloquante pour répondre immédiatement)
    const partnerEmail = order.partners?.email
    if (partnerEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com",
          to: partnerEmail,
          subject: `[Aegis Solaire] Vos ${order.credits} crédits ont été activés !`,
          text: `Bonjour ${order.partners?.company_name || ""},\n\nVotre virement bancaire pour la commande ${order.transfer_reference} a bien été réceptionné.\n\n${order.credits} crédits viennent d'être ajoutés à votre compte installateur.\nVotre nouveau solde est de : ${newCredits} crédits.\n\nVous pouvez dès à présent débloquer de nouveaux dossiers dans votre espace :\nhttps://www.aegissolaire.com/partenaires/dashboard\n\nBien à vous,\nL'équipe Aegis Solaire`,
        }).catch((mailErr) => {
          console.warn("[validate-order] email notification failed:", mailErr)
        })
      } catch { /* silent */ }
    }

    return NextResponse.json({
      success: true,
      message: `${order.credits} crédits attribués avec succès.`,
      newCredits,
      orderStatus: "paid",
    })
  }

  if (action === "cancel") {
    const { error: cancelErr } = await supabase
      .from("credit_orders")
      .update({
        status: "cancelled",
        notes: body.notes ?? order.notes,
      })
      .eq("id", id)

    if (cancelErr) {
      return NextResponse.json({ error: cancelErr.message }, { status: 500 })
    }

    try {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "credit_order_cancelled",
        entity_type: "credit_order",
        entity_id: id,
        details: { reference: order.transfer_reference },
      })
    } catch { /* silent */ }

    return NextResponse.json({
      success: true,
      message: "Commande annulée.",
      orderStatus: "cancelled",
    })
  }

  return NextResponse.json({ error: "Action non reconnue" }, { status: 400 })
}
