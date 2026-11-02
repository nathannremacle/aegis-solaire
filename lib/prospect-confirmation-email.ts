import { Resend } from "resend"

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildProspectConfirmationEmail(payload: ProspectConfirmationPayload): {
  subject: string
  text: string
  html: string
} {
  const isB2C = payload.segment === "B2C"
  const name = payload.firstName ? escapeHtml(payload.firstName) : "Bonjour"
  const surface = payload.surfaceArea ? `${payload.surfaceArea.toLocaleString("fr-BE")} m²` : "Non spécifiée"
  const economies = payload.estimatedSavings
    ? `${payload.estimatedSavings.toLocaleString("fr-BE")} € / an`
    : "Étude personnalisée en cours"
  const roi = payload.estimatedROIYears ? `~${payload.estimatedROIYears} ans` : "Selon autoconsommation"

  const subject = `Votre estimation solaire personnalisée — Aegis Solaire Wallonie`

  const text = `Bonjour ${name},

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

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; border-top: 4px solid #2563EB; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0F172A; padding: 28px 32px; text-align: left;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Aegis Solaire</h1>
                    <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Transition Solaire Wallonie</p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(245,158,11,0.15); border: 1px solid #F59E0B; color: #F59E0B; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
                      ${isB2C ? "RÉSIDENTIEL" : "B2B EXPERT"}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5; color: #0F172A;">
                Bonjour <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Nous confirmons la bonne réception de votre demande d'étude photovoltaïque pour la Région wallonne. Voici la synthèse des éléments renseignés :
              </p>

              <!-- Estimation Box -->
              <table role="presentation" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px; padding: 18px;">
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748B; font-weight: 600;">Surface projetée :</td>
                  <td style="padding: 8px 12px; font-size: 14px; color: #0F172A; font-weight: 700; text-align: right; font-family: ui-monospace, monospace;">${surface}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748B; font-weight: 600;">Économies estimées :</td>
                  <td style="padding: 8px 12px; font-size: 15px; color: #2563EB; font-weight: 800; text-align: right; font-family: ui-monospace, monospace;">${economies}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-size: 13px; color: #64748B; font-weight: 600;">Amortissement indicatif :</td>
                  <td style="padding: 8px 12px; font-size: 14px; color: #0F172A; font-weight: 700; text-align: right; font-family: ui-monospace, monospace;">${roi}</td>
                </tr>
              </table>

              <h2 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #0F172A;">
                Prochaines étapes de votre dossier
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                ${
                  isB2C
                    ? "Votre projet a été transmis à jusqu'à <strong>3 installateurs certifiés RESCERT</strong> en Wallonie afin de vous permettre de comparer les offres techniques et les devis sans aucun engagement."
                    : "Votre demande est prise en charge par <strong>1 installateur partenaire unique et certifié RESCERT</strong>. Il vous recontactera directement pour auditer la structure de toiture, le point de livraison réseau et l'autoconsommation optimale de votre site."
                }
              </p>

              <div style="background-color: #EFF6FF; border-left: 4px solid #2563EB; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1E40AF;">
                  💡 <strong>Garantie qualité :</strong> Tous nos installateurs partenaires sont vérifiés pour leur agrément officiel <em>RESCERT Photovoltaïque</em>, leur assurance décennale et l'utilisation de matériel certifié Tier-1 conforme aux prescriptions Synergrid C10/11.
                </p>
              </div>

              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #475569;">
                Pour toute question ou demande de modification, vous pouvez répondre directement à cet e-mail ou nous écrire à <a href="mailto:contact@aegissolaire.com" style="color: #2563EB; font-weight: 600;">contact@aegissolaire.com</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F1F5F9; padding: 20px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; line-height: 1.6; color: #64748B;">
              <p style="margin: 0 0 6px 0;">
                Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
              </p>
              <p style="margin: 0;">
                Conformément au RGPD, vous disposez d'un droit d'accès, d'opposition et d'effacement de vos données personnelles via notre DPO (<a href="mailto:dpo@aegissolaire.com" style="color: #475569;">dpo@aegissolaire.com</a>) ou en consultant notre <a href="https://www.aegissolaire.com/politique-confidentialite#desinscription" style="color: #475569;">politique de confidentialité</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

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
