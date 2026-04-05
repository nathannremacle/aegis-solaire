"use client"

import { useState } from "react"
import { useForm, type DefaultValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import {
  mediaPartnerRegistrationSchema,
  type MediaPartnerRegistrationInput,
} from "@/lib/media-partner-registration-schema"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"

const MP_STEP_FIELDS: (keyof MediaPartnerRegistrationInput)[][] = [
  ["name", "email", "companyName", "websiteUrl"],
  ["experienceDescription", "expectedLeadsPerMonth"],
]

const MP_STEP_META = [
  { title: "Vous & structure", hint: "Coordonnées et société représentée." },
  { title: "Activité & volume", hint: "Canaux, expérience et objectif de leads." },
] as const

const btnSolar =
  "h-12 w-full rounded-xl bg-[#FFC300] text-base font-bold text-[#001D3D] shadow-md transition-all hover:bg-[#e6b800] active:scale-[0.99] disabled:opacity-60 sm:h-14 sm:text-lg"

const fieldClass =
  "h-12 rounded-xl border-slate-200 bg-white/90 shadow-sm transition-colors focus-visible:border-[#001D3D]/30 focus-visible:ring-[#001D3D]/20"

export function MediaPartnerApplicationForm() {
  const [formOpenedAt] = useState(() => Date.now())
  const [honeypot, setHoneypot] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  const form = useForm<MediaPartnerRegistrationInput>({
    resolver: zodResolver(mediaPartnerRegistrationSchema),
    defaultValues: {
      name: "",
      email: "",
      companyName: "",
      websiteUrl: "",
      experienceDescription: "",
      expectedLeadsPerMonth: undefined,
    } as DefaultValues<MediaPartnerRegistrationInput>,
  })

  async function onSubmit(values: MediaPartnerRegistrationInput) {
    setErrorBanner(null)
    setLoading(true)
    try {
      const res = await fetch("/api/media-partners/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          websiteUrl: values.websiteUrl,
          fax_number: honeypot,
          form_opened_at: new Date(formOpenedAt).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorBanner(data.error ?? "Envoi impossible. Réessayez.")
        return
      }
      setSuccess(true)
      form.reset()
      setStep(0)
    } catch {
      setErrorBanner("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const mpTotalSteps = MP_STEP_META.length
  const mpLastStep = step === mpTotalSteps - 1

  async function mpGoNext() {
    const fields = MP_STEP_FIELDS[step]
    const ok = await form.trigger(fields)
    if (ok) setStep((s) => Math.min(s + 1, mpTotalSteps - 1))
  }

  function mpGoPrev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="w-full max-w-lg">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="rounded-2xl border border-slate-200/80 bg-white/95 px-6 py-10 text-center shadow-lg backdrop-blur-xl [padding-left:max(1.25rem,env(safe-area-inset-left))] [padding-right:max(1.25rem,env(safe-area-inset-right))]"
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.08 }}
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-2 ring-emerald-100"
            >
              <CheckCircle2 className="h-9 w-9 text-emerald-600" strokeWidth={2.25} />
            </motion.div>
            <p className="text-lg font-bold tracking-tight text-[#001D3D] sm:text-xl">
              Candidature reçue.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              Notre équipe vous recontactera sous 48h.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur-xl sm:p-8 [padding-left:max(1.25rem,env(safe-area-inset-left))] [padding-right:max(1.25rem,env(safe-area-inset-right))] [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <p className="mb-5 text-sm leading-relaxed text-slate-600">
              Deux étapes courtes : identité, puis votre projet et volumes indicatifs.
            </p>

            {errorBanner && (
              <div
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                role="alert"
              >
                {errorBanner}
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <input
                  type="text"
                  name="fax_number"
                  autoComplete="off"
                  tabIndex={-1}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="pointer-events-none absolute left-[-9999px] h-px w-px opacity-0"
                  aria-hidden
                />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 sm:text-sm">
                    <span className="font-semibold text-[#001D3D]">
                      Étape {step + 1} / {mpTotalSteps}
                    </span>
                    <span className="hidden truncate text-right sm:inline">{MP_STEP_META[step].title}</span>
                  </div>
                  <div className="flex gap-2" role="list" aria-label="Progression">
                    {MP_STEP_META.map((_, i) => (
                      <div
                        key={i}
                        role="listitem"
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= step ? "bg-[#FFC300]" : "bg-slate-200"
                        }`}
                        aria-current={i === step ? "step" : undefined}
                      />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{MP_STEP_META[step].hint}</p>
                </div>

                <div className="min-h-[14rem] space-y-4 sm:min-h-[12rem]">
                  {step === 0 && (
                    <div className="animate-in fade-in-0 space-y-4 duration-200">
                      <h3 className="text-sm font-semibold text-[#001D3D] sm:hidden">{MP_STEP_META[0].title}</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-slate-700">Nom et prénom</FormLabel>
                              <FormControl>
                                <Input placeholder="Jean Dupont" className={fieldClass} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-slate-700">E-mail professionnel</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  inputMode="email"
                                  autoComplete="email"
                                  placeholder="vous@structure.com"
                                  className={fieldClass}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-slate-700">Structure / société</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Nom commercial ou raison sociale"
                                  className={fieldClass}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="websiteUrl"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel className="text-slate-700">Site web (optionnel)</FormLabel>
                              <FormControl>
                                <Input
                                  type="url"
                                  inputMode="url"
                                  placeholder="https://"
                                  className={fieldClass}
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {step === 1 && (
                    <div className="animate-in fade-in-0 space-y-4 duration-200">
                      <h3 className="text-sm font-semibold text-[#001D3D] sm:hidden">{MP_STEP_META[1].title}</h3>
                      <FormField
                        control={form.control}
                        name="experienceDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">Expérience & canaux</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Canaux utilisés, niches, preuves de performance, conformité publicitaire…"
                                className="min-h-[min(28vh,8rem)] max-h-[min(40vh,14rem)] resize-y rounded-xl border-slate-200 bg-white/90 text-base shadow-sm focus-visible:border-[#001D3D]/30 focus-visible:ring-[#001D3D]/20 sm:min-h-[140px] sm:max-h-none sm:text-sm"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="expectedLeadsPerMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700">Volume indicatif (leads qualifiés / mois)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                placeholder="ex. 20"
                                className={fieldClass}
                                value={field.value === undefined || Number.isNaN(field.value) ? "" : field.value}
                                onChange={(e) => {
                                  const v = e.target.value
                                  field.onChange(v === "" ? undefined : parseInt(v, 10))
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  {step > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full rounded-xl border-slate-300 sm:h-14 sm:w-auto sm:min-w-[120px]"
                      onClick={mpGoPrev}
                    >
                      Retour
                    </Button>
                  ) : (
                    <span className="hidden sm:block sm:w-[120px]" aria-hidden />
                  )}
                  {!mpLastStep ? (
                    <Button
                      type="button"
                      className={`${btnSolar} sm:ml-auto`}
                      onClick={mpGoNext}
                    >
                      Continuer
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading} className={`${btnSolar} sm:ml-auto`}>
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Envoi en cours…
                        </span>
                      ) : (
                        "Envoyer la candidature"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
