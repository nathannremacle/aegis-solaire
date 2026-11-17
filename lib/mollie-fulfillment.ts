import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import type { Payment } from "@mollie/api-client"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"
import {
  sendAdminCreditOrderNotification,
  sendAdminLeadSaleNotification,
  type LeadSaleBuyerSummary,
} from "@/lib/admin-sales-emails"
import {
  buildCreditOrderConfirmationEmail,
  buildLeadDirectPurchaseConfirmationEmail,
} from "@/lib/email-templates/installer-transactional"
import { calculateOrderFinancials } from "@/lib/credit-pricing"
import {
  ensureInvoiceForCreditOrder,
  ensureInvoiceForLeadPurchase,
} from "@/lib/accounting/invoice-service"

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

  // 6. Émission de la facture séquentielle conforme & e-mail à l'installateur
  const issuedInvoice = await ensureInvoiceForCreditOrder(order.id)
  const partnerEmail = order.partners?.email
  if (partnerEmail && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      const invoiceRef = issuedInvoice.invoiceNumber || order.transfer_reference || `AEGIS-${order.id.slice(0, 8).toUpperCase()}`
      const rendered = buildCreditOrderConfirmationEmail({
        orderId: order.id,
        invoiceRef,
        companyName: order.partners?.company_name || "Partenaire Installateur",
        packName: order.pack_name,
        credits: Number(order.credits || 0),
        newCreditsBalance: newCredits,
        priceHtva: order.price_htva ?? 0,
        vatAmount: order.vat_amount ?? 0,
        priceTtc: order.price_ttc ?? 0,
        paymentMethodLabel: payment.method || "Bancontact",
        transactionId: payment.id,
      })

      await resend.emails.send({
        from: fromEmail,
        to: partnerEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      })
    } catch (emailErr) {
      console.error("[Mollie Fulfillment] Erreur notification email installateur:", emailErr)
    }
  }

  // 7. Notification d'alerte pour l'administrateur
  try {
    await sendAdminCreditOrderNotification({
      mode: "mollie_paid",
      orderId: order.id,
      partner: {
        id: order.partners?.id ?? order.partner_id,
        company_name: order.partners?.company_name || "Partenaire",
        email: order.partners?.email || "",
      },
      packName: order.pack_name,
      credits: Number(order.credits || 0),
      newCreditsBalance: newCredits,
      priceHtva: order.price_htva ?? 0,
      vatAmount: order.vat_amount ?? 0,
      priceTtc: order.price_ttc ?? 0,
      paymentMethod: payment.method || "Bancontact",
      molliePaymentId: payment.id,
    })
  } catch {
    /* silent */
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
    .select(
      "id, segment, marketplace_status, credit_cost, province, city, postal_code, site_address, surface_type, surface_area, estimated_power_kwc, annual_electricity_bill, roof_material, project_timeline, lead_score, grd, project_details, message, contact_preference, first_name, last_name, email, phone, company, company_vat, qualification_metadata, created_at"
    )
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
  const v2Fallback = calculateOrderFinancials(creditsEquivalent)
  const priceHtva = meta.priceHtva ? Number(meta.priceHtva).toFixed(2) : v2Fallback.priceHtva.toFixed(2)
  const vatAmount = meta.vatAmount ? Number(meta.vatAmount).toFixed(2) : v2Fallback.vatAmount.toFixed(2)
  const priceTtc = meta.priceTtc ? Number(meta.priceTtc).toFixed(2) : v2Fallback.priceTtc.toFixed(2)

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

  // 8. Émission de la facture séquentielle conforme & e-mail à l'installateur
  const issuedLeadInvoice = await ensureInvoiceForLeadPurchase({
    purchaseId: purchase.id,
    paymentId: payment.id,
    paymentMethod: payment.method || "Bancontact",
    priceHtva: Number(priceHtva),
    vatAmount: Number(vatAmount),
    priceTtc: Number(priceTtc),
  })

  if (partner.email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      const invoiceRef = issuedLeadInvoice.invoiceNumber || `AEGIS-LEAD-${payment.id.slice(-8).toUpperCase()}`
      const leadName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Prospect Photovoltaïque"
      const rawPref = (lead.contact_preference || (lead.qualification_metadata as any)?.contactPreference || "") as string
      const contactPreferenceLabel = rawPref === "direct_call"
        ? "Par appel direct (9h–18h)"
        : rawPref === "written_first"
          ? "Par e-mail ou SMS"
          : null
      const locationSubtitle = [lead.postal_code, lead.city].filter(Boolean).join(" ") || lead.province || "Wallonie"
      const addressLine = lead.site_address
        ? `${lead.site_address}, ${locationSubtitle}`
        : locationSubtitle

      const rendered = buildLeadDirectPurchaseConfirmationEmail({
        leadId: lead.id,
        segment: lead.segment || "B2C",
        invoiceRef,
        companyName: partner.company_name || "Partenaire Installateur",
        leadName,
        leadCompany: lead.company,
        phone: lead.phone,
        email: lead.email,
        addressLine,
        locationSubtitle,
        contactPreferenceLabel,
        priceHtva,
        vatAmount,
        priceTtc,
        paymentMethodLabel: payment.method || "Bancontact",
        transactionId: payment.id,
      })

      await resend.emails.send({
        from: fromEmail,
        to: partner.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      })
    } catch (emailErr) {
      console.error("[Mollie Lead Fulfillment] Erreur notification email installateur:", emailErr)
    }
  }

  // 9. Notification administrateur enrichie (nom du lead & lien, places restantes, localité, image, etc.)
  try {
    const { data: allLeadPurchases } = await supabase
      .from("lead_purchases")
      .select("id, partner_id, purchased_at, partners(id, company_name, is_test)")
      .eq("lead_id", leadId)
      .order("purchased_at", { ascending: true })

    const buyers: LeadSaleBuyerSummary[] = (allLeadPurchases || []).map((row: any) => {
      const pRel = Array.isArray(row.partners) ? row.partners[0] : row.partners
      return {
        partnerId: row.partner_id,
        companyName: pRel?.company_name || "Partenaire",
        purchasedAt: row.purchased_at,
        isTest: Boolean(pRel?.is_test),
        isCurrentBuyer: row.partner_id === partner.id,
      }
    })

    const effectiveTaken = buyers.length > 0 ? buyers.length : currentTaken + 1

    await sendAdminLeadSaleNotification({
      mode: "direct_mollie",
      purchaseId: purchase.id,
      partner: {
        id: partner.id,
        company_name: partner.company_name,
        email: partner.email,
        phone: partner.phone,
        credits: partner.credits,
      },
      lead,
      priceHtva,
      vatAmount,
      priceTtc,
      paymentMethod: payment.method || "Bancontact",
      molliePaymentId: payment.id,
      creditsSpent: creditsEquivalent,
      takenSlots: effectiveTaken,
      maxSlots,
      buyers,
    })
  } catch (adminEmailErr) {
    console.warn("[Mollie Lead Fulfillment] Notification admin échouée:", adminEmailErr)
  }

  return {
    success: true,
    purchaseId: purchase.id,
    purchase,
    lead,
  }
}
