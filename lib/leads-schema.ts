import { z } from "zod"
import { isProfessionalEmail, isValidFrBePhone, isValidBelgianVat, normalizeBelgianVat } from "@/lib/leads-validation"

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
  email: z
    .string()
    .email("Adresse e-mail invalide.")
    .refine(isProfessionalEmail, { message: "Veuillez utiliser une adresse e-mail professionnelle (domaines personnels type gmail, orange, free, etc. non acceptés)." }),
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
  province: z.enum(["liege", "hainaut", "namur", "brabant_wallon", "luxembourg"], {
    errorMap: () => ({ message: "Province invalide" }),
  }),
  grd: z.enum(["ores", "resa", "aieg", "rew", "unknown"]).optional().nullable(),
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

export type LeadSubmitInput = z.infer<typeof leadSubmitSchema>

/** Préparation pour vérification SIRET / SIRENE (structure prête pour appel API publique). */
export const SIRENE_API_BASE = "https://api.insee.fr/entreprises/sirene/V3.11"
export function buildSireneSiretUrl(siret: string): string {
  return `${SIRENE_API_BASE}/siret/${siret.trim().replace(/\s/g, "")}`
}
