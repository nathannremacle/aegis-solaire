import { z } from "zod"
import { isValidFrBePhone } from "@/lib/leads-validation"

function cleanBce(s: string): string {
  return s.replace(/[\s.]/g, "").toUpperCase().replace(/^BE/, "")
}

/** Zones d'intervention (Belgique / Wallonie). */
export const INSTALLER_REGIONS = [
  "Liège",
  "Hainaut",
  "Namur",
  "Luxembourg (BE)",
  "Brabant wallon",
  "Bruxelles-Capitale",
  "Flandre",
  "Toute la Belgique",
  "Autre / transfrontalier",
] as const

export const TARGET_SEGMENT_OPTIONS = [
  { value: "BOTH", label: "Résidentiel (B2C) et Professionnel (B2B)" },
  { value: "B2C", label: "Résidentiel uniquement (B2C)" },
  { value: "B2B", label: "Tertiaire & Industriel uniquement (B2B)" },
] as const

export const POWER_CAPACITY_OPTIONS = [
  { value: "residentiel_3_30", label: "Petite & moyenne puissance (3 à 30 kWc)" },
  { value: "tertiaire_30_1000", label: "Forte puissance tertiaire/industriel (30 à 1 000+ kWc)" },
  { value: "mixte", label: "Toute puissance (3 à 1 000+ kWc)" },
] as const

export const installerRegistrationSchema = z.object({
  companyName: z
    .string()
    .min(2, "Le nom de l'entreprise est requis (minimum 2 caractères)")
    .max(255)
    .transform((s) => s.trim()),
  siret: z
    .string()
    .min(1, "Le numéro d'entreprise BCE / KBO est requis (10 chiffres)")
    .transform((s) => cleanBce(s))
    .refine((s) => /^[01]\d{9}$/.test(s), "Le numéro BCE/KBO doit comporter 10 chiffres commençant par 0 ou 1 (ex. 0123.456.789 ou BE0123456789).")
    .refine((s) => {
      const first8 = parseInt(s.slice(0, 8), 10)
      const check = parseInt(s.slice(8, 10), 10)
      return check === 97 - (first8 % 97)
    }, "Numéro BCE/KBO invalide (la clé de contrôle Modulo 97 ne correspond pas)."),
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
  jobTitle: z
    .string()
    .min(1, "La fonction est requise")
    .max(255)
    .transform((s) => s.trim()),
  email: z.string().min(1, "L'adresse e-mail est requise").email("Adresse e-mail invalide"),
  phone: z
    .string()
    .min(1, "Le numéro de téléphone est requis")
    .refine(isValidFrBePhone, {
      message: "Veuillez indiquer un numéro de téléphone français ou belge valide.",
    }),
  targetSegment: z.enum(["B2B", "B2C", "BOTH"]).optional(),
  powerCapacity: z.enum(["residentiel_3_30", "tertiaire_30_1000", "mixte"]).optional(),
  rescertPhotovoltaicRef: z
    .string()
    .min(1, "La référence RESCERT Photovoltaïque est requise")
    .max(64)
    .transform((s) => s.trim()),
  rescertPhotovoltaicConfirmed: z
    .boolean()
    .refine((v) => v === true, {
      message:
        "Vous devez certifier que votre entreprise est couverte par la certification RESCERT Photovoltaïque à jour.",
    }),
  regions: z
    .array(z.string())
    .min(1, "Veuillez sélectionner au moins une zone d'intervention")
    .refine(
      (arr) => arr.every((r) => (INSTALLER_REGIONS as readonly string[]).includes(r)),
      { message: "Une ou plusieurs zones sélectionnées sont invalides." }
    ),
})

export type InstallerRegistrationInput = z.infer<typeof installerRegistrationSchema>

