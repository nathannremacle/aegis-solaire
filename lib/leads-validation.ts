import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js"

// ——— Domaines e-mail interdits (freemail / grand public) ———
const FREE_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.fr", "live.com",
  "outlook.com", "outlook.fr", "yahoo.com", "yahoo.fr", "orange.fr",
  "wanadoo.fr", "free.fr", "sfr.fr", "laposte.net", "icloud.com",
  "protonmail.com", "mail.com", "gmx.com", "gmx.fr", "yahoo.co.uk",
  "hotmail.co.uk", "live.co.uk", "outlook.co.uk", "bbox.fr", "aliceadsl.fr",
  "skynet.be", "telenet.be", "hotmail.be", "live.be",
] as const

/** Vérifie que l'email n'est pas un freemail (B2B : email professionnel requis). */
export function isProfessionalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return false
  return !FREE_EMAIL_DOMAINS.includes(domain as (typeof FREE_EMAIL_DOMAINS)[number])
}

/** Message à afficher si l'email n'est pas professionnel. */
export const EMAIL_PRO_MESSAGE =
  "Veuillez utiliser une adresse e-mail professionnelle (domaines personnels type gmail, orange, free, etc. non acceptés)."

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
  if (!isProfessionalEmail(trimmed)) return EMAIL_PRO_MESSAGE
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
  "Facture annuelle minimum de 5 000 € requise pour une étude B2B."

/** Normalise un numéro TVA belge (espaces, points). */
export function normalizeBelgianVat(input: string): string {
  return input.replace(/[\s.]/g, "").toUpperCase()
}

/** Valide le format BE + 10 chiffres (TVA entreprise belge). */
export function isValidBelgianVat(input: string): boolean {
  const n = normalizeBelgianVat(input)
  return /^BE\d{10}$/.test(n)
}

export const VAT_BE_MESSAGE =
  "Indiquez un numéro TVA belge valide (ex. BE0123456789)."

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
  if (value < 5000) return FACTURE_MIN_MESSAGE
  return null
}
