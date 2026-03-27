import { z } from "zod"
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
  email: z.string().email("Adresse e-mail invalide."),
  companyName: z
    .string()
    .max(200, "Maximum 200 caractères.")
    .optional()
    .transform((s) => {
      if (s === undefined || s === null) return undefined
      const t = s.trim()
      return t === "" ? undefined : t
    }),
})

export type WebinaireLeadInput = z.infer<typeof webinaireLeadSchema>
