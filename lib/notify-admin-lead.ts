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

/**
 * Génère un jeton cryptographique HMAC-SHA256 pour permettre la validation directe depuis l'email.
 * Valable 14 jours.
 */
export function generateLeadValidationToken(leadId: string, timestamp = Date.now()): string {
  const secret = getLeadActionSecret()
  const payload = `${leadId}:${timestamp}`
  const hmac = createHmac("sha256", secret).update(payload).digest("hex")
  return `${timestamp}.${hmac}`
}

/**
 * Vérifie l'authenticité et la fraîcheur d'un jeton de validation directe.
 */
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
  const token = generateLeadValidationToken(payload.leadId)
  const quickValidateUrl = `${baseUrl}/api/admin/leads/quick-validate?id=${encodeURIComponent(payload.leadId)}&token=${encodeURIComponent(token)}`
  const directLeadDashboardUrl = `${baseUrl}/admin/leads?search=${encodeURIComponent(payload.leadId)}`
  const triageUrl = `${baseUrl}/admin/leads?view=triage`

  const isB2B = payload.segment === "B2B"
  const fullName = `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || "Inconnu"
  const location = [payload.postalCode, payload.city, payload.province].filter(Boolean).join(" · ") || "Wallonie"

  const scoreNum = payload.leadScore != null ? Math.round(Number(payload.leadScore)) : null
  const isHotLead = scoreNum != null && scoreNum >= 70
  const isReviewNeeded = scoreNum != null && scoreNum < 40

  const scoreBadgeText = scoreNum != null ? `${scoreNum}/100` : "Non calculé"
  const scoreStatusLabel = isHotLead
    ? "🔥 HOT LEAD (Score élevé)"
    : isReviewNeeded
    ? "⚠️ À CONTRÔLER (Score faible)"
    : "QUALIFIÉ (Score standard)"

  const scoreBgColor = isHotLead ? "#DCFCE7" : isReviewNeeded ? "#FEE2E2" : "#F1F5F9"
  const scoreTextColor = isHotLead ? "#166534" : isReviewNeeded ? "#991B1B" : "#334155"
  const scoreBorderColor = isHotLead ? "#86EFAC" : isReviewNeeded ? "#FCA5A5" : "#CBD5E1"

  const subject = `⚡ [NOUVEAU LEAD] ${isB2B ? "🏢 B2B" : "🏡 B2C"} ${fullName} (${location}) — Score ${scoreBadgeText}`

  const surfaceFormatted = payload.surfaceArea != null ? `${payload.surfaceArea.toLocaleString("fr-BE")} m²` : "–"
  const billFormatted = payload.annualBill != null ? `${payload.annualBill.toLocaleString("fr-BE")} €/an` : "–"
  const savingsFormatted = payload.estimatedSavings != null ? `${payload.estimatedSavings.toLocaleString("fr-BE")} €/an` : "–"
  const roiFormatted = payload.estimatedROIYears != null ? `${payload.estimatedROIYears} ans` : "–"
  const powerFormatted = payload.estimatedPowerKwc != null ? `${payload.estimatedPowerKwc} kWc` : "–"
  const productionFormatted = payload.annualProductionKwh != null ? `${payload.annualProductionKwh.toLocaleString("fr-BE")} kWh/an` : "–"
  const panelCountFormatted = payload.estimatedPanelCount != null ? `~${payload.estimatedPanelCount} panneaux` : "–"
  const autoconsumptionFormatted = payload.autoconsumptionRate != null ? `${Math.round(payload.autoconsumptionRate * 100)} %` : "–"
  const creditsFormatted = payload.creditCost != null ? `${payload.creditCost} crédit${payload.creditCost > 1 ? "s" : ""}` : "–"

  const ownershipLabel =
    payload.ownershipStatus === "owner"
      ? "Propriétaire"
      : payload.ownershipStatus === "tenant_authorized"
      ? "Locataire (accord propriétaire)"
      : payload.ownershipStatus === "tenant" || payload.ownershipStatus === "tenant_unauthorized"
      ? "Locataire"
      : payload.ownershipStatus === "co_ownership"
      ? "Copropriété"
      : payload.ownershipStatus ?? "–"

  const factorsText =
    payload.scoreFactors && payload.scoreFactors.length > 0
      ? payload.scoreFactors.map((f) => `  • ${f.label} (${f.delta > 0 ? "+" : ""}${f.delta} pts)`).join("\n")
      : "  • Aucun facteur particulier"

  const text = `NOUVEAU DOSSIER LEAD EN ATTENTE DE VALIDATION (${isB2B ? "B2B Professionnel" : "B2C Résidentiel"})
========================================================================

ID Lead : ${payload.leadId}
Score de Confiance : ${scoreBadgeText} [${scoreStatusLabel}]
Valeur Marché : ${creditsFormatted}

DÉCISION RAPIDE DIRECTEMENT DEPUIS CE MAIL :
---------------------------------------------
>> CLIQUEZ ICI POUR VALIDER ET PUBLIER EN 1 CLIC :
${quickValidateUrl}

Ou ouvrir dans le dashboard admin :
${directLeadDashboardUrl}

ANALYSE DU SCORE DE CONFIANCE :
--------------------------------
${factorsText}

COORDONNÉES DU CONTACT :
-------------------------
Nom complet : ${fullName}
Email : ${payload.email}
Téléphone : ${payload.phone || "Non renseigné"}
${isB2B ? `Entreprise : ${payload.company || "–"}\nNuméro TVA : ${payload.companyVat || "–"}\nFonction : ${payload.jobTitle || "–"}\n` : ""}
Adresse : ${payload.siteAddress ? `${payload.siteAddress}, ` : ""}${payload.postalCode || ""} ${payload.city || ""} (${payload.province || "–"})
GRD compétent : ${payload.grd || "–"}

DONNÉES TECHNIQUES & PHYSIQUES :
---------------------------------
Surface utile toiture : ${surfaceFormatted} (${payload.surfaceType || "–"})
Matériau toiture : ${payload.roofMaterial || "–"}
Puissance photovoltaïque : ${powerFormatted} (${productionFormatted})
Nombre estimé de modules : ${panelCountFormatted}
Facture électrique actuelle : ${billFormatted}
Taux autoconsommation estimé : ${autoconsumptionFormatted}
Économies annuelles prévues : ${savingsFormatted}
Retour sur investissement estimé : ${roiFormatted}
Statut d'occupation : ${ownershipLabel}
Délai envisagé : ${payload.timeframe || "–"}
Borne de recharge VE souhaitée : ${payload.wantsIrve ? "Oui" : "Non"}
Formulaire source : ${payload.sourceForm || "simulateur"}
Code Partenaire Média : ${payload.mediaPartnerCode || "Aucun (direct)"}

${payload.message ? `COMMENTAIRES DU PROSPECT :\n${payload.message}\n\n` : ""}
Plateforme Aegis Solaire · Module de Modération Express`

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.5;">
  <div style="max-width: 680px; margin: 0 auto; padding: 24px 12px;">

    <!-- Carte Principale Conteneur -->
    <div style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);">

      <!-- En-tête Sombre & Identité Visuelle -->
      <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 32px; border-bottom: 2px solid #F59E0B;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #F59E0B; background-color: rgba(245, 158, 11, 0.15); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.3);">
            ${isB2B ? "🏢 SEGMENT B2B PROFESSIONNEL" : "🏡 SEGMENT B2C RÉSIDENTIEL"}
          </span>
          <span style="font-family: monospace; font-size: 12px; color: #94A3B8; background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 4px;">
            ID #${escapeHtml(payload.leadId.slice(0, 8))}
          </span>
        </div>

        <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0 0 6px 0; line-height: 1.3;">
          ${escapeHtml(fullName)}
        </h1>
        <p style="color: #94A3B8; font-size: 13px; margin: 0;">
          📍 ${escapeHtml(location)} · Reçu le ${new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      <div style="padding: 28px 32px;">

        <!-- ZONE D'ACTION ULTRA-RAPIDE : VALIDATION 1-CLIC -->
        <div style="background: #F0FDF4; border: 2px solid #86EFAC; border-radius: 10px; padding: 20px; margin-bottom: 28px; text-align: center;">
          <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #166534; margin-bottom: 6px;">
            ⚡ Modération Express 1-Clic
          </div>
          <p style="font-size: 14px; color: #14532D; margin: 0 0 16px 0; line-height: 1.4;">
            Prenez la décision directement : cliquez ci-dessous pour valider ce lead et déclencher instantanément la publication sur la marketplace.
          </p>
          <a href="${quickValidateUrl}" style="display: inline-block; background-color: #16A34A; color: #FFFFFF; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.35); text-align: center;">
            ✓ Valider et Publier ce Lead
          </a>
          <div style="margin-top: 12px;">
            <a href="${directLeadDashboardUrl}" style="font-size: 13px; color: #475569; text-decoration: underline;">
              Ou examiner en détail sur le Dashboard Admin →
            </a>
          </div>
        </div>

        <!-- GRILLE DE CONFIANCE & VALEUR MARCHÉ -->
        <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 28px; table-layout: fixed;">
          <tr>
            <!-- Score de Confiance -->
            <td style="background-color: ${scoreBgColor}; border: 1px solid ${scoreBorderColor}; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; color: ${scoreTextColor}; font-weight: 700; letter-spacing: 0.05em;">
                Score de Confiance
              </div>
              <div style="font-family: monospace; font-size: 26px; font-weight: 800; color: ${scoreTextColor}; margin: 6px 0 2px 0;">
                ${escapeHtml(scoreBadgeText)}
              </div>
              <div style="font-size: 11px; font-weight: 600; color: ${scoreTextColor};">
                ${escapeHtml(scoreStatusLabel)}
              </div>
            </td>

            <!-- Valeur Marketplace -->
            <td style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.05em;">
                Valeur Marketplace
              </div>
              <div style="font-family: monospace; font-size: 26px; font-weight: 800; color: #0F172A; margin: 6px 0 2px 0;">
                ${escapeHtml(creditsFormatted)}
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #64748B;">
                Tarif Installateur V2
              </div>
            </td>
          </tr>
        </table>

        <!-- ANALYSE EXPLICATIVE DU SCORE DE CONFIANCE -->
        ${
          payload.scoreFactors && payload.scoreFactors.length > 0
            ? `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px;">
                  Facteurs d'évaluation du score :
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  ${payload.scoreFactors
                    .map(
                      (f) => `<tr>
                        <td style="padding: 4px 0; color: #334155;">${escapeHtml(f.label)}</td>
                        <td style="padding: 4px 0; text-align: right; font-family: monospace; font-weight: 700; color: ${f.delta > 0 ? "#16A34A" : "#DC2626"};">
                          ${f.delta > 0 ? "+" : ""}${f.delta} pts
                        </td>
                      </tr>`
                    )
                    .join("")}
                </table>
              </div>`
            : ""
        }

        <!-- COORDONNÉES DU CONTACT -->
        <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin: 0 0 14px 0;">
            1. Coordonnées &amp; Décideur
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748B; width: 35%;">Nom complet</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${escapeHtml(fullName)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Téléphone direct</td>
              <td style="padding: 6px 0;">
                ${
                  payload.phone
                    ? `<a href="tel:${escapeHtml(payload.phone)}" style="color: #0F172A; font-family: monospace; font-weight: 700; text-decoration: underline;">📞 ${escapeHtml(payload.phone)}</a>`
                    : '<span style="color: #EF4444; font-weight: 600;">⚠️ Non renseigné</span>'
                }
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Adresse e-mail</td>
              <td style="padding: 6px 0;">
                <a href="mailto:${escapeHtml(payload.email)}" style="color: #0F172A; font-weight: 500; text-decoration: underline;">✉️ ${escapeHtml(payload.email)}</a>
              </td>
            </tr>
            ${
              isB2B
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748B;">Entreprise</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #0F172A;">${escapeHtml(payload.company || "–")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Numéro TVA BCE</td>
                    <td style="padding: 6px 0; font-family: monospace; font-weight: 600;">${escapeHtml(payload.companyVat || "–")}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748B;">Fonction / Titre</td>
                    <td style="padding: 6px 0;">${escapeHtml(payload.jobTitle || "–")}</td>
                  </tr>`
                : ""
            }
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Localisation &amp; GRD</td>
              <td style="padding: 6px 0;">${escapeHtml(location)} ${payload.grd ? `(${escapeHtml(payload.grd.toUpperCase())})` : ""}</td>
            </tr>
            ${
              payload.siteAddress
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748B;">Adresse d'installation</td>
                    <td style="padding: 6px 0;">${escapeHtml(payload.siteAddress)}</td>
                  </tr>`
                : ""
            }
          </table>
        </div>

        <!-- DONNÉES TECHNIQUES & PHYSIQUES -->
        <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #475569; margin: 0 0 14px 0;">
            2. Données Techniques &amp; Modélisation Solaire
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748B; width: 35%;">Surface utile</td>
              <td style="padding: 6px 0; font-weight: 700; font-family: monospace; color: #0F172A;">
                ${escapeHtml(surfaceFormatted)} <span style="font-weight: 400; color: #64748B;">(${escapeHtml(payload.surfaceType || "–")})</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Matériau toiture</td>
              <td style="padding: 6px 0;">${escapeHtml(payload.roofMaterial || "–")}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Puissance estimée</td>
              <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0F172A;">
                ${escapeHtml(powerFormatted)} <span style="font-weight: 400; color: #64748B;">(${escapeHtml(panelCountFormatted)})</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Production annuelle</td>
              <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(productionFormatted)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Facture actuelle</td>
              <td style="padding: 6px 0; font-family: monospace; font-weight: 600;">${escapeHtml(billFormatted)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Économies estimées</td>
              <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #16A34A;">${escapeHtml(savingsFormatted)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">ROI prévisionnel</td>
              <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(roiFormatted)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Autoconsommation</td>
              <td style="padding: 6px 0; font-family: monospace;">${escapeHtml(autoconsumptionFormatted)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Statut d'occupation</td>
              <td style="padding: 6px 0; font-weight: 600;">${escapeHtml(ownershipLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Délai de projet</td>
              <td style="padding: 6px 0;">${escapeHtml(payload.timeframe || "–")}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Borne de recharge IRVE</td>
              <td style="padding: 6px 0;">${payload.wantsIrve ? "⚡ Oui (souhaitée)" : "Non"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748B;">Source formulaire</td>
              <td style="padding: 6px 0; font-family: monospace; font-size: 13px;">${escapeHtml(payload.sourceForm || "simulateur")}</td>
            </tr>
            ${
              payload.mediaPartnerCode
                ? `<tr>
                    <td style="padding: 6px 0; color: #64748B;">Apporteur d'affaires</td>
                    <td style="padding: 6px 0; font-family: monospace; font-weight: 600;">${escapeHtml(payload.mediaPartnerCode)}</td>
                  </tr>`
                : ""
            }
          </table>
        </div>

        ${
          payload.message
            ? `<div style="background-color: #F8FAFC; border-left: 3px solid #0F172A; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 6px 6px 0;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748B; margin-bottom: 4px;">Commentaire laissé par le prospect :</div>
                <div style="font-size: 14px; color: #1E293B; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(payload.message)}</div>
              </div>`
            : ""
        }

        <!-- BOUTONS D'ACTION INFÉRIEURS -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #E2E8F0;">
          <a href="${quickValidateUrl}" style="display: block; background-color: #16A34A; color: #FFFFFF; font-weight: 700; font-size: 16px; padding: 15px 24px; border-radius: 8px; text-decoration: none; text-align: center; margin-bottom: 10px;">
            ⚡ Valider ce lead directement depuis ce mail
          </a>
          <a href="${directLeadDashboardUrl}" style="display: inline-block; font-size: 13px; color: #64748B; text-decoration: underline;">
            Accéder à la vue détaillée sur l'administration
          </a>
        </div>

      </div>

      <!-- Bas de page système -->
      <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94A3B8;">
        Aegis Solaire · Système d'Arbitrage et Modération Lead · <a href="${triageUrl}" style="color: #64748B;">File de Triage FIFO</a>
      </div>

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
