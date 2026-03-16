import { z } from "zod"
import { isProfessionalEmail } from "@/lib/leads-validation"

const FONCTION_OPTIONS = ["DAF", "RSE", "Dirigeant", "Autre"] as const

export const webinaireLeadSchema = z.object({
  firstName: z
    .string()
    .min(2, "Le prénom est requis (minimum 2 caractères)")
    .max(255)
    .transform((s) => s.trim()),
  jobTitle: z.enum(FONCTION_OPTIONS, {
    errorMap: () => ({ message: "Veuillez sélectionner une fonction." }),
  }),
  email: z
    .string()
    .email("Adresse e-mail invalide.")
    .refine(isProfessionalEmail, {
      message:
        "Veuillez utiliser une adresse e-mail professionnelle (gmail, yahoo, etc. non acceptés).",
    }),
})

export type WebinaireLeadInput = z.infer<typeof webinaireLeadSchema>
