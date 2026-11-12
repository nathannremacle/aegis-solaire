import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js"

/** Numéros belges et français acceptés (formats courants +32 / +33). */
const PHONE_COUNTRIES = ["FR", "BE"] as const

/** Valide un numéro français ou belge (format valide, pas de suites évidentes). */
export function isValidFrBePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, "")
  if (!/^(\+33|\+32|0)[1-9][0-9]{8}$/.test(cleaned)) return false
  let parsed = parsePhoneNumberFromString(cleaned, "FR")
  if (!parsed || !PHONE_COUNTRIES.includes(parsed.country as (typeof PHONE_COUNTRIES)[number])) {
    parsed = parsePhoneNumberFromString(cleaned, "BE")
    if (!parsed || !PHONE_COUNTRIES.includes(parsed.country as (typeof PHONE_COUNTRIES)[number])) return false
  }
  if (!isValidPhoneNumber(cleaned, parsed.country)) return false
  const national = parsed.nationalNumber.replace(/\D/g, "")
  if (/^0+$/.test(national) || /^1+$/.test(national)) return false
  const digits = national.split("")
  if (new Set(digits).size <= 2) return false
  return true
}

/** Message à afficher si le téléphone est invalide. */
export const PHONE_FR_BE_MESSAGE =
  "Veuillez indiquer un numéro de téléphone français ou belge valide."

/** Retourne le message d'erreur pour l'email (null si valide). */
export function getEmailError(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return "L'adresse e-mail est requise."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Adresse e-mail invalide."
  return null
}

/** Retourne le message d'erreur pour le téléphone (null si valide). */
export function getPhoneError(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return "Le numéro de téléphone est requis."
  if (!isValidFrBePhone(trimmed)) return PHONE_FR_BE_MESSAGE
  return null
}

/** Message surface minimale. */
export const SURFACE_MIN_MESSAGE =
  "Surface minimum : 1 500 m² pour un parking, 500 m² pour toiture ou friche."

/** Retourne le message d'erreur pour la surface (null si valide). */
export function getSurfaceError(surfaceType: string, surfaceArea: string): string | null {
  if (!surfaceType) return "Veuillez sélectionner le type de surface."
  const area = parseInt(surfaceArea, 10) || 0
  const min = surfaceType === "parking" ? 1500 : 500
  if (area < min) return SURFACE_MIN_MESSAGE
  return null
}

/** Message facture minimale. */
export const FACTURE_MIN_MESSAGE =
  "Facture annuelle minimum de 3 500 € requise pour une étude B2B."

/** Normalise un numéro TVA belge (espaces, points). */
export function normalizeBelgianVat(input: string): string {
  return input.replace(/[\s.]/g, "").toUpperCase()
}

/** Valide le format BE + 10 chiffres avec clé de contrôle Modulo 97 (BCE/TVA belge). */
export function isValidBelgianVat(input: string): boolean {
  const n = normalizeBelgianVat(input)
  if (!/^BE\d{9,10}$/.test(n)) return false
  const digits = n.replace(/^BE/, "")
  const padded = digits.length === 9 ? "0" + digits : digits
  if (!/^[01]\d{9}$/.test(padded)) return false
  const first8 = parseInt(padded.slice(0, 8), 10)
  const checkDigits = parseInt(padded.slice(8, 10), 10)
  const expectedCheck = 97 - (first8 % 97)
  return checkDigits === expectedCheck
}

export const VAT_BE_MESSAGE =
  "Indiquez un numéro TVA belge valide avec clé de contrôle conforme (ex. BE 1039.899.980)."

/** Erreur affichée sous le champ TVA (null si valide). */
export function getVatError(vat: string): string | null {
  const trimmed = vat.trim()
  if (!trimmed) return "Le numéro d'entreprise (TVA BE) est requis."
  if (!isValidBelgianVat(trimmed)) return VAT_BE_MESSAGE
  return null
}

/** Retourne le message d'erreur pour la facture (null si valide). */
export function getFactureError(annualElectricityBill: string): string | null {
  const value = parseInt(annualElectricityBill, 10) || 0
  if (value < 3500) return FACTURE_MIN_MESSAGE
  return null
}

/** Valide un code postal belge (4 chiffres, ex: 1000 à 9990). */
export function isValidBelgianPostalCode(postalCode: string): boolean {
  return /^[1-9][0-9]{3}$/.test(postalCode.trim())
}

/**
 * Validation stricte et normalisation d'un numéro de GSM ou téléphone belge.
 * Rejette les séquences fictives évidentes (123456, 000000, etc.) pour protéger l'appel d'offres.
 */
export function formatAndValidateBelgianPhone(input: string): {
  isValid: boolean
  normalized: string
  errorMessage?: string
} {
  // 1. Nettoyage des espaces, points, tirets, parenthèses
  let cleaned = input.replace(/[\s.\-()/]/g, "")

  // 2. Normalisation du préfixe international belge (+32 ou 0032 -> 0)
  if (cleaned.startsWith("+32")) {
    cleaned = "0" + cleaned.slice(3)
  } else if (cleaned.startsWith("0032")) {
    cleaned = "0" + cleaned.slice(4)
  }

  // 3. Vérification de la longueur et du préfixe (Mobile 04xx à 10 chiffres ou Fixe à 9 chiffres)
  const isMobile = /^04[56789]\d{7}$/.test(cleaned)
  const isLandline = /^0[12356789]\d{7}$/.test(cleaned)

  if (!isMobile && !isLandline) {
    return {
      isValid: false,
      normalized: cleaned,
      errorMessage: "Veuillez saisir un numéro belge valide (ex. 0470 12 34 56).",
    }
  }

  // 4. Détection des faux numéros évidents (Séquences répétitives ou suites évidentes)
  const subscriberDigits = isMobile ? cleaned.slice(4) : cleaned.slice(3)
  const isAllSameDigits = /^(\d)\1{5,}$/.test(subscriberDigits)
  const blockedPatterns = [
    "123456",
    "654321",
    "010203",
    "112233",
    "000000",
    "111111",
    "222222",
    "333333",
    "444444",
    "555555",
    "666666",
    "777777",
    "888888",
    "999999",
  ]

  if (isAllSameDigits || blockedPatterns.some((pattern) => subscriberDigits.includes(pattern))) {
    return {
      isValid: false,
      normalized: cleaned,
      errorMessage: "Ce numéro semble incomplet ou invalide. Un numéro réel est requis pour certifier l'appel d'offres.",
    }
  }

  // 5. Normalisation finale E.164 (+32...)
  const e164 = "+32" + cleaned.slice(1)
  return { isValid: true, normalized: e164 }
}

export type WalloonProvinceKey =
  | "brabant_wallon"
  | "liege"
  | "namur"
  | "hainaut"
  | "luxembourg"

/**
 * Retourne la clé de province wallonne canonique d'un code postal belge à 4 chiffres,
 * ou `null` si le code postal est situé hors Wallonie (Bruxelles 1000-1299, Flandre 1500-3999 / 8000-9999).
 */
export function getWalloonProvinceKeyFromPostalCode(cp: string): WalloonProvinceKey | null {
  const digits = cp.replace(/\D/g, "")
  if (digits.length !== 4) return null
  const code = parseInt(digits, 10)
  if (code >= 1300 && code <= 1499) return "brabant_wallon"
  if (code >= 4000 && code <= 4999) return "liege"
  if (code >= 5000 && code <= 5999) return "namur"
  if ((code >= 6000 && code <= 6599) || (code >= 7000 && code <= 7999)) return "hainaut"
  if (code >= 6600 && code <= 6999) return "luxembourg"
  return null
}

/**
 * Vérifie strictement si un code postal belge à 4 chiffres appartient à la Région wallonne.
 */
export function isWalloonPostalCode(postalCode: string): boolean {
  return getWalloonProvinceKeyFromPostalCode(postalCode) !== null
}

const WALLOON_PROVINCE_DISPLAY_NAMES: Record<WalloonProvinceKey, string> = {
  brabant_wallon: "Brabant wallon",
  liege: "Liège",
  namur: "Namur",
  hainaut: "Hainaut",
  luxembourg: "Luxembourg",
}

/**
 * Déduit le libellé de la province wallonne à partir du code postal belge à 4 chiffres.
 */
export function getProvinceFromPostalCode(cp: string): string {
  const key = getWalloonProvinceKeyFromPostalCode(cp)
  return key ? WALLOON_PROVINCE_DISPLAY_NAMES[key] : "Wallonie"
}

