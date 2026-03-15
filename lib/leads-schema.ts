import { z } from "zod"
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
function isProfessionalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase()
  if (!domain) return false
  return !FREE_EMAIL_DOMAINS.includes(domain as (typeof FREE_EMAIL_DOMAINS)[number])
}

/** Pays acceptés pour le téléphone (France + Belgique, cible du site). */
const PHONE_COUNTRIES = ["FR", "BE"] as const

/** Valide un numéro français ou belge réel via libphonenumber (format valide, pas de suites évidentes type 0600000000). */
function isValidFrBePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, "")
  // France : +33 ou 0 + 9 chiffres ; Belgique : +32 ou 0 + 9 chiffres (ex. 04xx xxx xxx)
  if (!/^(\+33|\+32|0)[1-9][0-9]{8}$/.test(cleaned)) return false
  let parsed = parsePhoneNumberFromString(cleaned, "FR")
  if (!parsed || !PHONE_COUNTRIES.includes(parsed.country as (typeof PHONE_COUNTRIES)[number])) {
    parsed = parsePhoneNumberFromString(cleaned, "BE")
    if (!parsed || !PHONE_COUNTRIES.includes(parsed.country as (typeof PHONE_COUNTRIES)[number])) return false
  }
  if (!isValidPhoneNumber(cleaned, parsed.country)) return false
  // Rejeter les numéros "évidents" type 0600000000, 0411111111, etc.
  const national = parsed.nationalNumber.replace(/\D/g, "")
  if (/^0+$/.test(national) || /^1+$/.test(national)) return false
  const digits = national.split("")
  const uniqueDigits = new Set(digits).size
  if (uniqueDigits <= 2) return false // trop répétitif = suspect
  return true
}

/** Schéma Zod pour la soumission lead (validation stricte B2B). */
export const leadSubmitSchema = z.object({
  // ——— Champs requis ———
  firstName: z
    .string()
    .min(2, "Le prénom est requis (minimum 2 caractères)")
    .max(255)
    .transform((s) => s.trim()),
  lastName: z
    .string()
    .min(2, "Le nom est requis (minimum 2 caractères)")
    .max(255)
    .transform((s) => s.trim()),
  email: z
    .string()
    .email("Email invalide")
    .refine(isProfessionalEmail, { message: "Veuillez utiliser une adresse e-mail professionnelle." }),
  phone: z
    .string()
    .min(1, "Le numéro de téléphone est requis")
    .refine(isValidFrBePhone, { message: "Veuillez indiquer un numéro de téléphone français ou belge valide." }),
  jobTitle: z.string().min(1, "La fonction est requise").max(255).transform((s) => s.trim()),
  surfaceType: z.enum(["toiture", "parking", "friche"], { errorMap: () => ({ message: "Type de surface invalide" }) }),
  surfaceArea: z.number().int().positive("Surface requise"),
  projectTimeline: z.enum(["urgent", "3_6_months", "6_plus_months"], { message: "Veuillez indiquer le délai de votre projet." }),
  annualElectricityBill: z.number().int().min(5000, "Facture annuelle minimum de 5 000 € requise pour une étude B2B."),
  marketingConsent: z.boolean(),

  // ——— Champs optionnels ———
  company: z.string().max(255).transform((s) => s.trim() || null).nullable().optional(),
  message: z.string().max(2000).transform((s) => s.trim() || null).nullable().optional(),

  // ——— Résultats simulation (fournis par le client après calcul) ———
  estimatedROIYears: z.number().optional(),
  autoconsumptionRate: z.number().optional(),
  estimatedSavings: z.number().optional(),

  // ——— Comportemental : form_opened_at utilisé côté API pour time-to-fill (≥ 4 s) ———
  form_opened_at: z.string().optional(),
})
  .refine(
    (data) => {
      const min = data.surfaceType === "parking" ? 1500 : 500
      return data.surfaceArea >= min
    },
    { message: "Surface minimum : 1 500 m² pour parking, 500 m² pour toiture ou friche.", path: ["surfaceArea"] }
  )

export type LeadSubmitInput = z.infer<typeof leadSubmitSchema>

/** Préparation pour vérification SIRET / SIRENE (structure prête pour appel API publique). */
export const SIRENE_API_BASE = "https://api.insee.fr/entreprises/sirene/V3.11"
export function buildSireneSiretUrl(siret: string): string {
  return `${SIRENE_API_BASE}/siret/${siret.trim().replace(/\s/g, "")}`
}
// Note : un appel réel nécessiterait une clé API Insee (consommateur SIRENE) et serait à faire côté backend.
