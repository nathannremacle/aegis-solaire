import { Resend } from "resend"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { getSurfaceTypeLabel, getGrdLabel } from "@/lib/lead-display-helpers"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

/** Liste d’e-mails installateurs (virgule). Ex. : "a@x.be,b@y.be" */
function getEnvPartnerAlertRecipients(): string[] {
  const raw = process.env.PARTNER_LEAD_ALERT_EMAILS ?? ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes("@"))
}

function dashboardUrl(leadId?: string, expressToken?: string): string {
  const base = getEmailSiteBaseUrl()
  if (leadId && expressToken) {
    return `${base}/partenaires/express/${encodeURIComponent(leadId)}?t=${encodeURIComponent(expressToken)}`
  }
  return `${base}/partenaires`
}

export type PartnerLeadTeaserPayload = {
  targetEmails: string[]
  leadId?: string
  expressToken?: string
  segment?: string
  province: string
  provinceFreeText?: string | null
  surfaceType: string
  surfaceArea: number
  annualElectricityBill: number
  grd: string | null | undefined
  roofImageUrl?: string | null
  /** Texte déjà sanitizé côté appelant ; ne pas repasser d’identifiants. */
  projectDetails: string | null
}

export function buildPartnerLeadTeaserContent(payload: PartnerLeadTeaserPayload): {
  subject: string
  text: string
  html: string
} {
  const provinceLabel = getProvinceDisplayLabel(payload.province, payload.provinceFreeText)
  const typeLabel = getSurfaceTypeLabel(payload.surfaceType)
  const grdLabel = payload.grd ? getGrdLabel(payload.grd) : "—"
  const facture = `${payload.annualElectricityBill.toLocaleString("fr-BE")} € HT / an`
  const surface = `${payload.surfaceArea.toLocaleString("fr-BE")} m²`
  const precisions =
    payload.projectDetails && payload.projectDetails.trim() !== ""
      ? payload.projectDetails.trim()
      : "—"
  const ctaUrl = dashboardUrl(payload.leadId, payload.expressToken)

  const subject = `Nouveau projet B2B solaire disponible — ${provinceLabel}`

  const text = `AEGIS SOLAIRE — NOUVEAU PROJET B2B QUALIFIÉ
Tiers de Confiance Wallon · Agrément RESCERT & CWaPE

Un nouveau dossier photovoltaïque B2B exclusif est disponible sur la marketplace Aegis Solaire.

Caractéristiques du projet :
• Type d'implantation : ${typeLabel}
• Surface disponible : ${surface}
• Province : ${provinceLabel}
• Facture électrique estimée : ${facture}
• Gestionnaire de réseau (GRD) : ${grdLabel}
• Précisions techniques : ${precisions}

Débloquer ce dossier sur votre Dashboard :
${ctaUrl}

Règle d'attribution B2B : Exclusivité 100% garantie (1 seul installateur partenaire).

Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique.
`.trim()

  const bodyHtml = `
    ${renderFiguresBox(
    {
      label: "Surface disponible",
      value: surface,
      sublabel: typeLabel,
    },
    {
      label: "Facture électrique annuelle",
      value: facture,
      sublabel: `GRD · ${grdLabel}`,
    }
  )}

    ${renderActionBox({
    kicker: "Attribution B2B",
    title: "Exclusivité 100 % garantie",
    subtext: "1 seul installateur partenaire sur ce projet.",
    ctaLabel: "Débloquer sur le Dashboard →",
    ctaUrl: ctaUrl,
  })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Spécifications du projet
          </h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              ${payload.roofImageUrl
      ? `<td class="photo-cell" width="42%" style="width: 42%; padding-right: 15px; vertical-align: top;">
                      <img src="${escapeEmailHtml(payload.roofImageUrl)}" alt="Visuel du bâtiment" width="230" style="display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 7px; border: 1px solid #e2eaf0;" />
                      <p style="margin: 4px 0 0 0; font-size: 12px; color: #4d6374;">Photo du bâtiment</p>
                    </td>`
      : ""
    }
              <td class="spec-cell" style="vertical-align: top;">
                ${renderSpecsTable([
      { label: "Implantation", value: typeLabel },
      { label: "Localisation", value: provinceLabel },
      { label: "Gestionnaire réseau", value: grdLabel },
      ...(precisions !== "—" ? [{ label: "Précisions", value: precisions, italic: true }] : []),
    ])}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Projet B2B exclusif en ${provinceLabel} · ${surface} · ${facture}.`,
    reference: `B2B · ${provinceLabel}`,
    context: "Nouveau projet photovoltaïque B2B",
    headline: provinceLabel,
    subtitle: `${typeLabel} · ${surface}`,
    statusPill: { text: "Exclusivité B2B · 1 seul installateur", tone: "success" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Accéder au Dashboard", href: ctaUrl },
    ],
  })

  return { subject, text, html }
}

/**
 * Envoie le teaser anonymisé aux destinataires ciblés (depuis DB + fallback env).
 */
export async function sendPartnerLeadTeaserEmails(payload: PartnerLeadTeaserPayload): Promise<void> {
  const envRecipients = getEnvPartnerAlertRecipients()
  const recipients = Array.from(new Set([...payload.targetEmails, ...envRecipients])).filter(
    (email) => {
      const normalized = email.toLowerCase().trim()
      return (
        normalized.includes("@") &&
        !normalized.endsWith("@aegissolaire-pro.be") &&
        !normalized.endsWith("@example.com") &&
        !normalized.endsWith("@test.com")
      )
    }
  )

  if (recipients.length === 0) {
    console.log(
      "[Partner teaser] Aucun destinataire BDD ni ENV trouvé — e-mail d’alerte non envoyé."
    )
    return
  }

  const { subject, text, html } = buildPartnerLeadTeaserContent(payload)

  if (!resendApiKey) {
    console.log("[Partner teaser] RESEND_API_KEY non définie — e-mail simulé:", {
      to: recipients,
      subject,
    })
    return
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    replyTo: replyToEmail,
    subject,
    text,
    html,
  })

  if (error) {
    console.error("[Partner teaser] Resend error:", error)
    return
  }
}
