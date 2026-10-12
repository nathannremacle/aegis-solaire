import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID d'achat requis" }, { status: 400 })
  }

  let body: {
    pipeline_status?: "to_contact" | "contacted" | "meeting_scheduled" | "quote_sent" | "won" | "lost"
    notes?: string
    next_action_at?: string | null
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // Vérifier que cet achat appartient bien à ce partenaire
  const { data: purchase, error: purchaseErr } = await admin
    .from("lead_purchases")
    .select("id, partner_id")
    .eq("id", id)
    .single()

  if (purchaseErr || !purchase || purchase.partner_id !== partner.id) {
    return NextResponse.json({ error: "Achat introuvable ou non autorisé" }, { status: 404 })
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (body.pipeline_status !== undefined) {
    const validStatuses = ["to_contact", "contacted", "meeting_scheduled", "quote_sent", "won", "lost"]
    if (!validStatuses.includes(body.pipeline_status)) {
      return NextResponse.json({ error: "Statut de pipeline invalide" }, { status: 400 })
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
    .eq("id", id)
    .select("id, pipeline_status, notes, next_action_at, updated_at")
    .single()

  if (updateErr) {
    console.error("[purchases:update] error:", updateErr)
    return NextResponse.json({ error: "Impossible de mettre à jour le suivi commercial" }, { status: 500 })
  }

  return NextResponse.json({ success: true, purchase: updated })
}
