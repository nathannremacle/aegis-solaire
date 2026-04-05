import { z } from "zod"

export const mediaPartnerRegistrationSchema = z.object({
  name: z
    .string()
    .min(2, "Le nom est requis (minimum 2 caractères)")
    .max(255)
    .transform((s) => s.trim()),
  email: z.string().min(1, "L'adresse e-mail est requise").email("Adresse e-mail invalide"),
  companyName: z
    .string()
    .min(2, "Le nom de la structure / société est requis")
    .max(255)
    .transform((s) => s.trim()),
  websiteUrl: z
    .string()
    .max(2048)
    .optional()
    .transform((s) => {
      if (s == null || s === undefined) return undefined
      const t = s.trim()
      return t === "" ? undefined : t
    })
    .refine((s) => s === undefined || /^https?:\/\/.+/i.test(s), {
      message: "URL du site invalide (utilisez https://…)",
    }),
  experienceDescription: z
    .string()
    .min(40, "Décrivez votre expérience (au moins 40 caractères)")
    .max(8000)
    .transform((s) => s.trim()),
  expectedLeadsPerMonth: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined
      if (typeof val === "string") return parseInt(val, 10)
      return val
    },
    z
      .number({ invalid_type_error: "Indiquez un nombre de leads indicatif" })
      .int("Nombre entier requis")
      .min(1, "Minimum 1 lead / mois")
      .max(100_000, "Valeur trop élevée")
  ),
})

export type MediaPartnerRegistrationInput = z.infer<typeof mediaPartnerRegistrationSchema>
