"use server"

import { revalidateTag } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/admin"

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

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
}
