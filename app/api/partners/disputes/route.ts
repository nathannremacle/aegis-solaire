import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

export const dynamic = "force-dynamic"

/** Fenêtre maximale de contestation : 7 jours ouvrés (~10 jours calendaires) */
const MAX_DISPUTE_WINDOW_MS = 10 * 24 * 60 * 60 * 1000

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  try {
    const { data: disputes, error } = await admin
      .from("lead_disputes")
      .select("id, lead_id, purchase_id, reason, details, status, admin_notes, credits_refunded, created_at, resolved_at")
      .eq("partner_id", partner.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ disputes: [] })
    }

    return NextResponse.json({ disputes: disputes ?? [] })
  } catch {
    return NextResponse.json({ disputes: [] })
  }
}

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: {
    leadId?: string
    purchaseId?: string
    reason?: "unreachable" | "wrong_number" | "out_of_scope" | "already_equipped" | "other"
    details?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const { leadId, purchaseId, reason, details } = body

  if (!leadId || !purchaseId || !reason || !details?.trim()) {
    return NextResponse.json({ error: "Veuillez renseigner un motif et décrire le problème rencontré." }, { status: 400 })
  }

  const validReasons = ["unreachable", "wrong_number", "out_of_scope", "already_equipped", "other"]
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: "Motif de réclamation non reconnu." }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // Vérifier la légitimité de l'achat
  const { data: purchase, error: purchaseErr } = await admin
    .from("lead_purchases")
    .select("id, partner_id, lead_id, purchased_at, credits_spent")
    .eq("id", purchaseId)
    .single()

  if (purchaseErr || !purchase || purchase.partner_id !== partner.id || purchase.lead_id !== leadId) {
    return NextResponse.json({ error: "Dossier ou achat introuvable." }, { status: 404 })
  }

  // Vérifier le respect du délai contractuel de 7 jours ouvrés (Article 4.1 des CGV)
  if (purchase.purchased_at) {
    const purchasedTime = new Date(purchase.purchased_at).getTime()
    if (!Number.isNaN(purchasedTime) && Date.now() - purchasedTime > MAX_DISPUTE_WINDOW_MS) {
      return NextResponse.json(
        {
          error:
            "Le délai contractuel de réclamation (7 jours ouvrés suivant l'acquisition du dossier) est dépassé.",
        },
        { status: 400 }
      )
    }
  }

  // Vérifier si une réclamation est déjà en cours
  const { data: existing } = await admin
    .from("lead_disputes")
    .select("id, status")
    .eq("purchase_id", purchaseId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: `Une réclamation pour ce dossier a déjà été enregistrée (Statut : ${existing.status}).`,
    }, { status: 409 })
  }

  const { data: dispute, error: insertErr } = await admin
    .from("lead_disputes")
    .insert({
      partner_id: partner.id,
      purchase_id: purchaseId,
      lead_id: leadId,
      reason,
      details: details.trim(),
      status: "pending",
      credits_refunded: 0,
    })
    .select()
    .single()

  if (insertErr) {
    console.error("[disputes:insert] error:", insertErr)
    return NextResponse.json({ error: "Impossible d'enregistrer la réclamation. Veuillez réessayer ou contacter le support." }, { status: 500 })
  }

  // Noter dans l'audit log
  try {
    await admin.from("audit_log").insert({
      action: "LEAD_DISPUTE_FILED",
      entity_type: "lead_disputes",
      entity_id: dispute.id,
      details: {
        partner_id: partner.id,
        lead_id: leadId,
        reason,
      },
    })
  } catch {
    /* silent */
  }

  // Notification email à l'administrateur pour traitement sous 24h ouvrées
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || "contact@aegissolaire.com"
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `[Aegis Solaire - Litige] Nouvelle réclamation de ${partner.company_name} (Lead #${leadId.slice(0, 8)})`,
        text: `Une nouvelle demande de Garantie Lead Conforme a été ouverte :\n\n- Installateur : ${partner.company_name} (${partner.email})\n- Lead ID : ${leadId}\n- Motif : ${reason}\n- Crédits engagés : ${purchase.credits_spent ?? 0}\n- Détails : ${details.trim()}\n\nTraiter sous 24h ouvrées dans l'interface d'administration :\nhttps://www.aegissolaire.com/admin/disputes`,
      })
    } catch {
      /* silent */
    }
  }

  return NextResponse.json({
    success: true,
    message: "Votre signalement a été transmis à l'équipe conformité Aegis Solaire. Examen et recrédit sous 24h ouvrées.",
    dispute,
  })
}
