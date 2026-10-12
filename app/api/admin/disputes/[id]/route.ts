import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  let body: {
    action?: "approve" | "reject"
    adminNotes?: string
    refundCredits?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const { action, adminNotes } = body
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Action invalide (approve ou reject requis)" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // 1. Récupérer la réclamation
  const { data: dispute, error: disputeErr } = await supabase
    .from("lead_disputes")
    .select("*, lead_purchases(id, credits_spent), partners(id, company_name, email)")
    .eq("id", id)
    .single()

  if (disputeErr || !dispute) {
    return NextResponse.json({ error: "Réclamation introuvable" }, { status: 404 })
  }

  if (dispute.status !== "pending") {
    return NextResponse.json({ error: `Cette réclamation a déjà été traitée (${dispute.status}).` }, { status: 400 })
  }

  const refundAmount = body.refundCredits ?? (dispute.lead_purchases?.credits_spent || 2)

  if (action === "approve") {
    // 2. Rembourser les crédits via add_credits RPC
    const { error: rpcErr } = await supabase.rpc("add_credits", {
      p_partner_id: dispute.partner_id,
      p_amount: refundAmount,
      p_type: "refund",
      p_reference: `Garantie 48h - Réclamation #${dispute.id.slice(0, 8)}`,
    })

    if (rpcErr) {
      console.error("[admin:disputes] add_credits error:", rpcErr)
      return NextResponse.json({ error: "Erreur lors du recrédit partenaire : " + rpcErr.message }, { status: 500 })
    }

    // 3. Mettre à jour la réclamation
    await supabase
      .from("lead_disputes")
      .update({
        status: "approved",
        credits_refunded: refundAmount,
        admin_notes: adminNotes || "Remboursement accepté sous garantie 48h",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)

    // 4. Audit Log
    try {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "LEAD_DISPUTE_APPROVED_REFUNDED",
        entity_type: "lead_disputes",
        entity_id: id,
        details: {
          partner_id: dispute.partner_id,
          lead_id: dispute.lead_id,
          credits_refunded: refundAmount,
        },
      })
    } catch {
      /* silent */
    }

    return NextResponse.json({
      success: true,
      status: "approved",
      creditsRefunded: refundAmount,
      message: `Réclamation approuvée. ${refundAmount} crédits restitués au partenaire.`,
    })
  } else {
    // Rejet
    await supabase
      .from("lead_disputes")
      .update({
        status: "rejected",
        admin_notes: adminNotes || "Réclamation non conforme aux critères de garantie",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id)

    try {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "LEAD_DISPUTE_REJECTED",
        entity_type: "lead_disputes",
        entity_id: id,
        details: {
          partner_id: dispute.partner_id,
          lead_id: dispute.lead_id,
          reason: dispute.reason,
          admin_notes: adminNotes,
        },
      })
    } catch {
      /* silent */
    }

    return NextResponse.json({
      success: true,
      status: "rejected",
      message: "Réclamation clôturée et rejetée.",
    })
  }
}
