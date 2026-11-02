import { NextRequest, NextResponse } from "next/server"
import { revalidateTag, revalidatePath } from "next/cache"
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

  if (action === "approve") {
    // 2. Traitement atomique du remboursement via refund_lead_dispute RPC
    const { data: refundResult, error: rpcErr } = await supabase.rpc("refund_lead_dispute", {
      p_dispute_id: id,
      p_admin_email: user.email || "contact@aegissolaire.com",
      p_admin_notes: adminNotes || "Remboursement accepté sous garantie Lead Conforme",
      p_refund_credits: body.refundCredits !== undefined ? body.refundCredits : null,
    })

    let refundedCredits = refundResult?.credits_refunded

    if (rpcErr) {
      console.warn("[admin:disputes] RPC refund_lead_dispute fallback:", rpcErr.message)
      const exactCost = body.refundCredits ?? (dispute.lead_purchases?.credits_spent ?? 0)
      refundedCredits = exactCost

      if (exactCost > 0) {
        await supabase.rpc("add_credits", {
          p_partner_id: dispute.partner_id,
          p_amount: exactCost,
          p_type: "refund",
          p_reference: `Garantie Lead Conforme - Réclamation #${dispute.id.slice(0, 8)}`,
        })
      }

      await supabase
        .from("lead_disputes")
        .update({
          status: "approved",
          credits_refunded: exactCost,
          admin_notes: adminNotes || "Remboursement accepté sous garantie Lead Conforme",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id)
    }

    // 2b. Mettre à jour le statut du lead sur la Marketplace selon le motif
    try {
      if (dispute.reason === "wrong_number" || dispute.reason === "already_equipped") {
        // Retirer immédiatement le dossier de la marketplace pour éviter qu'un autre installateur n'achète un faux numéro
        await supabase
          .from("leads")
          .update({ marketplace_status: "archived", status: "lost" })
          .eq("id", dispute.lead_id)
      } else if (dispute.reason === "out_of_scope") {
        // Si le dossier était sold_out mais valide pour un autre installateur de la bonne zone, libérer le slot
        await supabase
          .from("leads")
          .update({ marketplace_status: "available" })
          .eq("id", dispute.lead_id)
          .eq("marketplace_status", "sold_out")
      }
    } catch {
      /* ignore lead status update error */
    }

    // 3. Audit Log
    try {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "contact@aegissolaire.com",
        action: "LEAD_DISPUTE_APPROVED_REFUNDED",
        entity_type: "lead_disputes",
        entity_id: id,
        details: {
          partner_id: dispute.partner_id,
          lead_id: dispute.lead_id,
          credits_refunded: refundedCredits,
        },
      })
    } catch {
      /* silent */
    }

    // 4. Notification email à l'installateur
    const partnerEmail = dispute.partners?.email
    if (partnerEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com",
          to: partnerEmail,
          subject: `[Aegis Solaire] Garantie Lead Conforme approuvée (+${refundedCredits} crédits recrédités)`,
          text: `Bonjour ${dispute.partners?.company_name || ""},\n\nVotre réclamation concernant le dossier #${String(dispute.lead_id).slice(0, 8)} a été approuvée par notre équipe conformité.\n\n${refundedCredits} crédits ont été immédiatement réintégrés sur votre solde installateur.\n${adminNotes ? `\nNote de l'équipe : ${adminNotes}\n` : ""}\nAccéder à votre espace partenaire :\nhttps://www.aegissolaire.com/partenaires/dashboard\n\nBien cordialement,\nL'équipe Support Aegis Solaire\n\n--\nPlateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`,
        })
      } catch {
        /* silent */
      }
    }

    revalidateTag("admin-badges", "max")
    revalidateTag("admin-kpis", "max")
    revalidatePath("/admin", "layout")

    return NextResponse.json({
      success: true,
      status: "approved",
      creditsRefunded: refundedCredits,
      message: `Réclamation approuvée. ${refundedCredits} crédits restitués au partenaire.`,
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

    // Notification email à l'installateur
    const partnerEmail = dispute.partners?.email
    if (partnerEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com",
          to: partnerEmail,
          subject: `[Aegis Solaire] Décision concernant votre réclamation (Dossier #${String(dispute.lead_id).slice(0, 8)})`,
          text: `Bonjour ${dispute.partners?.company_name || ""},\n\nAprès vérification de votre signalement concernant le dossier #${String(dispute.lead_id).slice(0, 8)}, notre équipe conformité n'a pas pu donner une suite favorable à la demande de recrédit.\n\nMotif / Précision : ${adminNotes || "Réclamation non conforme aux conditions de la Garantie Lead Conforme (Article 4.1 des CGV)."}\n\nPour toute question complémentaire, vous pouvez répondre directement à cet e-mail (contact@aegissolaire.com).\n\nBien cordialement,\nL'équipe Support Aegis Solaire\n\n--\nPlateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`,
        })
      } catch {
        /* silent */
      }
    }

    revalidateTag("admin-badges", "max")
    revalidateTag("admin-kpis", "max")
    revalidatePath("/admin", "layout")

    return NextResponse.json({
      success: true,
      status: "rejected",
      message: "Réclamation clôturée et rejetée.",
    })
  }
}
