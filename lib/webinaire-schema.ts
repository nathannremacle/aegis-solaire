import { z } from "zod"

const FONCTION_OPTIONS = ["DAF", "RSE", "Dirigeant", "Autre"] as const
export const WEBINAIRE_SURFACE_OPTIONS = ["lt_500", "m500_1500", "gt_1500"] as const

export const webinaireLeadSchema = z.object({
  firstName: z
    .string()
    .min(2, "Le prénom est requis (minimum 2 caractères)")
    .max(255)
    .transform((s) => s.trim()),
  jobTitle: z.enum(FONCTION_OPTIONS, {
    errorMap: () => ({ message: "Veuillez sélectionner une fonction." }),
  }),
  email: z.string().email("Adresse e-mail invalide."),
  companyName: z
    .string({ required_error: "Le nom de l'entreprise est requis." })
    .min(2, "Le nom de l'entreprise doit comporter au moins 2 caractères.")
    .max(200, "Maximum 200 caractères.")
    .transform((s) => s.trim()),
  surfaceRange: z
    .enum(WEBINAIRE_SURFACE_OPTIONS, {
      errorMap: () => ({ message: "Veuillez sélectionner la surface estimée." }),
    })
    .optional(),
  newsletterConsent: z.boolean().optional(),
})

export type WebinaireLeadInput = z.infer<typeof webinaireLeadSchema>

