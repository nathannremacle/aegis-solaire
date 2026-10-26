import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

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
      { error: "Veuillez préciser votre demande ou vos questions pour nos ingénieurs." },
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

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A; line-height: 1.5;">
          <div style="padding: 20px 0; border-bottom: 2px solid #0F172A;">
            <h2 style="margin: 0; font-size: 18px; color: #0F172A;">Nouvelle demande d'accompagnement expert</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">Reçue via la Marketplace / Espace Partenaire</p>
          </div>

          <div style="padding: 20px 0;">
            <p style="font-size: 14px;"><strong>Partenaire :</strong> ${escapeHtml(partner.company_name)}</p>
            <p style="font-size: 14px;"><strong>Email de contact :</strong> ${escapeHtml(partner.email)}</p>
            <p style="font-size: 14px;"><strong>Téléphone direct :</strong> ${escapeHtml(partnerPhone)} (Préférence : ${preferredContact === "phone" ? "Téléphone" : preferredContact === "email" ? "E-mail" : "Les deux"})</p>
            <p style="font-size: 14px;"><strong>Type d'étude demandée :</strong> <span style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${escapeHtml(studyLabel)}</span></p>

            ${
              leadReference || leadData
                ? `
              <div style="margin: 16px 0; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #475569;">Dossier rattaché</p>
                <p style="margin: 0; font-size: 13px;">${escapeHtml(leadReference || (leadData ? `${leadData.segment} · ${leadData.city || ""} (${leadData.postal_code || ""})` : "Dossier externe"))}</p>
                ${
                  leadData
                    ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">Puissance : ${leadData.estimated_power_kwc || "—"} kWc · Surface : ${leadData.surface_area || "—"} m² · Toiture : ${leadData.roof_material || "Standard"}</p>`
                    : ""
                }
              </div>
            `
                : ""
            }

            <div style="margin-top: 16px;">
              <p style="font-size: 13px; font-weight: bold; margin-bottom: 6px;">Questions &amp; Précisions de l'installateur :</p>
              <div style="background: #F1F5F9; padding: 12px; border-radius: 6px; font-size: 13px; white-space: pre-wrap; font-style: italic;">
                "${escapeHtml(message.trim())}"
              </div>
            </div>
          </div>

          <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
            Engagement de prise en charge sous 24h ouvrées · Cellule Technique &amp; Ingénierie Aegis Solaire.
          </div>
        </div>
      `

      // 1. Email interne à la cellule technique
      await resend.emails.send({
        from: fromEmail,
        to: toOfficialEmail,
        replyTo: partner.email,
        subject: emailSubject,
        html: emailHtml,
      })

      // 2. Email accusé de réception au partenaire
      const partnerAckHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0F172A; line-height: 1.5;">
          <div style="padding: 20px 0; border-bottom: 2px solid #0F172A;">
            <h2 style="margin: 0; font-size: 18px; color: #0F172A;">Cellule Technique &amp; Ingénierie Aegis Solaire</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">Accusé de réception de votre demande d'étude</p>
          </div>

          <div style="padding: 20px 0;">
            <p style="font-size: 14px;">Bonjour,</p>
            <p style="font-size: 14px;">
              Nous avons bien reçu votre demande d'accompagnement expert concernant : <strong>${escapeHtml(studyLabel)}</strong>.
            </p>
            ${
              leadReference
                ? `<p style="font-size: 13px; color: #475569;"><strong>Dossier concerné :</strong> ${escapeHtml(leadReference)}</p>`
                : ""
            }
            <div style="margin: 16px 0; padding: 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #475569;">Récapitulatif de votre note</p>
              <p style="margin: 0; font-size: 13px; font-style: italic;">"${escapeHtml(message.trim())}"</p>
            </div>
            <p style="font-size: 13px; color: #334155;">
              Un ingénieur de notre cellule technique analyse les spécificités de votre dossier (raccordement GRD, faisabilité PEB/PACE 2030, dimensionnement et rentabilité) et vous recontactera sous <strong>24 heures ouvrées</strong> par ${preferredContact === "phone" ? "téléphone" : preferredContact === "email" ? "e-mail" : "téléphone ou e-mail"}.
            </p>
          </div>

          <div style="padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
            L'équipe Support &amp; Cellule Technique Aegis Solaire · <a href="mailto:contact@aegissolaire.com" style="color: #0F172A; font-weight: 600;">contact@aegissolaire.com</a>
          </div>
        </div>
      `

      await resend.emails.send({
        from: fromEmail,
        to: partner.email,
        replyTo: toOfficialEmail,
        subject: `Prise en charge de votre demande d'étude expert — Aegis Solaire`,
        html: partnerAckHtml,
      })
    } catch (emailErr) {
      console.warn("[expert-request] email send error (non blocking):", emailErr)
    }
  }

  return NextResponse.json({
    success: true,
    message: "Votre demande d'étude a été transmise à notre Cellule Technique & Ingénierie. Examen sous 24h ouvrées.",
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
