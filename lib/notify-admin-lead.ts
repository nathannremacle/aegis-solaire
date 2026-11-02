import { Resend } from "resend"

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
  province?: string | null
  postalCode?: string | null
  city?: string | null
  siteAddress?: string | null
  grd?: string | null
  ownershipStatus?: string | null
  timeframe?: string | null
  roofMaterial?: string | null
  leadScore?: number | null
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
 * Détermine la liste des destinataires pour les alertes administrateur.
 * Priorité : ADMIN_ALERT_EMAIL > ADMIN_EMAILS > mrnathanrem@gmail.com
 */
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
  const triageUrl = `${baseUrl}/admin/leads?view=triage`
  const directLeadUrl = `${baseUrl}/admin/leads?search=${encodeURIComponent(payload.leadId)}`

  const isB2B = payload.segment === "B2B"
  const fullName = `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || "Inconnu"
  const location = [payload.postalCode, payload.city, payload.province].filter(Boolean).join(" · ") || "Wallonie"

  const subject = `⚡ [NOUVEAU LEAD] ${isB2B ? "🏢 B2B" : "🏡 B2C"} ${fullName} (${location}) — À valider`

  const surfaceFormatted = payload.surfaceArea != null ? `${payload.surfaceArea.toLocaleString("fr-BE")} m²` : "–"
  const billFormatted = payload.annualBill != null ? `${payload.annualBill.toLocaleString("fr-BE")} €/an` : "–"
  const savingsFormatted = payload.estimatedSavings != null ? `${payload.estimatedSavings.toLocaleString("fr-BE")} €/an` : "–"
  const roiFormatted = payload.estimatedROIYears != null ? `${payload.estimatedROIYears} ans` : "–"
  const powerFormatted = payload.estimatedPowerKwc != null ? `${payload.estimatedPowerKwc} kWc` : "–"
  const scoreFormatted = payload.leadScore != null ? `${payload.leadScore}/100` : "Non calculé"
  const creditsFormatted = payload.creditCost != null ? `${payload.creditCost} crédit${payload.creditCost > 1 ? "s" : ""}` : "–"

  const ownershipLabel =
    payload.ownershipStatus === "owner"
      ? "Propriétaire"
      : payload.ownershipStatus === "tenant"
      ? "Locataire"
      : payload.ownershipStatus ?? "–"

  const text = `NOUVEAU LEAD EN ATTENTE DE VALIDATION (${isB2B ? "B2B Professionnel" : "B2C Résidentiel"})
========================================================================

ID Lead : ${payload.leadId}
Score Qualité : ${scoreFormatted} | Valeur Marché : ${creditsFormatted}

CONTACT PROSPECT :
------------------
Nom : ${fullName}
Email : ${payload.email}
Téléphone : ${payload.phone || "Non renseigné"}
${isB2B ? `Entreprise : ${payload.company || "–"}\nNuméro TVA : ${payload.companyVat || "–"}\nFonction : ${payload.jobTitle || "–"}\n` : ""}
Adresse : ${payload.siteAddress ? `${payload.siteAddress}, ` : ""}${payload.postalCode || ""} ${payload.city || ""} (${payload.province || "–"})
GRD : ${payload.grd || "–"}

DONNÉES PROJET & TECHNIQUE :
----------------------------
Surface utile : ${surfaceFormatted} (${payload.surfaceType || "–"})
Matériau toiture : ${payload.roofMaterial || "–"}
Facture annuelle : ${billFormatted}
Puissance calculée : ${powerFormatted}
Économies estimées : ${savingsFormatted}
ROI estimé : ${roiFormatted}
Statut d'occupation : ${ownershipLabel}
Délai envisagé : ${payload.timeframe || "–"}
Source : ${payload.sourceForm || "simulateur"}
Code Partenaire Média : ${payload.mediaPartnerCode || "Aucun (direct)"}

${payload.message ? `MESSAGE / REMARQUE DU PROSPECT :\n${payload.message}\n\n` : ""}
ACTION REQUISE :
Validez ce lead dans le panneau d'administration pour déclencher l'attribution aux installateurs partenaires :
- Lien direct Lead : ${directLeadUrl}
- File de Triage : ${triageUrl}

Plateforme Aegis Solaire · Notification interne d'administration`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5;">
  <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">

    <!-- En-tête -->
    <div style="background-color: #0F172A; border-radius: 8px 8px 0 0; padding: 24px 28px; text-align: left;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #F59E0B; background-color: rgba(245, 158, 11, 0.15); padding: 4px 10px; border-radius: 4px;">
          ${isB2B ? "🏢 SEGMENT B2B PROFESSIONNEL" : "🏡 SEGMENT B2C RÉSIDENTIEL"}
        </span>
        <span style="font-family: monospace; font-size: 12px; color: #94A3B8;">#${escapeHtml(payload.leadId.slice(0, 8))}</span>
      </div>
      <h1 style="color: #FFFFFF; font-size: 20px; font-weight: 700; margin: 12px 0 4px 0; line-height: 1.3;">
        Nouveau lead en attente de modération
      </h1>
      <p style="color: #94A3B8; font-size: 13px; margin: 0;">
        Reçu le ${new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>

    <!-- Corps principal -->
    <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; padding: 24px 28px; border-radius: 0 0 8px 8px;">

      <!-- Bannière Call To Action Rapide -->
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 16px; margin-bottom: 24px; text-align: center;">
        <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #0F172A;">
          Validez ce lead pour le publier instantanément sur la Marketplace :
        </p>
        <a href="${directLeadUrl}" style="display: inline-block; background-color: #0F172A; color: #FFFFFF; font-weight: 600; font-size: 14px; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-right: 8px;">
          ⚡ Ouvrir la fiche du Lead
        </a>
        <a href="${triageUrl}" style="display: inline-block; background-color: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; font-weight: 600; font-size: 14px; padding: 10px 16px; border-radius: 6px; text-decoration: none;">
          Accéder à la file de Triage
        </a>
      </div>

      <!-- Métriques Clés Qualification -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0; margin-bottom: 24px;">
        <tr>
          <td style="width: 50%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; letter-spacing: 0.05em;">Score Qualité</div>
            <div style="font-family: monospace; font-size: 20px; font-weight: 700; color: #0F172A; margin-top: 4px;">${escapeHtml(scoreFormatted)}</div>
          </td>
          <td style="width: 50%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 600; letter-spacing: 0.05em;">Prix Marketplace</div>
            <div style="font-family: monospace; font-size: 20px; font-weight: 700; color: #0F172A; margin-top: 4px;">${escapeHtml(creditsFormatted)}</div>
          </td>
        </tr>
      </table>

      <!-- Coordonnées du contact -->
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;">
        Coordonnées du Contact
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; width: 35%;">Nom complet</td>
          <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${escapeHtml(fullName)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Téléphone</td>
          <td style="padding: 6px 0;">
            ${
              payload.phone
                ? `<a href="tel:${escapeHtml(payload.phone)}" style="color: #0F172A; font-family: monospace; font-weight: 700; text-decoration: underline;">${escapeHtml(payload.phone)}</a>`
                : '<span style="color: #94A3B8;">Non renseigné</span>'
            }
          </td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">E-mail</td>
          <td style="padding: 6px 0;">
            <a href="mailto:${escapeHtml(payload.email)}" style="color: #0F172A; text-decoration: underline;">${escapeHtml(payload.email)}</a>
          </td>
        </tr>
        ${
          isB2B
            ? `<tr>
                <td style="padding: 6px 0; color: #64748B;">Entreprise</td>
                <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(payload.company || "–")}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748B;">Numéro de TVA</td>
                <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(payload.companyVat || "–")}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748B;">Fonction</td>
                <td style="padding: 6px 0;">${escapeHtml(payload.jobTitle || "–")}</td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Localisation</td>
          <td style="padding: 6px 0;">${escapeHtml(location)}</td>
        </tr>
        ${
          payload.siteAddress
            ? `<tr>
                <td style="padding: 6px 0; color: #64748B;">Adresse du site</td>
                <td style="padding: 6px 0;">${escapeHtml(payload.siteAddress)}</td>
              </tr>`
            : ""
        }
        <tr>
          <td style="padding: 6px 0; color: #64748B;">GRD compétent</td>
          <td style="padding: 6px 0;">${escapeHtml(payload.grd || "–")}</td>
        </tr>
      </table>

      <!-- Données Techniques & Financières -->
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin: 0 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0;">
        Détails Techniques du Projet
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; width: 35%;">Surface utile</td>
          <td style="padding: 6px 0; font-weight: 600; font-family: monospace;">${escapeHtml(surfaceFormatted)} <span style="font-weight: 400; color: #64748B;">(${escapeHtml(payload.surfaceType || "–")})</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Matériau toiture</td>
          <td style="padding: 6px 0;">${escapeHtml(payload.roofMaterial || "–")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Facture annuelle</td>
          <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(billFormatted)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Puissance estimée</td>
          <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(powerFormatted)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Économies estimées</td>
          <td style="padding: 6px 0; font-family: monospace; color: #047857; font-weight: 600;">${escapeHtml(savingsFormatted)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Retour sur investissement</td>
          <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(roiFormatted)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Statut occupation</td>
          <td style="padding: 6px 0;">${escapeHtml(ownershipLabel)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Délai souhaité</td>
          <td style="padding: 6px 0;">${escapeHtml(payload.timeframe || "–")}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;">Source formulaire</td>
          <td style="padding: 6px 0; font-family: monospace; font-size: 13px;">${escapeHtml(payload.sourceForm || "simulateur")}</td>
        </tr>
        ${
          payload.mediaPartnerCode
            ? `<tr>
                <td style="padding: 6px 0; color: #64748B;">Partenaire affilié</td>
                <td style="padding: 6px 0; font-family: monospace; font-weight: 600;">${escapeHtml(payload.mediaPartnerCode)}</td>
              </tr>`
            : ""
        }
      </table>

      ${
        payload.message
          ? `<div style="background-color: #F8FAFC; border-left: 3px solid #0F172A; padding: 12px 16px; margin-bottom: 24px; border-radius: 0 4px 4px 0;">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748B; margin-bottom: 4px;">Commentaires du prospect :</div>
              <div style="font-size: 14px; color: #1E293B; white-space: pre-wrap;">${escapeHtml(payload.message)}</div>
            </div>`
          : ""
      }

      <!-- Boutons finaux -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid #E2E8F0;">
        <a href="${directLeadUrl}" style="display: block; background-color: #0F172A; color: #FFFFFF; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 6px; text-decoration: none; text-align: center;">
          ⚡ Valider ce lead maintenant
        </a>
      </div>

    </div>

    <!-- Footer technique -->
    <div style="text-align: center; margin-top: 16px; font-size: 12px; color: #94A3B8;">
      Aegis Solaire · Alerte automatique d'administration interne · <a href="${triageUrl}" style="color: #64748B;">Gestionnaire de Leads</a>
    </div>

  </div>
</body>
</html>`

  return { subject, text, html }
}

/**
 * Envoie un email d'alerte immédiat à l'administrateur lors de l'arrivée d'un lead.
 * Non-bloquant : renvoie un statut et ne fait pas crasher l'enregistrement du prospect.
 */
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

/**
 * Envoie un email d'alerte lors d'une inscription webinaire B2B.
 */
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

  const subject = `🎥 [INSCRIPTION WEBINAIRE] ${payload.firstName} (${payload.companyName || "Entreprise non précisée"})`
  const text = `Nouvelle inscription au webinaire B2B :
- Nom : ${payload.firstName}
- Fonction : ${payload.jobTitle}
- Entreprise : ${payload.companyName || "–"}
- Email : ${payload.email}
- Surface toiture estimée : ${payload.surfaceRange || "–"}
- ID Lead : ${payload.leadId}

Voir le lead : ${baseUrl}/admin/leads?search=${encodeURIComponent(payload.leadId)}`

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
