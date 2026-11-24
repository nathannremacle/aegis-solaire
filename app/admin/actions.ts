"use server"

import { after } from "next/server"
import { revalidateTag, revalidatePath } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getAdminUser } from "@/lib/admin-auth"
import { triggerPostPublishDispatch } from "@/lib/lead-relance-engine"
import { B2C_CREDIT_COST, B2B_CREDIT_COST } from "@/lib/credit-pricing"
import { calculateLeadCreditCost } from "@/lib/marketplace-pricing"
import { sendLeadAssignedEmail } from "@/lib/notify-installateur"
import { evaluateLeadPublishability } from "@/lib/lead-quality"
import { getPrimaryLeadImageItem } from "@/lib/lead-images"

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
      "id, segment, credit_cost, province, postal_code, city, site_address, surface_area, surface_type, annual_electricity_bill, first_name, last_name, email, phone, company, company_vat, ownership_status, qualification_metadata"
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
      : lead?.credit_cost && lead.credit_cost > 0
        ? lead.credit_cost
        : calculateLeadCreditCost({
            segment: lead.segment || "B2C",
            surfaceArea: lead.surface_area,
            surfaceType: lead.surface_type,
            annualBill: lead.annual_electricity_bill,
            qualificationMetadata: (lead.qualification_metadata as Record<string, unknown>) ?? null,
          }) || (lead?.segment === "B2B" ? B2B_CREDIT_COST : B2C_CREDIT_COST)

  const existingMeta =
    lead.qualification_metadata && typeof lead.qualification_metadata === "object"
      ? (lead.qualification_metadata as Record<string, unknown>)
      : {}
  const nowIso = new Date().toISOString()
  const mergedMeta: Record<string, unknown> = {
    ...existingMeta,
    withdrawn_from_marketplace: false,
    published_at: existingMeta.published_at || nowIso,
    ...(existingMeta.withdrawn_from_marketplace === true ? { republished_at: nowIso } : {}),
  }

  const updatePayload: Record<string, any> = {
    status: "qualified",
    marketplace_status: "available",
    credit_cost: finalCost,
    pricing_version: "v4",
    qualification_metadata: mergedMeta,
    updated_at: nowIso,
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
      created_at: nowIso,
    })
  } catch {
    // Non-blocking
  }

  // Auto-Pilot d'abord ; puis Vague 1 si le dossier n'est pas déjà sold_out
  const dispatch = await triggerPostPublishDispatch(leadId)

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/leads")
  revalidateTag("marketplace-feed", "max")
  revalidatePath("/partenaires/dashboard")

  return { success: true, dispatch }
}

export async function unpublishLeadAction(leadId: string) {
  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()

  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select("id, segment, status, marketplace_status, qualification_metadata")
    .eq("id", leadId)
    .single()

  if (fetchErr || !lead) {
    throw new Error("Dossier introuvable.")
  }

  const existingMeta =
    lead.qualification_metadata && typeof lead.qualification_metadata === "object"
      ? (lead.qualification_metadata as Record<string, unknown>)
      : {}
  const nowIso = new Date().toISOString()

  const updatedMeta: Record<string, unknown> = {
    ...existingMeta,
    withdrawn_from_marketplace: true,
    withdrawn_at: nowIso,
    withdrawn_by: adminUser.email || "admin@aegissolaire.com",
  }

  const { error } = await supabase
    .from("leads")
    .update({
      marketplace_status: "pending_review",
      qualification_metadata: updatedMeta,
      updated_at: nowIso,
    })
    .eq("id", leadId)

  if (error) throw new Error(error.message)

  try {
    await supabase.from("audit_log").insert({
      admin_email: adminUser.email || "admin@aegissolaire.com",
      action: "LEAD_UNPUBLISHED_FROM_MARKETPLACE",
      entity_type: "leads",
      entity_id: leadId,
      details: {
        previous_marketplace_status: lead.marketplace_status,
        withdrawn_at: nowIso,
      },
      created_at: nowIso,
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/leads")
  revalidatePath("/partenaires/dashboard")

  return { success: true }
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

  // Mettre à jour avec prix par défaut v2 selon segment après contrôle qualité strict de chaque dossier
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, segment, credit_cost, province, postal_code, city, site_address, surface_area, surface_type, annual_electricity_bill, first_name, last_name, email, phone, company, company_vat, ownership_status, qualification_metadata"
    )
    .in("id", leadIds)

  const nowIso = new Date().toISOString()

  const blockedReasons: string[] = []
  for (const lead of leads ?? []) {
    const q = evaluateLeadPublishability(lead)
    if (!q.isPublishable) {
      const label =
        `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.company || lead.id
      blockedReasons.push(`${label} (${q.missingFields[0]})`)
    }
  }

  if (blockedReasons.length > 0) {
    throw new Error(
      `Publication groupée bloquée (${blockedReasons.length} dossier(s) non conforme(s)) : ${blockedReasons.slice(0, 3).join(" · ")}`
    )
  }

  const publishedLeadIds: string[] = []
  if (leads) {
    for (const lead of leads) {
      const finalCost =
        lead.credit_cost && lead.credit_cost > 0
          ? lead.credit_cost
          : lead.segment === "B2B"
            ? B2B_CREDIT_COST
            : B2C_CREDIT_COST

      const existingMeta =
        lead.qualification_metadata && typeof lead.qualification_metadata === "object"
          ? (lead.qualification_metadata as Record<string, unknown>)
          : {}

      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          status: "qualified",
          marketplace_status: "available",
          credit_cost: finalCost,
          pricing_version: "v2",
          qualification_metadata: {
            ...existingMeta,
            withdrawn_from_marketplace: false,
            published_at: existingMeta.published_at || nowIso,
            ...(existingMeta.withdrawn_from_marketplace === true ? { republished_at: nowIso } : {}),
          },
          updated_at: nowIso,
        })
        .eq("id", lead.id)

      if (!updateErr) {
        publishedLeadIds.push(lead.id)
      }
    }
  }

  try {
    await supabase.from("audit_log").insert({
      admin_email: adminUser.email || "admin@aegissolaire.com",
      action: "BULK_LEADS_PUBLISHED",
      entity_type: "leads",
      details: { count: leadIds.length, ids: leadIds },
      created_at: nowIso,
    })
  } catch {
    // Non-blocking
  }

  if (publishedLeadIds.length > 0) {
    after(async () => {
      for (const publishedId of publishedLeadIds) {
        await triggerPostPublishDispatch(publishedId)
      }
    })
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/leads")
  revalidateTag("marketplace-feed", "max")
  revalidatePath("/partenaires/dashboard")
}

export async function bulkUnpublishAction(leadIds: string[]) {
  if (leadIds.length === 0) return

  const adminUser = await getAdminUser()
  if (!adminUser) {
    throw new Error("Accès administrateur requis.")
  }

  const supabase = createServiceRoleClient()
  const nowIso = new Date().toISOString()
  const callerEmail = adminUser.email || "admin@aegissolaire.com"

  const { data: leads } = await supabase
    .from("leads")
    .select("id, qualification_metadata")
    .in("id", leadIds)

  if (leads) {
    for (const lead of leads) {
      const existingMeta =
        lead.qualification_metadata && typeof lead.qualification_metadata === "object"
          ? (lead.qualification_metadata as Record<string, unknown>)
          : {}

      await supabase
        .from("leads")
        .update({
          marketplace_status: "pending_review",
          qualification_metadata: {
            ...existingMeta,
            withdrawn_from_marketplace: true,
            withdrawn_at: nowIso,
            withdrawn_by: callerEmail,
          },
          updated_at: nowIso,
        })
        .eq("id", lead.id)
    }
  }

  try {
    await supabase.from("audit_log").insert({
      admin_email: callerEmail,
      action: "BULK_UNPUBLISH_FROM_MARKETPLACE",
      entity_type: "leads",
      details: { count: leadIds.length, ids: leadIds, withdrawn_at: nowIso },
      created_at: nowIso,
    })
  } catch {
    // Non-blocking
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/leads")
  revalidatePath("/partenaires/dashboard")
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
      "id, first_name, last_name, email, phone, job_title, company, segment, max_slots, surface_type, surface_area, annual_electricity_bill, estimated_roi_years, estimated_savings, message, credit_cost, status, marketplace_status, qualification_metadata"
    )
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    throw new Error("Lead introuvable.")
  }

  const maxSlots =
    typeof (lead as { max_slots?: number | null }).max_slots === "number"
      ? Number((lead as { max_slots?: number | null }).max_slots)
      : lead.segment === "B2B"
        ? 2
        : 3

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
        roof_image_url: getPrimaryLeadImageItem(lead)?.url ?? null,
        roof_image_is_ai_projection: Boolean(getPrimaryLeadImageItem(lead)?.isAiProjection),
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
      pricing_version: "v4",
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
