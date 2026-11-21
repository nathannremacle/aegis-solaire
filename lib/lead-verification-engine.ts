import { resolveMx } from "node:dns/promises"
import {
  verifyWalloniaAddressStrict,
  type AddressResolutionLevel,
} from "./address-spw"
import {
  formatAndValidateBelgianPhone,
  getEmailTypoSuggestion,
  isDisposableEmailDomain,
  isFakePhonePattern,
  isPlaceholderEmail,
  isSuspiciousPersonName,
  isValidFrBePhone,
  normalizeFrBePhone,
} from "./leads-validation"

export interface EmailMxVerificationResult {
  valid: boolean
  isDisposable: boolean
  domain: string
  mxServers: string[]
  transientError?: boolean
  typoSuggestion?: string | null
  reason?: string
}

export interface WalloniaAddressVerificationResult {
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
  confidenceScore: number // 0 à 100
  source: "SPW_ICAR"
  rawCandidatesCount: number
  coordinates?: { lat: number; lng: number } | null
  googleMapsUrl?: string
  googleEarthUrl?: string
  streetViewUrl?: string
  walOnMapUrl?: string
}

export interface CbeCompanyVerificationResult {
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
  nameMatchesInput?: boolean
  postalMatchesInput?: boolean
  error?: string
}

export interface PhoneVerificationResult {
  valid: boolean
  e164: string | null
  lineType: "mobile" | "landline" | "unknown"
  fakePattern: boolean
  reason?: string
}

export interface IdentityVerificationResult {
  suspiciousName: boolean
  identicalFirstLast: boolean
  reason?: string
}

export interface DuplicateLeadVerificationResult {
  hasDuplicatePhone: boolean
  hasDuplicateEmail: boolean
  duplicateLeadIds: string[]
  lastSubmittedAt?: string | null
}

export type PhoneOtpStatus =
  | "verified"
  | "sent_pending"
  | "skipped_by_prospect"
  | "send_failed"
  | "rate_limited"
  | "not_attempted_voip"
  | "not_attempted_non_be"
  | "not_attempted_invalid_lookup"
  | "not_configured"
  | "disabled"
  | "awaiting_send"
  | "not_applicable"

export interface PhoneOtpVerificationResult {
  verified: boolean
  status?: PhoneOtpStatus | null
  channel?: "sms" | "call" | "dev_mock" | null
  verifiedAt?: string | null
  sentAt?: string | null
  skippedAt?: string | null
  failedAt?: string | null
  sendAttempts?: number | null
  verifyFailedAttempts?: number | null
  twilioCode?: number | null
  accountRestricted?: boolean | null
  error?: string | null
  lastVerifyError?: string | null
  required?: boolean
}

export interface TwilioLookupSnapshot {
  configured?: boolean
  valid: boolean
  countryCode?: string | null
  lineType?: string | null
  carrierName?: string | null
  smsPumpingRiskLevel?: string | null
  smsPumpingRiskScore?: number | null
  transientError?: boolean
  checkedAt?: string | null
}

export interface LeadEnrichedVerification {
  emailMx: EmailMxVerificationResult
  walloniaAddress: WalloniaAddressVerificationResult
  cbeCompany?: CbeCompanyVerificationResult | null
  phoneAnalysis?: PhoneVerificationResult
  phoneOtp?: PhoneOtpVerificationResult | null
  twilioLookup?: TwilioLookupSnapshot | null
  identityAnalysis?: IdentityVerificationResult
  duplicateCheck?: DuplicateLeadVerificationResult | null
  globalTrustScoreDelta: number
  trustBadges: string[]
  warningFlags: string[]
}

const DNS_TIMEOUT_MS = 2500

function isTransientDnsErrorCode(code: string): boolean {
  return ["ETIMEOUT", "EAI_AGAIN", "ESERVFAIL", "ECONNREFUSED", "TIMEOUT"].includes(
    code.toUpperCase()
  )
}

/**
 * 1. Contrôle DNS MX : vérifie l'existence réelle des serveurs de messagerie du domaine e-mail
 * (domaine jetable, typo, Null-MX RFC 7505, timeout borné).
 */
export async function verifyEmailDomainMx(email: string): Promise<EmailMxVerificationResult> {
  const trimmed = email.trim().toLowerCase()
  const atIdx = trimmed.lastIndexOf("@")
  if (atIdx === -1 || atIdx === trimmed.length - 1) {
    return {
      valid: false,
      isDisposable: false,
      domain: "",
      mxServers: [],
      reason: "Format e-mail invalide",
    }
  }

  const domain = trimmed.slice(atIdx + 1)
  const typoSuggestion = getEmailTypoSuggestion(trimmed)

  if (typoSuggestion) {
    return {
      valid: false,
      isDisposable: false,
      domain,
      mxServers: [],
      typoSuggestion,
      reason: `Faute de frappe probable dans le domaine (vouliez-vous écrire @${typoSuggestion} ?)`,
    }
  }

  if (isDisposableEmailDomain(domain)) {
    return {
      valid: false,
      isDisposable: true,
      domain,
      mxServers: [],
      reason: "Nom de domaine d'e-mail jetable / temporaire détecté",
    }
  }

  if (isPlaceholderEmail(trimmed)) {
    return {
      valid: false,
      isDisposable: false,
      domain,
      mxServers: [],
      reason: "Adresse e-mail générique ou factice détectée",
    }
  }

  try {
    const mxRecords = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error("DNS timeout"), { code: "ETIMEOUT" })), DNS_TIMEOUT_MS)
      ),
    ])

    const validRecords = (mxRecords ?? []).filter(
      (r) => typeof r.exchange === "string" && r.exchange.trim() !== "." && r.exchange.trim().length >= 3
    )

    if (validRecords.length === 0) {
      return {
        valid: false,
        isDisposable: false,
        domain,
        mxServers: [],
        reason: "Aucun serveur de messagerie (MX) actif configuré pour ce domaine",
      }
    }

    const sortedServers = validRecords
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange)

    return {
      valid: true,
      isDisposable: false,
      domain,
      mxServers: sortedServers,
    }
  } catch (err: unknown) {
    const code = String((err as { code?: string } | null)?.code || "MX_LOOKUP_FAILED")
    const transientError = isTransientDnsErrorCode(code)
    return {
      valid: false,
      isDisposable: false,
      domain,
      mxServers: [],
      transientError,
      reason:
        code === "ENOTFOUND" || code === "ENODATA" || code === "ENOTIMP"
          ? "Nom de domaine inexistant ou sans serveur e-mail"
          : `Échec de résolution DNS (${code})`,
    }
  }
}

/**
 * 2. Contrôle Géoportail de la Wallonie (SPW / ICAR) :
 * Vérifie rigoureusement la commune, le code postal, la rue et le numéro de maison (avec coordonnées WGS84).
 */
export async function verifyWalloniaAddressSpw(params: {
  postalCode?: string | null
  city?: string | null
  streetAddress?: string | null
}): Promise<WalloniaAddressVerificationResult> {
  return verifyWalloniaAddressStrict(params)
}

/**
 * 3. Contrôle Entreprise BCE / KBO via cbeapi.be :
 * Vérifie le numéro d'entreprise, le statut actif vs faillite, l'adresse du siège et l'activité NACE.
 */
export async function verifyBelgianCompanyCbe(
  rawVatNumber: string,
  apiKeyOverride?: string
): Promise<CbeCompanyVerificationResult> {
  const apiKey = apiKeyOverride || process.env.CBE_API_KEY
  if (!apiKey) {
    return {
      verified: false,
      active: false,
      error: "Clé CBE_API_KEY non configurée",
    }
  }

  // Nettoyage du numéro de TVA (ex: "BE 0478.963.210" -> "0478963210")
  const digitsOnly = rawVatNumber.replace(/[^0-9]/g, "")
  if (digitsOnly.length < 9 || digitsOnly.length > 10) {
    return {
      verified: false,
      active: false,
      error: "Format de numéro d'entreprise invalide (doit contenir 9 ou 10 chiffres)",
    }
  }

  const paddedVat = digitsOnly.padStart(10, "0")

  try {
    const url = `https://cbeapi.be/api/v1/company/${paddedVat}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
    })

    if (res.status === 404) {
      return {
        verified: false,
        active: false,
        vatNumber: paddedVat,
        error: "Entreprise introuvable dans la Banque-Carrefour des Entreprises",
      }
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return {
        verified: false,
        active: false,
        vatNumber: paddedVat,
        error: `Erreur API CBE (${res.status}): ${errText.slice(0, 100)}`,
      }
    }

    const data = await res.json()
    const company = data?.data || data

    // Analyse du statut de l'entreprise
    const rawStatus = (company?.status || company?.registration_status || "").toString().toLowerCase()
    const isActive = rawStatus === "active" || rawStatus === "actif" || rawStatus === "" || !rawStatus.includes("stop")

    const officialName = company?.denomination || company?.denomination_with_legal_form || company?.name || company?.commercial_name || ""
    const legalForm = company?.juridical_form || company?.juridical_form_short || company?.legal_form?.description || company?.legal_form || ""

    const addressObj = company?.address || company?.headquarters?.address || {}
    const postalCode = addressObj?.post_code || addressObj?.zip_code || addressObj?.postal_code || ""
    const city = addressObj?.city || addressObj?.municipality || ""
    const fullAddress = addressObj?.full_address || [addressObj?.street, addressObj?.street_number, postalCode, city].filter(Boolean).join(" ")

    // Détermination si le siège est situé en Wallonie (codes postaux 1300-1499 et 4000-7999)
    const postalNum = parseInt(postalCode, 10)
    const isWallonia =
      (!Number.isNaN(postalNum) &&
        ((postalNum >= 1300 && postalNum <= 1499) || (postalNum >= 4000 && postalNum <= 7999))) ||
      false

    // Activité principale NACE
    const mainNace = Array.isArray(company?.nace_activities)
      ? company.nace_activities[0]
      : Array.isArray(company?.activities)
      ? company.activities[0]
      : company?.main_activity || null

    const naceCode = mainNace?.code || mainNace?.nace_code || ""
    const naceDescription = mainNace?.description || mainNace?.name || ""

    return {
      verified: true,
      active: isActive,
      vatNumber: paddedVat,
      officialName,
      legalForm: typeof legalForm === "string" ? legalForm : "",
      fullAddress,
      postalCode,
      city,
      isWalloniaHeadquarters: isWallonia,
      naceCode,
      naceDescription,
    }
  } catch (err: any) {
    console.error("[CBE API] Exception lors de l'appel:", err)
    return {
      verified: false,
      active: false,
      vatNumber: paddedVat,
      error: err?.message || "Erreur de connexion cbeapi.be",
    }
  }
}

function normalizeCompanyTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length >= 2 &&
        !["sa", "srl", "sprl", "bv", "nv", "vzw", "asbl", "sc", "scrl", "bvba"].includes(t)
    )
}

export function verifyPhoneIntegrity(phone?: string | null): PhoneVerificationResult {
  const raw = (phone ?? "").trim()
  if (!raw) {
    return { valid: false, e164: null, lineType: "unknown", fakePattern: false, reason: "Téléphone absent" }
  }

  const normalizedBe = formatAndValidateBelgianPhone(raw)
  if (normalizedBe.isValid) {
    const e164 = normalizedBe.normalized
    const isBeMobile = /^\+324[56789]\d{7}$/.test(e164)
    return {
      valid: true,
      e164,
      lineType: isBeMobile ? "mobile" : "landline",
      fakePattern: false,
    }
  }

  if (isValidFrBePhone(raw)) {
    const e164 = normalizeFrBePhone(raw)
    const isFrMobile = Boolean(e164 && /^\+33[67]\d{8}$/.test(e164))
    return {
      valid: true,
      e164,
      lineType: isFrMobile ? "mobile" : "landline",
      fakePattern: false,
    }
  }

  const digits = raw.replace(/\D/g, "")
  const subscriber = digits.length >= 6 ? digits.slice(-6) : digits
  const fakePattern = isFakePhonePattern(subscriber)
  return {
    valid: false,
    e164: null,
    lineType: "unknown",
    fakePattern,
    reason: fakePattern ? "Séquence téléphonique factice détectée" : normalizedBe.errorMessage || "Format invalide",
  }
}

export function verifyIdentityIntegrity(params: {
  firstName?: string | null
  lastName?: string | null
}): IdentityVerificationResult {
  const first = (params.firstName ?? "").trim()
  const last = (params.lastName ?? "").trim()
  const suspiciousName = isSuspiciousPersonName(first) || isSuspiciousPersonName(last)
  const normFirst = first.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const normLast = last.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  const identicalFirstLast = normFirst.length >= 2 && normFirst === normLast

  return {
    suspiciousName,
    identicalFirstLast,
    reason: suspiciousName
      ? "Prénom ou nom suspect / générique"
      : identicalFirstLast
        ? "Prénom et nom strictement identiques"
        : undefined,
  }
}

/**
 * Moteur d'enrichissement global : exécute les vérifications en parallèle (< 300 ms en nominal).
 */
export async function enrichLeadVerifications(params: {
  email: string
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  postalCode?: string | null
  city?: string | null
  streetAddress?: string | null
  company?: string | null
  companyVat?: string | null
  segment?: string | null
}): Promise<LeadEnrichedVerification> {
  const { email, phone, firstName, lastName, postalCode, city, streetAddress, company, companyVat, segment } = params

  const [mxRes, spwRes, cbeRes] = await Promise.allSettled([
    verifyEmailDomainMx(email),
    verifyWalloniaAddressSpw({ postalCode, city, streetAddress }),
    companyVat && segment === "B2B" ? verifyBelgianCompanyCbe(companyVat) : Promise.resolve(null),
  ])

  const emailMx: EmailMxVerificationResult =
    mxRes.status === "fulfilled"
      ? mxRes.value
      : { valid: false, isDisposable: false, domain: "", mxServers: [], transientError: true, reason: "Lookup DNS indisponible" }

  const walloniaAddress: WalloniaAddressVerificationResult =
    spwRes.status === "fulfilled"
      ? spwRes.value
      : { validInWallonia: false, confidenceScore: 0, source: "SPW_ICAR", rawCandidatesCount: 0 }

  let cbeCompany: CbeCompanyVerificationResult | null =
    cbeRes.status === "fulfilled" ? cbeRes.value : null

  if (cbeCompany && cbeCompany.verified && company) {
    const inputTokens = normalizeCompanyTokens(company)
    const cbeTokens = normalizeCompanyTokens(cbeCompany.officialName || "")
    const nameMatchesInput =
      inputTokens.length === 0 ||
      cbeTokens.length === 0 ||
      inputTokens.some((t) => cbeTokens.some((ct) => ct.includes(t) || t.includes(ct)))
    const postalMatchesInput =
      !postalCode || !cbeCompany.postalCode || postalCode.trim() === cbeCompany.postalCode.trim()
    cbeCompany = { ...cbeCompany, nameMatchesInput, postalMatchesInput }
  }

  const phoneAnalysis = phone !== undefined ? verifyPhoneIntegrity(phone) : undefined
  const identityAnalysis =
    firstName !== undefined || lastName !== undefined
      ? verifyIdentityIntegrity({ firstName, lastName })
      : undefined

  let globalTrustScoreDelta = 0
  const trustBadges: string[] = []
  const warningFlags: string[] = []

  // 1. Évaluation E-mail MX
  if (emailMx.valid) {
    globalTrustScoreDelta += 5
    trustBadges.push("Serveurs e-mail MX valides")
  } else if (emailMx.isDisposable) {
    globalTrustScoreDelta -= 40
    warningFlags.push("Adresse e-mail temporaire / jetable")
  } else if (!emailMx.transientError) {
    globalTrustScoreDelta -= 30
    warningFlags.push(emailMx.reason || "Domaine e-mail sans serveur de messagerie")
  } else {
    warningFlags.push(emailMx.reason || "Contrôle DNS e-mail temporairement indisponible")
  }

  // 2. Évaluation Téléphone & Identité
  if (phoneAnalysis) {
    if (phoneAnalysis.valid) {
      trustBadges.push(
        phoneAnalysis.lineType === "mobile"
          ? `Téléphone mobile certifié (${phoneAnalysis.e164})`
          : `Téléphone fixe certifié (${phoneAnalysis.e164})`
      )
    } else {
      globalTrustScoreDelta -= phoneAnalysis.fakePattern ? 35 : 20
      warningFlags.push(phoneAnalysis.reason || "Numéro de téléphone non conforme")
    }
  }

  if (identityAnalysis?.suspiciousName) {
    globalTrustScoreDelta -= 25
    warningFlags.push("Identité suspecte ou nom de test détecté")
  } else if (identityAnalysis?.identicalFirstLast) {
    globalTrustScoreDelta -= 10
    warningFlags.push("Prénom et nom strictement identiques")
  }

  // 3. Évaluation Localisation SPW & Complétude Adresse
  if (walloniaAddress.postalMismatch) {
    globalTrustScoreDelta -= 25
    warningFlags.push(
      `Incohérence code postal (${postalCode || "?"}) vs localité SPW (${walloniaAddress.officialPostalCode || "?"} ${walloniaAddress.officialCity || ""})`
    )
  } else if (walloniaAddress.validInWallonia && walloniaAddress.houseVerified) {
    globalTrustScoreDelta += 10
    trustBadges.push(
      `Adresse exacte certifiée SPW ICAR (${walloniaAddress.canonicalStreet || ""} ${walloniaAddress.houseNumber || ""}, ${walloniaAddress.officialPostalCode || ""} ${walloniaAddress.officialSection || walloniaAddress.officialCity || ""})`.trim()
    )
  } else if (walloniaAddress.validInWallonia && walloniaAddress.streetVerified) {
    if (!walloniaAddress.hasHouseNumber) {
      globalTrustScoreDelta -= 10
      warningFlags.push(
        "Numéro de maison manquant — localisation satellite / Street View précise impossible"
      )
    } else {
      trustBadges.push(
        `Voirie reconnue SPW Wallonie (${walloniaAddress.canonicalStreet || walloniaAddress.officialCity || "ICAR"})`
      )
      warningFlags.push(
        "Numéro de bâtiment non confirmé au cadastre SPW ICAR (construction neuve ou erreur de saisie)"
      )
    }
  } else if (walloniaAddress.validInWallonia) {
    trustBadges.push(
      `Commune reconnue SPW Wallonie (${walloniaAddress.officialCity || "ICAR"})`
    )
    if (streetAddress && streetAddress.trim().length > 0) {
      globalTrustScoreDelta -= 10
      warningFlags.push(
        "Nom de rue non trouvé dans le registre SPW ICAR pour ce code postal"
      )
    } else if (segment === "B2C") {
      globalTrustScoreDelta -= 10
      warningFlags.push("Adresse précise de voirie (rue et n°) manquante")
    }
  } else {
    globalTrustScoreDelta -= 20
    warningFlags.push("Localisation non répertoriée dans le cadastre SPW Wallonie")
  }

  // 4. Évaluation Entreprise BCE
  if (cbeCompany) {
    if (cbeCompany.verified && cbeCompany.active) {
      globalTrustScoreDelta += 15
      trustBadges.push(
        `BCE : Société active${cbeCompany.isWalloniaHeadquarters ? " (Siège en Wallonie)" : ""}`
      )
      if (cbeCompany.nameMatchesInput === false) {
        globalTrustScoreDelta -= 15
        warningFlags.push(
          `Raison sociale différente à la BCE ("${cbeCompany.officialName || "?"}" vs "${company || "?"}")`
        )
      }
    } else if (cbeCompany.verified && !cbeCompany.active) {
      globalTrustScoreDelta -= 50
      warningFlags.push("BCE : Entreprise radiée, fermée ou en faillite")
    } else if (cbeCompany.error) {
      warningFlags.push(`BCE : ${cbeCompany.error}`)
    }
  }

  return {
    emailMx,
    walloniaAddress,
    cbeCompany,
    phoneAnalysis,
    identityAnalysis,
    globalTrustScoreDelta,
    trustBadges,
    warningFlags,
  }
}
