import { z } from "zod"
import { BELGIUM_PROVINCE_KEYS, type BelgiumProvinceKey } from "@/lib/belgium-regions"
import { isValidFrBePhone, isValidBelgianVat, normalizeBelgianVat } from "@/lib/leads-validation"

const provinceEnum = z.enum(BELGIUM_PROVINCE_KEYS as unknown as [BelgiumProvinceKey, ...BelgiumProvinceKey[]])

export const JOB_TITLE_OPTIONS = ["Dirigeant", "DAF", "Resp. RSE ou Technique", "Autre"] as const
export type JobTitle = (typeof JOB_TITLE_OPTIONS)[number]

export const SOURCE_FORM_OPTIONS = [
  "b2b_simulator",
  "b2c_simulator",
  "b2c_devis_landing",
  "webinar_upsell",
  "manual_admin",
  "api_partner",
] as const
export type SourceForm = (typeof SOURCE_FORM_OPTIONS)[number]

export const OWNERSHIP_STATUS_OPTIONS = [
  "owner",
  "tenant_authorized",
  "tenant_unauthorized",
  "co_ownership",
] as const
export type OwnershipStatus = (typeof OWNERSHIP_STATUS_OPTIONS)[number]

export const ROOF_MATERIAL_OPTIONS = [
  "tuiles",
  "ardoises",
  "plat_epdm",
  "bac_acier",
  "zinc_autre",
  "fibrociment_amiante",
] as const
export type RoofMaterial = (typeof ROOF_MATERIAL_OPTIONS)[number]

export const PROJECT_DRIVER_OPTIONS = [
  "reduire_facture",
  "peb_permis",
  "flotte_irve",
  "tiers_invest",
] as const
export type ProjectDriver = (typeof PROJECT_DRIVER_OPTIONS)[number]

export const TIMEFRAME_OPTIONS = [
  "immediat_3mois",
  "3_6mois",
  "plus_6mois",
  "simple_renseignement",
] as const
export type Timeframe = (typeof TIMEFRAME_OPTIONS)[number]

/**
 * Schéma Zod Canonique Unifié pour la soumission de Leads (B2B & B2C)
 * Aligné avec la migration 024_canonical_leads_schema.sql
 */
export const leadSubmitSchema = z
  .object({
    // Tronc commun obligatoire
    segment: z.enum(["B2B", "B2C"]).default("B2B"),
    sourceForm: z.enum(SOURCE_FORM_OPTIONS).optional(),

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
    email: z.string().email("Adresse e-mail valide requise."),
    phone: z
      .string()
      .min(1, "Le numéro de téléphone est requis.")
      .refine(isValidFrBePhone, { message: "Veuillez indiquer un numéro de téléphone belge ou français valide." }),

    // Localisation précise (Cruciale pour audit Google Maps & matching local)
    province: provinceEnum,
    provinceFreeText: z
      .string()
      .max(400, "Maximum 400 caractères.")
      .optional()
      .transform((s) => {
        if (!s) return undefined
        const t = s.trim()
        return t === "" ? undefined : t
      }),
    postalCode: z
      .string()
      .regex(/^[0-9]{4}$/, "Le code postal belge doit comporter exactement 4 chiffres.")
      .optional(),
    city: z.string().max(100).optional(),
    siteAddress: z.string().max(255).optional(),

    // Spécifications techniques toiture & surface
    surfaceType: z.enum(["toiture", "parking", "terrain", "friche"], {
      errorMap: () => ({ message: "Type de surface invalide" }),
    }),
    surfaceArea: z.number().int().positive("Surface requise"),
    roofMaterial: z.enum(ROOF_MATERIAL_OPTIONS).optional(),
    ownershipStatus: z.enum(OWNERSHIP_STATUS_OPTIONS).optional(),

    // Énergie & Réseau
    annualElectricityBill: z.number().int().positive("Facture annuelle requise"),
    grd: z.enum(["ores", "resa", "aieg", "rew", "fluvius", "unknown"]).optional().nullable(),

    // B2B Déclencheurs & Structure d'entreprise
    company: z.string().max(255).transform((s) => s.trim()).optional(),
    companyVat: z
      .string()
      .transform((s) => normalizeBelgianVat(s))
      .refine((s) => !s || isValidBelgianVat(s), { message: "Numéro TVA belge invalide (format BE + 10 chiffres)." })
      .optional(),
    jobTitle: z.enum(JOB_TITLE_OPTIONS).optional(),
    projectDriver: z.enum(PROJECT_DRIVER_OPTIONS).optional(),

    // B2C & Timing
    timeframe: z.enum(TIMEFRAME_OPTIONS).optional(),

    // Métadonnées secondaires extensibles (JSONB)
    qualificationMetadata: z.record(z.unknown()).optional(),

    // Consentements RGPD
    marketingConsent: z
      .boolean()
      .refine((v) => v === true, { message: "Le consentement est requis pour transmettre votre demande." }),
    newsletterConsent: z.boolean().optional(),

    // Notes de précisions libres
    projectDetails: z
      .string()
      .max(2000, "Maximum 2 000 caractères.")
      .optional()
      .transform((s) => {
        if (!s) return undefined
        const t = s.trim()
        return t === "" ? undefined : t
      }),

    // Estimations algorithmiques
    estimatedROIYears: z.number().optional(),
    autoconsumptionRate: z.number().optional(),
    estimatedSavings: z.number().optional(),

    // Sécurité et attribution
    fax_number: z.string().optional(),
    form_opened_at: z.string().optional(),
    mediaPartnerCode: z.string().max(50).optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Validation stricte du segment B2B
    if (data.segment === "B2B") {
      if (!data.company || data.company.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le nom de l'entreprise est obligatoire pour une étude B2B.",
          path: ["company"],
        })
      }

      if (!data.companyVat || data.companyVat.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le numéro d'entreprise / TVA belge (BE0...) est obligatoire en B2B.",
          path: ["companyVat"],
        })
      }

      if (!data.jobTitle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fonction du décideur est requise en B2B.",
          path: ["jobTitle"],
        })
      }

      if (data.surfaceArea < 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Surface représentative trop faible pour une étude B2B (minimum 100 m²).",
          path: ["surfaceArea"],
        })
      }
    }

    // 2. Validation de localisation personnalisée si 'autre'
    if (data.province === "autre" && (!data.provinceFreeText || data.provinceFreeText.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Veuillez préciser la commune ou localisation dans le champ libre.",
        path: ["provinceFreeText"],
      })
    }
  })

export type LeadSubmitInput = z.infer<typeof leadSubmitSchema>

/** Préparation pour vérification BCE / KBO belge via web-service */
export const BCE_PUBLIC_SEARCH_URL = "https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html"
export function formatBceNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7, 10)}`
  }
  return digits
}
