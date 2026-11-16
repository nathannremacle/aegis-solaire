import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import { buildExpertRequestAckEmail } from "@/lib/email-templates/installer-transactional"
import {
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

export const dynamic = "force-dynamic"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const toOfficialEmail = "contact@aegissolaire.com"

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Session expirée ou non autorisée." }, { status: 401 })
  }

  let body: {
    studyType?: string
    leadId?: string | null
    leadReference?: string | null
    message?: string
    phone?: string
    preferredContact?: "phone" | "email" | "both"
    additionalDetails?: Record<string, any>
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 })
  }

  const {
    studyType = "market_study",
    leadId = null,
    leadReference = null,
    message = "",
    phone = "",
    preferredContact = "phone",
    additionalDetails = {},
  } = body

  if (!message || message.trim().length < 5) {
    return NextResponse.json(
      { error: "Veuillez préciser votre demande ou vos questions pour nos experts." },
      { status: 400 }
    )
  }

  const admin = createServiceRoleClient()

  // 1. Si un lead est ciblé, récupérer les détails pour enrichir la demande
  let leadData: any = null
  if (leadId) {
    const { data: lead } = await admin
      .from("leads")
      .select("id, segment, province, city, postal_code, surface_area, annual_electricity_bill, estimated_power_kwc, roof_material, grd")
      .eq("id", leadId)
      .maybeSingle()
    if (lead) {
      leadData = lead
    }
  }

  const studyLabels: Record<string, string> = {
    market_study: "Étude de marché locale & concurrence (Wallonie)",
    technical_sizing: "Dimensionnement technique & faisabilité (PEB / PACE 2030)",
    financial_roi: "Modélisation financière & Rentabilité B2B (DPI 40%)",
    closing_support: "Aide au closing & contre-expertise client",
    custom: "Demande technique sur-mesure",
  }

  const studyLabel = studyLabels[studyType] || "Accompagnement expert"
  const partnerPhone = phone.trim() || partner.phone || "Non spécifié"

  // 2. Traçabilité complète dans l'audit_log
  try {
    await admin.from("audit_log").insert({
      action: "PARTNER_EXPERT_REQUEST",
      entity_type: "expert_requests",
      entity_id: leadId || partner.id,
      details: {
        partner_id: partner.id,
        partner_company: partner.company_name,
        partner_email: partner.email,
        partner_phone: partnerPhone,
        study_type: studyType,
        study_label: studyLabel,
        lead_id: leadId,
        lead_reference: leadReference,
        lead_data: leadData,
        message: message.trim(),
        preferred_contact: preferredContact,
        additional_details: additionalDetails,
        status: "submitted",
        created_at: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.warn("[expert-request] audit_log insert failed (resilient fallback):", err)
  }

  // 3. Notification par email à la cellule technique et confirmation au partenaire (si Resend configuré)
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey)

      const emailSubject = `[Cellule Technique] Demande d'étude expert : ${partner.company_name} (${studyLabel})`
      const baseUrl = getEmailSiteBaseUrl()
      const prefLabel =
        preferredContact === "phone"
          ? "Téléphone"
          : preferredContact === "email"
            ? "E-mail"
            : "Téléphone ou e-mail"
      const attachedLeadLabel =
        leadReference ||
        (leadData ? `${leadData.segment} · ${leadData.city || ""} (${leadData.postal_code || ""})` : null)

      const emailHtml = renderInstallerEmailShell({
        subject: emailSubject,
        preheader: `${partner.company_name} demande une étude : ${studyLabel}.`,
        reference: leadReference || "Cellule Technique",
        context: "Notification interne · Cellule Technique",
        headline: "Demande d’accompagnement expert",
        subtitle: `${partner.company_name} · ${studyLabel}`,
        statusPill: { text: "Engagement réponse sous 24 h ouvrées", tone: "info" },
        logoHref: `${baseUrl}/admin/leads`,
        bodyHtml: `
          ${renderCalloutBox({
            label: "Questions & précisions de l'installateur",
            value: `« ${message.trim()} »`,
            tone: "info",
          })}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding-top: 14px; border-top: 1px solid #e4edf1;">
                ${renderSpecsTable([
                  { label: "Partenaire", value: partner.company_name },
                  { label: "E-mail", value: partner.email },
                  { label: "Téléphone", value: `${partnerPhone} (${prefLabel})` },
                  { label: "Type d'étude", value: studyLabel },
                  ...(attachedLeadLabel ? [{ label: "Dossier rattaché", value: attachedLeadLabel }] : []),
                  ...(leadData
                    ? [
                        {
                          label: "Dimensionnement",
                          value: `${leadData.estimated_power_kwc || "—"} kWc · ${leadData.surface_area || "—"} m² · ${leadData.roof_material || "Standard"}`,
                        },
                      ]
                    : []),
                ])}
              </td>
            </tr>
          </table>
          ${renderActionBox({
            kicker: "Suivi partenaire",
            title: `Contacter ${partner.company_name}`,
            subtext: `Canal privilégié : ${prefLabel}`,
            ctaLabel: "Répondre par e-mail →",
            ctaUrl: `mailto:${partner.email}?subject=${encodeURIComponent(`Re: ${studyLabel} — Cellule Technique Aegis Solaire`)}`,
          })}
        `,
        footerLinks: [
          { label: "Dashboard Admin", href: `${baseUrl}/admin/leads` },
          { label: "Répondre au partenaire", href: `mailto:${partner.email}` },
        ],
        footerLegalText: "Aegis Solaire · Notification interne Cellule Technique",
      })

      // 1. Email interne à la cellule technique
      await resend.emails.send({
        from: fromEmail,
        to: toOfficialEmail,
        replyTo: partner.email,
        subject: emailSubject,
        html: emailHtml,
      })

      // 2. Email accusé de réception au partenaire
      const partnerAck = buildExpertRequestAckEmail({
        companyName: partner.company_name,
        studyLabel,
        leadReference,
        message: message.trim(),
        preferredContact,
      })

      await resend.emails.send({
        from: fromEmail,
        to: partner.email,
        replyTo: toOfficialEmail,
        subject: partnerAck.subject,
        text: partnerAck.text,
        html: partnerAck.html,
      })
    } catch (emailErr) {
      console.warn("[expert-request] email send error (non blocking):", emailErr)
    }
  }

  return NextResponse.json({
    success: true,
    message: "Votre demande d'étude a été transmise à notre Cellule Technique. Examen sous 24h ouvrées.",
    studyType,
    studyLabel,
  })
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
