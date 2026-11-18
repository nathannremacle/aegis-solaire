import {
  getEmailError,
  isValidBelgianVat,
  isValidFrBePhone,
  isWalloonPostalCode,
} from "./leads-validation"

export type VerificationTier = "verified" | "plausible" | "none"

export interface ChannelVerificationBadge {
  tier: VerificationTier
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

export interface LeadVerificationDisplayInput {
  segment?: string | null
  phone?: string | null
  email?: string | null
  postal_code?: string | null
  postalCode?: string | null
  company_vat?: string | null
  companyVat?: string | null
  phone_verified?: boolean | null
  email_verified?: boolean | null
  email_delivery_status?: string | null
  qualification_metadata?: Record<string, unknown> | null
  qualificationMetadata?: Record<string, unknown> | null
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
  const meta = lead.qualification_metadata ?? lead.qualificationMetadata ?? null
  const verifs =
    meta && typeof meta === "object" && (meta as Record<string, unknown>).verifications
      ? ((meta as Record<string, unknown>).verifications as Record<string, any>)
      : null

  // ── 1. Téléphone ──
  const hasRawPhone = typeof lead.phone === "string" && lead.phone.trim().length > 0
  const rawPhoneValid = hasRawPhone ? isValidFrBePhone(lead.phone as string) : null
  const phoneOtpVerified = Boolean(lead.phone_verified || verifs?.phoneOtp?.verified)
  const phoneOtpChannel = verifs?.phoneOtp?.channel as string | null | undefined
  const phoneAnalysisValid = verifs?.phoneAnalysis?.valid
  const lookupValid = Boolean(verifs?.twilioLookup?.valid)
  const carrierName =
    typeof verifs?.twilioLookup?.carrierName === "string" && verifs.twilioLookup.carrierName.trim()
      ? verifs.twilioLookup.carrierName.trim()
      : null

  let phone: ChannelVerificationBadge
  if (rawPhoneValid === false || phoneAnalysisValid === false) {
    phone = { tier: "none", shortLabel: null, detailLabel: null }
  } else if (phoneOtpVerified) {
    const isCall = phoneOtpChannel === "call"
    phone = {
      tier: "verified",
      shortLabel: isCall ? "Téléphone vérifié (appel)" : "Téléphone vérifié (SMS)",
      detailLabel: isCall
        ? `Numéro certifié par appel vocal OTP${carrierName ? ` · ${carrierName}` : ""}`
        : `Numéro certifié par code SMS OTP${carrierName ? ` · ${carrierName}` : ""}`,
    }
  } else if (lookupValid) {
    phone = {
      tier: "plausible",
      shortLabel: carrierName ? `Ligne plausible (${carrierName})` : "Ligne plausible (opérateur)",
      detailLabel: `Ligne active détectée chez l'opérateur${carrierName ? ` (${carrierName})` : ""}, non vérifiée par SMS`,
    }
  } else if (rawPhoneValid === true || phoneAnalysisValid === true || (!hasRawPhone && verifs?.phoneAnalysis?.valid !== false)) {
    // Sur les cartes marketplace anonymisées (où lead.phone est volontairement absent), un dossier publié valide est au minimum plausible par format
    if (!hasRawPhone && !verifs && lead.phone !== undefined) {
      phone = { tier: "none", shortLabel: null, detailLabel: null }
    } else {
      phone = {
        tier: "plausible",
        shortLabel: "Téléphone plausible (format BE)",
        detailLabel: "Format téléphonique BE/FR conforme, non vérifié par SMS",
      }
    }
  } else {
    phone = { tier: "none", shortLabel: null, detailLabel: null }
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
    email = { tier: "none", shortLabel: null, detailLabel: null }
  } else if (emailProofVerified) {
    email = {
      tier: "verified",
      shortLabel: "E-mail vérifié",
      detailLabel: "Adresse e-mail confirmée en 1 clic par le prospect",
    }
  } else if (deliveryStatus === "delivered") {
    email = {
      tier: "plausible",
      shortLabel: "E-mail plausible (remis)",
      detailLabel: "Serveur MX actif et e-mail récapitulatif remis sans rebond (confirmation en attente)",
    }
  } else if (emailMx?.valid) {
    email = {
      tier: "plausible",
      shortLabel: "E-mail plausible (MX)",
      detailLabel: "Domaine e-mail actif (serveurs MX valides), non confirmé par clic du prospect",
    }
  } else if (rawEmailSyntaxOk === true) {
    email = {
      tier: "plausible",
      shortLabel: "E-mail plausible (format)",
      detailLabel: "Syntaxe e-mail valide, non confirmée par clic du prospect",
    }
  } else {
    email = { tier: "none", shortLabel: null, detailLabel: null }
  }

  // ── 3. Adresse & Localisation SPW ──
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
    address = { tier: "none", shortLabel: null, detailLabel: null }
  } else if (spw?.houseVerified) {
    address = {
      tier: "verified",
      shortLabel: "Adresse exacte SPW",
      detailLabel: "Rue et numéro de bâtiment certifiés au cadastre SPW ICAR",
    }
  } else if (spw?.streetVerified) {
    address = {
      tier: "plausible",
      shortLabel: "Voirie reconnue SPW",
      detailLabel: "Voirie reconnue au registre SPW ICAR (numéro de maison à confirmer)",
    }
  } else if (spw?.validInWallonia || (cp.length === 4 && isWalloonPostalCode(cp))) {
    address = {
      tier: "plausible",
      shortLabel: "Zone wallonne plausible",
      detailLabel: "Code postal localisé en Wallonie, adresse précise non confirmée SPW",
    }
  } else {
    address = { tier: "none", shortLabel: null, detailLabel: null }
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
        shortLabel: "Société active BCE",
        detailLabel: `Entreprise active vérifiée à la BCE${cbe.officialName ? ` (${cbe.officialName})` : ""}`,
      }
    } else if (cbe?.verified && cbe.active === false) {
      company = { tier: "none", shortLabel: null, detailLabel: null }
    } else if (vat && isValidBelgianVat(vat)) {
      company = {
        tier: "plausible",
        shortLabel: "TVA plausible (Mod 97)",
        detailLabel: "Numéro de TVA belge syntaxiquement conforme (Modulo 97)",
      }
    } else {
      company = { tier: "none", shortLabel: null, detailLabel: null }
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
