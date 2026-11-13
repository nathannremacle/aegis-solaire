import { Resend } from "resend"
import { createHmac } from "crypto"
import { detectLeadRiskFlags } from "./admin/lead-risk"
import { buildMapLinks, type AddressResolutionLevel } from "./address-spw"
import { hasBelgianHouseNumber } from "./leads-validation"

export type ScoreFactor = {
  label: string
  delta: number
}

export type RiskFlag = {
  code: string
  label: string
  severity: "critical" | "warning"
  description: string
}

export type CbeCompanyData = {
  verified: boolean
  active: boolean
  vatNumber?: string
  officialName?: string
  legalForm?: string
  fullAddress?: string
  postalCode?: string
  city?: string
  isWalloniaHeadquarters?: boolean
  naceCode?: string
  naceDescription?: string
  error?: string
}

export type EmailMxData = {
  valid: boolean
  isDisposable: boolean
  domain: string
  mxServers: string[]
  reason?: string
}

export type WalloniaAddressData = {
  validInWallonia: boolean
  resolutionLevel?: AddressResolutionLevel
  streetVerified?: boolean
  houseVerified?: boolean
  hasHouseNumber?: boolean
  postalMismatch?: boolean
  officialCity?: string
  officialSection?: string
  officialPostalCode?: string
  canonicalStreet?: string
  houseNumber?: string | null
  confidenceScore: number
  coordinates?: { lat: number; lng: number } | null
  googleMapsUrl?: string
  streetViewUrl?: string
}

export type LeadEnrichedData = {
  emailMx?: EmailMxData | null
  walloniaAddress?: WalloniaAddressData | null
  cbeCompany?: CbeCompanyData | null
  trustBadges?: string[]
  warningFlags?: string[]
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
  contactPreference?: "written_first" | "direct_call" | string | null
  sourceForm?: string | null
  mediaPartnerCode?: string | null
  message?: string | null
  verifications?: LeadEnrichedData | null
  riskFlags?: RiskFlag[] | null
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

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Valide le format BE + 10 chiffres avec clé de contrôle Modulo 97 (BCE/TVA belge).
 */
export function checkBelgianVatModulo97(input?: string | null): boolean {
  if (!input) return false
  const n = input.replace(/[\s.]/g, "").toUpperCase()
  if (!/^BE\d{9,10}$/.test(n)) return false
  const digits = n.replace(/^BE/, "")
  const padded = digits.length === 9 ? "0" + digits : digits
  if (!/^[01]\d{9}$/.test(padded)) return false
  const first8 = parseInt(padded.slice(0, 8), 10)
  const checkDigits = parseInt(padded.slice(8, 10), 10)
  const expectedCheck = 97 - (first8 % 97)
  return checkDigits === expectedCheck
}

/**
 * Valide un numéro belge ou français.
 */
export function checkBelgianOrFrPhone(phone?: string | null): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/[\s.-]/g, "")
  if (!/^(\+33|\+32|0)[1-9][0-9]{7,9}$/.test(cleaned)) return false
  const digits = cleaned.replace(/\D/g, "")
  if (new Set(digits.split("")).size <= 2) return false
  return true
}

/**
 * Détecte les signaux de risque et de vigilance pour un lead donné (aligné sur le cockpit admin).
 */
export function extractLeadRiskAlerts(payload: AdminLeadAlertPayload): RiskFlag[] {
  return detectLeadRiskFlags({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    postalCode: payload.postalCode,
    city: payload.city,
    siteAddress: payload.siteAddress,
    province: payload.province,
    segment: payload.segment,
    company: payload.company,
    companyVat: payload.companyVat,
    ownershipStatus: payload.ownershipStatus,
    surfaceArea: payload.surfaceArea,
    annualElectricityBill: payload.annualBill,
    qualificationMetadata: payload.verifications ? { verifications: payload.verifications } : null,
  })
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

  // 1. Détection des risques cockpit admin
  const riskAlerts = payload.riskFlags ?? extractLeadRiskAlerts(payload)

  const isVatValid = payload.companyVat ? checkBelgianVatModulo97(payload.companyVat) : null
  const isPhoneValid = payload.phone ? checkBelgianOrFrPhone(payload.phone) : null

  // 2. Vérifications externes (BCE, DNS MX, SPW)
  const verifs = payload.verifications
  const cbe = verifs?.cbeCompany
  const mx = verifs?.emailMx
  const spw = verifs?.walloniaAddress

  // Consolidation de toutes les alertes (Cockpit + APIs)
  const allAlerts: { label: string; detail: string; critical: boolean }[] = []

  for (const rf of riskAlerts) {
    allAlerts.push({
      label: rf.label,
      detail: rf.description,
      critical: rf.severity === "critical",
    })
  }

  // Alerte BCE si le numéro d'entreprise est introuvable ou inactif
  if (isB2B && payload.companyVat) {
    if (cbe && !cbe.verified && cbe.error) {
      if (!allAlerts.some((a) => a.label.includes("TVA") || a.label.includes("BCE"))) {
        allAlerts.push({
          label: "BCE : Numéro introuvable",
          detail: cbe.error,
          critical: true,
        })
      }
    } else if (cbe && cbe.verified && !cbe.active) {
      allAlerts.push({
        label: "BCE : Entreprise fermée ou radiée",
        detail: "Le statut de cette société n'est plus actif à la Banque-Carrefour des Entreprises.",
        critical: true,
      })
    }
  }

  // Alerte E-mail MX
  if (mx && !mx.valid) {
    allAlerts.push({
      label: "E-mail : Serveur MX introuvable",
      detail: mx.reason || "Le nom de domaine de l'e-mail ne possède pas de serveur pour recevoir des messages.",
      critical: true,
    })
  }

  // Alerte SPW Cadastre
  if (spw && !spw.validInWallonia && spw.confidenceScore <= 10) {
    allAlerts.push({
      label: "SPW : Localisation non répertoriée",
      detail: "L'adresse ou le code postal n'a pas été trouvé dans le registre officiel ICAR de Wallonie.",
      critical: false,
    })
  }

  // 3. Points certifiés positifs
  const certifiedBadges: string[] = []
  if (mx?.valid) {
    certifiedBadges.push(`E-mail certifié : serveurs MX actifs (${mx.mxServers[0] || "valide"})`)
  }
  if (spw?.validInWallonia && spw.houseVerified) {
    certifiedBadges.push(
      `Adresse exacte certifiée SPW ICAR : ${spw.canonicalStreet || ""} ${spw.houseNumber || ""}, ${spw.officialPostalCode || payload.postalCode || ""} ${spw.officialSection || spw.officialCity || ""}`.trim()
    )
  } else if (spw?.validInWallonia && spw.streetVerified && hasBelgianHouseNumber(payload.siteAddress)) {
    certifiedBadges.push(
      `Voirie certifiée SPW Wallonie : ${spw.canonicalStreet || spw.officialCity || payload.city || "ICAR"}`
    )
  } else if (spw?.validInWallonia && spw.confidenceScore >= 30 && !spw.postalMismatch) {
    certifiedBadges.push(
      `Commune wallonne reconnue (${spw.officialCity || payload.city || "ICAR"}) — adresse précise à vérifier`
    )
  }
  if (cbe?.verified && cbe.active) {
    certifiedBadges.push(
      `BCE certifiée : ${cbe.officialName} (${cbe.legalForm || "Active"})${cbe.isWalloniaHeadquarters ? " · Siège en Wallonie" : ""}`
    )
  }
  if (isVatValid) {
    certifiedBadges.push("Numéro TVA conforme (Modulo 97)")
  }
  if (isPhoneValid) {
    certifiedBadges.push("Numéro de téléphone belge conforme")
  }

  const scoreNum = payload.leadScore != null ? Math.round(Number(payload.leadScore)) : null
  const isHotLead = scoreNum != null && scoreNum >= 70
  const isReviewNeeded = scoreNum != null && scoreNum < 40

  const scoreBadgeText = scoreNum != null ? `${scoreNum}/100` : "Non calculé"
  const scoreCategory = isHotLead
    ? "Priorité haute (HOT LEAD)"
    : isReviewNeeded
    ? "Vigilance requise (score faible)"
    : "Qualifié"

  const companyOrName = payload.company ? `${fullName} (${payload.company})` : fullName
  const subjectPrefix = allAlerts.length > 0 ? `[ATTENTION ${allAlerts.length} ALERTE${allAlerts.length > 1 ? "S" : ""}] ` : ""
  const subject = `${subjectPrefix}[Aegis Solaire] Nouveau dossier : ${companyOrName} · Score ${scoreBadgeText}`

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
      ? "Propriétaire occupant"
      : payload.ownershipStatus === "tenant_authorized"
      ? "Locataire (accord bailleur)"
      : payload.ownershipStatus === "tenant" || payload.ownershipStatus === "tenant_unauthorized"
      ? "Locataire (SANS accord)"
      : payload.ownershipStatus === "co_ownership"
      ? "Copropriété"
      : payload.ownershipStatus ?? "–"

  const textAlerts = allAlerts.map((a) => `  [!] ${a.label} : ${a.detail}`).join("\n")
  const textCertified = certifiedBadges.map((b) => `  [✓] ${b}`).join("\n")

  const text = `NOUVEAU DOSSIER LEAD EN ATTENTE DE VALIDATION
========================================================================

Identifiant : ${payload.leadId}
Segment : ${isB2B ? "Professionnel (B2B)" : "Résidentiel (B2C)"}
Score de qualification : ${scoreBadgeText} (${scoreCategory})
Valeur marketplace : ${creditsFormatted}

${allAlerts.length > 0 ? `POINTS DE VIGILANCE ET ALERTES DE CONFORMITÉ :\n-----------------------------------------------\n${textAlerts}\n\n` : ""}
${certifiedBadges.length > 0 ? `CONTRÔLES DE CONFORMITÉ VALIDÉS :\n---------------------------------\n${textCertified}\n\n` : ""}
VALIDATION DIRECTE EN 1 CLIC :
------------------------------
Pour valider et publier ce lead sans vous connecter, cliquez sur le lien suivant :
${quickValidateUrl}

Ou ouvrir dans le dashboard admin :
${directLeadDashboardUrl}

COORDONNÉES :
-------------
Nom : ${fullName}
Téléphone : ${payload.phone || "Non renseigné"} ${isPhoneValid === false ? "(ATTENTION: format suspect)" : ""}
${payload.contactPreference === "direct_call" ? "RÈGLE CLIENT : [APPEL DIRECT AUTORISÉ (9H-18H)]" : payload.contactPreference === "written_first" ? "RÈGLE CLIENT : [APPROCHE ÉCRITE (E-MAIL / SMS) D'ABORD — PAS D'APPEL À FROID]" : ""}
Email : ${payload.email} ${mx?.valid === false ? "(ATTENTION: sans serveur MX)" : ""}
${isB2B ? `Entreprise : ${payload.company || "–"}\nNuméro TVA : ${payload.companyVat || "–"} ${isVatValid === false ? "(ATTENTION: Clé Modulo 97 non valide)" : isVatValid === true ? "(TVA valide)" : ""}\nFonction : ${payload.jobTitle || "–"}\n` : ""}
${cbe?.verified ? `Détails BCE officiels : ${cbe.officialName} (${cbe.legalForm || ""}) - NACE ${cbe.naceCode} : ${cbe.naceDescription}\n` : ""}
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
                  Aegis Solaire · Modération des leads
                </span>
                <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 6px 0 2px 0;">
                  Nouveau dossier à modérer
                </h1>
                <p style="font-size: 13px; color: #6B7280; margin: 0;">
                  ${isB2B ? "Segment Professionnel (B2B)" : "Segment Résidentiel (B2C)"} · Reçu le ${new Date().toLocaleDateString("fr-BE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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

        <!-- 1. ENCADRÉ DES POINTS DE VIGILANCE (SI DES ALERTES EXISTENT) -->
        ${
          allAlerts.length > 0
            ? `<div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-left: 4px solid #DC2626; padding: 16px 24px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #991B1B; margin-bottom: 8px;">
                  Signalements de vigilance (${allAlerts.length} alerte${allAlerts.length > 1 ? "s" : ""}) :
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #7F1D1D;">
                  ${allAlerts
                    .map(
                      (a) => `<tr>
                        <td valign="top" style="padding: 3px 6px 3px 0; color: #DC2626; font-weight: bold; width: 14px;">•</td>
                        <td style="padding: 3px 0; line-height: 1.4;">
                          <strong style="color: #991B1B;">${escapeHtml(a.label)} :</strong> ${escapeHtml(a.detail)}
                        </td>
                      </tr>`
                    )
                    .join("")}
                </table>
              </div>`
            : ""
        }

        <!-- 2. ENCADRÉ DES CONTRÔLES CERTIFIÉS POSITIFS -->
        ${
          certifiedBadges.length > 0
            ? `<div style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; padding: 14px 24px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #166534; margin-bottom: 6px;">
                  Contrôles de conformité certifiés :
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #14532D;">
                  ${certifiedBadges
                    .map(
                      (b) => `<tr>
                        <td valign="top" style="padding: 2px 6px 2px 0; color: #16A34A; font-weight: bold; width: 14px;">✓</td>
                        <td style="padding: 2px 0;">${escapeHtml(b)}</td>
                      </tr>`
                    )
                    .join("")}
                </table>
              </div>`
            : ""
        }

        <!-- Bloc d'action rapide -->
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
                        Examiner sur le dashboard admin
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

          <!-- Coordonnées du contact avec statuts de vérification -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #4B5563; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB; margin-bottom: 10px;">
              Contact &amp; Données d'identification
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
              <tr>
                <td width="35%" style="padding: 5px 0; color: #6B7280;">Nom complet</td>
                <td style="padding: 5px 0; font-weight: 600; color: #111827;">${escapeHtml(fullName)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Téléphone</td>
                <td style="padding: 5px 0;">
                  ${
                    payload.phone
                      ? `<a href="tel:${escapeHtml(payload.phone)}" style="color: #111827; font-family: monospace; font-weight: 600; text-decoration: underline;">${escapeHtml(payload.phone)}</a>`
                      : '<span style="color: #9CA3AF;">Non renseigné</span>'
                  }
                  ${
                    isPhoneValid === true
                      ? `<span style="display: inline-block; font-size: 11px; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">Format BE valide</span>`
                      : isPhoneValid === false
                      ? `<span style="display: inline-block; font-size: 11px; color: #B91C1C; background: #FEF2F2; border: 1px solid #FECACA; padding: 1px 6px; border-radius: 3px; margin-left: 6px; font-weight: 600;">Format suspect</span>`
                      : ""
                  }
                </td>
              </tr>
              ${
                payload.contactPreference
                  ? `<tr>
                <td style="padding: 5px 0; color: #6B7280;">Règle de contact</td>
                <td style="padding: 5px 0;">
                  ${
                    payload.contactPreference === "direct_call"
                      ? `<span style="display: inline-block; font-size: 11px; font-weight: 700; color: #1E40AF; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 2px 8px; border-radius: 4px;">APPEL DIRECT AUTORISÉ (9H-18H)</span>`
                      : `<span style="display: inline-block; font-size: 11px; font-weight: 700; color: #065F46; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 8px; border-radius: 4px;">APPROCHE ÉCRITE (E-MAIL / SMS) D'ABORD</span>`
                  }
                </td>
              </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Adresse e-mail</td>
                <td style="padding: 5px 0;">
                  <a href="mailto:${escapeHtml(payload.email)}" style="color: #111827; text-decoration: underline;">${escapeHtml(payload.email)}</a>
                  ${
                    mx?.valid === true
                      ? `<span style="display: inline-block; font-size: 11px; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">MX valide</span>`
                      : mx?.valid === false
                      ? `<span style="display: inline-block; font-size: 11px; color: #B91C1C; background: #FEF2F2; border: 1px solid #FECACA; padding: 1px 6px; border-radius: 3px; margin-left: 6px; font-weight: 600;">Sans serveur MX</span>`
                      : ""
                  }
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
                      <td style="padding: 5px 0;">
                        <span style="font-family: monospace; font-weight: 600; color: #111827;">${escapeHtml(payload.companyVat || "–")}</span>
                        ${
                          isVatValid === true
                            ? `<span style="display: inline-block; font-size: 11px; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">Modulo 97 conforme</span>`
                            : isVatValid === false
                            ? `<span style="display: inline-block; font-size: 11px; color: #B91C1C; background: #FEF2F2; border: 1px solid #FECACA; padding: 1px 6px; border-radius: 3px; margin-left: 6px; font-weight: 600;">Attention : TVA non valide</span>`
                            : ""
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0; color: #6B7280;">Fonction</td>
                      <td style="padding: 5px 0;">${escapeHtml(payload.jobTitle || "–")}</td>
                    </tr>`
                  : ""
              }
              ${
                cbe?.verified
                  ? `<tr style="background-color: #F8FAFC;">
                      <td style="padding: 8px 6px; color: #475569; font-size: 12px; font-weight: 600;" colspan="2">
                        <div style="color: #0F172A; font-weight: 700; margin-bottom: 2px;">
                          Registre officiel BCE (cbeapi.be) :
                        </div>
                        <div style="color: #334155; line-height: 1.4;">
                          ${escapeHtml(cbe.officialName)} · <em>${escapeHtml(cbe.legalForm || "")}</em>
                          ${cbe.active ? `<span style="color: #047857; font-weight: 600;">(Société active)</span>` : `<span style="color: #B91C1C; font-weight: 600;">(Non active)</span>`}<br/>
                          Siège : ${escapeHtml(cbe.fullAddress || "–")}<br/>
                          ${cbe.naceCode ? `Activité NACE ${escapeHtml(cbe.naceCode)} : ${escapeHtml(cbe.naceDescription || "–")}` : ""}
                        </div>
                      </td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="padding: 5px 0; color: #6B7280;">Localisation</td>
                <td style="padding: 5px 0;">
                  ${escapeHtml(location)}
                  ${
                    spw?.houseVerified
                      ? `<span style="display: inline-block; font-size: 11px; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">Adresse exacte SPW</span>`
                      : spw?.validInWallonia && spw.streetVerified && !hasBelgianHouseNumber(payload.siteAddress)
                      ? `<span style="display: inline-block; font-size: 11px; color: #B45309; background: #FFFBEB; border: 1px solid #FDE68A; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">Rue SPW (N° manquant)</span>`
                      : spw?.validInWallonia && !spw.postalMismatch
                      ? `<span style="display: inline-block; font-size: 11px; color: #1D4ED8; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">Commune SPW</span>`
                      : ""
                  }
                </td>
              </tr>
              ${
                payload.siteAddress
                  ? (() => {
                      const mapLinks = buildMapLinks({
                        streetAddress: payload.siteAddress,
                        postalCode: payload.postalCode,
                        city: payload.city,
                        coordinates: spw?.coordinates ?? null,
                      })
                      const hasNum = hasBelgianHouseNumber(payload.siteAddress)
                      return `<tr>
                      <td style="padding: 5px 0; color: #6B7280;">Adresse du site</td>
                      <td style="padding: 5px 0;">
                        <strong>${escapeHtml(payload.siteAddress)}</strong>
                        ${
                          !hasNum
                            ? `<span style="display: inline-block; font-size: 11px; color: #B91C1C; background: #FEF2F2; border: 1px solid #FECACA; padding: 1px 6px; border-radius: 3px; margin-left: 6px;">N° maison manquant</span>`
                            : ""
                        }
                        <span style="margin-left: 8px; font-size: 11px;">
                          <a href="${mapLinks.googleMapsUrl}" style="color: #2563EB; text-decoration: underline;">Maps</a>
                          ·
                          <a href="${mapLinks.streetViewUrl}" style="color: #2563EB; text-decoration: underline;">Street View</a>
                        </span>
                      </td>
                    </tr>`
                    })()
                  : `<tr>
                      <td style="padding: 5px 0; color: #6B7280;">Adresse du site</td>
                      <td style="padding: 5px 0; color: #B91C1C; font-style: italic;">Non renseignée</td>
                    </tr>`
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
                <td style="padding: 5px 0; font-weight: 600;">
                  ${escapeHtml(ownershipLabel)}
                  ${
                    payload.ownershipStatus === "tenant_unauthorized" || payload.ownershipStatus === "tenant"
                      ? `<span style="display: inline-block; font-size: 11px; color: #B91C1C; background: #FEF2F2; border: 1px solid #FECACA; padding: 1px 6px; border-radius: 3px; margin-left: 6px; font-weight: 600;">Attention : locataire</span>`
                      : ""
                  }
                </td>
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
