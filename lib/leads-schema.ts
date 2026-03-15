import { z } from "zod"
import { isProfessionalEmail, isValidFrBePhone } from "@/lib/leads-validation"

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
    .email("Adresse e-mail invalide.")
    .refine(isProfessionalEmail, { message: "Veuillez utiliser une adresse e-mail professionnelle (domaines personnels type gmail, orange, free, etc. non acceptés)." }),
  phone: z
    .string()
    .min(1, "Le numéro de téléphone est requis.")
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
    { message: "Surface minimum : 1 500 m² pour un parking, 500 m² pour toiture ou friche.", path: ["surfaceArea"] }
  )

export type LeadSubmitInput = z.infer<typeof leadSubmitSchema>

/** Préparation pour vérification SIRET / SIRENE (structure prête pour appel API publique). */
export const SIRENE_API_BASE = "https://api.insee.fr/entreprises/sirene/V3.11"
export function buildSireneSiretUrl(siret: string): string {
  return `${SIRENE_API_BASE}/siret/${siret.trim().replace(/\s/g, "")}`
}
// Note : un appel réel nécessiterait une clé API Insee (consommateur SIRENE) et serait à faire côté backend.
