import { z } from "zod"
import { BELGIUM_PROVINCE_KEYS, type BelgiumProvinceKey } from "@/lib/belgium-regions"
import { isValidFrBePhone, isValidBelgianVat, normalizeBelgianVat } from "@/lib/leads-validation"

const provinceEnum = z.enum(BELGIUM_PROVINCE_KEYS as unknown as [BelgiumProvinceKey, ...BelgiumProvinceKey[]])

const jobTitleEnum = ["Dirigeant", "DAF", "Resp. RSE ou Technique", "Autre"] as const

/** Schéma Zod pour la soumission lead — hybride B2B/B2C. */
export const leadSubmitSchema = z.object({
  segment: z.enum(["B2B", "B2C"]).default("B2B"),
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
  jobTitle: z.enum(jobTitleEnum).optional(),
  company: z.string().max(255).transform((s) => s.trim()).optional(),
  companyVat: z
    .string()
    .transform((s) => normalizeBelgianVat(s))
    .refine((s) => !s || isValidBelgianVat(s), { message: "Numéro TVA belge invalide (format BE + 10 chiffres)." })
    .optional(),

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
  annualElectricityBill: z.number().int().positive("Facture annuelle requise"),
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
    (data) => {
      // Pour les B2B, on impose 200m² min, JobTitle, Company et CompanyVat obligatoires.
      if (data.segment === "B2B") {
        if (data.surfaceArea < 200) return false
      }
      return true
    },
    { message: "Surface représentative trop faible pour une étude B2B (> 200m²).", path: ["surfaceArea"] }
  )
  .refine(
    (data) => {
      if (data.segment === "B2B") {
        return Boolean(data.company && data.company.length > 0)
      }
      return true
    },
    { message: "Nom de l'entreprise requis en B2B.", path: ["company"] }
  )
  .refine(
    (data) => {
      if (data.segment === "B2B") {
        return Boolean(data.companyVat && data.companyVat.length > 4)
      }
      return true
    },
    { message: "Numéro TVA BE requis en B2B.", path: ["companyVat"] }
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
