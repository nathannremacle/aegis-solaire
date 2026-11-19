import { Resend } from "resend"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
  type EmailSpecRow,
} from "@/lib/email-templates/installer-email-layout"
import {
  AI_PROJECTION_BADGE_SHORT,
  AI_PROJECTION_EMAIL_CAPTION,
} from "@/lib/lead-images"

export type LeadDetailsForEmail = {
  first_name: string
  last_name: string | null
  email: string
  phone: string | null
  job_title: string
  company: string | null
  surface_type: string | null
  surface_area: number | null
  annual_electricity_bill: number | null
  project_timeline?: string | null
  estimated_roi_years?: number | null
  estimated_savings?: number | null
  roof_image_url?: string | null
  roof_image_is_ai_projection?: boolean
  message?: string | null
}

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

export function buildLeadAssignedEmail(lead: LeadDetailsForEmail): {
  subject: string
  text: string
  html: string
} {
  const contactName = `${lead.first_name}${lead.last_name ? ` ${lead.last_name}` : ""}`.trim()
  const subject = `[Aegis Solaire] Nouveau lead assigné : ${contactName}`
  const baseUrl = getEmailSiteBaseUrl()
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`

  const surface =
    lead.surface_area != null && lead.surface_type
      ? `${lead.surface_area.toLocaleString("fr-BE")} m² (${lead.surface_type})`
      : lead.surface_area != null
        ? `${lead.surface_area.toLocaleString("fr-BE")} m²`
        : "—"
  const facture =
    lead.annual_electricity_bill != null
      ? `${lead.annual_electricity_bill.toLocaleString("fr-BE")} € HT / an`
      : "—"
  const roi = lead.estimated_roi_years != null ? `${lead.estimated_roi_years} ans` : "—"
  const economies =
    lead.estimated_savings != null
      ? `${lead.estimated_savings.toLocaleString("fr-BE")} € / an`
      : "—"

  const specRows: EmailSpecRow[] = [
    { label: "Surface", value: surface },
    { label: "Facture annuelle", value: facture },
    { label: "ROI estimé", value: roi },
    { label: "Économies estimées", value: economies },
    ...(lead.project_timeline ? [{ label: "Échéance", value: lead.project_timeline }] : []),
    ...(lead.message?.trim()
      ? [{ label: "Message du prospect", value: `« ${lead.message.trim()} »`, italic: true }]
      : []),
  ]

  const bodyHtml = `
    ${renderFiguresBox(
      {
        label: "Économies estimées",
        value: economies,
        sublabel: `ROI estimé · ${roi}`,
      },
      {
        label: "Facture annuelle",
        value: facture,
        sublabel: surface !== "—" ? `Surface · ${surface}` : null,
      }
    )}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td style="padding: 14px 15px;">
          <h2 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Coordonnées du prospect
          </h2>
          ${renderSpecsTable([
            { label: "Contact", value: contactName },
            { label: "Fonction", value: lead.job_title || "—" },
            ...(lead.company ? [{ label: "Entreprise", value: lead.company }] : []),
            { label: "Téléphone", value: lead.phone ?? "—" },
            { label: "E-mail", value: lead.email },
          ])}
        </td>
      </tr>
    </table>

    ${renderActionBox({
      kicker: "Attribution directe Speed-to-Lead",
      title: "Coordonnées complètes disponibles",
      subtext: "Contactez le prospect rapidement pour maximiser la transformation.",
      ctaLabel: "Ouvrir l'espace partenaire →",
      ctaUrl: dashboardUrl,
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Détails du projet
          </h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              ${
                lead.roof_image_url
                  ? `<td class="photo-cell" width="42%" style="width: 42%; padding-right: 15px; vertical-align: top;">
                      <img src="${escapeEmailHtml(lead.roof_image_url)}" alt="Photo du bâtiment" width="230" style="display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 7px; border: 1px solid #e2eaf0;" />
                      ${
                        lead.roof_image_is_ai_projection
                          ? `<p style="margin: 6px 0 0 0; padding: 5px 8px; background-color: #fff5df; border-left: 3px solid #d69729; border-radius: 0 5px 5px 0; font-size: 11px; line-height: 1.4; color: #684916;">
                              <strong>${escapeEmailHtml(AI_PROJECTION_BADGE_SHORT)}</strong><br />
                              ${escapeEmailHtml(AI_PROJECTION_EMAIL_CAPTION)}
                            </p>`
                          : `<p style="margin: 4px 0 0 0; font-size: 12px; color: #4d6374;">Photo du bâtiment</p>`
                      }
                    </td>`
                  : ""
              }
              <td class="spec-cell" style="vertical-align: top;">
                ${renderSpecsTable(specRows)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Lead assigné : ${contactName}${lead.company ? ` (${lead.company})` : ""} · ${lead.phone || lead.email}`,
    reference: "Attribution directe",
    context: "Nouveau dossier assigné",
    contextColor: "#1d5d45",
    headline: contactName,
    subtitle: `${lead.job_title}${lead.company ? ` · ${lead.company}` : ""}`,
    statusPill: { text: "Speed-to-Lead · Coordonnées complètes", tone: "success" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Espace partenaire", href: dashboardUrl },
    ],
  })

  const text = `AEGIS SOLAIRE — NOUVEAU LEAD ASSIGNÉ
${contactName}${lead.company ? ` (${lead.company})` : ""}

COORDONNÉES :
• Fonction : ${lead.job_title || "—"}
• Téléphone : ${lead.phone ?? "—"}
• E-mail : ${lead.email}

PROJET :
${specRows.map((r) => `• ${r.label} : ${r.value}`).join("\n")}${
    lead.roof_image_url && lead.roof_image_is_ai_projection
      ? `\n• Visuel du bâtiment : ${AI_PROJECTION_BADGE_SHORT} (${AI_PROJECTION_EMAIL_CAPTION})`
      : ""
  }

Espace partenaire : ${dashboardUrl}
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
`.trim()

  return { subject, text, html }
}

export async function sendLeadAssignedEmail(
  installateurEmail: string,
  lead: LeadDetailsForEmail
): Promise<void> {
  const { subject, text, html } = buildLeadAssignedEmail(lead)

  if (!resendApiKey) {
    console.log("[Speed-to-Lead] RESEND_API_KEY non définie – e-mail simulé:", {
      to: installateurEmail,
      subject,
      lead: `${lead.first_name} ${lead.last_name || ""}`.trim(),
    })
    return
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: installateurEmail,
    replyTo: replyToEmail,
    subject,
    text,
    html,
  })

  if (error) {
    console.error("[Speed-to-Lead] Resend error:", error)
    throw new Error("Échec envoi e-mail")
  }
}
