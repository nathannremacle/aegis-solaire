import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import {
  DISPUTE_ABUSE_ROLLING_DAYS,
  DISPUTE_ABUSE_THRESHOLD_PERCENT,
  VALID_DISPUTE_REASON_IDS,
  checkDisputeEligibility,
  computePartnerDisputeStats30d,
  getDisputeReasonConfig,
  getWrongNumberProofLabel,
  type DisputeReasonId,
  type WrongNumberProofId,
} from "@/lib/disputes-policy"
import { fetchPartnerDisputePrivilege } from "@/lib/partner-dispute-privilege"
import {
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

export const dynamic = "force-dynamic"

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  try {
    const [{ data: disputes, error }, privilege] = await Promise.all([
      admin
        .from("lead_disputes")
        .select("id, lead_id, purchase_id, reason, details, status, admin_notes, credits_refunded, created_at, resolved_at")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false }),
      fetchPartnerDisputePrivilege(admin, partner.id),
    ])

    if (error) {
      return NextResponse.json({
        disputes: [],
        disputesSuspended: privilege.disputes_suspended,
        disputesSuspendedReason: privilege.disputes_suspended_reason,
      })
    }

    return NextResponse.json({
      disputes: disputes ?? [],
      disputesSuspended: privilege.disputes_suspended,
      disputesSuspendedReason: privilege.disputes_suspended_reason,
    })
  } catch {
    return NextResponse.json({ disputes: [], disputesSuspended: false, disputesSuspendedReason: null })
  }
}

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const privilege = await fetchPartnerDisputePrivilege(admin, partner.id)
  if (privilege.disputes_suspended) {
    return NextResponse.json(
      {
        error:
          "La faculté de déclarer de nouveaux litiges est actuellement suspendue sur votre compte conformément à l'article 5.6 des CGV. Contactez contact@aegissolaire.com.",
        code: "DISPUTES_SUSPENDED",
        reason: privilege.disputes_suspended_reason,
      },
      { status: 403 }
    )
  }

  let body: {
    leadId?: string
    purchaseId?: string
    reason?: DisputeReasonId
    details?: string
    diligenceConfirmed?: boolean
    wrongNumberProof?: WrongNumberProofId
    wrongNumberVerifiedAck?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const {
    leadId,
    purchaseId,
    reason,
    details,
    diligenceConfirmed,
    wrongNumberProof,
    wrongNumberVerifiedAck,
  } = body
  const trimmedDetails = details?.trim() || ""

  if (!leadId || !purchaseId || !reason || !trimmedDetails) {
    return NextResponse.json({ error: "Veuillez renseigner un motif et décrire le problème rencontré." }, { status: 400 })
  }

  if (!VALID_DISPUTE_REASON_IDS.includes(reason)) {
    return NextResponse.json({ error: "Motif de réclamation non reconnu." }, { status: 400 })
  }

  // Vérifier la légitimité de l'achat + métadonnées du lead (contact_preference, vérifications)
  const { data: purchase, error: purchaseErr } = await admin
    .from("lead_purchases")
    .select(
      "id, partner_id, lead_id, purchased_at, credits_spent, leads(contact_preference, phone_verified, email_verified, qualification_metadata)"
    )
    .eq("id", purchaseId)
    .single()

  if (purchaseErr || !purchase || purchase.partner_id !== partner.id || purchase.lead_id !== leadId) {
    return NextResponse.json({ error: "Dossier ou achat introuvable." }, { status: 404 })
  }

  const leadRel = Array.isArray((purchase as any).leads)
    ? (purchase as any).leads[0]
    : (purchase as any).leads
  const contactPreference =
    leadRel?.contact_preference ||
    leadRel?.qualification_metadata?.contactPreference ||
    null

  // Vérifier les règles contractuelles (Article 5 des CGV : fenêtre 7j ouvrés, délai min 24h si injoignable, diligence, 20 car. min, garde-fou wrong_number)
  const eligibility = checkDisputeEligibility({
    reason,
    purchasedAt: purchase.purchased_at,
    details: trimmedDetails,
    contactPreference,
    diligenceConfirmed:
      typeof diligenceConfirmed === "boolean" ? diligenceConfirmed : undefined,
    wrongNumberProof: wrongNumberProof ?? null,
    requireWrongNumberProof: reason === "wrong_number",
    phoneVerified: Boolean(leadRel?.phone_verified),
    emailVerified: Boolean(leadRel?.email_verified),
    wrongNumberVerifiedAck:
      typeof wrongNumberVerifiedAck === "boolean" ? wrongNumberVerifiedAck : undefined,
  })

  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: eligibility.error || "Réclamation non recevable.", code: eligibility.code },
      { status: 400 }
    )
  }

  // Vérifier si une réclamation est déjà en cours
  const { data: existing } = await admin
    .from("lead_disputes")
    .select("id, status")
    .eq("purchase_id", purchaseId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: `Une réclamation pour ce dossier a déjà été enregistrée (Statut : ${existing.status}).`,
    }, { status: 409 })
  }

  const storedDetails =
    reason === "wrong_number" && wrongNumberProof
      ? `[${getWrongNumberProofLabel(wrongNumberProof)}] ${trimmedDetails}`
      : trimmedDetails

  const { data: dispute, error: insertErr } = await admin
    .from("lead_disputes")
    .insert({
      partner_id: partner.id,
      purchase_id: purchaseId,
      lead_id: leadId,
      reason,
      details: storedDetails,
      status: "pending",
      credits_refunded: 0,
    })
    .select()
    .single()

  if (insertErr) {
    console.error("[disputes:insert] error:", insertErr)
    return NextResponse.json({ error: "Impossible d'enregistrer la réclamation. Veuillez réessayer ou contacter le support." }, { status: 500 })
  }

  // Calculer le ratio anti-abus 30 jours du partenaire (CGV Art. 5.6 : seuil 8 %)
  const cutoffIso = new Date(
    Date.now() - DISPUTE_ABUSE_ROLLING_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
  const [{ data: pPurchases }, { data: pDisputes }] = await Promise.all([
    admin
      .from("lead_purchases")
      .select("partner_id, purchased_at")
      .eq("partner_id", partner.id)
      .gte("purchased_at", cutoffIso),
    admin
      .from("lead_disputes")
      .select("partner_id, status, created_at")
      .eq("partner_id", partner.id)
      .gte("created_at", cutoffIso),
  ])

  const partnerStats30d = computePartnerDisputeStats30d({
    purchases: pPurchases ?? [],
    disputes: pDisputes ?? [],
  }).get(partner.id)

  // Noter dans l'audit log
  try {
    await admin.from("audit_log").insert({
      action: "LEAD_DISPUTE_FILED",
      entity_type: "lead_disputes",
      entity_id: dispute.id,
      details: {
        partner_id: partner.id,
        lead_id: leadId,
        reason,
        partner_stats_30d: partnerStats30d ?? null,
      },
    })
  } catch {
    /* silent */
  }

  // Notification email à l'administrateur pour traitement sous 24h ouvrées
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || "contact@aegissolaire.com"
      const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
      const baseUrl = getEmailSiteBaseUrl()
      const adminDisputesUrl = `${baseUrl}/admin/disputes`
      const leadRef = leadId.slice(0, 8).toUpperCase()
      const reasonMeta = getDisputeReasonConfig(reason)
      const abuseWarning = partnerStats30d?.exceedsAbuseThreshold
        ? `⚠️ ALERTE ANTI-ABUS (Art. 5.6 CGV) : ${partnerStats30d.disputes30d}/${partnerStats30d.purchases30d} (${partnerStats30d.disputeRatePct} % > ${DISPUTE_ABUSE_THRESHOLD_PERCENT} % sur 30j)`
        : null
      const subject = `[Aegis Solaire - Litige${partnerStats30d?.exceedsAbuseThreshold ? " · ALERTE >8%" : ""}] Nouvelle réclamation de ${partner.company_name} (Lead #${leadRef})`
      const text = `Une nouvelle demande de Garantie Lead Conforme a été ouverte :\n\n- Installateur : ${partner.company_name} (${partner.email})\n- Ratio 30j : ${partnerStats30d ? `${partnerStats30d.disputes30d}/${partnerStats30d.purchases30d} (${partnerStats30d.disputeRatePct} %)` : "N/A"}\n- Lead ID : ${leadId}\n- Motif : ${reasonMeta.label}\n- Préférence contact prospect : ${contactPreference === "direct_call" ? "Appel direct" : "Approche écrite d'abord"}\n- Vérifications : Tél ${leadRel?.phone_verified ? "OTP vérifié" : "Non OTP"} · E-mail ${leadRel?.email_verified ? "Confirmé" : "Non confirmé"}\n- Crédits engagés : ${purchase.credits_spent ?? 0}\n- Détails : ${trimmedDetails}\n\nTraiter sous 24h ouvrées dans l'interface d'administration :\n${adminDisputesUrl}`

      const bodyHtml = `
        ${
          abuseWarning
            ? renderCalloutBox({
                label: "Surveillance anti-abus · Article 5.6 CGV",
                value: abuseWarning,
                tone: "warning",
              })
            : ""
        }
        ${renderCalloutBox({
          label: "Détails du signalement",
          value: trimmedDetails,
          tone: "warning",
        })}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding-top: 14px; border-top: 1px solid #e4edf1;">
              ${renderSpecsTable([
                { label: "Installateur", value: `${partner.company_name} (${partner.email})` },
                {
                  label: "Ratio contestation 30 j",
                  value: partnerStats30d
                    ? `${partnerStats30d.disputes30d} / ${partnerStats30d.purchases30d} (${partnerStats30d.disputeRatePct} %)`
                    : "0 %",
                },
                { label: "Lead ID", value: leadId },
                { label: "Motif", value: reasonMeta.label },
                {
                  label: "Préférence prospect",
                  value: contactPreference === "direct_call" ? "Appel direct" : "Approche écrite d'abord",
                },
                {
                  label: "Certifications lead",
                  value: `Tél ${leadRel?.phone_verified ? "OTP vérifié" : "Non OTP"} · E-mail ${leadRel?.email_verified ? "Confirmé" : "Non confirmé"}`,
                },
                { label: "Crédits engagés", value: `${purchase.credits_spent ?? 0} crédits` },
              ])}
            </td>
          </tr>
        </table>
        ${renderActionBox({
          kicker: "Engagement conformité · 24h ouvrées",
          title: `Réclamation #${leadRef}`,
          subtext: "Approuver le recrédit ou clôturer depuis le panneau admin.",
          ctaLabel: "Traiter la réclamation →",
          ctaUrl: adminDisputesUrl,
        })}
      `

      const html = renderInstallerEmailShell({
        subject,
        preheader: `${partner.company_name} a ouvert une réclamation sur le dossier #${leadRef} (${reason}).`,
        reference: `Litige #${leadRef}`,
        context: "Administration · Garantie Lead Conforme",
        contextColor: "#89610e",
        headline: "Nouvelle réclamation partenaire",
        subtitle: `${partner.company_name} · ${purchase.credits_spent ?? 0} crédits engagés`,
        statusPill: { text: "À traiter sous 24 h ouvrées", tone: "warning" },
        bodyHtml,
        logoHref: `${baseUrl}/admin/disputes`,
        footerLinks: [
          { label: "Panneau litiges", href: adminDisputesUrl },
          { label: "Dashboard admin", href: `${baseUrl}/admin` },
        ],
        footerLegalText: "Aegis Solaire · Notification interne Conformité & Litiges",
      })

      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject,
        text,
        html,
      })
    } catch {
      /* silent */
    }
  }

  return NextResponse.json({
    success: true,
    message: "Votre signalement a été transmis à l'équipe conformité Aegis Solaire. Examen et recrédit sous 24h ouvrées.",
    dispute,
  })
}
