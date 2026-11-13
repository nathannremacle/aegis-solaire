"use server"

import { revalidateTag, revalidatePath } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getAdminUser } from "@/lib/admin-auth"
import { dispatchLeadWave } from "@/lib/lead-relance-engine"
import { B2C_CREDIT_COST, B2B_CREDIT_COST } from "@/lib/credit-pricing"
import { sendLeadAssignedEmail } from "@/lib/notify-installateur"
import { evaluateLeadPublishability } from "@/lib/lead-quality"

export async function validateCreditOrderAction(orderId: string, adminEmail?: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()
  const callerEmail = adminEmail || adminUser.email || "admin@aegissolaire.com"

  // 1. Validation comptable et crédit de solde via la RPC atomique officielle
  const { data: settleResult, error: settleErr } = await supabase.rpc("settle_credit_order", {
    p_order_id: orderId,
    p_provider: "bank_transfer",
    p_notes: `Validé manuellement par ${callerEmail}`,
  })

  if (settleErr) {
    throw new Error(settleErr.message || "Erreur lors de la validation atomique de la commande.")
  }

  // 2. Récupérer l'ID partenaire pour l'invalidation du cache
  const { data: order } = await supabase
    .from("credit_orders")
    .select("partner_id, credits")
    .eq("id", orderId)
    .single()

  // 3. Journal d'audit
  try {
    await supabase.from("audit_log").insert({
      admin_email: callerEmail,
      action: "VALIDATE_CREDIT_ORDER",
      entity_type: "credit_orders",
      entity_id: orderId,
      payload: { credits: order?.credits, partner_id: order?.partner_id, settleResult },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  // 4. Invalidation chirurgicale immédiate des caches Next.js
  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidatePath("/admin", "layout")
  if (order?.partner_id) {
    revalidateTag(`partner-dashboard-${order.partner_id}`, "max")
  }
}

export async function publishLeadAction(leadId: string, creditCost?: number) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()

  // Récupérer le lead et vérifier les critères minimaux de qualité (dont adresse B2C complète)
  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, segment, credit_cost, province, postal_code, city, site_address, surface_area, surface_type, annual_electricity_bill, first_name, last_name, email, phone, company"
    )
    .eq("id", leadId)
    .single()

  if (!lead) {
    throw new Error("Dossier introuvable.")
  }

  const qualityCheck = evaluateLeadPublishability(lead)
  if (!qualityCheck.isPublishable) {
    throw new Error(
      `Publication bloquée : ${qualityCheck.missingFields.join(" · ")}. Complétez la fiche d'abord.`
    )
  }

  const finalCost =
    creditCost && creditCost > 0
      ? creditCost
      : lead?.credit_cost ?? (lead?.segment === "B2B" ? B2B_CREDIT_COST : B2C_CREDIT_COST)

  const updatePayload: Record<string, any> = {
    status: "qualified",
    marketplace_status: "available",
    credit_cost: finalCost,
    pricing_version: "v2",
  }

  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", leadId)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: adminUser.email || "admin@aegissolaire.com",
      action: "LEAD_QUALIFIED_AND_PUBLISHED",
      entity_type: "leads",
      entity_id: leadId,
      details: { credit_cost: finalCost, pricing_version: "v2" },
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
  revalidatePath("/admin", "layout")
  revalidateTag("marketplace-feed", "max")
}

export async function rejectLeadAction(leadId: string, reason: string, adminNotes?: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

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
      admin_email: adminUser.email || "admin@aegissolaire.com",
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
  revalidatePath("/admin", "layout")
}

export async function archiveLeadAction(leadId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("leads")
    .update({ status: "lost", marketplace_status: "rejected" })
    .eq("id", leadId)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: adminUser.email || "admin@aegissolaire.com",
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
  revalidatePath("/admin", "layout")
}

export async function bulkQualifyAndPublishAction(leadIds: string[]) {
  if (leadIds.length === 0) return

  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()

  // Mettre à jour avec prix par défaut v2 selon segment pour les leads qui n'en ont pas
  const { data: leads } = await supabase
    .from("leads")
    .select("id, segment, credit_cost")
    .in("id", leadIds)

  if (leads) {
    for (const lead of leads) {
      const finalCost =
        lead.credit_cost && lead.credit_cost > 0
          ? lead.credit_cost
          : lead.segment === "B2B"
            ? B2B_CREDIT_COST
            : B2C_CREDIT_COST

      await supabase
        .from("leads")
        .update({
          status: "qualified",
          marketplace_status: "available",
          credit_cost: finalCost,
          pricing_version: "v2",
        })
        .eq("id", lead.id)
    }
  }

  try {
    await supabase.from("audit_log").insert({
      admin_email: adminUser.email || "admin@aegissolaire.com",
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
  revalidatePath("/admin", "layout")
  revalidateTag("marketplace-feed", "max")
}

export async function bulkRejectAction(leadIds: string[], reason: string) {
  if (leadIds.length === 0) return

  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from("leads")
    .update({ status: "lost", marketplace_status: "rejected" })
    .in("id", leadIds)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: adminUser.email || "admin@aegissolaire.com",
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
  revalidatePath("/admin", "layout")
}

export async function assignLeadAction(
  leadId: string,
  partnerIds: string[],
  chargeCredits: boolean = true
) {
  if (!partnerIds || partnerIds.length === 0) {
    throw new Error("Au moins un installateur doit être sélectionné.")
  }

  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()

  // 1. Récupérer le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select(
      "id, first_name, last_name, email, phone, job_title, company, segment, surface_type, surface_area, annual_electricity_bill, estimated_roi_years, estimated_savings, message, credit_cost, status, marketplace_status"
    )
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    throw new Error("Lead introuvable.")
  }

  const maxSlots = lead.segment === "B2B" ? 1 : 3

  // Vérifier les attributions déjà existantes pour ce lead dans lead_purchases
  const { data: existingPurchases, error: purCheckErr } = await supabase
    .from("lead_purchases")
    .select("id, partner_id")
    .eq("lead_id", leadId)

  if (purCheckErr) {
    console.error("[assignLeadAction] Error fetching existing purchases:", purCheckErr)
  }

  const existingPartnerIds = new Set((existingPurchases || []).map((p) => p.partner_id))
  const newPartnerIds = partnerIds.filter((id) => !existingPartnerIds.has(id))

  const totalSlotsTaken = existingPartnerIds.size + newPartnerIds.length
  if (totalSlotsTaken > maxSlots) {
    throw new Error(
      `Ce lead ne peut être attribué qu'à ${maxSlots} installateur(s) maximum (${existingPartnerIds.size} déjà attribué(s), tentative d'ajout de ${newPartnerIds.length}).`
    )
  }

  const costPerPartner =
    lead.credit_cost && lead.credit_cost > 0
      ? lead.credit_cost
      : lead.segment === "B2B"
        ? B2B_CREDIT_COST
        : B2C_CREDIT_COST

  // 2. Traiter chaque nouvel installateur
  for (const partnerId of newPartnerIds) {
    const { data: partner, error: pErr } = await supabase
      .from("partners")
      .select("id, credits, company_name, email")
      .eq("id", partnerId)
      .single()

    if (pErr || !partner) {
      throw new Error(`Installateur partenaire introuvable (${partnerId}).`)
    }

    if (chargeCredits) {
      if ((partner.credits || 0) < costPerPartner) {
        throw new Error(
          `Solde insuffisant pour ${partner.company_name} (${partner.credits || 0} < ${costPerPartner} crédits requis).`
        )
      }

      // Débiter les crédits du partenaire
      const newBalance = Math.max(0, (partner.credits || 0) - costPerPartner)
      const { error: debitErr } = await supabase
        .from("partners")
        .update({ credits: newBalance })
        .eq("id", partnerId)

      if (debitErr) {
        throw new Error(
          `Échec du débit des crédits pour ${partner.company_name}: ${debitErr.message}`
        )
      }

      // Journaliser dans credit_transactions (type 'purchase')
      try {
        await supabase.from("credit_transactions").insert({
          partner_id: partnerId,
          amount: -costPerPartner,
          type: "purchase",
          reference: `ASSIGN:${leadId.slice(0, 8)}`,
          created_at: new Date().toISOString(),
        })
      } catch (tErr) {
        console.warn("[assignLeadAction] credit_transactions insert warning:", tErr)
      }
    }

    // Enregistrer l'achat dans lead_purchases
    const { error: insErr } = await supabase.from("lead_purchases").insert({
      lead_id: leadId,
      partner_id: partnerId,
      credits_spent: chargeCredits ? costPerPartner : 0,
      purchased_at: new Date().toISOString(),
    })

    if (insErr) {
      console.error("[assignLeadAction] Error inserting lead_purchases:", insErr)
      throw new Error(`Échec de l'attribution: ${insErr.message}`)
    }

    // Notification email non-bloquante du partenaire
    if (partner.email) {
      void sendLeadAssignedEmail(partner.email, {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        job_title: lead.job_title,
        company: lead.company ?? null,
        surface_type: lead.surface_type,
        surface_area: lead.surface_area,
        annual_electricity_bill: lead.annual_electricity_bill,
        estimated_roi_years: lead.estimated_roi_years ?? null,
        estimated_savings: lead.estimated_savings ?? null,
        message: lead.message ?? null,
      }).catch((emailErr) => {
        console.error("[assignLeadAction] Notification email failed:", emailErr)
      })
    }
  }

  // 3. Mettre à jour le statut du lead
  // Utilise le statut valide 'qualified' conforme à leads_status_check
  // Pas d'écriture dans installateur_id qui possède une FK stricte sur la table installateurs legacy
  const isSoldOut = totalSlotsTaken >= maxSlots
  const { error: updateErr } = await supabase
    .from("leads")
    .update({
      status: "qualified",
      marketplace_status: isSoldOut ? "sold_out" : "available",
      credit_cost: costPerPartner,
      pricing_version: "v2",
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId)

  if (updateErr) throw new Error(updateErr.message)

  // 4. Journal d'audit
  try {
    await supabase.from("audit_log").insert({
      admin_email: adminUser.email || "admin@aegissolaire.com",
      action: "LEAD_DIRECTLY_ASSIGNED",
      entity_type: "leads",
      entity_id: leadId,
      details: {
        partner_ids: partnerIds,
        new_partner_ids: newPartnerIds,
        charge_credits: chargeCredits,
        credits_per_partner: costPerPartner,
        total_slots_taken: totalSlotsTaken,
        marketplace_status: isSoldOut ? "sold_out" : "available",
      },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidatePath("/admin", "layout")
  revalidateTag("marketplace-feed", "max")
  for (const pId of partnerIds) {
    revalidateTag(`partner-dashboard-${pId}`, "max")
  }
}
