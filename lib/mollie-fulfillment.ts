import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import type { Payment } from "@mollie/api-client"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"

export interface FulfillmentResult {
  success: boolean
  alreadyPaid?: boolean
  newCredits?: number
  error?: string
}

/**
 * Valide une commande de crédits payée via Mollie de manière 100% atomique et idempotente.
 * Cette fonction est partagée entre le webhook Mollie et la route de vérification de statut au retour.
 */
export async function fulfillPaidCreditOrder(
  orderId: string,
  payment: Payment
): Promise<FulfillmentResult> {
  const supabase = createServiceRoleClient()

  // 1. Récupérer la commande avec les infos partenaires
  const { data: order, error: orderErr } = await supabase
    .from("credit_orders")
    .select("*, partners(id, company_name, email, credits)")
    .eq("id", orderId)
    .single()

  if (orderErr || !order) {
    console.error("[Mollie Fulfillment] Commande introuvable:", orderId, orderErr)
    return { success: false, error: "Order not found" }
  }

  const metadata = payment.metadata as { orderId?: string } | null
  if (payment.status !== "paid" || metadata?.orderId !== orderId) {
    return { success: false, error: "Payment does not match order" }
  }
  const { data: result, error: rpcErr } = await supabase.rpc("settle_credit_order", {
    p_order_id: orderId,
    p_provider: "mollie",
    p_payment_id: payment.id,
    p_amount: payment.amount.value,
    p_currency: payment.amount.currency,
    p_notes: `Paiement en ligne validé (${payment.id}).`,
  })
  if (rpcErr || !result) {
    console.error("[Mollie Fulfillment] Settlement failed:", rpcErr)
    return { success: false, error: "Failed to settle order" }
  }
  const newCredits = result.newCredits as number
  if (result.alreadyPaid) return { success: true, alreadyPaid: true, newCredits }

  // 5. Journal d'audit sécurisé
  try {
    await supabase.from("audit_log").insert({
      admin_email: "system:mollie",
      action: "credit_order_paid_mollie",
      entity_type: "credit_order",
      entity_id: order.id,
      details: {
        mollie_payment_id: payment.id,
        method: payment.method,
        amount: payment.amount,
        credits: order.credits,
        partner_id: order.partner_id,
        new_credits: newCredits,
      },
    })
  } catch (e) {
    console.warn("[Mollie Fulfillment] Audit log warning:", e)
  }

  // 6. E-mail de confirmation & justificatif comptable B2B à l'installateur
  const partnerEmail = order.partners?.email
  if (partnerEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      const invoiceRef = order.transfer_reference || `AEGIS-${order.id.slice(0, 8).toUpperCase()}`
      const issuedDate = new Date().toLocaleDateString("fr-BE")
      const priceHtva = Number(order.price_htva ?? 0).toFixed(2)
      const vatAmount = Number(order.vat_amount ?? 0).toFixed(2)
      const priceTtc = Number(order.price_ttc ?? 0).toFixed(2)

      await resend.emails.send({
        from: fromEmail,
        to: partnerEmail,
        subject: `[Aegis Solaire] Confirmation & Justificatif TVA (${invoiceRef}) — +${order.credits} crédits activés`,
        text: `Bonjour ${order.partners?.company_name || ""},\n\nVotre paiement pour le ${order.pack_name} a été validé avec succès.\n\n${order.credits} crédits viennent d'être ajoutés automatiquement à votre compte installateur.\nVotre nouveau solde est de : ${newCredits} crédits.\n\n--- RÉCAPITULATIF COMPTABLE B2B (ACQUITTÉ) ---\nRéférence pièce : ${invoiceRef}\nDate d'émission : ${issuedDate}\nPrestation : ${order.pack_name} (${order.credits} crédits leads photovoltaïques)\nMontant HTVA : ${priceHtva} €\nTVA belge (21 %) : ${vatAmount} €\nMontant Total TTC acquitté : ${priceTtc} €\nTransaction Mollie : ${payment.id}\n\nÉmetteur : INIT42 · BCE / TVA BE 1039.899.980 · Liège, Belgique\nClient B2B : ${order.partners?.company_name || "Partenaire Installateur"}\n----------------------------------------------\n\nVous pouvez dès maintenant débloquer vos chantiers prioritaires dans votre espace :\nhttps://www.aegissolaire.com/partenaires/dashboard\n\nBien cordialement,\nL'équipe Aegis Solaire\n\n--\nPlateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`,
      })
    } catch (emailErr) {
      console.error("[Mollie Fulfillment] Erreur notification email installateur:", emailErr)
    }
  }

  // 7. Notification d'alerte pour l'administrateur
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || "contact@aegissolaire.com"
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `[Aegis Solaire - Trésorerie] Recharge automatique reçue : ${order.partners?.company_name} (+${order.credits} crédits)`,
        text: `Recharge automatique réussie par Mollie (${payment.method || "Bancontact"}) :\n\n- Entreprise : ${order.partners?.company_name}\n- Pack : ${order.pack_name} (${order.credits} crédits)\n- Montant TTC : ${order.price_ttc} €\n- Identifiant Mollie : ${payment.id}\n- Nouveau solde installateur : ${newCredits} crédits\n\nLes crédits ont été alloués instantanément sans action manuelle requise.`,
      })
    } catch {
      /* silent */
    }
  }

  return {
    success: true,
    newCredits,
  }
}

export interface LeadFulfillmentResult {
  success: boolean
  alreadyPaid?: boolean
  purchaseId?: string
  purchase?: any
  lead?: any
  error?: string
}

/**
 * Valide un achat direct de lead payé via Mollie en euros de manière 100% atomique et idempotente.
 */
export async function fulfillPaidLeadDirectPurchase(
  leadId: string,
  partnerId: string,
  payment: Payment
): Promise<LeadFulfillmentResult> {
  if (isShowcaseOnlyLeadId(leadId)) {
    return { success: false, error: "Dossier vitrine régional clôturé (non achetable)." }
  }

  const supabase = createServiceRoleClient()

  // 1. Récupérer le partenaire
  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id, company_name, email, phone, credits")
    .eq("id", partnerId)
    .single()

  if (partnerErr || !partner) {
    console.error("[Mollie Lead Fulfillment] Partenaire introuvable:", partnerId, partnerErr)
    return { success: false, error: "Partner not found" }
  }

  // 2. Vérifier si l'achat existe déjà (idempotence)
  const { data: existingPurchase } = await supabase
    .from("lead_purchases")
    .select("*")
    .eq("lead_id", leadId)
    .eq("partner_id", partnerId)
    .maybeSingle()

  if (existingPurchase) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id, first_name, last_name, email, phone, company, company_vat, province, city, postal_code, site_address, segment, surface_type, surface_area, annual_electricity_bill, grd, project_details, message")
      .eq("id", leadId)
      .single()

    return {
      success: true,
      alreadyPaid: true,
      purchaseId: existingPurchase.id,
      purchase: existingPurchase,
      lead,
    }
  }

  // 3. Récupérer les informations du lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, segment, marketplace_status, credit_cost, province, city, postal_code, site_address, surface_type, surface_area, annual_electricity_bill, grd, project_details, message, first_name, last_name, email, phone, company, company_vat")
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    console.error("[Mollie Lead Fulfillment] Lead introuvable:", leadId, leadErr)
    return { success: false, error: "Lead not found" }
  }

  const isB2B = lead.segment === "B2B"
  const maxSlots = isB2B ? 1 : 3

  // 4. Vérifier les créneaux déjà pris
  const { count: takenSlots } = await supabase
    .from("lead_purchases")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", leadId)

  const currentTaken = Number(takenSlots || 0)
  if (currentTaken >= maxSlots) {
    // Si les créneaux se sont remplis avant la confirmation, marquer sold_out
    await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", leadId)
    console.warn("[Mollie Lead Fulfillment] Créneaux complets pour le lead:", leadId)
    // On crédite les crédits sur le compte du partenaire en dédommagement immédiat
    const meta = (payment.metadata as any) || {}
    const creditsToCompensate = Number(meta.credits || (isB2B ? 9 : 3))
    await supabase.rpc("add_credits", { p_amount: creditsToCompensate, p_partner_id: partner.id })
    return {
      success: false,
      error: `Créneaux déjà complets pour ce dossier. ${creditsToCompensate} crédits ont été crédités sur votre compte.`,
    }
  }

  const meta = (payment.metadata as any) || {}
  const creditsEquivalent = Number(meta.credits || lead.credit_cost || (isB2B ? 9 : 3))
  const priceHtva = meta.priceHtva ? Number(meta.priceHtva).toFixed(2) : ((creditsEquivalent * 1150) / 100).toFixed(2)
  const vatAmount = meta.vatAmount ? Number(meta.vatAmount).toFixed(2) : (Number(priceHtva) * 0.21).toFixed(2)
  const priceTtc = meta.priceTtc ? Number(meta.priceTtc).toFixed(2) : (Number(priceHtva) + Number(vatAmount)).toFixed(2)

  // 5. Insérer l'achat dans lead_purchases
  const { data: purchase, error: purchaseErr } = await supabase
    .from("lead_purchases")
    .insert({
      lead_id: leadId,
      partner_id: partnerId,
      credits_spent: creditsEquivalent,
      pipeline_status: "to_contact",
      notes: `Achat direct en euros (Mollie: ${payment.id}) · ${priceHtva} € HTVA (${payment.method || "Bancontact"})`,
      purchased_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (purchaseErr || !purchase) {
    console.error("[Mollie Lead Fulfillment] Erreur insertion lead_purchases:", purchaseErr)
    return { success: false, error: "Failed to record lead purchase" }
  }

  // 6. Fermer le lead si dernier slot acquis
  if (currentTaken + 1 >= maxSlots) {
    await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", leadId)
  }

  // 7. Journal d'audit
  try {
    await supabase.from("audit_log").insert({
      admin_email: "system:mollie",
      action: "lead_direct_paid_mollie",
      entity_type: "lead_purchase",
      entity_id: purchase.id,
      details: {
        mollie_payment_id: payment.id,
        method: payment.method,
        lead_id: leadId,
        partner_id: partnerId,
        amount_eur: payment.amount,
        price_htva: priceHtva,
        vat_amount: vatAmount,
        price_ttc: priceTtc,
      },
    })
  } catch (auditErr) {
    console.warn("[Mollie Lead Fulfillment] Audit log warning:", auditErr)
  }

  // 8. E-mail de confirmation & Justificatif comptable B2B à l'installateur
  if (partner.email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      const invoiceRef = `AEGIS-LEAD-${payment.id.slice(-8).toUpperCase()}`
      const issuedDate = new Date().toLocaleDateString("fr-BE")
      const leadName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Prospect Photovoltaïque"

      await resend.emails.send({
        from: fromEmail,
        to: partner.email,
        subject: `[Aegis Solaire] Justificatif d'achat TVA (${invoiceRef}) — Dossier ${lead.segment} débloqué !`,
        text: `Bonjour ${partner.company_name || ""},\n\nVotre paiement direct pour le déblocage du dossier ${lead.segment} a été validé avec succès.\n\nCe dossier est dès à présent disponible dans votre portefeuille client CRM avec ses coordonnées complètes :\n- Nom : ${leadName} ${lead.company ? `(${lead.company})` : ""}\n- Téléphone : ${lead.phone || "—"}\n- E-mail : ${lead.email || "—"}\n- Adresse : ${lead.site_address || `${lead.city || ""} (${lead.postal_code || ""})`}\n\n--- JUSTIFICATIF COMPTABLE B2B (ACQUITTÉ) ---\nRéférence facture : ${invoiceRef}\nDate d'émission : ${issuedDate}\nPrestation : Achat direct dossier photovoltaïque ${lead.segment} (Réf: ${lead.id.slice(0, 8)})\nMontant HTVA : ${priceHtva} €\nTVA belge (21 %) : ${vatAmount} €\nMontant Total TTC acquitté : ${priceTtc} €\nMéthode de paiement : ${payment.method || "Bancontact"} (Mollie: ${payment.id})\n\nÉmetteur : INIT42 · BCE / TVA BE 1039.899.980 · Liège, Belgique\nClient B2B : ${partner.company_name || "Partenaire Installateur"}\n----------------------------------------------\n\nAccédez à la fiche complète dans votre CRM :\nhttps://www.aegissolaire.com/partenaires/dashboard\n\nBien cordialement,\nL'équipe Aegis Solaire\n\n--\nPlateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`,
      })
    } catch (emailErr) {
      console.error("[Mollie Lead Fulfillment] Erreur notification email installateur:", emailErr)
    }
  }

  // 9. Notification administrateur
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || "contact@aegissolaire.com"
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `[Aegis Solaire - Ventes] Achat direct lead : ${partner.company_name} (${priceTtc} € TTC)`,
        text: `Nouveau déblocage direct par lead en euros via Mollie (${payment.method || "Bancontact"}) :\n\n- Partenaire : ${partner.company_name} (${partner.email})\n- Dossier ID : ${lead.id} (${lead.segment} - ${lead.province || "Wallonie"})\n- Montant HTVA : ${priceHtva} €\n- Montant TTC : ${priceTtc} €\n- Transaction Mollie : ${payment.id}\n\nLe dossier a été immédiatement assigné dans le CRM du partenaire.`,
      })
    } catch {
      /* silent */
    }
  }

  return {
    success: true,
    purchaseId: purchase.id,
    purchase,
    lead,
  }
}
