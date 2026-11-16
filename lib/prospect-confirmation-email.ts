import { Resend } from "resend"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

export type ProspectConfirmationPayload = {
  email: string
  firstName: string
  lastName?: string | null
  segment: "B2B" | "B2C"
  surfaceType?: string | null
  surfaceArea?: number | null
  annualElectricityBill?: number | null
  estimatedSavings?: number | null
  estimatedROIYears?: number | null
  province?: string | null
}

export function buildProspectConfirmationEmail(payload: ProspectConfirmationPayload): {
  subject: string
  text: string
  html: string
} {
  const isB2C = payload.segment === "B2C"
  const rawName = payload.firstName?.trim() || "Bonjour"
  const baseUrl = getEmailSiteBaseUrl()
  const surface = payload.surfaceArea
    ? `${payload.surfaceArea.toLocaleString("fr-BE")} m²`
    : "Non spécifiée"
  const economies = payload.estimatedSavings
    ? `${payload.estimatedSavings.toLocaleString("fr-BE")} € / an`
    : "Étude en cours"
  const roi = payload.estimatedROIYears
    ? `~${payload.estimatedROIYears} ans`
    : "Selon autoconsommation"

  const subject = `Votre estimation solaire personnalisée — Aegis Solaire Wallonie`

  const text = `Bonjour ${rawName},

Merci d'avoir utilisé le simulateur solaire Aegis Solaire.

Synthèse de votre modélisation :
- Segment : ${isB2C ? "Résidentiel (Particulier)" : "Professionnel & Entreprise (B2B)"}
- Surface utile estimée : ${surface}
- Économies annuelles potentielles : ${economies}
- Retour sur investissement estimé : ${roi}

Prochaines étapes :
${
  isB2C
    ? "Votre projet a été transmis à jusqu'à 3 installateurs certifiés RESCERT de votre région en Wallonie afin de vous fournir un comparatif de devis gratuit et sans engagement."
    : "Votre dossier technique a été qualifié et transmis en exclusivité à 1 installateur partenaire certifié RESCERT pour valider la faisabilité technique sur site (toiture, cabine HT, raccordement ORES/RESA)."
}

Besoin d'une précision ? Répondez directement à cet e-mail ou écrivez à contact@aegissolaire.com.

Conformément au RGPD, vous disposez d'un droit d'accès, d'opposition et de rectification de vos données personnelles (dpo@aegissolaire.com).
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`

  const bodyHtml = `
    <p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.5; color: #142d42;">
      Bonjour <strong>${escapeEmailHtml(rawName)}</strong>, nous confirmons la bonne réception de votre demande d'étude photovoltaïque en Wallonie.
    </p>

    ${renderFiguresBox(
      {
        label: "Économies estimées",
        value: economies,
        sublabel: `Surface projetée · ${surface}`,
      },
      {
        label: "Amortissement indicatif",
        value: roi,
        sublabel: isB2C ? "Comparatif max 3 artisans" : "Exclusivité 1 artisan B2B",
      }
    )}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Prochaines étapes de votre dossier
          </h2>
          ${renderSpecsTable([
            { label: "Segment", value: isB2C ? "Résidentiel (Particulier)" : "Professionnel (B2B)" },
            {
              label: "Mise en relation",
              value: isB2C
                ? "Jusqu'à 3 installateurs certifiés RESCERT sans engagement"
                : "1 installateur partenaire unique certifié RESCERT",
            },
            { label: "Certification requise", value: "Agrément RESCERT & conformité Synergrid C10/11" },
          ])}
        </td>
      </tr>
    </table>

    ${renderCalloutBox({
      label: "Garantie qualité Aegis Solaire",
      value:
        "Tous nos installateurs partenaires sont vérifiés pour leur agrément RESCERT Photovoltaïque, leur assurance décennale et l'utilisation de matériel Tier-1.",
      tone: "info",
    })}

    <p style="margin: 14px 0 0 0; font-size: 14px; line-height: 1.5; color: #4d6374;">
      Une question ou une modification à apporter ? Répondez directement à cet e-mail ou écrivez à <a href="mailto:contact@aegissolaire.com" style="color: #194767; text-decoration: underline;">contact@aegissolaire.com</a>.
    </p>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Synthèse de votre étude solaire en Wallonie · Économies estimées : ${economies}.`,
    reference: isB2C ? "Résidentiel" : "B2B Expert",
    context: "Confirmation de votre demande",
    headline: "Votre estimation solaire",
    subtitle: isB2C ? "Étude résidentielle · Wallonie" : "Étude professionnelle B2B · Wallonie",
    statusPill: { text: "Dossier transmis à nos partenaires RESCERT", tone: "success" },
    bodyHtml,
    logoHref: baseUrl,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Droits RGPD", href: "mailto:dpo@aegissolaire.com" },
      { label: "Politique de confidentialité", href: `${baseUrl}/politique-confidentialite#desinscription` },
    ],
  })

  return { subject, text, html }
}

export async function sendProspectConfirmationEmail(
  payload: ProspectConfirmationPayload
): Promise<{ success: boolean; error?: string }> {
  if (!resendApiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Prospect confirmation] RESEND_API_KEY non configurée — envoi ignoré en dev pour:", payload.email)
    }
    return { success: true }
  }

  try {
    const resend = new Resend(resendApiKey)
    const { subject, text, html } = buildProspectConfirmationEmail(payload)

    const res = await resend.emails.send({
      from: fromEmail,
      to: payload.email,
      replyTo: replyToEmail,
      subject,
      text,
      html,
    })

    if (res.error) {
      console.error("[Prospect confirmation] Erreur Resend:", res.error)
      return { success: false, error: res.error.message }
    }

    return { success: true }
  } catch (err) {
    console.error("[Prospect confirmation] Exception Resend:", err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
