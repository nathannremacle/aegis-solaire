import { z } from "zod"
import { BELGIUM_PROVINCE_KEYS, type BelgiumProvinceKey } from "@/lib/belgium-regions"
import { isValidFrBePhone, isValidBelgianVat, normalizeBelgianVat } from "@/lib/leads-validation"

const provinceEnum = z.enum(BELGIUM_PROVINCE_KEYS as unknown as [BelgiumProvinceKey, ...BelgiumProvinceKey[]])

const jobTitleEnum = ["Dirigeant", "DAF", "Resp. RSE ou Technique", "Autre"] as const

/** Schéma Zod pour la soumission lead — tunnel Wallonie B2B. */
export const leadSubmitSchema = z.object({
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
  email: z.string().email("Adresse e-mail invalide."),
  phone: z
    .string()
    .min(1, "Le numéro de téléphone est requis.")
    .refine(isValidFrBePhone, { message: "Veuillez indiquer un numéro de téléphone français ou belge valide." }),
  jobTitle: z.enum(jobTitleEnum, { message: "Veuillez sélectionner votre fonction." }),
  company: z.string().min(1, "Le nom de l'entreprise est requis.").max(255).transform((s) => s.trim()),
  companyVat: z
    .string()
    .min(1, "Le numéro TVA belge est requis.")
    .transform((s) => normalizeBelgianVat(s))
    .refine(isValidBelgianVat, { message: "Numéro TVA belge invalide (format BE + 10 chiffres)." }),

  surfaceType: z.enum(["toiture", "parking", "terrain"], { errorMap: () => ({ message: "Type de surface invalide" }) }),
  surfaceArea: z.number().int().positive("Surface requise"),
  province: provinceEnum,
  /** Précision locale (obligatoire si province = autre ; optionnel sinon : commune, site, pays limitrophe…). */
  provinceFreeText: z
    .string()
    .max(400, "Maximum 400 caractères pour la précision de localisation.")
    .optional()
    .transform((s) => {
      if (s === undefined || s === null) return undefined
      const t = s.trim()
      return t === "" ? undefined : t
    }),
  grd: z.enum(["ores", "resa", "aieg", "rew", "fluvius", "unknown"]).optional().nullable(),
  annualElectricityBill: z.number().int().min(5000, "Facture annuelle minimum de 5 000 € requise pour une étude B2B."),
  marketingConsent: z
    .boolean()
    .refine((v) => v === true, { message: "Le consentement est requis pour transmettre votre demande." }),

  projectDetails: z
    .string()
    .max(2000, "Maximum 2 000 caractères.")
    .optional()
    .transform((s) => {
      if (s === undefined || s === null) return undefined
      const t = s.trim()
      return t === "" ? undefined : t
    }),

  estimatedROIYears: z.number().optional(),
  autoconsumptionRate: z.number().optional(),
  estimatedSavings: z.number().optional(),

  form_opened_at: z.string().optional(),
})
  .refine(
    (data) => data.surfaceArea >= 200,
    { message: "Surface représentative trop faible pour une étude B2B.", path: ["surfaceArea"] }
  )
  .refine(
    (data) => {
      if (data.province !== "autre") return true
      return Boolean(data.provinceFreeText && data.provinceFreeText.length >= 2)
    },
    { message: "Indiquez la localisation dans le champ libre (commune, zone, pays…).", path: ["provinceFreeText"] }
  )

export type LeadSubmitInput = z.infer<typeof leadSubmitSchema>

/** Préparation pour vérification SIRET / SIRENE (structure prête pour appel API publique). */
export const SIRENE_API_BASE = "https://api.insee.fr/entreprises/sirene/V3.11"
export function buildSireneSiretUrl(siret: string): string {
  return `${SIRENE_API_BASE}/siret/${siret.trim().replace(/\s/g, "")}`
}
