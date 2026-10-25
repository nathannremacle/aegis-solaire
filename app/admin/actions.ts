"use server"

import { revalidateTag } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { dispatchLeadWave } from "@/lib/lead-relance-engine"

export async function validateCreditOrderAction(orderId: string, adminEmail: string) {
  const supabase = createServiceRoleClient()

  // 1. Récupération de la commande en attente
  const { data: order, error: fetchErr } = await supabase
    .from("credit_orders")
    .select("id, partner_id, credits, status, transfer_reference")
    .eq("id", orderId)
    .single()

  if (fetchErr || !order || order.status !== "pending") {
    throw new Error("Commande introuvable ou déjà validée.")
  }

  // 2. Mise à jour du statut de la commande
  const { error: updateOrderErr } = await supabase
    .from("credit_orders")
    .update({ status: "paid", validated_at: new Date().toISOString() })
    .eq("id", orderId)

  if (updateOrderErr) throw new Error(updateOrderErr.message)

  // 3. Créditer le compte partenaire via RPC atomique
  try {
    await supabase.rpc("increment_partner_credits", {
      p_partner_id: order.partner_id,
      p_amount: order.credits,
      p_reference: `ORDER:${order.transfer_reference || order.id}`,
    })
  } catch {
    // Fallback direct sur add_credits ou UPDATE si increment_partner_credits n'est pas encore actif
    try {
      await supabase.rpc("add_credits", {
        p_partner_id: order.partner_id,
        p_amount: order.credits,
        p_type: "topup",
        p_reference: `ORDER:${order.transfer_reference || order.id}`,
      })
    } catch {
      const { data: currentPartner } = await supabase.from("partners").select("credits").eq("id", order.partner_id).single()
      await supabase.from("partners").update({ credits: (currentPartner?.credits || 0) + order.credits }).eq("id", order.partner_id)
      await supabase.from("credit_transactions").insert({
        partner_id: order.partner_id,
        amount: order.credits,
        type: "topup",
        reference: `ORDER:${order.transfer_reference || order.id}`,
        created_at: new Date().toISOString(),
      })
    }
  }

  // 4. Journal d'audit
  try {
    await supabase.from("audit_log").insert({
      admin_email: adminEmail,
      action: "VALIDATE_CREDIT_ORDER",
      entity_type: "credit_orders",
      entity_id: order.id,
      payload: { credits: order.credits, partner_id: order.partner_id },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  // 5. Invalidation chirurgicale immédiate des caches Next.js
  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag(`partner-dashboard-${order.partner_id}`, "max")
}

export async function publishLeadAction(leadId: string, creditCost?: number) {
  const supabase = createServiceRoleClient()

  const updatePayload: Record<string, any> = {
    status: "qualified",
    marketplace_status: "available",
  }
  if (creditCost && creditCost > 0) {
    updatePayload.credit_cost = creditCost
  }

  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: "admin@aegis-solaire.be",
      action: "LEAD_QUALIFIED_AND_PUBLISHED",
      entity_type: "leads",
      entity_id: leadId,
      details: { credit_cost: creditCost },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  // Déclencher la Vague 1 de relance ciblée (Tier 1) de façon non bloquante
  void dispatchLeadWave(leadId, 1).catch((err) =>
    console.error("[publishLeadAction] dispatchLeadWave error:", err)
  )

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
}

export async function rejectLeadAction(leadId: string, reason: string, adminNotes?: string) {
  const supabase = createServiceRoleClient()

  const updatePayload: Record<string, any> = {
    status: "lost",
    marketplace_status: "rejected",
  }
  if (adminNotes !== undefined) {
    updatePayload.admin_notes = adminNotes
  }

  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: "admin@aegis-solaire.be",
      action: "LEAD_REJECTED",
      entity_type: "leads",
      entity_id: leadId,
      details: { reason, notes: adminNotes },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
}

export async function archiveLeadAction(leadId: string) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("leads")
    .update({ status: "lost", marketplace_status: "rejected" })
    .eq("id", leadId)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: "admin@aegis-solaire.be",
      action: "LEAD_ARCHIVED",
      entity_type: "leads",
      entity_id: leadId,
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
}

export async function bulkQualifyAndPublishAction(leadIds: string[]) {
  if (leadIds.length === 0) return
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("leads")
    .update({ status: "qualified", marketplace_status: "available" })
    .in("id", leadIds)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: "admin@aegis-solaire.be",
      action: "BULK_LEADS_PUBLISHED",
      entity_type: "leads",
      details: { count: leadIds.length, ids: leadIds },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
}

export async function bulkRejectAction(leadIds: string[], reason: string) {
  if (leadIds.length === 0) return
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("leads")
    .update({ status: "lost", marketplace_status: "rejected" })
    .in("id", leadIds)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: "admin@aegis-solaire.be",
      action: "BULK_LEADS_REJECTED",
      entity_type: "leads",
      details: { count: leadIds.length, ids: leadIds, reason },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
}

export async function assignLeadAction(
  leadId: string,
  partnerIds: string[],
  chargeCredits: boolean = true
) {
  if (!partnerIds || partnerIds.length === 0) {
    throw new Error("Au moins un installateur doit être sélectionné.")
  }

  const supabase = createServiceRoleClient()

  // 1. Récupérer le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, segment, credit_cost, status, marketplace_status")
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    throw new Error("Lead introuvable.")
  }

  const maxSlots = lead.segment === "B2B" ? 1 : 3
  if (partnerIds.length > maxSlots) {
    throw new Error(`Ce lead ne peut être attribué qu'à ${maxSlots} installateur(s) maximum.`)
  }

  const costPerPartner = lead.credit_cost ?? (lead.segment === "B2B" ? 5 : 2)

  // 2. Traiter chaque installateur
  for (const partnerId of partnerIds) {
    if (chargeCredits) {
      const { data: partner } = await supabase
        .from("partners")
        .select("id, credits, company_name")
        .eq("id", partnerId)
        .single()

      if (partner && (partner.credits || 0) < costPerPartner) {
        throw new Error(
          `Solde insuffisant pour ${partner.company_name} (${partner.credits || 0} < ${costPerPartner} crédits).`
        )
      }

      try {
        await supabase.rpc("add_credits", {
          p_partner_id: partnerId,
          p_amount: -costPerPartner,
          p_type: "spend",
          p_reference: `ASSIGN:${leadId.slice(0, 8)}`,
        })
      } catch {
        if (partner) {
          await supabase
            .from("partners")
            .update({ credits: Math.max(0, (partner.credits || 0) - costPerPartner) })
            .eq("id", partnerId)
        }
      }
    }

    // Enregistrer l'achat dans lead_purchases
    await supabase.from("lead_purchases").insert({
      lead_id: leadId,
      partner_id: partnerId,
      credits_spent: chargeCredits ? costPerPartner : 0,
      purchased_at: new Date().toISOString(),
    })
  }

  // 3. Mettre à jour le statut du lead
  const { error: updateErr } = await supabase
    .from("leads")
    .update({
      status: "distributed",
      marketplace_status: partnerIds.length >= maxSlots ? "sold_out" : "available",
      installateur_id: partnerIds[0],
    })
    .eq("id", leadId)

  if (updateErr) throw new Error(updateErr.message)

  // 4. Journal d'audit
  try {
    await supabase.from("audit_log").insert({
      admin_email: "admin@aegis-solaire.be",
      action: "LEAD_DIRECTLY_ASSIGNED",
      entity_type: "leads",
      entity_id: leadId,
      details: {
        partner_ids: partnerIds,
        charge_credits: chargeCredits,
        credits_per_partner: costPerPartner,
      },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
  for (const pId of partnerIds) {
    revalidateTag(`partner-dashboard-${pId}`, "max")
  }
}

