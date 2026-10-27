import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function PATCH(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: {
    purchaseId?: string
    pipeline_status?: "to_contact" | "contacted" | "meeting_scheduled" | "quote_sent" | "won" | "lost"
    notes?: string
    next_action_at?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const purchaseId = body.purchaseId
  if (!purchaseId) {
    return NextResponse.json({ error: "purchaseId requis" }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // Tolérance résiliente : accepter soit l'ID d'achat (lead_purchases.id), soit l'ID du lead (lead_purchases.lead_id)
  let purchase: { id: string; partner_id: string } | null = null

  const { data: purchaseById } = await admin
    .from("lead_purchases")
    .select("id, partner_id")
    .eq("id", purchaseId)
    .eq("partner_id", partner.id)
    .maybeSingle()

  if (purchaseById) {
    purchase = purchaseById
  } else {
    const { data: purchaseByLead } = await admin
      .from("lead_purchases")
      .select("id, partner_id")
      .eq("lead_id", purchaseId)
      .eq("partner_id", partner.id)
      .maybeSingle()

    if (purchaseByLead) {
      purchase = purchaseByLead
    }
  }

  if (!purchase) {
    return NextResponse.json({ error: "Achat introuvable ou non autorisé" }, { status: 404 })
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (body.pipeline_status !== undefined) {
    const validStatuses = ["to_contact", "contacted", "meeting_scheduled", "quote_sent", "won", "lost"]
    if (!validStatuses.includes(body.pipeline_status)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 })
    }
    updatePayload.pipeline_status = body.pipeline_status
  }

  if (body.notes !== undefined) {
    updatePayload.notes = body.notes
  }

  if (body.next_action_at !== undefined) {
    updatePayload.next_action_at = body.next_action_at
  }

  const { data: updated, error: updateErr } = await admin
    .from("lead_purchases")
    .update(updatePayload)
    .eq("id", purchase.id)
    .select("id, pipeline_status, notes, next_action_at, updated_at")
    .single()

  if (updateErr) {
    console.error("[pipeline-status] update error:", updateErr)
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: updated || updatePayload })
}
