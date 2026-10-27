import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { z } from "zod"
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
  const parsed = z.object({ action: z.enum(["validate", "cancel"]), notes: z.string().max(2000).optional() })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  const body = parsed.data
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
    const { data: result, error: rpcErr } = await supabase.rpc("settle_credit_order", {
      p_order_id: id,
      p_provider: "bank_transfer",
      p_notes: body.notes ?? null,
    })
    if (rpcErr || !result) {
      console.error("[validate-order] Settlement failed:", rpcErr)
      return NextResponse.json({ error: "Impossible de valider cette commande." }, { status: 409 })
    }
    const newCredits = result.newCredits as number
    if (result.alreadyPaid) {
      return NextResponse.json({ success: true, alreadyPaid: true, newCredits, orderStatus: "paid" })
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
    const { error: cancelErr } = await supabase.rpc("cancel_credit_order", {
      p_order_id: id,
      p_notes: body.notes ?? null,
    })
    if (cancelErr) {
      return NextResponse.json({ error: "Impossible d’annuler cette commande. Une commande payée doit faire l’objet d’un remboursement." }, { status: 409 })
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
