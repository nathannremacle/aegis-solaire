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

  // Vérifier la propriété de l'achat
  const { data: purchase, error: purchaseErr } = await admin
    .from("lead_purchases")
    .select("id, partner_id")
    .eq("id", purchaseId)
    .single()

  if (purchaseErr || !purchase || purchase.partner_id !== partner.id) {
    return NextResponse.json({ error: "Achat introuvable ou non autorisé" }, { status: 404 })
  }

  const updatePayload: Record<string, any> = {}

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

  const { error: updateErr } = await admin
    .from("lead_purchases")
    .update(updatePayload)
    .eq("id", purchaseId)

  if (updateErr) {
    console.error("[pipeline-status] update error:", updateErr)
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: updatePayload })
}
