"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  installerRegistrationSchema,
  type InstallerRegistrationInput,
  INSTALLER_REGIONS,
} from "@/lib/installer-registration-schema"

const STEP_FIELDS: (keyof InstallerRegistrationInput)[][] = [
  ["companyName", "siret"],
  ["firstName", "lastName", "jobTitle", "email", "phone"],
  ["rescertPhotovoltaicRef", "rescertPhotovoltaicConfirmed"],
  ["regions"],
]

const STEP_META = [
  { title: "Entreprise", hint: "Raison sociale et numéro d'entreprise (BCE / KBO)." },
  { title: "Contact", hint: "La personne référente pour la suite du dossier." },
  { title: "RESCERT", hint: "Obligatoire pour le réseau partenaires en Belgique." },
  { title: "Zones", hint: "Où vous intervenez pour les demandes clients." },
] as const

const inputClass =
  "h-11 min-h-[44px] rounded-xl border-border bg-background text-base shadow-sm transition-colors focus-visible:ring-2 sm:h-12 sm:text-sm"

export function InstallerRegistrationForm() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)

  const form = useForm<InstallerRegistrationInput>({
    resolver: zodResolver(installerRegistrationSchema),
    defaultValues: {
      companyName: "",
      siret: "",
      firstName: "",
      lastName: "",
      jobTitle: "",
      email: "",
      phone: "",
      rescertPhotovoltaicRef: "",
      rescertPhotovoltaicConfirmed: false,
      regions: [],
    },
  })

  const totalSteps = STEP_META.length
  const isLastStep = step === totalSteps - 1

  async function goNext() {
    const fields = STEP_FIELDS[step]
    const ok = await form.trigger(fields)
    if (ok) setStep((s) => Math.min(s + 1, totalSteps - 1))
  }

  function goPrev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function onSubmit(values: InstallerRegistrationInput) {
    setLoading(true)
    try {
      const res = await fetch("/api/installateurs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'envoi")
        return
      }
      toast.success(
        data.message ??
          "Votre demande a bien été envoyée. Notre équipe va vérifier votre certification RESCERT Photovoltaïque et vous recontactera sous 48h."
      )
      form.reset()
      setStep(0)
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]"
        noValidate
      >
        {/* Progress — compact on mobile */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
            <span className="font-medium text-foreground">
              Étape {step + 1} / {totalSteps}
            </span>
            <span className="hidden truncate text-right sm:inline">{STEP_META[step].title}</span>
          </div>
          <div className="flex gap-1.5" role="list" aria-label="Progression du formulaire">
            {STEP_META.map((_, i) => (
              <div
                key={i}
                role="listitem"
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-accent" : "bg-muted"
                }`}
                aria-current={i === step ? "step" : undefined}
              />
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{STEP_META[step].hint}</p>
        </div>

        <div className="min-h-[12rem] space-y-4 sm:min-h-[10rem]">
          {step === 0 && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <h3 className="text-sm font-semibold text-foreground sm:hidden">{STEP_META[0].title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nom de l&apos;entreprise</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex. Solar Pro SAS" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>BCE / KBO</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10 chiffres (Belgique)"
                          inputMode="numeric"
                          maxLength={20}
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Numéro d&apos;entreprise — souvent 10 chiffres en Belgique.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <h3 className="text-sm font-semibold text-foreground sm:hidden">{STEP_META[1].title}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input placeholder="Jean" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input placeholder="Dupont" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Fonction</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex. Directeur technique" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 lg:col-span-1">
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="jean.dupont@entreprise.be"
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2 lg:col-span-1">
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+32 475 12 34 56"
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in-0 duration-200">
              <h3 className="text-sm font-semibold text-foreground sm:hidden">{STEP_META[2].title}</h3>
              <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
                <FormField
                  control={form.control}
                  name="rescertPhotovoltaicRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence RESCERT Photovoltaïque</FormLabel>
                      <FormControl>
                        <Input placeholder="Numéro ou identifiant" className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rescertPhotovoltaicConfirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border border-border/60 bg-background/60 p-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                          aria-describedby="rescert-error"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-snug">
                        <FormLabel className="cursor-pointer text-sm font-normal leading-snug">
                          Je certifie que mon entreprise est couverte par une certification RESCERT Photovoltaïque à
                          jour (marché belge, RGIE et assurances).
                        </FormLabel>
                        <FormMessage id="rescert-error" />
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 animate-in fade-in-0 duration-200">
              <h3 className="text-sm font-semibold text-foreground sm:hidden">{STEP_META[3].title}</h3>
              <FormField
                control={form.control}
                name="regions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base sm:text-sm">Région(s) couverte(s)</FormLabel>
                    <p className="text-xs text-muted-foreground">Cochez toutes les zones concernées.</p>
                    <div className="max-h-[min(52vh,20rem)] overflow-y-auto overscroll-contain rounded-xl border border-border p-2 sm:max-h-none sm:overflow-visible sm:p-0 sm:border-0">
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {INSTALLER_REGIONS.map((r) => {
                          const selected = field.value ?? []
                          const checked = selected.includes(r)
                          return (
                            <label
                              key={r}
                              className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors hover:bg-muted/40 ${
                                checked ? "border-accent/60 bg-accent/5" : "border-border"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(isOn) => {
                                  const next = new Set(selected)
                                  if (isOn === true) next.add(r)
                                  else next.delete(r)
                                  field.onChange(Array.from(next))
                                }}
                              />
                              <span className="font-normal leading-snug text-foreground">{r}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[44px] w-full rounded-xl sm:h-12 sm:w-auto sm:min-w-[120px]"
              onClick={goPrev}
            >
              Retour
            </Button>
          ) : (
            <span className="hidden sm:block sm:w-[120px]" aria-hidden />
          )}
          {!isLastStep ? (
            <Button
              type="button"
              size="lg"
              className="h-11 min-h-[44px] w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 sm:ml-auto sm:h-12 sm:w-auto sm:min-w-[200px]"
              onClick={goNext}
            >
              Continuer
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="h-11 min-h-[44px] w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 sm:ml-auto sm:h-12 sm:w-auto sm:min-w-[220px]"
              disabled={loading}
            >
              {loading ? "Envoi en cours…" : "Envoyer la candidature"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )
}
