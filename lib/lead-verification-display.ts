import {
  getEmailError,
  isValidBelgianVat,
  isValidFrBePhone,
  isWalloonPostalCode,
} from "./leads-validation"
import type { PhoneOtpStatus } from "./lead-verification-engine"

export type VerificationTier = "verified" | "plausible" | "none"

export type PhoneDiagnosticTone = "success" | "warning" | "danger" | "info" | "neutral"

export interface ChannelVerificationBadge {
  tier: VerificationTier
  /** Libellé ultra-compact pour micro-pilules et vues denses */
  compactLabel: string | null
  /** Libellé court pour pilules / cartes / e-mails teaser */
  shortLabel: string | null
  /** Libellé descriptif complet pour infobulles / tiroir d'inspection */
  detailLabel: string | null
}

export interface LeadVerificationSummary {
  phone: ChannelVerificationBadge
  email: ChannelVerificationBadge
  address: ChannelVerificationBadge
  company: ChannelVerificationBadge | null
  verifiedCount: number
  plausibleCount: number
}

export interface PhoneVerificationDiagnostic {
  lookup: {
    status: "valid" | "transient_error" | "not_configured" | "not_run"
    lineType: string | null
    lineTypeLabel: "Mobile" | "Fixe" | "VoIP" | "Inconnu"
    carrierName: string | null
    badgeText: string
    badgeTone: PhoneDiagnosticTone
    detailText: string
  }
  otp: {
    status: PhoneOtpStatus | "legacy_untracked"
    verified: boolean
    channel: "sms" | "call" | "dev_mock" | null
    isTechnicalFailure: boolean
    isProspectNotValidated: boolean
    badgeText: string
    badgeTone: PhoneDiagnosticTone
    detailText: string
    twilioCode: number | null
    error: string | null
    delaySeconds: number | null
  }
  overallBadge: {
    text: string
    tone: PhoneDiagnosticTone
  }
}

export interface LeadVerificationDisplayInput {
  segment?: string | null
  phone?: string | null
  email?: string | null
  postal_code?: string | null
  postalCode?: string | null
  company_vat?: string | null
  companyVat?: string | null
  phone_verified?: boolean | null
  phone_verified_at?: string | null
  phone_verification_method?: string | null
  phone_carrier?: string | null
  phone_line_type?: string | null
  email_verified?: boolean | null
  email_delivery_status?: string | null
  created_at?: string | null
  createdAt?: string | null
  qualification_metadata?: Record<string, unknown> | null
  qualificationMetadata?: Record<string, unknown> | null
}

function getVerifsObject(lead: LeadVerificationDisplayInput): Record<string, any> | null {
  const meta = lead.qualification_metadata ?? lead.qualificationMetadata ?? null
  if (!meta || typeof meta !== "object") return null
  const verifs = (meta as Record<string, unknown>).verifications
  return verifs && typeof verifs === "object" ? (verifs as Record<string, any>) : null
}

function formatBrusselsTime(iso?: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString("fr-BE", {
    timeZone: "Europe/Brussels",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDelayLabel(delaySeconds: number | null): string | null {
  if (delaySeconds === null || !Number.isFinite(delaySeconds)) return null
  if (delaySeconds < 120) return `+${delaySeconds} s`
  if (delaySeconds < 3600) {
    const mins = Math.floor(delaySeconds / 60)
    const secs = delaySeconds % 60
    return secs > 0 ? `+${mins} min ${secs} s` : `+${mins} min`
  }
  return `+${Math.round(delaySeconds / 60)} min`
}

function resolveLineTypeLabel(rawType?: string | null): "Mobile" | "Fixe" | "VoIP" | "Inconnu" {
  if (!rawType) return "Inconnu"
  const clean = rawType.trim()
  if (clean === "mobile") return "Mobile"
  if (clean === "landline") return "Fixe"
  if (clean === "voip" || clean === "nonFixedVoip") return "VoIP"
  return "Inconnu"
}

/**
 * Retourne un diagnostic séparé et sans ambiguïté des 2 couches téléphoniques :
 * 1) Contrôle opérateur (Twilio Lookup v2 : type de ligne + opérateur)
 * 2) Preuve prospect par code OTP (SMS / appel vocal Twilio Verify, ou motif exact d'absence)
 */
export function getPhoneVerificationDiagnostic(
  lead: LeadVerificationDisplayInput
): PhoneVerificationDiagnostic {
  const verifs = getVerifsObject(lead)
  const phoneOtp =
    verifs?.phoneOtp && typeof verifs.phoneOtp === "object"
      ? (verifs.phoneOtp as Record<string, any>)
      : null
  const twilioLookup =
    verifs?.twilioLookup && typeof verifs.twilioLookup === "object"
      ? (verifs.twilioLookup as Record<string, any>)
      : null

  const carrierName =
    typeof twilioLookup?.carrierName === "string" && twilioLookup.carrierName.trim()
      ? twilioLookup.carrierName.trim()
      : typeof lead.phone_carrier === "string" && lead.phone_carrier.trim()
        ? lead.phone_carrier.trim()
        : null

  const lineType =
    (typeof twilioLookup?.lineType === "string" && twilioLookup.lineType.trim()
      ? twilioLookup.lineType.trim()
      : null) ??
    (typeof lead.phone_line_type === "string" && lead.phone_line_type.trim()
      ? lead.phone_line_type.trim()
      : null) ??
    (typeof verifs?.phoneAnalysis?.lineType === "string" && verifs.phoneAnalysis.lineType.trim()
      ? verifs.phoneAnalysis.lineType.trim()
      : null)

  const lineTypeLabel = resolveLineTypeLabel(lineType)
  const lookupTransientError = twilioLookup?.transientError === true
  const phoneOtpVerified = Boolean(lead.phone_verified || phoneOtp?.verified)
  const lookupCheckedTime = formatBrusselsTime(
    typeof twilioLookup?.checkedAt === "string" ? twilioLookup.checkedAt : null
  )

  const hasValidLookup = Boolean(
    (twilioLookup?.valid === true && !lookupTransientError) ||
    lead.phone_verification_method === "twilio_lookup" ||
    (phoneOtpVerified && Boolean(carrierName))
  )

  let lookup: PhoneVerificationDiagnostic["lookup"]
  if (lookupTransientError) {
    lookup = {
      status: "transient_error",
      lineType,
      lineTypeLabel,
      carrierName,
      badgeText: "Lookup erreur temp.",
      badgeTone: "warning",
      detailText:
        "Contrôle opérateur Twilio Lookup temporairement indisponible (erreur réseau/API)",
    }
  } else if (hasValidLookup) {
    const isVoip = lineTypeLabel === "VoIP"
    lookup = {
      status: "valid",
      lineType,
      lineTypeLabel,
      carrierName,
      badgeText: carrierName ? `Lookup · ${carrierName}` : "Lookup actif",
      badgeTone: isVoip ? "warning" : "info",
      detailText: `Ligne active (${lineTypeLabel})${carrierName ? ` · ${carrierName}` : ""}${lookupCheckedTime ? ` (${lookupCheckedTime})` : ""
        }`,
    }
  } else if (twilioLookup?.configured === false) {
    lookup = {
      status: "not_configured",
      lineType,
      lineTypeLabel,
      carrierName,
      badgeText: "Lookup non configuré",
      badgeTone: "neutral",
      detailText: "Contrôle opérateur Twilio Lookup non configuré dans l'environnement",
    }
  } else {
    lookup = {
      status: "not_run",
      lineType,
      lineTypeLabel,
      carrierName,
      badgeText: "Format BE/FR seul",
      badgeTone: "neutral",
      detailText:
        "Aucun contrôle opérateur Twilio Lookup enregistré (syntaxe BE/FR vérifiée)",
    }
  }

  const rawChannel =
    phoneOtp?.channel === "call" || lead.phone_verification_method === "twilio_call"
      ? "call"
      : phoneOtp?.channel === "dev_mock" || lead.phone_verification_method === "dev_mock"
        ? "dev_mock"
        : phoneOtp?.channel === "sms" || lead.phone_verification_method === "twilio_sms"
          ? "sms"
          : null

  const rawStatus = phoneOtp?.status as PhoneOtpStatus | undefined
  const status: PhoneOtpStatus | "legacy_untracked" = phoneOtpVerified
    ? "verified"
    : rawStatus ?? "legacy_untracked"

  const twilioCode = typeof phoneOtp?.twilioCode === "number" ? phoneOtp.twilioCode : null
  const error =
    typeof phoneOtp?.error === "string" && phoneOtp.error.trim()
      ? phoneOtp.error.trim()
      : null
  const verifyFailedAttempts =
    typeof phoneOtp?.verifyFailedAttempts === "number" ? phoneOtp.verifyFailedAttempts : 0
  const sentAt = typeof phoneOtp?.sentAt === "string" ? phoneOtp.sentAt : null
  const verifiedAt =
    (typeof lead.phone_verified_at === "string" && lead.phone_verified_at) ||
    (typeof phoneOtp?.verifiedAt === "string" ? phoneOtp.verifiedAt : null)
  const createdAt = lead.created_at ?? lead.createdAt ?? null

  let delaySeconds: number | null = null
  if (verifiedAt) {
    const baseIso = sentAt ?? createdAt
    if (baseIso) {
      const startMs = new Date(baseIso).getTime()
      const endMs = new Date(verifiedAt).getTime()
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
        delaySeconds = Math.round((endMs - startMs) / 1000)
      }
    }
  }

  let otp: PhoneVerificationDiagnostic["otp"]
  let overallBadge: PhoneVerificationDiagnostic["overallBadge"]

  if (status === "verified") {
    const isCall = rawChannel === "call"
    const isMock = rawChannel === "dev_mock"
    const timeStr = formatBrusselsTime(verifiedAt)
    const delayStr = formatDelayLabel(delaySeconds)
    const badgeText = isCall
      ? "Appel OTP vérifié"
      : isMock
        ? "OTP validé (test)"
        : "SMS OTP vérifié"
    const detailParts = [
      isCall
        ? "Code validé par appel vocal"
        : isMock
          ? "Code validé (mode dev)"
          : "Code validé par SMS",
    ]
    if (timeStr) detailParts.push(`à ${timeStr}`)
    if (delayStr) detailParts.push(`(${delayStr})`)
    if (verifyFailedAttempts > 0) {
      detailParts.push(`· ${verifyFailedAttempts} essai(s) erroné(s) avant succès`)
    }

    otp = {
      status,
      verified: true,
      channel: rawChannel ?? "sms",
      isTechnicalFailure: false,
      isProspectNotValidated: false,
      badgeText,
      badgeTone: "success",
      detailText: detailParts.join(" "),
      twilioCode,
      error: null,
      delaySeconds,
    }
    overallBadge = { text: badgeText, tone: "success" }
  } else if (status === "sent_pending") {
    const isCall = rawChannel === "call"
    const sentTime = formatBrusselsTime(sentAt)
    const badgeText = isCall ? "Appel envoyé · non saisi" : "SMS envoyé · non saisi"
    otp = {
      status,
      verified: false,
      channel: rawChannel ?? "sms",
      isTechnicalFailure: false,
      isProspectNotValidated: true,
      badgeText,
      badgeTone: "warning",
      detailText: `${isCall ? "Appel vocal envoyé" : "SMS OTP bien envoyé"}${sentTime ? ` à ${sentTime}` : ""
        } — le prospect n'a pas encore validé le code${verifyFailedAttempts > 0 ? ` (${verifyFailedAttempts} essai(s) erroné(s))` : ""
        }`,
      twilioCode,
      error: null,
      delaySeconds: null,
    }
    overallBadge = {
      text: lookup.status === "valid" ? "Lookup seul · SMS non validé" : "SMS envoyé · non saisi",
      tone: "warning",
    }
  } else if (status === "skipped_by_prospect") {
    const hadSendFailure = Boolean(phoneOtp?.failedAt || twilioCode !== null || error)
    const sentTime = formatBrusselsTime(sentAt)
    const skippedTime = formatBrusselsTime(
      typeof phoneOtp?.skippedAt === "string" ? phoneOtp.skippedAt : null
    )

    if (hadSendFailure) {
      otp = {
        status,
        verified: false,
        channel: rawChannel,
        isTechnicalFailure: true,
        isProspectNotValidated: false,
        badgeText: "Échec SMS · ignoré ensuite",
        badgeTone: "danger",
        detailText: `Échec technique d'envoi${twilioCode ? ` (Twilio #${twilioCode})` : ""}${error ? ` : ${error}` : ""
          } — le prospect a cliqué « Continuer sans confirmer »`,
        twilioCode,
        error,
        delaySeconds: null,
      }
      overallBadge = {
        text: lookup.status === "valid" ? "Lookup seul · Échec SMS" : "Échec technique SMS",
        tone: "danger",
      }
    } else {
      otp = {
        status,
        verified: false,
        channel: rawChannel,
        isTechnicalFailure: false,
        isProspectNotValidated: true,
        badgeText: "Ignoré par le prospect",
        badgeTone: "warning",
        detailText: sentTime
          ? `SMS bien envoyé à ${sentTime}, mais le prospect a cliqué sur « Continuer sans confirmer »${skippedTime ? ` à ${skippedTime}` : ""
          }${verifyFailedAttempts > 0 ? ` (${verifyFailedAttempts} essai(s) erroné(s))` : ""}`
          : `Le prospect a cliqué sur « Continuer sans confirmer »${skippedTime ? ` à ${skippedTime}` : ""
          } sans valider de code`,
        twilioCode,
        error: null,
        delaySeconds: null,
      }
      overallBadge = {
        text: lookup.status === "valid" ? "Lookup seul · SMS ignoré" : "SMS ignoré",
        tone: "warning",
      }
    }
  } else if (status === "send_failed") {
    const failedTime = formatBrusselsTime(
      typeof phoneOtp?.failedAt === "string" ? phoneOtp.failedAt : null
    )
    const badgeText = twilioCode ? `Échec SMS (#${twilioCode})` : "Échec technique SMS"
    otp = {
      status,
      verified: false,
      channel: rawChannel,
      isTechnicalFailure: true,
      isProspectNotValidated: false,
      badgeText,
      badgeTone: "danger",
      detailText: `Échec technique d'envoi Twilio Verify${twilioCode ? ` (code #${twilioCode})` : ""
        }${failedTime ? ` à ${failedTime}` : ""}${error ? ` : ${error}` : ""}`,
      twilioCode,
      error,
      delaySeconds: null,
    }
    overallBadge = {
      text: lookup.status === "valid" ? "Lookup seul · Échec SMS" : "Échec technique SMS",
      tone: "danger",
    }
  } else if (status === "rate_limited") {
    otp = {
      status,
      verified: false,
      channel: rawChannel,
      isTechnicalFailure: false,
      isProspectNotValidated: false,
      badgeText: "SMS bloqué (rate limit)",
      badgeTone: "warning",
      detailText:
        error || "Trop de tentatives d'envoi SMS sur ce numéro (limitation anti-abus)",
      twilioCode,
      error,
      delaySeconds: null,
    }
    overallBadge = {
      text: lookup.status === "valid" ? "Lookup seul · Rate limit SMS" : "SMS bloqué (rate limit)",
      tone: "warning",
    }
  } else if (status === "not_configured" || status === "disabled") {
    const isDisabled = status === "disabled"
    const badgeText = isDisabled ? "OTP désactivé" : "Twilio Verify non configuré"
    otp = {
      status,
      verified: false,
      channel: null,
      isTechnicalFailure: true,
      isProspectNotValidated: false,
      badgeText,
      badgeTone: "danger",
      detailText: isDisabled
        ? "Vérification SMS désactivée par configuration (LEAD_PHONE_OTP_DISABLED=true)"
        : "Service Twilio Verify non configuré (identifiants TWILIO_* absents)",
      twilioCode: null,
      error: null,
      delaySeconds: null,
    }
    overallBadge = {
      text: lookup.status === "valid" ? "Lookup seul · OTP inactif" : badgeText,
      tone: "danger",
    }
  } else if (
    status === "not_attempted_voip" ||
    status === "not_attempted_non_be" ||
    status === "not_attempted_invalid_lookup"
  ) {
    const labelMap = {
      not_attempted_voip: {
        badge: "SMS non envoyé (VoIP)",
        detail: "Ligne VoIP détectée par Lookup — envoi SMS ignoré en mode Soft OTP",
      },
      not_attempted_non_be: {
        badge: "SMS non envoyé (hors BE)",
        detail: "Numéro détecté hors Belgique (+32) en B2C — envoi SMS non déclenché",
      },
      not_attempted_invalid_lookup: {
        badge: "SMS non envoyé (Lookup rejeté)",
        detail: "Numéro non attribué ou bloqué selon Twilio Lookup — SMS non envoyé",
      },
    } as const
    const info = labelMap[status]
    otp = {
      status,
      verified: false,
      channel: null,
      isTechnicalFailure: false,
      isProspectNotValidated: false,
      badgeText: info.badge,
      badgeTone: "warning",
      detailText: info.detail,
      twilioCode: null,
      error,
      delaySeconds: null,
    }
    overallBadge = { text: info.badge, tone: "warning" }
  } else if (status === "awaiting_send") {
    otp = {
      status,
      verified: false,
      channel: null,
      isTechnicalFailure: false,
      isProspectNotValidated: true,
      badgeText: "Envoi SMS non finalisé",
      badgeTone: "warning",
      detailText:
        "Dossier enregistré, mais la requête d'envoi SMS (/phone-otp/send) n'a pas abouti",
      twilioCode: null,
      error: null,
      delaySeconds: null,
    }
    overallBadge = {
      text: lookup.status === "valid" ? "Lookup seul · SMS non envoyé" : "SMS non envoyé",
      tone: "warning",
    }
  } else if (status === "not_applicable") {
    otp = {
      status,
      verified: false,
      channel: null,
      isTechnicalFailure: false,
      isProspectNotValidated: false,
      badgeText: "OTP non requis",
      badgeTone: "neutral",
      detailText: "Import partenaire ou saisie manuelle — code SMS OTP non requis",
      twilioCode: null,
      error: null,
      delaySeconds: null,
    }
    overallBadge = {
      text: lookup.status === "valid" ? "Lookup seul" : "Format BE/FR seul",
      tone: lookup.status === "valid" ? "info" : "neutral",
    }
  } else {
    // legacy_untracked
    otp = {
      status: "legacy_untracked",
      verified: false,
      channel: null,
      isTechnicalFailure: false,
      isProspectNotValidated: true,
      badgeText: "SMS non validé",
      badgeTone: lookup.status === "valid" ? "info" : "neutral",
      detailText:
        lookup.status === "valid"
          ? "Contrôle opérateur Lookup effectué uniquement — aucune validation SMS enregistrée"
          : "Aucune validation SMS OTP ni contrôle Lookup enregistré",
      twilioCode: null,
      error: null,
      delaySeconds: null,
    }
    overallBadge = {
      text: lookup.status === "valid" ? "Lookup seul · sans SMS" : "Format BE seul",
      tone: lookup.status === "valid" ? "info" : "neutral",
    }
  }

  return { lookup, otp, overallBadge }
}

/**
 * Calcule le statut de vérification factuel (jamais survendu) d'un dossier :
 * - "verified" : confirmé par preuve directe du prospect (OTP SMS/appel, clic e-mail) ou registre officiel exact (SPW bâtiment / BCE active)
 * - "plausible" : contrôlé techniquement (syntaxe BE/FR, Lookup opérateur, DNS MX, livraison Resend, voirie SPW, TVA Modulo 97) sans preuve d'identité directe
 * - "none" : donnée suspecte, rejetée, en rebond (bounce) ou absente → aucun badge positif affiché
 */
export function getLeadVerificationSummary(
  lead: LeadVerificationDisplayInput
): LeadVerificationSummary {
  const verifs = getVerifsObject(lead)

  // ── 1. Téléphone ──
  const hasRawPhone = typeof lead.phone === "string" && lead.phone.trim().length > 0
  const rawPhoneValid = hasRawPhone ? isValidFrBePhone(lead.phone as string) : null
  const phoneOtpVerified = Boolean(lead.phone_verified || verifs?.phoneOtp?.verified)
  const phoneOtpChannel =
    (verifs?.phoneOtp?.channel as string | null | undefined) ??
    (lead.phone_verification_method === "twilio_call"
      ? "call"
      : lead.phone_verification_method === "twilio_sms"
        ? "sms"
        : null)
  const phoneAnalysisValid = verifs?.phoneAnalysis?.valid
  const lookupTransientError = verifs?.twilioLookup?.transientError === true
  const lookupValid = Boolean(
    (verifs?.twilioLookup?.valid === true && !lookupTransientError) ||
    lead.phone_verification_method === "twilio_lookup"
  )
  const carrierName =
    typeof verifs?.twilioLookup?.carrierName === "string" && verifs.twilioLookup.carrierName.trim()
      ? verifs.twilioLookup.carrierName.trim()
      : typeof lead.phone_carrier === "string" && lead.phone_carrier.trim()
        ? lead.phone_carrier.trim()
        : null

  let phone: ChannelVerificationBadge
  if (rawPhoneValid === false || phoneAnalysisValid === false) {
    phone = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
  } else if (phoneOtpVerified) {
    const isCall = phoneOtpChannel === "call"
    phone = {
      tier: "verified",
      compactLabel: isCall ? "Tél. vérifié appel" : "Tél. vérifié SMS",
      shortLabel: isCall ? "Téléphone vérifié par appel" : "Téléphone vérifié par SMS",
      detailLabel: isCall
        ? `Code vocal validé${carrierName ? ` · ${carrierName}` : " par le prospect"}`
        : `Code SMS validé${carrierName ? ` · ${carrierName}` : " par le prospect"}`,
    }
  } else if (lookupValid) {
    phone = {
      tier: "plausible",
      compactLabel: "Ligne active (sans SMS)",
      shortLabel: "Ligne active · sans SMS",
      detailLabel: carrierName
        ? `Opérateur ${carrierName} · non confirmé par SMS`
        : "Numéro actif, non confirmé par SMS",
    }
  } else if (
    rawPhoneValid === true ||
    phoneAnalysisValid === true ||
    (!hasRawPhone && verifs?.phoneAnalysis?.valid !== false)
  ) {
    // Sur les cartes marketplace anonymisées (où lead.phone est volontairement absent), un dossier publié valide est au minimum plausible par format
    if (!hasRawPhone && !verifs && lead.phone !== undefined) {
      phone = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
    } else {
      phone = {
        tier: "plausible",
        compactLabel: "Numéro valide (sans SMS)",
        shortLabel: "Numéro valide · sans SMS",
        detailLabel: "Format belge valide, non confirmé par SMS",
      }
    }
  } else {
    phone = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
  }

  // ── 2. E-mail ──
  const deliveryStatus =
    lead.email_delivery_status ?? (verifs?.emailDelivery?.status as string | undefined) ?? null
  const isBounced = deliveryStatus === "bounced" || deliveryStatus === "complained"
  const hasRawEmail = typeof lead.email === "string" && lead.email.trim().length > 0
  const rawEmailSyntaxOk = hasRawEmail ? getEmailError(lead.email as string) === null : null
  const emailMx = verifs?.emailMx as
    | { valid?: boolean; isDisposable?: boolean; transientError?: boolean }
    | undefined
  const emailProofVerified = Boolean(lead.email_verified || verifs?.emailProof?.verified)

  let email: ChannelVerificationBadge
  if (
    isBounced ||
    emailMx?.isDisposable ||
    (emailMx && emailMx.valid === false && !emailMx.transientError) ||
    rawEmailSyntaxOk === false
  ) {
    email = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
  } else if (emailProofVerified) {
    email = {
      tier: "verified",
      compactLabel: "E-mail vérifié",
      shortLabel: "E-mail vérifié",
      detailLabel: "Confirmé par le prospect",
    }
  } else if (deliveryStatus === "delivered") {
    email = {
      tier: "plausible",
      compactLabel: "E-mail reçu",
      shortLabel: "E-mail reçu · non confirmé",
      detailLabel: "Récapitulatif bien reçu, confirmation en attente",
    }
  } else if (emailMx?.valid) {
    email = {
      tier: "plausible",
      compactLabel: "E-mail valide",
      shortLabel: "E-mail valide · non confirmé",
      detailLabel: "Domaine actif, non confirmé par le prospect",
    }
  } else if (rawEmailSyntaxOk === true) {
    email = {
      tier: "plausible",
      compactLabel: "E-mail renseigné",
      shortLabel: "E-mail renseigné · non confirmé",
      detailLabel: "Format valide, non confirmé par le prospect",
    }
  } else {
    email = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
  }

  // ── 3. Adresse & Localisation ──
  const spw = verifs?.walloniaAddress as
    | {
      validInWallonia?: boolean
      postalMismatch?: boolean
      streetVerified?: boolean
      houseVerified?: boolean
    }
    | undefined
  const cp = (lead.postal_code ?? lead.postalCode ?? "").trim()
  const isB2B = lead.segment === "B2B"

  let address: ChannelVerificationBadge
  if (spw?.postalMismatch || (!isB2B && cp.length === 4 && !isWalloonPostalCode(cp))) {
    address = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
  } else if (spw?.houseVerified) {
    address = {
      tier: "verified",
      compactLabel: "Adresse vérifiée",
      shortLabel: "Adresse exacte vérifiée",
      detailLabel: "Rue et numéro vérifiés (cadastre wallon)",
    }
  } else if (spw?.streetVerified) {
    address = {
      tier: "plausible",
      compactLabel: "Rue reconnue",
      shortLabel: "Rue reconnue · n° à confirmer",
      detailLabel: "Rue existante en Wallonie, numéro à confirmer",
    }
  } else if (spw?.validInWallonia || (cp.length === 4 && isWalloonPostalCode(cp))) {
    address = {
      tier: "plausible",
      compactLabel: "Commune wallonne",
      shortLabel: "Commune wallonne",
      detailLabel: "Code postal en Wallonie, adresse à confirmer",
    }
  } else {
    address = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
  }

  // ── 4. Société B2B ──
  let company: ChannelVerificationBadge | null = null
  if (isB2B) {
    const cbe = verifs?.cbeCompany as
      | { verified?: boolean; active?: boolean; officialName?: string }
      | undefined
    const vat = lead.company_vat ?? lead.companyVat ?? null
    if (cbe?.verified && cbe.active) {
      company = {
        tier: "verified",
        compactLabel: "Société BCE",
        shortLabel: "Société active (BCE)",
        detailLabel: `Active à la BCE${cbe.officialName ? ` · ${cbe.officialName}` : ""}`,
      }
    } else if (cbe?.verified && cbe.active === false) {
      company = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
    } else if (vat && isValidBelgianVat(vat)) {
      company = {
        tier: "plausible",
        compactLabel: "TVA valide",
        shortLabel: "Numéro de TVA valide",
        detailLabel: "Format TVA belge valide, société à confirmer",
      }
    } else {
      company = { tier: "none", compactLabel: null, shortLabel: null, detailLabel: null }
    }
  }

  const allBadges = [phone, email, address, ...(company ? [company] : [])]
  const verifiedCount = allBadges.filter((b) => b.tier === "verified").length
  const plausibleCount = allBadges.filter((b) => b.tier === "plausible").length

  return {
    phone,
    email,
    address,
    company,
    verifiedCount,
    plausibleCount,
  }
}
