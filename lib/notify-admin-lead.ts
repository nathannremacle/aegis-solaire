import { Resend } from "resend"
import { createHmac } from "crypto"

export type ScoreFactor = {
  label: string
  delta: number
}

export type AdminLeadAlertPayload = {
  leadId: string
  firstName: string
  lastName?: string | null
  email: string
  phone?: string | null
  company?: string | null
  companyVat?: string | null
  jobTitle?: string | null
  segment: "B2B" | "B2C" | string
  surfaceType?: string | null
  surfaceArea?: number | null
  annualBill?: number | null
  estimatedSavings?: number | null
  estimatedROIYears?: number | null
  estimatedPowerKwc?: number | null
  annualProductionKwh?: number | null
  estimatedPanelCount?: number | null
  autoconsumptionRate?: number | null
  wantsIrve?: boolean
  province?: string | null
  postalCode?: string | null
  city?: string | null
  siteAddress?: string | null
  grd?: string | null
  ownershipStatus?: string | null
  timeframe?: string | null
  roofMaterial?: string | null
  leadScore?: number | null
  scoreStatus?: "HOT_LEAD" | "new" | "NEEDS_HUMAN_REVIEW" | string | null
  scoreFactors?: ScoreFactor[]
  creditCost?: number | null
  sourceForm?: string | null
  mediaPartnerCode?: string | null
  message?: string | null
}

export type AdminWebinarAlertPayload = {
  leadId: string
  firstName: string
  email: string
  jobTitle: string
  companyName?: string | null
  surfaceRange?: string | null
  sourceForm?: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Clé secrète pour signer le jeton de validation en 1 clic.
 */
function getLeadActionSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RESEND_API_KEY ||
    "aegis-solaire-admin-lead-quick-validate-salt-2026"
  )
}

export function generateLeadValidationToken(leadId: string, timestamp = Date.now()): string {
  const secret = getLeadActionSecret()
  const payload = `${leadId}:${timestamp}`
  const hmac = createHmac("sha256", secret).update(payload).digest("hex")
  return `${timestamp}.${hmac}`
}

export function verifyLeadValidationToken(leadId: string, token: string): boolean {
  if (!leadId || !token || !token.includes(".")) return false
  const [timestampStr, hmac] = token.split(".")
  const timestamp = parseInt(timestampStr, 10)
  if (Number.isNaN(timestamp)) return false

  // Validité maximale de 14 jours
  const maxAgeMs = 14 * 24 * 60 * 60 * 1000
  if (Date.now() - timestamp > maxAgeMs) return false

  const secret = getLeadActionSecret()
  const expected = createHmac("sha256", secret).update(`${leadId}:${timestamp}`).digest("hex")
  return expected.toLowerCase() === hmac.toLowerCase().trim()
}

export function getAdminAlertRecipients(): string[] {
  const custom = process.env.ADMIN_ALERT_EMAIL?.trim()
  if (custom) {
    return custom
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
  }

  const admins = process.env.ADMIN_EMAILS?.trim()
  if (admins) {
    return admins
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
  }

  return ["mrnathanrem@gmail.com"]
}

export function buildAdminLeadAlertEmail(payload: AdminLeadAlertPayload): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
  const token = generateLeadValidationToken(payload.leadId)
  const quickValidateUrl = `${baseUrl}/api/admin/leads/quick-validate?id=${encodeURIComponent(payload.leadId)}&token=${encodeURIComponent(token)}`
  const directLeadDashboardUrl = `${baseUrl}/admin/leads?leadId=${encodeURIComponent(payload.leadId)}`
  const triageUrl = `${baseUrl}/admin/leads?view=triage`

  const isB2B = payload.segment === "B2B"
  const fullName = `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || "Contact non spécifié"
  const location = [payload.postalCode, payload.city, payload.province].filter(Boolean).join(" · ") || "Wallonie"

  const scoreNum = payload.leadScore != null ? Math.round(Number(payload.leadScore)) : null
  const isHotLead = scoreNum != null && scoreNum >= 70
  const isReviewNeeded = scoreNum != null && scoreNum < 40

  const scoreBadgeText = scoreNum != null ? `${scoreNum}/100` : "Non calculé"
  const scoreCategory = isHotLead
    ? "Priorité haute (HOT LEAD)"
    : isReviewNeeded
    ? "À vérifier (score bas)"
    : "Qualifié"

  const companyOrName = payload.company ? `${fullName} (${payload.company})` : fullName
  const subject = `[Aegis Solaire] Nouveau dossier à valider : ${companyOrName} · Score ${scoreBadgeText}`

  const surfaceFormatted = payload.surfaceArea != null ? `${payload.surfaceArea.toLocaleString("fr-BE")} m²` : "–"
  const billFormatted = payload.annualBill != null ? `${payload.annualBill.toLocaleString("fr-BE")} € HT / an` : "–"
  const savingsFormatted = payload.estimatedSavings != null ? `${payload.estimatedSavings.toLocaleString("fr-BE")} € / an` : "–"
  const roiFormatted = payload.estimatedROIYears != null ? `${payload.estimatedROIYears} ans` : "–"
  const powerFormatted = payload.estimatedPowerKwc != null ? `${payload.estimatedPowerKwc} kWc` : "–"
  const productionFormatted = payload.annualProductionKwh != null ? `${payload.annualProductionKwh.toLocaleString("fr-BE")} kWh / an` : "–"
  const panelCountFormatted = payload.estimatedPanelCount != null ? `~${payload.estimatedPanelCount} panneaux` : "–"
  const autoconsumptionFormatted =
    payload.autoconsumptionRate != null
      ? `${Math.round(payload.autoconsumptionRate > 1 ? payload.autoconsumptionRate : payload.autoconsumptionRate * 100)} %`
      : "–"
  const creditsFormatted = payload.creditCost != null ? `${payload.creditCost} crédit${payload.creditCost > 1 ? "s" : ""}` : "–"

  const ownershipLabel =
    payload.ownershipStatus === "owner"
      ? "Propriétaire"
      : payload.ownershipStatus === "tenant_authorized"
      ? "Locataire (accord bailleur)"
      : payload.ownershipStatus === "tenant" || payload.ownershipStatus === "tenant_unauthorized"
      ? "Locataire"
      : payload.ownershipStatus === "co_ownership"
      ? "Copropriété"
      : payload.ownershipStatus ?? "–"

  const factorsText =
    payload.scoreFactors && payload.scoreFactors.length > 0
      ? payload.scoreFactors.map((f) => `  - ${f.label} (${f.delta > 0 ? "+" : ""}${f.delta} pts)`).join("\n")
      : "  - Aucun facteur particulier"

  const text = `NOUVEAU DOSSIER LEAD EN ATTENTE DE VALIDATION
========================================================================

Identifiant : ${payload.leadId}
Segment : ${isB2B ? "Professionnel (B2B)" : "Résidentiel (B2C)"}
Score de qualification : ${scoreBadgeText} (${scoreCategory})
Valeur marketplace : ${creditsFormatted}

VALIDATION DIRECTE EN 1 CLIC :
------------------------------
Pour valider et publier ce lead sans vous connecter, cliquez sur le lien suivant :
${quickValidateUrl}

Ou ouvrir dans le dashboard admin :
${directLeadDashboardUrl}

FACTEURS DE QUALIFICATION :
---------------------------
${factorsText}

COORDONNÉES :
-------------
Nom : ${fullName}
Téléphone : ${payload.phone || "Non renseigné"}
Email : ${payload.email}
${isB2B ? `Entreprise : ${payload.company || "–"}\nNuméro TVA : ${payload.companyVat || "–"}\nFonction : ${payload.jobTitle || "–"}\n` : ""}
Localisation : ${payload.siteAddress ? `${payload.siteAddress}, ` : ""}${payload.postalCode || ""} ${payload.city || ""} (${payload.province || "–"})
GRD compétent : ${payload.grd || "–"}

DONNÉES DU PROJET :
-------------------
Surface utile : ${surfaceFormatted} (${payload.surfaceType || "–"})
Matériau toiture : ${payload.roofMaterial || "–"}
Puissance estimée : ${powerFormatted} (${panelCountFormatted})
Productible annuel : ${productionFormatted}
Facture actuelle : ${billFormatted}
Taux d'autoconsommation : ${autoconsumptionFormatted}
Économies estimées : ${savingsFormatted}
Retour sur investissement : ${roiFormatted}
Statut d'occupation : ${ownershipLabel}
Délai envisagé : ${payload.timeframe || "–"}
Borne IRVE : ${payload.wantsIrve ? "Oui" : "Non"}
Formulaire source : ${payload.sourceForm || "simulateur"}

${payload.message ? `COMMENTAIRE DU PROSPECT :\n${payload.message}\n\n` : ""}
Aegis Solaire · Notification interne`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; margin: 0 auto;">
    <tr>
      <td>

        <!-- En-tête sobre institutionnel -->
        <div style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-bottom: none; border-radius: 8px 8px 0 0; padding: 24px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280;">
                  Aegis Solaire · Plateforme d'Arbitrage
                </span>
                <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 6px 0 2px 0;">
                  Nouveau dossier lead à modérer
                </h1>
                <p style="font-size: 13px; color: #6B7280; margin: 0;">
                  ${isB2B ? "Dossier Professionnel (B2B)" : "Dossier Résidentiel (B2C)"} · Reçu le ${new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </td>
              <td align="right" valign="top" style="white-space: nowrap;">
                <span style="display: inline-block; font-family: monospace; font-size: 11px; color: #4B5563; background-color: #F3F4F6; border: 1px solid #E5E7EB; padding: 3px 8px; border-radius: 4px;">
                  #${escapeHtml(payload.leadId.slice(0, 8))}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <!-- Bloc d'action rapide sobre -->
        <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-left: 3px solid #0F172A; padding: 18px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <p style="font-size: 13px; font-weight: 600; color: #111827; margin: 0 0 4px 0;">
                  Validation en 1 clic
                </p>
                <p style="font-size: 12px; color: #6B7280; margin: 0 0 12px 0;">
                  Publie immédiatement ce dossier sur la marketplace et déclenche la notification aux installateurs certifiés.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <a href="${quickValidateUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
                        Valider et publier sur la marketplace
                      </a>
                    </td>
                    <td style="padding-left: 12px;">
                      <a href="${directLeadDashboardUrl}" style="font-size: 13px; color: #4B5563; text-decoration: underline;">
                        Ouvrir dans l'admin
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <!-- Corps principal -->
        <div style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 8px 8px; padding: 24px 28px;">

          <!-- Synthèse Qualification & Score -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden;">
            <tr>
              <td width="50%" style="padding: 14px 18px; border-right: 1px solid #E5E7EB; background-color: #FAFAFA;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; letter-spacing: 0.05em;">Score de qualification</div>
                <div style="font-size: 22px; font-weight: 700; color: #111827; font-family: monospace; margin: 2px 0;">
                  ${escapeHtml(scoreBadgeText)}
                </div>
                <div style="font-size: 12px; color: ${isHotLead ? "#047857" : isReviewNeeded ? "#B91C1C" : "#4B5563"}; font-weight: 600;">
                  ${escapeHtml(scoreCategory)}
                </div>
              </td>
              <td width="50%" style="padding: 14px 18px; background-color: #FAFAFA;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; letter-spacing: 0.05em;">Prix marketplace</div>
                <div style="font-size: 22px; font-weight: 700; color: #111827; font-family: monospace; margin: 2px 0;">
                  ${escapeHtml(creditsFormatted)}
                </div>
                <div style="font-size: 12px; color: #6B7280;">
                  Tarification installateur V2
                </div>
              </td>
            </tr>
          </table>

          <!-- Facteurs d'évaluation du score -->
          ${
            payload.scoreFactors && payload.scoreFactors.length > 0
              ? `<div style="margin-bottom: 24px; padding: 12px 16px; background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px;">
                  <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6B7280; margin-bottom: 6px; letter-spacing: 0.05em;">
                    Détail du calcul de score :
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px;">
                    ${payload.scoreFactors
                      .map(
                        (f) => `<tr>
                          <td style="padding: 3px 0; color: #374151;">${escapeHtml(f.label)}</td>
                          <td align="right" style="padding: 3px 0; font-family: monospace; font-weight: 600; color: ${f.delta > 0 ? "#047857" : "#DC2626"};">
                            ${f.delta > 0 ? "+" : ""}${f.delta} pts
                          </td>
                        </tr>`
                      )
                      .join("")}
                  </table>
                </div>`
              : ""
          }

          <!-- Coordonnées du contact -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4B5563; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; margin-bottom: 10px;">
              Contact &amp; Identification
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
              <tr>
                <td width="35%" style="padding: 5px 0; color: #6B7280;">Nom complet</td>
                <td style="padding: 5px 0; font-weight: 600; color: #111827;">${escapeHtml(fullName)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Téléphone direct</td>
                <td style="padding: 5px 0;">
                  ${
                    payload.phone
                      ? `<a href="tel:${escapeHtml(payload.phone)}" style="color: #111827; font-family: monospace; font-weight: 600; text-decoration: underline;">${escapeHtml(payload.phone)}</a>`
                      : '<span style="color: #9CA3AF;">Non renseigné</span>'
                  }
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Adresse e-mail</td>
                <td style="padding: 5px 0;">
                  <a href="mailto:${escapeHtml(payload.email)}" style="color: #111827; text-decoration: underline;">${escapeHtml(payload.email)}</a>
                </td>
              </tr>
              ${
                isB2B
                  ? `<tr>
                      <td style="padding: 5px 0; color: #6B7280;">Entreprise</td>
                      <td style="padding: 5px 0; font-weight: 600; color: #111827;">${escapeHtml(payload.company || "–")}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;">Numéro de TVA</td>
                      <td style="padding: 5px 0; font-family: monospace;">${escapeHtml(payload.companyVat || "–")}</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;">Fonction</td>
                      <td style="padding: 5px 0;">${escapeHtml(payload.jobTitle || "–")}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Localisation</td>
                <td style="padding: 5px 0;">${escapeHtml(location)}</td>
              </tr>
              ${
                payload.siteAddress
                  ? `<tr>
                      <td style="padding: 5px 0; color: #6B7280;">Adresse du site</td>
                      <td style="padding: 5px 0;">${escapeHtml(payload.siteAddress)}</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">GRD compétent</td>
                <td style="padding: 5px 0;">${escapeHtml(payload.grd ? payload.grd.toUpperCase() : "–")}</td>
              </tr>
            </table>
          </div>

          <!-- Données du projet -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4B5563; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; margin-bottom: 10px;">
              Données Techniques &amp; Énergétiques
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
              <tr>
                <td width="35%" style="padding: 5px 0; color: #6B7280;">Surface utile</td>
                <td style="padding: 5px 0; font-weight: 600; font-family: monospace;">
                  ${escapeHtml(surfaceFormatted)} <span style="font-weight: 400; color: #6B7280;">(${escapeHtml(payload.surfaceType || "–")})</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Matériau de toiture</td>
                <td style="padding: 5px 0;">${escapeHtml(payload.roofMaterial || "–")}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Puissance estimée</td>
                <td style="padding: 5px 0; font-family: monospace; font-weight: 600;">
                  ${escapeHtml(powerFormatted)} <span style="font-weight: 400; color: #6B7280;">(${escapeHtml(panelCountFormatted)})</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Productible estimé</td>
                <td style="padding: 5px 0; font-family: monospace;">${escapeHtml(productionFormatted)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Facture annuelle</td>
                <td style="padding: 5px 0; font-family: monospace;">${escapeHtml(billFormatted)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Économies estimées</td>
                <td style="padding: 5px 0; font-family: monospace; font-weight: 600; color: #047857;">${escapeHtml(savingsFormatted)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">ROI estimé</td>
                <td style="padding: 5px 0; font-family: monospace;">${escapeHtml(roiFormatted)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Autoconsommation</td>
                <td style="padding: 5px 0; font-family: monospace;">${escapeHtml(autoconsumptionFormatted)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Statut d'occupation</td>
                <td style="padding: 5px 0;">${escapeHtml(ownershipLabel)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Délai envisagé</td>
                <td style="padding: 5px 0;">${escapeHtml(payload.timeframe || "–")}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Borne de recharge</td>
                <td style="padding: 5px 0;">${payload.wantsIrve ? "Oui" : "Non"}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Formulaire source</td>
                <td style="padding: 5px 0; font-family: monospace; font-size: 12px; color: #6B7280;">${escapeHtml(payload.sourceForm || "simulateur")}</td>
              </tr>
            </table>
          </div>

          <!-- Commentaires du prospect -->
          ${
            payload.message
              ? `<div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px;">
                  <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6B7280; margin-bottom: 4px;">
                    Commentaire du prospect :
                  </div>
                  <div style="font-size: 13px; color: #1F2937; white-space: pre-wrap; line-height: 1.4;">${escapeHtml(payload.message)}</div>
                </div>`
              : ""
          }

          <!-- Liens finaux -->
          <div style="padding-top: 16px; border-top: 1px solid #E5E7EB; text-align: center;">
            <a href="${quickValidateUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 11px 24px; border-radius: 6px;">
              Valider ce lead maintenant
            </a>
            <div style="margin-top: 10px;">
              <a href="${directLeadDashboardUrl}" style="font-size: 12px; color: #6B7280; text-decoration: underline;">
                Examiner la fiche complète dans le panneau d'administration
              </a>
              <span style="color: #D1D5DB; margin: 0 6px;">·</span>
              <a href="${triageUrl}" style="font-size: 12px; color: #6B7280; text-decoration: underline;">
                File de triage
              </a>
            </div>
          </div>

        </div>

        <!-- Bas de page -->
        <div style="text-align: center; padding-top: 16px; font-size: 11px; color: #9CA3AF;">
          Aegis Solaire · Notification interne d'arbitrage · <a href="${baseUrl}/admin" style="color: #6B7280;">Administration</a>
        </div>

      </td>
    </tr>
  </table>

</body>
</html>`

  return { subject, text, html }
}

export async function sendAdminNewLeadAlertEmail(
  payload: AdminLeadAlertPayload
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[Admin Lead Alert] RESEND_API_KEY non configurée — alerte ignorée pour lead:", payload.leadId)
    return { success: false, error: "RESEND_API_KEY non configurée" }
  }

  const recipients = getAdminAlertRecipients()
  if (!recipients.length) {
    console.warn("[Admin Lead Alert] Aucun destinataire configuré.")
    return { success: false, error: "Aucun destinataire configuré" }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
  const replyTo = payload.email || process.env.RESEND_REPLY_TO || "contact@aegissolaire.com"

  try {
    const resend = new Resend(apiKey)
    const { subject, text, html } = buildAdminLeadAlertEmail(payload)

    const res = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      replyTo,
      subject,
      text,
      html,
    })

    if (res.error) {
      console.error("[Admin Lead Alert] Erreur Resend:", res.error)
      return { success: false, error: res.error.message }
    }

    return { success: true }
  } catch (err) {
    console.error("[Admin Lead Alert] Exception Resend:", err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function sendAdminWebinarAlertEmail(
  payload: AdminWebinarAlertPayload
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false }

  const recipients = getAdminAlertRecipients()
  if (!recipients.length) return { success: false }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
  const replyTo = payload.email || "contact@aegissolaire.com"
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

  const subject = `[Aegis Solaire] Inscription webinaire B2B : ${payload.firstName} (${payload.companyName || "Entreprise non précisée"})`
  const text = `Nouvelle inscription au webinaire B2B :
- Nom : ${payload.firstName}
- Fonction : ${payload.jobTitle}
- Entreprise : ${payload.companyName || "–"}
- Email : ${payload.email}
- Surface toiture estimée : ${payload.surfaceRange || "–"}
- ID Lead : ${payload.leadId}

Voir le dossier : ${baseUrl}/admin/leads?leadId=${encodeURIComponent(payload.leadId)}`

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: fromEmail,
      to: recipients,
      replyTo,
      subject,
      text,
    })
    return { success: true }
  } catch (err) {
    console.error("[Admin Webinar Alert] Exception Resend:", err)
    return { success: false }
  }
}
