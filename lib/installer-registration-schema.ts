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
    .min(1, "Le numéro SIRET est requis")
    .transform((s) => cleanSiret(s))
    .refine((s) => s.length === 14, "Le SIRET doit comporter exactement 14 chiffres")
    .refine((s) => /^\d{14}$/.test(s), "Le SIRET ne doit contenir que des chiffres"),
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
  rgeNumber: z
    .string()
    .min(1, "Le numéro de certification RGE est requis")
    .max(64)
    .transform((s) => s.trim()),
  qualiPvCertified: z.literal(true, {
    errorMap: () => ({ message: "Vous devez certifier que votre entreprise possède la qualification QualiPV à jour." }),
  }),
  region: z
    .string()
    .min(1, "Veuillez sélectionner au moins une zone d'intervention"),
})

export type InstallerRegistrationInput = z.infer<typeof installerRegistrationSchema>

/** Liste des régions pour le select (zone d'intervention). */
export const INSTALLER_REGIONS = [
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Île-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d'Azur",
  "Belgique",
  "Autre / Multi-régions",
] as const
