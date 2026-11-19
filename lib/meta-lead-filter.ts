export interface InternalLeadCheckParams {
  email?: string | null
  phone?: string | null
}

const INTERNAL_TEST_DOMAINS = [
  "@aegissolaire.com",
  "@aegissolaire-pro.be",
  "@example.com",
  "@example.org",
  "@example.net",
  "@example.invalid",
  "@test.com",
]

const FICTITIOUS_PHONE_DIGITS = new Set([
  "32470102030",
  "32470123456",
  "32400000000",
  "0470102030",
  "0470123456",
])

/**
 * Détecte si un lead provient d'un compte interne, d'un test développeur ou d'un numéro fictif
 * afin d'éviter de polluer les signaux d'optimisation Meta Pixel / Conversions API.
 */
export function isInternalOrTestLead(params: InternalLeadCheckParams): boolean {
  const email = (params.email ?? "").trim().toLowerCase()
  if (email) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)

    if (adminEmails.includes(email)) return true
    if (email === "mrnathanrem@gmail.com") return true

    const atIndex = email.lastIndexOf("@")
    if (atIndex > 0) {
      const localPart = email.slice(0, atIndex)
      const domainPart = email.slice(atIndex)
      if (localPart.startsWith("test+") || localPart.startsWith("dev+")) {
        return true
      }
      if (INTERNAL_TEST_DOMAINS.some((suffix) => domainPart === suffix)) {
        return true
      }
      if (domainPart.includes("init42.")) {
        return true
      }
    }
  }

  const rawDigits = (params.phone ?? "").replace(/\D/g, "")
  if (rawDigits) {
    const withoutIntlZeroes = rawDigits.startsWith("00") ? rawDigits.slice(2) : rawDigits
    if (
      FICTITIOUS_PHONE_DIGITS.has(rawDigits) ||
      FICTITIOUS_PHONE_DIGITS.has(withoutIntlZeroes)
    ) {
      return true
    }
  }

  return false
}

export interface MetaLeadFilterParams {
  email?: string | null
  phone?: string | null
  segment: string
  ownershipStatus?: string | null
  isResubmitSameFinalizedSession?: boolean
  hasDuplicateEmail?: boolean
  hasDuplicatePhone?: boolean
  finalScore?: number
  lineType?: string | null
}

/**
 * Décide si un lead soumis doit alimenter les événements Meta 'Lead' (CAPI + Pixel client).
 * Filtre les tests internes, doublons, locataires non autorisés, scores faibles et lignes VoIP B2C.
 */
export function shouldTrackMetaLeadConversion(params: MetaLeadFilterParams): boolean {
  if (params.isResubmitSameFinalizedSession) return false
  if (isInternalOrTestLead({ email: params.email, phone: params.phone })) return false
  if (params.hasDuplicateEmail || params.hasDuplicatePhone) return false
  if (params.segment !== "B2B" && params.ownershipStatus !== "owner") return false
  if (typeof params.finalScore === "number" && params.finalScore < 45) return false
  if (
    params.segment === "B2C" &&
    (params.lineType === "voip" || params.lineType === "nonFixedVoip")
  ) {
    return false
  }
  return true
}
