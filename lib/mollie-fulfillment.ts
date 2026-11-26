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
import {
  calculateOrderFinancials,
  getExclusiveCreditCost,
} from "@/lib/credit-pricing"
import { createExpressBuyToken } from "@/lib/express-buy-token"
import {
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
} from "@/lib/email-templates/installer-email-layout"
import { getValidMollieMandate } from "@/lib/mollie"
import { sendProspectExclusiveMatchEmail } from "@/lib/prospect-exclusive-match-email"
import {
  ensureInvoiceForCreditOrder,
  ensureInvoiceForLeadPurchase,
} from "@/lib/accounting/invoice-service"
import {
  ensurePartnerReferralCode,
  triggerPartnerReferralReward,
} from "@/lib/partner-referrals"
import { triggerDistributorBonusReward } from "@/lib/distributor-partners"

async function savePartnerMollieMandateIfPresent(
  supabase: ReturnType<typeof createServiceRoleClient>,
  partnerId: string,
  payment: Payment
) {
  try {
    const customerId = payment.customerId || null
    const mandateId = payment.mandateId || null
    if (!customerId) return
    const meta = (payment.metadata as { enableOneClick?: boolean } | null) || null
    if (!meta?.enableOneClick && !mandateId && payment.sequenceType !== "first") return

    let finalMandateId = mandateId
    let mandateStatus = finalMandateId ? "valid" : "pending"

    if (!finalMandateId) {
      try {
        const res = await getValidMollieMandate(customerId)
        if (res.mandateId) {
          finalMandateId = res.mandateId
          mandateStatus = res.valid ? "valid" : "pending"
        }
      } catch {
        // Ignorer si Mollie n'a pas encore provisionné le mandat de manière synchrone
      }
    }

    await supabase
      .from("partners")
      .update({
        mollie_customer_id: customerId,
        ...(finalMandateId ? { mollie_mandate_id: finalMandateId } : {}),
        mollie_mandate_status: mandateStatus,
      })
      .eq("id", partnerId)
  } catch (err) {
    console.warn("[Mollie Mandate Save] Erreur non bloquante:", err)
  }
}

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

  await savePartnerMollieMandateIfPresent(supabase, order.partner_id, payment)

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
      const referralCode = await ensurePartnerReferralCode(
        supabase,
        order.partner_id,
        order.partners?.company_name
      ).catch(() => null)
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
        referralCode,
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

  try {
    await triggerPartnerReferralReward(supabase, order.partner_id, "first_credit_order")
  } catch {
    /* non-blocking */
  }

  try {
    await triggerDistributorBonusReward(supabase, order.partner_id, "first_credit_order")
  } catch {
    /* non-blocking */
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
  exclusive?: boolean
  maxSlots?: number
  newCredits?: number
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
      "id, segment, marketplace_status, credit_cost, max_slots, province, city, postal_code, site_address, surface_type, surface_area, estimated_power_kwc, annual_electricity_bill, roof_material, project_timeline, lead_score, grd, project_details, message, contact_preference, first_name, last_name, email, phone, company, company_vat, qualification_metadata, created_at"
    )
    .eq("id", leadId)
    .single()

  if (leadErr || !lead) {
    console.error("[Mollie Lead Fulfillment] Lead introuvable:", leadId, leadErr)
    return { success: false, error: "Lead not found" }
  }

  const isB2B = lead.segment === "B2B"
  const meta = (payment.metadata as Record<string, unknown>) || {}
  const isExclusiveBuyout = Boolean(meta.exclusive)
  const rawCreditsToDebit = Math.max(0, Math.floor(Number(meta.creditsToDebit || 0)))
  const isHybrid = Boolean(meta.isHybrid) && rawCreditsToDebit > 0
  const baseMaxSlots =
    typeof (lead as { max_slots?: number | null }).max_slots === "number"
      ? Number((lead as { max_slots?: number | null }).max_slots)
      : isB2B
        ? 2
        : 3
  const maxSlots = isExclusiveBuyout ? 1 : baseMaxSlots

  // 4. Vérifier les créneaux déjà pris par des partenaires réels
  const { data: existingPurchases } = await supabase
    .from("lead_purchases")
    .select("partner_id, partners(is_test, company_name)")
    .eq("lead_id", leadId)

  const currentTaken = (existingPurchases || []).filter((row: any) => {
    const pRel = Array.isArray(row.partners) ? row.partners[0] : row.partners
    const isTestPartner =
      pRel?.is_test === true ||
      (typeof pRel?.company_name === "string" && pRel.company_name.toLowerCase().includes("test"))
    return !isTestPartner
  }).length

  if ((isExclusiveBuyout && currentTaken > 0) || currentTaken >= baseMaxSlots) {
    if (currentTaken >= baseMaxSlots) {
      await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", leadId)
    }
    console.warn("[Mollie Lead Fulfillment] Créneaux complets ou exclusivité expirée:", leadId)
    const fallbackCredits = isExclusiveBuyout
      ? getExclusiveCreditCost({ segment: lead.segment, credit_cost: lead.credit_cost })
      : Number(lead.credit_cost || (isB2B ? 13 : 3))
    const totalLeadCredits = Number(meta.totalCredits || meta.credits || fallbackCredits)
    const creditsToCompensate = isHybrid
      ? Math.max(1, totalLeadCredits - rawCreditsToDebit)
      : totalLeadCredits
    const { error: compErr } = await supabase.rpc("add_credits", {
      p_partner_id: partner.id,
      p_amount: creditsToCompensate,
      p_type: "adjustment",
      p_reference: `COMPENSATION_SLOTS_FULL:${leadId}`,
    })
    if (compErr) {
      await supabase
        .from("partners")
        .update({ credits: Number(partner.credits || 0) + creditsToCompensate })
        .eq("id", partner.id)
    }
    return {
      success: false,
      error: `Créneaux complets ou dossier déjà partagé avant validation. ${creditsToCompensate} crédit${creditsToCompensate > 1 ? "s" : ""} ont été crédités sur votre compte (vos crédits partiels n'ont pas été débités).`,
    }
  }

  const creditsEquivalent = isExclusiveBuyout
    ? Number(
        meta.totalCredits ||
          meta.credits ||
          getExclusiveCreditCost({ segment: lead.segment, credit_cost: lead.credit_cost })
      )
    : Number(meta.totalCredits || meta.credits || lead.credit_cost || (isB2B ? 13 : 3))
  const v2Fallback = calculateOrderFinancials(creditsEquivalent)
  const priceHtva = meta.priceHtva ? Number(meta.priceHtva).toFixed(2) : v2Fallback.priceHtva.toFixed(2)
  const vatAmount = meta.vatAmount ? Number(meta.vatAmount).toFixed(2) : v2Fallback.vatAmount.toFixed(2)
  const priceTtc = meta.priceTtc ? Number(meta.priceTtc).toFixed(2) : v2Fallback.priceTtc.toFixed(2)
  const purchaseChannel =
    meta.channel === "auto_pilot" ? "auto_pilot" : "mollie_direct"
  const exclusiveTag = isExclusiveBuyout ? " (EXCLUSIF)" : ""
  const purchaseNotes = isHybrid
    ? `Achat direct en euros (Mollie: ${payment.id}) · Complément (${rawCreditsToDebit} cr. utilisés) · ${priceHtva} € HTVA (${payment.method || "Bancontact"})${exclusiveTag}`
    : `Achat direct en euros${exclusiveTag} (Mollie: ${payment.id}) · ${priceHtva} € HTVA (${payment.method || "Bancontact"})`

  // 5. Insérer l'achat dans lead_purchases (avec repli si nouvelles colonnes non migrées)
  let purchase: any = null
  let purchaseErr: any = null
  const basePurchaseRow = {
    lead_id: leadId,
    partner_id: partnerId,
    credits_spent: creditsEquivalent,
    pipeline_status: "to_contact",
    notes: purchaseNotes,
    purchased_at: new Date().toISOString(),
  }

  const resInsert = await supabase
    .from("lead_purchases")
    .insert({
      ...basePurchaseRow,
      is_exclusive: isExclusiveBuyout || baseMaxSlots === 1,
      purchase_channel: purchaseChannel,
    })
    .select()
    .single()

  if (
    resInsert.error &&
    (resInsert.error.code === "42703" ||
      resInsert.error.message?.includes("is_exclusive") ||
      resInsert.error.message?.includes("purchase_channel"))
  ) {
    const fallbackInsert = await supabase
      .from("lead_purchases")
      .insert(basePurchaseRow)
      .select()
      .single()
    purchase = fallbackInsert.data
    purchaseErr = fallbackInsert.error
  } else {
    purchase = resInsert.data
    purchaseErr = resInsert.error
  }

  if (purchaseErr || !purchase) {
    console.error("[Mollie Lead Fulfillment] Erreur insertion lead_purchases:", purchaseErr)
    return { success: false, error: "Failed to record lead purchase" }
  }

  // 5b. Débit atomique des crédits partiels utilisés en complément
  let effectiveNewCredits = Number(partner.credits || 0)
  let actualDebitedCredits = 0
  if (isHybrid && rawCreditsToDebit > 0) {
    const { data: deductData, error: deductErr } = await supabase.rpc("deduct_credits_safe", {
      p_partner_id: partnerId,
      p_amount: rawCreditsToDebit,
      p_reference: `HYBRID_LEAD:${leadId}`,
    })
    if (!deductErr && deductData) {
      actualDebitedCredits = Number(deductData.debited ?? 0)
      effectiveNewCredits = Number(deductData.new_credits ?? effectiveNewCredits)
    } else {
      actualDebitedCredits = Math.min(effectiveNewCredits, rawCreditsToDebit)
      effectiveNewCredits = Math.max(0, effectiveNewCredits - actualDebitedCredits)
      await supabase
        .from("partners")
        .update({ credits: effectiveNewCredits })
        .eq("id", partnerId)
    }
  }

  // 6. Clôturer le dossier si exclusivité ou dernier slot acquis
  if (isExclusiveBuyout) {
    const { error: exclErr } = await supabase
      .from("leads")
      .update({
        max_slots: 1,
        exclusive_buyout: true,
        marketplace_status: "sold_out",
      })
      .eq("id", leadId)
    if (exclErr && (exclErr.code === "42703" || exclErr.message?.includes("exclusive_buyout"))) {
      await supabase
        .from("leads")
        .update({ max_slots: 1, marketplace_status: "sold_out" })
        .eq("id", leadId)
    }

    if (lead.email && !isB2B) {
      const contactPref =
        (lead as { contact_preference?: string | null }).contact_preference ||
        ((lead.qualification_metadata as Record<string, unknown> | null)?.contactPreference as
          | string
          | undefined) ||
        null

      await sendProspectExclusiveMatchEmail({
        email: lead.email,
        firstName: lead.first_name,
        leadId: lead.id,
        city: lead.city,
        province: lead.province,
        estimatedPowerKwc: lead.estimated_power_kwc,
        surfaceArea: lead.surface_area,
        grd: lead.grd,
        contactPreference: contactPref,
        partnerCompany: partner.company_name || "Notre installateur partenaire RESCERT",
        partnerEmail: partner.email,
        partnerPhone: partner.phone,
      }).catch((err) => {
        console.warn("[Mollie Lead Fulfillment] Erreur e-mail réassurance prospect:", err)
      })
    }
  } else if (currentTaken + 1 >= baseMaxSlots) {
    await supabase.from("leads").update({ marketplace_status: "sold_out" }).eq("id", leadId)
  }

  await savePartnerMollieMandateIfPresent(supabase, partnerId, payment)

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
        is_hybrid: isHybrid,
        credits_debited: actualDebitedCredits,
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

      const referralCode = await ensurePartnerReferralCode(
        supabase,
        partner.id,
        partner.company_name
      ).catch(() => null)

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
        referralCode,
      })

      await resend.emails.send({
        from: fromEmail,
        to: partner.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      })

      // Si le partenaire a acheté à l'acte et dispose de < 6 crédits, proposer l'Offre Tremplin sans appel
      if (!isHybrid && effectiveNewCredits < 6 && creditsEquivalent < 24) {
        const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
        const netRemainingCredits = 24 - creditsEquivalent
        const netPriceHtvaNum = Math.max(1, 198 - Number(priceHtva))
        const netPriceHtva = netPriceHtvaNum.toFixed(2).replace(".", ",")
        const paidFormatted = Number(priceHtva).toFixed(2).replace(".", ",")
        const expressToken = createExpressBuyToken({
          leadId: lead.id,
          partnerId: partner.id,
          rescertCompany: partner.company_name,
          rescertEmail: partner.email,
        })
        const tremplinUrl = `${siteBase}/partenaires/express/${encodeURIComponent(lead.id)}?t=${encodeURIComponent(expressToken)}`
        const tremplinSubject = `Offre Tremplin 24h : déduisez vos ${paidFormatted} € de votre Quota Accélération`
        const tremplinText = `Bonjour,\n\nVous venez de débloquer un dossier sur Aegis Solaire pour ${paidFormatted} € HTVA.\n\nPendant 24h, transformez cet achat en acompte intégralement déduit d'un Quota Accélération (24 crédits à -16 %) : ne réglez que ${netPriceHtva} € HTVA pour recevoir +${netRemainingCredits} crédits supplémentaires (Garantie Livraison 45 jours incluse, zéro abonnement) :\n${tremplinUrl}\n\nLa Direction des Partenariats Aegis Solaire\ncontact@aegissolaire.com`
        const tremplinHtml = renderInstallerEmailShell({
          subject: tremplinSubject,
          preheader: `Déduisez intégralement vos ${paidFormatted} € HTVA sur le Quota Accélération (24 crédits à -16 %).`,
          reference: `TREMPLIN · #${lead.id.slice(0, 8).toUpperCase()}`,
          context: "Offre Tremplin valable 24 h",
          headline: "Ne perdez pas votre tarif à l'acte",
          subtitle: `${partner.company_name || "Partenaire RESCERT"} · Déduction intégrale appliquée`,
          statusPill: { text: "Garantie Livraison 45 jours incluse", tone: "success" },
          bodyHtml: `
            ${renderFiguresBox(
              {
                label: "Acompte déjà réglé (déduit)",
                value: `-${paidFormatted} € HT`,
                sublabel: `${creditsEquivalent} crédits utilisés`,
              },
              {
                label: "Reste net à régler",
                value: `${netPriceHtva} € HT`,
                sublabel: `+${netRemainingCredits} crédits ajoutés (-16 %)`,
              }
            )}
            ${renderActionBox({
              kicker: "Offre valable 24 heures · Zéro abonnement",
              title: "Convertir en Quota Accélération (24 crédits)",
              subtext: "Priorité Auto-Pilot T+0s (30 min avant le Spot) + Garantie Cash-Back 45 jours (Art. 4.4 CGV).",
              ctaLabel: `Activer pour ${netPriceHtva} € HTVA →`,
              ctaUrl: tremplinUrl,
            })}
            ${renderCalloutBox({
              label: "Zéro risque sur votre trésorerie",
              value: "Si nous ne vous livrons pas assez de dossiers conformes à vos critères dans les 45 jours, le solde non consommé vous est remboursé par virement sous 48h ouvrées.",
              tone: "info",
            })}
          `,
          footerLinks: [
            { label: "Activer mon Quota", href: tremplinUrl },
            { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
          ],
        })

        await resend.emails.send({
          from: fromEmail,
          to: partner.email,
          replyTo: "contact@aegissolaire.com",
          subject: tremplinSubject,
          text: tremplinText,
          html: tremplinHtml,
        }).catch(() => {})
      }
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

  try {
    await triggerPartnerReferralReward(supabase, partnerId, "first_direct_lead_purchase")
  } catch {
    /* non-blocking */
  }

  try {
    await triggerDistributorBonusReward(supabase, partnerId, "first_direct_lead_purchase")
  } catch {
    /* non-blocking */
  }

  return {
    success: true,
    purchaseId: purchase.id,
    purchase,
    lead,
    exclusive: isExclusiveBuyout || isB2B,
    maxSlots,
    newCredits: effectiveNewCredits,
  }
}
