import { Resend } from "resend"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

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

function dashboardUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aegissolaire.com").replace(/\/$/, "")
  return `${base}/partenaires`
}

const SURFACE_TYPE_LABELS: Record<string, string> = {
  toiture: "Toiture",
  parking: "Parking",
  terrain: "Terrain",
  friche: "Friche",
}

const GRD_LABELS: Record<string, string> = {
  ores: "Ores",
  resa: "Resa",
  aieg: "AIEG",
  rew: "REW",
  fluvius: "Fluvius",
  unknown: "Je ne sais pas",
}

export type PartnerLeadTeaserPayload = {
  targetEmails: string[]
  segment?: string
  province: string
  provinceFreeText?: string | null
  surfaceType: string
  surfaceArea: number
  annualElectricityBill: number
  grd: string | null | undefined
  /** Texte déjà sanitizé côté appelant ; ne pas repasser d’identifiants. */
  projectDetails: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildPartnerLeadTeaserContent(payload: PartnerLeadTeaserPayload): {
  subject: string
  text: string
  html: string
} {
  const provinceLabel = getProvinceDisplayLabel(payload.province, payload.provinceFreeText)
  const typeLabel = SURFACE_TYPE_LABELS[payload.surfaceType] ?? payload.surfaceType
  const grdKey = payload.grd ?? "unknown"
  const grdLabel = GRD_LABELS[grdKey] ?? (payload.grd ?? "—")
  const facture = `${payload.annualElectricityBill.toLocaleString("fr-BE")} € HT / an`
  const surface = `${payload.surfaceArea.toLocaleString("fr-BE")} m²`
  const precisions =
    payload.projectDetails && payload.projectDetails.trim() !== ""
      ? payload.projectDetails.trim()
      : "—"
  const ctaUrl = dashboardUrl()

  const subject = `⚡ Nouveau Lead B2B Solaire disponible — ${provinceLabel}`

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

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
    }
    table { border-collapse: separate; border-spacing: 0; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      font-variant-numeric: tabular-nums !important;
    }
    a { color: #2563EB; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-body { padding: 24px 18px !important; }
      .email-header { padding: 18px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 28px 12px 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container avec liseré Cobalt Tech au sommet -->
        <table role="presentation" class="email-container" width="600" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #2563EB; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header Blanc Pur pour contraste maximal avec logo.png -->
          <tr>
            <td class="email-header" style="background-color: #FFFFFF; padding: 22px 32px; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="https://www.aegissolaire.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="https://www.aegissolaire.com/logo.png" alt="Aegis Solaire" width="160" height="34" style="height: 34px; width: auto; max-width: 180px; display: block; border: 0; outline: none; text-decoration: none;" />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span class="mono" style="display: inline-block; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; letter-spacing: 0.04em; text-transform: uppercase;">
                      Projet B2B Exclusif
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="email-body" style="padding: 34px 32px 28px 32px;">
              
              <p class="mono" style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #2563EB; text-transform: uppercase; letter-spacing: 0.08em;">
                Alerte Dossier Professionnel · ${escapeHtml(provinceLabel)}
              </p>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; line-height: 1.25; color: #0F172A; letter-spacing: -0.02em;">
                Nouveau projet B2B disponible en Wallonie
              </h1>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Un nouveau projet photovoltaïque d'envergure professionnelle vient d'être validé par nos auditeurs techniques dans la province de <strong>${escapeHtml(provinceLabel)}</strong>.
              </p>

              <!-- Bento Project Card -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <p class="mono" style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.06em;">
                  📋 Spécifications du projet :
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="42%" style="padding: 8px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #E2E8F0;">Type d'implantation :</td>
                    <td width="58%" style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #E2E8F0;">${escapeHtml(typeLabel)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #E2E8F0;">Surface disponible :</td>
                    <td class="mono" style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F172A; border-bottom: 1px solid #E2E8F0;">${escapeHtml(surface)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #E2E8F0;">Localisation :</td>
                    <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #E2E8F0;">${escapeHtml(provinceLabel)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #E2E8F0;">Facture électrique annuelle :</td>
                    <td class="mono" style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #2563EB; border-bottom: 1px solid #E2E8F0;">${escapeHtml(facture)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 13px; color: #64748B; border-bottom: 1px solid #E2E8F0;">Gestionnaire de réseau (GRD) :</td>
                    <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #0F172A; border-bottom: 1px solid #E2E8F0;">${escapeHtml(grdLabel)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-size: 13px; color: #64748B;">Précisions du client :</td>
                    <td style="padding: 8px 0; font-size: 13px; color: #334155; font-style: italic;">${escapeHtml(precisions).replace(/\n/g, "<br/>")}</td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center" style="padding: 4px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);">
                          <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; padding: 15px 36px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: 0.01em;">
                            Débloquer ce dossier sur le Dashboard &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span class="mono" style="font-size: 12px; color: #64748B;">Exclusivité 100% garantie · 1 seul installateur</span>
                  </td>
                </tr>
              </table>

              <!-- Support Box -->
              <div style="background-color: #F1F5F9; border-left: 3px solid #2563EB; padding: 16px 18px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0F172A;">
                  Une question technique ou d'ingénierie sur ce dossier ?
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #475569;">
                  Notre cellule technique et support partenaires est à votre écoute : <a href="mailto:contact@aegissolaire.com" style="color: #2563EB; font-weight: 600; text-decoration: underline;">contact@aegissolaire.com</a>.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 22px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; line-height: 1.6; color: #64748B;">
              <p style="margin: 0 0 6px 0;">
                <strong>Aegis Solaire</strong> &mdash; Plateforme d'audit financier et de mise en relation photovoltaïque indépendante en Wallonie.
              </p>
              <p style="margin: 0 0 6px 0;">
                Éditée par <strong>INIT42</strong> (Nathan Remacle, personne physique) · BCE/TVA <span class="mono">BE 1039.899.980</span> · Liège, Belgique.
              </p>
              <p style="margin: 0;">
                Agrément RESCERT Photovoltaïque · Conformité CWaPE &amp; PACE 2030.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()

  return { subject, text, html }
}

/**
 * Envoie le teaser anonymisé aux destinataires ciblés (depuis DB + fallback env).
 */
export async function sendPartnerLeadTeaserEmails(payload: PartnerLeadTeaserPayload): Promise<void> {
  const envRecipients = getEnvPartnerAlertRecipients()
  const recipients = Array.from(new Set([...payload.targetEmails, ...envRecipients]))

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
