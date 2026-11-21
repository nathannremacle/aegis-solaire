import { Resend } from "resend"
import { createHmac } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { detectLeadRiskFlags } from "./admin/lead-risk"
import { buildMapLinks, type AddressResolutionLevel } from "./address-spw"
import { hasBelgianHouseNumber, isValidFrBePhone } from "./leads-validation"
import { calculateLeadScore } from "./lead-score"
import { calculateMarketplaceFinancials, calculateLeadCreditCost } from "./marketplace-pricing"
import { getPhoneVerificationDiagnostic } from "./lead-verification-display"
import type {
  PhoneOtpVerificationResult,
  TwilioLookupSnapshot,
} from "./lead-verification-engine"
import {
  getOwnershipLabel,
  getRoofMaterialLabel,
  getSurfaceTypeLabel,
  getTimeframeLabel,
  getGrdLabel,
} from "./lead-display-helpers"
import {
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInlineBadge,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

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
  googleEarthUrl?: string
  streetViewUrl?: string
  walOnMapUrl?: string
}

export type LeadEnrichedData = {
  emailMx?: EmailMxData | null
  walloniaAddress?: WalloniaAddressData | null
  cbeCompany?: CbeCompanyData | null
  phoneAnalysis?: { valid?: boolean; lineType?: string | null } | null
  phoneOtp?: PhoneOtpVerificationResult | null
  twilioLookup?: TwilioLookupSnapshot | null
  trustBadges?: string[]
  warningFlags?: string[]
}

export type AdminLeadAlertPayload = {
  leadId: string
  firstName: string
  lastName?: string | null
  email: string
  phone?: string | null
  phoneVerified?: boolean | null
  phoneVerifiedAt?: string | null
  phoneVerificationMethod?: string | null
  phoneCarrier?: string | null
  phoneLineType?: string | null
  createdAt?: string | null
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
 * Valide un numéro belge ou français via la règle canonique unifiée (bloque les suites factices).
 */
export function checkBelgianOrFrPhone(phone?: string | null): boolean {
  if (!phone) return false
  return isValidFrBePhone(phone)
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

  // 2. Vérifications externes (BCE, DNS MX, SPW, Téléphone Lookup + OTP)
  const verifs = payload.verifications
  const cbe = verifs?.cbeCompany
  const mx = verifs?.emailMx
  const spw = verifs?.walloniaAddress
  const phoneDiag = getPhoneVerificationDiagnostic({
    segment: payload.segment,
    phone: payload.phone,
    email: payload.email,
    postal_code: payload.postalCode,
    company_vat: payload.companyVat,
    phone_verified: payload.phoneVerified ?? Boolean(verifs?.phoneOtp?.verified),
    phone_verified_at: payload.phoneVerifiedAt ?? verifs?.phoneOtp?.verifiedAt ?? null,
    phone_verification_method: payload.phoneVerificationMethod ?? null,
    phone_carrier: payload.phoneCarrier ?? null,
    phone_line_type: payload.phoneLineType ?? null,
    created_at: payload.createdAt ?? null,
    qualification_metadata: verifs ? { verifications: verifs } : null,
  })

  // Consolidation de toutes les alertes (Cockpit + APIs)
  const allAlerts: { label: string; detail: string; critical: boolean }[] = []

  for (const rf of riskAlerts) {
    allAlerts.push({
      label: rf.label,
      detail: rf.description,
      critical: rf.severity === "critical",
    })
  }

  // Alerte échec technique SMS OTP ou rate limit
  if (phoneDiag.otp.isTechnicalFailure) {
    allAlerts.push({
      label:
        phoneDiag.otp.status === "not_configured" || phoneDiag.otp.status === "disabled"
          ? "SMS OTP : Service désactivé / non configuré"
          : "SMS OTP : Échec technique d'envoi",
      detail: phoneDiag.otp.detailText,
      critical: true,
    })
  } else if (phoneDiag.otp.status === "rate_limited") {
    allAlerts.push({
      label: "SMS OTP : Limitation anti-abus (rate limit)",
      detail: phoneDiag.otp.detailText,
      critical: false,
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
  if (phoneDiag.otp.verified) {
    const methodLabel = phoneDiag.otp.channel === "call" ? "appel vocal OTP" : "SMS OTP"
    const lookupSuffix =
      phoneDiag.lookup.status === "valid"
        ? ` + Lookup opérateur (${phoneDiag.lookup.lineTypeLabel}${phoneDiag.lookup.carrierName ? ` · ${phoneDiag.lookup.carrierName}` : ""})`
        : ""
    certifiedBadges.push(`Téléphone certifié par ${methodLabel}${lookupSuffix}`)
  } else if (phoneDiag.lookup.status === "valid") {
    certifiedBadges.push(
      `Lookup opérateur actif uniquement (${phoneDiag.lookup.lineTypeLabel}${phoneDiag.lookup.carrierName ? ` · ${phoneDiag.lookup.carrierName}` : ""}) — SMS OTP non validé`
    )
  } else if (isPhoneValid) {
    certifiedBadges.push("Numéro de téléphone conforme (format BE/FR) — sans Lookup ni SMS")
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

  const ownershipLabel = payload.ownershipStatus ? getOwnershipLabel(payload.ownershipStatus) : "–"
  const surfaceTypeLabel = payload.surfaceType ? getSurfaceTypeLabel(payload.surfaceType) : "–"
  const roofMaterialLabel = payload.roofMaterial ? getRoofMaterialLabel(payload.roofMaterial) : "–"
  const timeframeLabel = payload.timeframe ? getTimeframeLabel(payload.timeframe) : "–"
  const grdLabel = payload.grd ? getGrdLabel(payload.grd) : "–"

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
Téléphone : ${payload.phone || "Non renseigné"} ${isPhoneValid === false ? "(ATTENTION: format suspect)" : `[${phoneDiag.overallBadge.text}]`}
  - Contrôle opérateur (Lookup) : ${phoneDiag.lookup.detailText}
  - Vérification SMS/Appel (OTP) : ${phoneDiag.otp.detailText}
${payload.contactPreference === "direct_call" ? "RÈGLE CLIENT : [APPEL DIRECT AUTORISÉ (9H-18H)]" : payload.contactPreference === "written_first" ? "RÈGLE CLIENT : [APPROCHE ÉCRITE (E-MAIL / SMS) D'ABORD — PAS D'APPEL À FROID]" : ""}
Email : ${payload.email} ${mx?.valid === false ? "(ATTENTION: sans serveur MX)" : ""}
${isB2B ? `Entreprise : ${payload.company || "–"}\nNuméro TVA : ${payload.companyVat || "–"} ${isVatValid === false ? "(ATTENTION: Clé Modulo 97 non valide)" : isVatValid === true ? "(TVA valide)" : ""}\nFonction : ${payload.jobTitle || "–"}\n` : ""}
${cbe?.verified ? `Détails BCE officiels : ${cbe.officialName} (${cbe.legalForm || ""}) - NACE ${cbe.naceCode} : ${cbe.naceDescription}\n` : ""}
Localisation : ${payload.siteAddress ? `${payload.siteAddress}, ` : ""}${payload.postalCode || ""} ${payload.city || ""} (${payload.province || "–"})
GRD compétent : ${grdLabel}

DONNÉES DU PROJET :
-------------------
Surface utile : ${surfaceFormatted} (${surfaceTypeLabel})
Matériau toiture : ${roofMaterialLabel}
Puissance estimée : ${powerFormatted} (${panelCountFormatted})
Productible annuel : ${productionFormatted}
Facture actuelle : ${billFormatted}
Taux d'autoconsommation : ${autoconsumptionFormatted}
Économies estimées : ${savingsFormatted}
Retour sur investissement : ${roiFormatted}
Statut d'occupation : ${ownershipLabel}
Délai envisagé : ${timeframeLabel}
Borne IRVE : ${payload.wantsIrve ? "Oui" : "Non"}
Formulaire source : ${payload.sourceForm || "simulateur"}

${payload.message ? `COMMENTAIRE DU PROSPECT :\n${payload.message}\n\n` : ""}
Aegis Solaire · Notification interne`

  const leadRefCode = payload.leadId.slice(0, 8).toUpperCase()
  const receivedLabel = new Date(payload.createdAt || Date.now()).toLocaleDateString("fr-BE", {
    timeZone: "Europe/Brussels",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const alertsBlockHtml =
    allAlerts.length > 0
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-top: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 12px; background-color: #fdecec; border-left: 3px solid #991b1b; border-radius: 0 5px 5px 0;">
              <span style="display: block; font-size: 13px; font-weight: bold; color: #991b1b; margin-bottom: 4px;">
                Signalements de vigilance (${allAlerts.length})
              </span>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #7f1d1d; border-collapse: collapse;">
                ${allAlerts
                  .map(
                    (a) => `<tr>
                      <td valign="top" style="padding: 2px 6px 2px 0; font-weight: bold; width: 12px;">&bull;</td>
                      <td style="padding: 2px 0; line-height: 1.4;"><strong>${escapeHtml(a.label)} :</strong> ${escapeHtml(a.detail)}</td>
                    </tr>`
                  )
                  .join("")}
              </table>
            </td>
          </tr>
        </table>`
      : ""

  const certifiedBlockHtml =
    certifiedBadges.length > 0
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-top: 12px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 12px; background-color: #e8f2ed; border-left: 3px solid #1d5d45; border-radius: 0 5px 5px 0;">
              <span style="display: block; font-size: 13px; font-weight: bold; color: #1d5d45; margin-bottom: 4px;">
                Contrôles de conformité validés
              </span>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #14532d; border-collapse: collapse;">
                ${certifiedBadges
                  .map(
                    (b) => `<tr>
                      <td valign="top" style="padding: 2px 6px 2px 0; font-weight: bold; width: 14px;">&#10003;</td>
                      <td style="padding: 2px 0; line-height: 1.4;">${escapeHtml(b)}</td>
                    </tr>`
                  )
                  .join("")}
              </table>
            </td>
          </tr>
        </table>`
      : ""

  const addressLinksHtml = payload.siteAddress
    ? (() => {
        const mapLinks = buildMapLinks({
          streetAddress: payload.siteAddress,
          postalCode: payload.postalCode,
          city: payload.city,
          coordinates: spw?.coordinates ?? null,
        })
        const hasNum = hasBelgianHouseNumber(payload.siteAddress)
        return `<strong>${escapeHtml(payload.siteAddress)}</strong>${
          !hasNum ? renderInlineBadge("N° manquant", "danger") : ""
        } &middot; <a href="${escapeHtml(mapLinks.googleMapsUrl)}" target="_blank" style="color: #194767; text-decoration: underline;">Maps</a> &middot; <a href="${escapeHtml(mapLinks.googleEarthUrl)}" target="_blank" style="color: #194767; text-decoration: underline;">Google Earth</a> &middot; <a href="${escapeHtml(mapLinks.walOnMapUrl)}" target="_blank" style="color: #194767; text-decoration: underline;">WalOnMap</a>`
      })()
    : `<span style="color: #991b1b; font-style: italic;">Non renseignée</span>`

  const contactRowsHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
      <tr>
        <th scope="row" style="width: 38%; padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Nom complet</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">${escapeHtml(fullName)}</td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Téléphone</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">
          ${payload.phone ? `<a href="tel:${escapeHtml(payload.phone)}" style="color: #142d42; text-decoration: underline;">${escapeHtml(payload.phone)}</a>` : "Non renseigné"}
          ${isPhoneValid === false ? renderInlineBadge("Format suspect", "danger") : renderInlineBadge(phoneDiag.overallBadge.text, phoneDiag.overallBadge.tone)}
        </td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Contrôle Lookup</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">
          ${escapeHtml(phoneDiag.lookup.detailText)}
          ${renderInlineBadge(phoneDiag.lookup.badgeText, phoneDiag.lookup.badgeTone)}
        </td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Vérification SMS / Appel</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">
          <strong style="color: ${phoneDiag.otp.isTechnicalFailure ? "#991b1b" : phoneDiag.otp.verified ? "#1d5d45" : "#142d42"};">${escapeHtml(phoneDiag.otp.badgeText)}</strong>
          <span style="display: block; margin-top: 2px; font-size: 12px; color: #4d6374; line-height: 1.4;">${escapeHtml(phoneDiag.otp.detailText)}</span>
        </td>
      </tr>
      ${
        payload.contactPreference
          ? `<tr>
              <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Préférence contact</th>
              <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">
                ${
                  payload.contactPreference === "direct_call"
                    ? "Appel direct autorisé (9h–18h)"
                    : "Approche écrite (E-mail / SMS) d'abord"
                }
              </td>
            </tr>`
          : ""
      }
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">E-mail</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">
          <a href="mailto:${escapeHtml(payload.email)}" style="color: #194767; text-decoration: underline;">${escapeHtml(payload.email)}</a>
          ${mx?.valid === true ? renderInlineBadge("MX valide", "success") : mx?.valid === false ? renderInlineBadge("Sans MX", "danger") : ""}
        </td>
      </tr>
      ${
        isB2B
          ? `<tr>
              <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Entreprise &amp; TVA</th>
              <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top; font-variant-numeric: tabular-nums;">
                ${escapeHtml(payload.company || "—")} · ${escapeHtml(payload.companyVat || "—")}
                ${isVatValid === true ? renderInlineBadge("Modulo 97 OK", "success") : isVatValid === false ? renderInlineBadge("TVA invalide", "danger") : ""}
              </td>
            </tr>`
          : ""
      }
      ${
        cbe?.verified
          ? `<tr>
              <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Registre BCE</th>
              <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; color: #142d42; vertical-align: top;">
                <strong>${escapeHtml(cbe.officialName)}</strong> (${escapeHtml(cbe.legalForm || "Active")}) · ${escapeHtml(cbe.fullAddress || "—")}
              </td>
            </tr>`
          : ""
      }
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Localisation</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">
          ${escapeHtml(location)}
          ${
            spw?.houseVerified
              ? renderInlineBadge("Adresse exacte SPW", "success")
              : spw?.validInWallonia && spw.streetVerified && !hasBelgianHouseNumber(payload.siteAddress)
                ? renderInlineBadge("Rue SPW (N° manquant)", "warning")
                : spw?.validInWallonia && !spw.postalMismatch
                  ? renderInlineBadge("Commune SPW", "info")
                  : ""
          }
        </td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">Adresse du site</th>
        <td style="padding: 6px 0; border-bottom: 1px solid #e6edf1; text-align: left; font-size: 13px; color: #142d42; vertical-align: top;">${addressLinksHtml}</td>
      </tr>
      <tr>
        <th scope="row" style="padding: 6px 8px 6px 0; border-bottom: 0; text-align: left; font-size: 13px; font-weight: normal; color: #4d6374; vertical-align: top;">GRD compétent</th>
        <td style="padding: 6px 0; border-bottom: 0; text-align: left; font-size: 13px; font-weight: bold; color: #142d42; vertical-align: top;">${escapeHtml(grdLabel)}</td>
      </tr>
    </table>
  `

  const techRows = [
    { label: "Surface & type", value: `${surfaceFormatted} (${surfaceTypeLabel})` },
    { label: "Matériau toiture", value: roofMaterialLabel },
    { label: "Puissance estimée", value: `${powerFormatted} (${panelCountFormatted})` },
    { label: "Productible estimé", value: productionFormatted },
    { label: "Facture annuelle", value: billFormatted },
    { label: "Économies estimées", value: savingsFormatted },
    { label: "ROI & Autoconso", value: `${roiFormatted} · ${autoconsumptionFormatted}` },
    { label: "Statut d'occupation", value: ownershipLabel },
    { label: "Délai & Borne IRVE", value: `${timeframeLabel} · IRVE : ${payload.wantsIrve ? "Oui" : "Non"}` },
    { label: "Source", value: payload.sourceForm || "simulateur" },
  ]

  const html = renderInstallerEmailShell({
    subject,
    preheader: `${companyOrName} · ${location} · ${phoneDiag.overallBadge.text} · Score ${scoreBadgeText} · ${creditsFormatted}`,
    reference: `Dossier #${leadRefCode}`,
    context: `Modération Lead · ${isB2B ? "B2B" : "B2C"} · ${receivedLabel}`,
    contextColor: allAlerts.length > 0 ? "#991b1b" : isHotLead ? "#1d5d45" : "#305a76",
    headline: companyOrName,
    subtitle: location,
    statusPill: {
      text: `${scoreCategory} · ${scoreBadgeText}`,
      tone: allAlerts.length > 0 ? "danger" : isHotLead ? "success" : isReviewNeeded ? "warning" : "info",
    },
    logoHref: directLeadDashboardUrl,
    bodyHtml: `
      ${alertsBlockHtml}
      ${certifiedBlockHtml}

      ${renderActionBox({
        kicker: "Validation en 1 clic",
        title: `Publier le dossier #${leadRefCode}`,
        subtext: "Déclenche immédiatement la Vague 1 aux installateurs.",
        ctaLabel: "Valider et publier →",
        ctaUrl: quickValidateUrl,
        secondaryLabel: "Examiner sur le dashboard admin",
        secondaryUrl: directLeadDashboardUrl,
      })}

      ${renderFiguresBox(
        {
          label: "Score de qualification",
          value: scoreBadgeText,
          sublabel: scoreCategory,
        },
        {
          label: "Prix marketplace",
          value: creditsFormatted,
          sublabel: "Tarification installateur V2",
        }
      )}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
        <tr>
          <td style="padding: 14px 15px;">
            <h2 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
              Contact &amp; Identification
            </h2>
            ${contactRowsHtml}
          </td>
        </tr>
      </table>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
            <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
              Données techniques &amp; énergétiques
            </h2>
            ${renderSpecsTable(techRows)}
          </td>
        </tr>
      </table>

      ${
        payload.message
          ? renderCalloutBox({
              label: "Commentaire du prospect",
              value: payload.message,
              tone: "info",
            })
          : ""
      }
    `,
    footerLinks: [
      { label: "Examiner le dossier", href: directLeadDashboardUrl },
      { label: "File de triage", href: triageUrl },
      { label: "Administration", href: `${baseUrl}/admin` },
    ],
    footerLegalText: "Aegis Solaire · Notification interne d'arbitrage & modération",
  })

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

  const adminLeadUrl = `${baseUrl}/admin/leads?leadId=${encodeURIComponent(payload.leadId)}`
  const leadRefCode = payload.leadId.slice(0, 8).toUpperCase()
  const html = renderInstallerEmailShell({
    subject,
    preheader: `Inscription webinaire B2B : ${payload.firstName} (${payload.companyName || "Entreprise"})`,
    reference: `Dossier #${leadRefCode}`,
    context: "Administration · Webinaire B2B",
    headline: payload.firstName,
    subtitle: `${payload.jobTitle}${payload.companyName ? ` · ${payload.companyName}` : ""}`,
    statusPill: { text: "Inscription webinaire B2B", tone: "info" },
    logoHref: adminLeadUrl,
    bodyHtml: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding-top: 14px; border-top: 1px solid #e4edf1;">
            ${renderSpecsTable([
              { label: "Contact", value: payload.firstName },
              { label: "Fonction", value: payload.jobTitle || "—" },
              { label: "Entreprise", value: payload.companyName || "—" },
              { label: "E-mail", value: payload.email },
              { label: "Surface estimée", value: payload.surfaceRange || "—" },
            ])}
          </td>
        </tr>
      </table>
      ${renderActionBox({
        kicker: "Dossier enregistré",
        title: `Lead #${leadRefCode}`,
        ctaLabel: "Ouvrir le dossier →",
        ctaUrl: adminLeadUrl,
      })}
    `,
    footerLinks: [
      { label: "Ouvrir le dossier", href: adminLeadUrl },
      { label: "Administration", href: `${baseUrl}/admin` },
    ],
    footerLegalText: "Aegis Solaire · Notification interne Webinaire B2B",
  })

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: fromEmail,
      to: recipients,
      replyTo,
      subject,
      text,
      html,
    })
    return { success: true }
  } catch (err) {
    console.error("[Admin Webinar Alert] Exception Resend:", err)
    return { success: false }
  }
}

export function buildAdminLeadOtpConfirmedEmail(
  payload: AdminLeadAlertPayload & { marketplaceStatus?: string | null }
): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
  const token = generateLeadValidationToken(payload.leadId)
  const quickValidateUrl = `${baseUrl}/api/admin/leads/quick-validate?id=${encodeURIComponent(payload.leadId)}&token=${encodeURIComponent(token)}`
  const directLeadDashboardUrl = `${baseUrl}/admin/leads?leadId=${encodeURIComponent(payload.leadId)}`
  const leadRefCode = payload.leadId.slice(0, 8).toUpperCase()

  const fullName = `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || "Contact non spécifié"
  const companyOrName = payload.company ? `${fullName} (${payload.company})` : fullName
  const location = [payload.postalCode, payload.city, payload.province].filter(Boolean).join(" · ") || "Wallonie"
  const scoreNum = payload.leadScore != null ? Math.round(Number(payload.leadScore)) : null
  const scoreBadgeText = scoreNum != null ? `${scoreNum}/100` : "Non calculé"
  const creditsFormatted = payload.creditCost != null ? `${payload.creditCost} crédit${payload.creditCost > 1 ? "s" : ""}` : "–"
  const verifs = payload.verifications

  const phoneDiag = getPhoneVerificationDiagnostic({
    segment: payload.segment,
    phone: payload.phone,
    email: payload.email,
    postal_code: payload.postalCode,
    company_vat: payload.companyVat,
    phone_verified: payload.phoneVerified ?? true,
    phone_verified_at: payload.phoneVerifiedAt ?? verifs?.phoneOtp?.verifiedAt ?? null,
    phone_verification_method: payload.phoneVerificationMethod ?? null,
    phone_carrier: payload.phoneCarrier ?? null,
    phone_line_type: payload.phoneLineType ?? null,
    created_at: payload.createdAt ?? null,
    qualification_metadata: verifs ? { verifications: verifs } : null,
  })

  const alreadyPublished =
    payload.marketplaceStatus === "available" || payload.marketplaceStatus === "sold_out"

  const subject = `[Aegis Solaire] ${phoneDiag.otp.badgeText} confirmé : ${companyOrName} · Score ${scoreBadgeText}`
  const text = `AEGIS SOLAIRE — CONFIRMATION TÉLÉPHONE PROSPECT
========================================================================

Dossier : #${leadRefCode} (${payload.leadId})
Prospect : ${companyOrName}
Localisation : ${location}
Téléphone : ${payload.phone || "—"}
  - Contrôle Lookup : ${phoneDiag.lookup.detailText}
  - Vérification OTP : ${phoneDiag.otp.detailText}
Score actualisé : ${scoreBadgeText}

${alreadyPublished ? `Examiner le dossier : ${directLeadDashboardUrl}` : `Valider et publier en 1 clic : ${quickValidateUrl}\nExaminer sur le dashboard admin : ${directLeadDashboardUrl}`}
`

  const html = renderInstallerEmailShell({
    subject,
    preheader: `${companyOrName} · ${phoneDiag.otp.detailText} · Score ${scoreBadgeText}`,
    reference: `Dossier #${leadRefCode}`,
    context: `Mise à jour Téléphone · ${payload.segment === "B2B" ? "B2B" : "B2C"}`,
    contextColor: "#1d5d45",
    headline: companyOrName,
    subtitle: location,
    statusPill: {
      text: `${phoneDiag.otp.badgeText} · Score ${scoreBadgeText}`,
      tone: "success",
    },
    logoHref: directLeadDashboardUrl,
    bodyHtml: `
      ${renderFiguresBox(
        {
          label: "Score actualisé",
          value: scoreBadgeText,
          sublabel: "Inclut bonus certification OTP",
        },
        {
          label: "Statut téléphone",
          value: phoneDiag.otp.badgeText,
          sublabel: phoneDiag.lookup.carrierName || phoneDiag.lookup.lineTypeLabel,
        }
      )}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
        <tr>
          <td style="padding: 14px 15px;">
            <h2 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
              Détail de certification téléphonique
            </h2>
            ${renderSpecsTable([
              { label: "Téléphone", value: payload.phone || "—" },
              { label: "Contrôle Lookup", value: phoneDiag.lookup.detailText },
              { label: "Vérification OTP", value: phoneDiag.otp.detailText },
              { label: "Tarif marketplace", value: creditsFormatted },
            ])}
          </td>
        </tr>
      </table>

      ${
        alreadyPublished
          ? renderActionBox({
              kicker: "Dossier déjà en ligne",
              title: `Lead #${leadRefCode}`,
              subtext: "La certification OTP a été ajoutée à la fiche marketplace.",
              ctaLabel: "Ouvrir sur le dashboard admin →",
              ctaUrl: directLeadDashboardUrl,
            })
          : renderActionBox({
              kicker: "Validation en 1 clic",
              title: `Publier le dossier #${leadRefCode}`,
              subtext: "Numéro certifié par code OTP — prêt pour la Vague 1.",
              ctaLabel: "Valider et publier →",
              ctaUrl: quickValidateUrl,
              secondaryLabel: "Examiner sur le dashboard admin",
              secondaryUrl: directLeadDashboardUrl,
            })
      }
    `,
    footerLinks: [
      { label: "Examiner le dossier", href: directLeadDashboardUrl },
      { label: "Administration", href: `${baseUrl}/admin` },
    ],
    footerLegalText: "Aegis Solaire · Notification interne de certification OTP",
  })

  return { subject, text, html }
}

export async function sendAdminLeadOtpConfirmedEmail(
  payload: AdminLeadAlertPayload & { marketplaceStatus?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { success: false, error: "RESEND_API_KEY non configurée" }
  const recipients = getAdminAlertRecipients()
  if (!recipients.length) return { success: false, error: "Aucun destinataire configuré" }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
  const replyTo = payload.email || process.env.RESEND_REPLY_TO || "contact@aegissolaire.com"

  try {
    const resend = new Resend(apiKey)
    const { subject, text, html } = buildAdminLeadOtpConfirmedEmail(payload)
    const res = await resend.emails.send({
      from: fromEmail,
      to: recipients,
      replyTo,
      subject,
      text,
      html,
    })
    if (res.error) {
      console.error("[Admin Lead OTP Confirmed] Erreur Resend:", res.error)
      return { success: false, error: res.error.message }
    }
    return { success: true }
  } catch (err) {
    console.error("[Admin Lead OTP Confirmed] Exception Resend:", err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export function buildAdminLeadAlertPayloadFromLeadRow(
  leadRow: Record<string, any>
): AdminLeadAlertPayload {
  const meta =
    leadRow.qualification_metadata && typeof leadRow.qualification_metadata === "object"
      ? (leadRow.qualification_metadata as Record<string, any>)
      : {}
  const verifs =
    meta.verifications && typeof meta.verifications === "object"
      ? (meta.verifications as LeadEnrichedData)
      : null

  const segment = leadRow.segment || "B2C"
  const surfaceArea = Math.max(0, Number(leadRow.surface_area_m2 ?? leadRow.surface_area) || 0)
  const annualBill = Math.max(
    0,
    Number(leadRow.annual_bill_eur ?? leadRow.annual_electricity_bill) || 0
  )
  const timeframe = leadRow.timeframe ?? leadRow.project_timeline ?? null
  const projectDetails = leadRow.project_details ?? leadRow.message ?? null

  const creditCost =
    leadRow.credit_cost ??
    calculateLeadCreditCost({
      segment,
      surfaceArea,
      surfaceType: leadRow.surface_type,
      annualBill,
      timeframe,
      projectTimeline: leadRow.project_timeline,
      wantsIrve: Boolean(leadRow.wants_irve),
      projectDetails,
      qualificationMetadata: meta,
    })

  const financials = calculateMarketplaceFinancials({
    segment,
    surfaceArea,
    surfaceType: leadRow.surface_type,
    roofMaterial: leadRow.roof_material,
    annualBill,
    creditCost,
    estimatedPowerKwc: leadRow.estimated_power_kwc,
    projectDetails,
    qualificationMetadata: meta,
  })

  const scoreRes = calculateLeadScore({
    firstName: leadRow.first_name || "",
    lastName: leadRow.last_name || "",
    jobTitle: leadRow.job_title || "",
    surfaceArea: financials.normalizedSurfaceAreaM2,
    annualElectricityBill: financials.normalizedAnnualBill,
    segment,
    grd: leadRow.grd ?? null,
  })

  return {
    leadId: leadRow.id,
    firstName: leadRow.first_name || "",
    lastName: leadRow.last_name ?? null,
    email: leadRow.email || "",
    phone: leadRow.phone ?? null,
    phoneVerified: Boolean(leadRow.phone_verified),
    phoneVerifiedAt: leadRow.phone_verified_at ?? null,
    phoneVerificationMethod: leadRow.phone_verification_method ?? null,
    phoneCarrier: leadRow.phone_carrier ?? null,
    phoneLineType: leadRow.phone_line_type ?? null,
    createdAt: leadRow.created_at ?? null,
    company: leadRow.company ?? null,
    companyVat: leadRow.company_vat ?? null,
    jobTitle: leadRow.job_title ?? null,
    segment,
    surfaceType: leadRow.surface_type ?? null,
    surfaceArea: financials.normalizedSurfaceAreaM2,
    annualBill: financials.normalizedAnnualBill,
    estimatedSavings: leadRow.estimated_savings ?? financials.revenueEstimatePerYear,
    estimatedROIYears: leadRow.estimated_roi_years ?? financials.estimatedRoiYears,
    estimatedPowerKwc: leadRow.estimated_power_kwc ?? financials.estimatedPowerKwc,
    annualProductionKwh:
      typeof meta.annualProductionKwh === "number"
        ? meta.annualProductionKwh
        : financials.annualProductionKwh,
    estimatedPanelCount:
      typeof meta.estimatedPanelCount === "number"
        ? meta.estimatedPanelCount
        : financials.estimatedPanelCount,
    autoconsumptionRate: leadRow.autoconsumption_rate ?? financials.autoconsumptionRate,
    wantsIrve: Boolean(leadRow.wants_irve) || financials.includesEv,
    province: leadRow.province ?? null,
    postalCode: leadRow.postal_code ?? null,
    city: leadRow.city ?? null,
    siteAddress: leadRow.site_address ?? null,
    grd: leadRow.grd ?? null,
    ownershipStatus: leadRow.ownership_status ?? null,
    timeframe,
    roofMaterial: leadRow.roof_material ?? null,
    leadScore: leadRow.lead_score ?? scoreRes.score,
    scoreStatus: leadRow.status ?? scoreRes.status,
    scoreFactors: scoreRes.factors,
    creditCost,
    contactPreference: leadRow.contact_preference ?? meta.contactPreference ?? "written_first",
    sourceForm: leadRow.source_form ?? null,
    mediaPartnerCode: leadRow.media_partner_code ?? null,
    message: projectDetails,
    verifications: verifs,
  }
}

export type DeferredAdminAlertTrigger =
  | "otp_verified"
  | "otp_skipped"
  | "otp_send_terminal"
  | "cron_recovery"

/**
 * Envoie l'alerte admin différée avec prise de verrou atomique en base (zéro doublon),
 * puis relit qualification_metadata juste avant marquage "sent" pour préserver toute écriture concurrente.
 */
export async function dispatchDeferredAdminLeadAlert(
  supabase: SupabaseClient<any, "public", any>,
  leadId: string,
  trigger: DeferredAdminAlertTrigger
): Promise<{ dispatched: boolean; alreadySent?: boolean; error?: string }> {
  const { data: leadRow, error: fetchErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle()

  if (fetchErr || !leadRow) {
    return { dispatched: false, error: fetchErr?.message || "Lead introuvable" }
  }

  const meta =
    leadRow.qualification_metadata && typeof leadRow.qualification_metadata === "object"
      ? ({ ...leadRow.qualification_metadata } as Record<string, any>)
      : {}

  const currentStatus = meta.admin_alert_status as string | undefined
  if (currentStatus === "sent") {
    return { dispatched: false, alreadySent: true }
  }

  const expectedStatus =
    currentStatus === "sending" && trigger === "cron_recovery"
      ? "sending"
      : currentStatus === "pending_otp"
        ? "pending_otp"
        : null

  if (!expectedStatus) {
    return { dispatched: false, alreadySent: currentStatus !== undefined }
  }

  const claimedAt = new Date().toISOString()
  const { data: claimedRow, error: claimErr } = await supabase
    .from("leads")
    .update({
      qualification_metadata: {
        ...meta,
        admin_alert_status: "sending",
        admin_alert_claimed_at: claimedAt,
      },
    })
    .eq("id", leadId)
    .eq("qualification_metadata->>admin_alert_status", expectedStatus)
    .select("*")
    .maybeSingle()

  if (claimErr || !claimedRow) {
    return { dispatched: false, alreadySent: true }
  }

  const payload = buildAdminLeadAlertPayloadFromLeadRow(claimedRow)
  const sendRes = await sendAdminNewLeadAlertEmail(payload)

  // Relire la ligne la plus récente pour éviter d'écraser une mise à jour concurrente de verifications.phoneOtp
  const { data: latestRow } = await supabase
    .from("leads")
    .select("qualification_metadata")
    .eq("id", leadId)
    .maybeSingle()

  const latestMeta =
    latestRow?.qualification_metadata && typeof latestRow.qualification_metadata === "object"
      ? ({ ...latestRow.qualification_metadata } as Record<string, any>)
      : ({ ...meta } as Record<string, any>)

  if (!sendRes.success) {
    await supabase
      .from("leads")
      .update({
        qualification_metadata: {
          ...latestMeta,
          admin_alert_status: "pending_otp",
          admin_alert_last_error: sendRes.error || "send_failed",
        },
      })
      .eq("id", leadId)
    return { dispatched: false, error: sendRes.error }
  }

  await supabase
    .from("leads")
    .update({
      qualification_metadata: {
        ...latestMeta,
        admin_alert_status: "sent",
        admin_alert_sent_at: new Date().toISOString(),
        admin_alert_trigger: trigger,
      },
    })
    .eq("id", leadId)

  return { dispatched: true }
}

/**
 * Rattrape les dossiers dont l'alerte admin était en attente de validation OTP depuis plus de delayMs (3 min par défaut).
 * S'exécute 24h/24 dans le cron (indépendamment des heures ouvrées des relances partenaires).
 */
export async function flushDeferredAdminLeadAlerts(
  supabase: SupabaseClient<any, "public", any>,
  options?: { delayMs?: number }
): Promise<number> {
  const delayMs = options?.delayMs ?? 3 * 60 * 1000
  const now = Date.now()
  const cutoffIso = new Date(now - delayMs).toISOString()
  const staleClaimIso = new Date(now - 10 * 60 * 1000).toISOString()
  const lookbackIso = new Date(now - 48 * 60 * 60 * 1000).toISOString()

  const [pendingRes, staleRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id")
      .eq("qualification_metadata->>admin_alert_status", "pending_otp")
      .gte("created_at", lookbackIso)
      .lte("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .limit(25),
    supabase
      .from("leads")
      .select("id")
      .eq("qualification_metadata->>admin_alert_status", "sending")
      .gte("created_at", lookbackIso)
      .lte("qualification_metadata->>admin_alert_claimed_at", staleClaimIso)
      .order("created_at", { ascending: true })
      .limit(10),
  ])

  const ids = Array.from(
    new Set([
      ...(pendingRes.data ?? []).map((r: { id: string }) => r.id),
      ...(staleRes.data ?? []).map((r: { id: string }) => r.id),
    ])
  )

  let dispatchedCount = 0
  for (const leadId of ids) {
    try {
      const res = await dispatchDeferredAdminLeadAlert(supabase, leadId, "cron_recovery")
      if (res.dispatched) dispatchedCount++
    } catch (err) {
      console.error("[Admin Alert Flush] Échec non bloquant pour lead:", leadId, err)
    }
  }

  return dispatchedCount
}
