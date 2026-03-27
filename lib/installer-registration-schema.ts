import { z } from "zod"
import { isProfessionalEmail, isValidFrBePhone } from "@/lib/leads-validation"

function cleanSiret(s: string): string {
  return s.replace(/\s/g, "")
}

export const installerRegistrationSchema = z.object({
  companyName: z
    .string()
    .min(2, "Le nom de l'entreprise est requis (minimum 2 caractères)")
    .max(255)
    .transform((s) => s.trim()),
  siret: z
    .string()
    .min(1, "Le numéro d'entreprise est requis (ex. BCE / KBO : 10 chiffres en Belgique)")
    .transform((s) => cleanSiret(s))
    .refine((s) => s.length >= 10 && s.length <= 14 && /^\d+$/.test(s), "Numéro d'entreprise invalide (souvent 10 chiffres pour le BCE/KBO en Belgique)."),
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
  email: z
    .string()
    .min(1, "L'adresse e-mail est requise")
    .email("Adresse e-mail invalide")
    .refine(isProfessionalEmail, {
      message: "Veuillez utiliser une adresse e-mail professionnelle (domaines personnels type gmail, orange, free, etc. non acceptés).",
    }),
  phone: z
    .string()
    .min(1, "Le numéro de téléphone est requis")
    .refine(isValidFrBePhone, {
      message: "Veuillez indiquer un numéro de téléphone français ou belge valide.",
    }),
  rescertPhotovoltaicRef: z
    .string()
    .min(1, "La référence RESCERT Photovoltaïque est requise")
    .max(64)
    .transform((s) => s.trim()),
  rescertPhotovoltaicConfirmed: z.literal(true, {
    errorMap: () => ({
      message:
        "Vous devez certifier que votre entreprise est couverte par la certification RESCERT Photovoltaïque à jour.",
    }),
  }),
  region: z
    .string()
    .min(1, "Veuillez sélectionner au moins une zone d'intervention"),
})

export type InstallerRegistrationInput = z.infer<typeof installerRegistrationSchema>

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
