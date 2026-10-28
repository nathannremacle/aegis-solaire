"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  BadgeCheck,
  CheckCircle2,
  Mail,
  RefreshCw,
} from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  installerRegistrationSchema,
  type InstallerRegistrationInput,
  INSTALLER_REGIONS,
  TARGET_SEGMENT_OPTIONS,
  POWER_CAPACITY_OPTIONS,
} from "@/lib/installer-registration-schema"

const STEP_FIELDS: (keyof InstallerRegistrationInput)[][] = [
  ["companyName", "siret", "targetSegment", "powerCapacity"],
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
  const [submittedData, setSubmittedData] = useState<{
    email: string
    companyName: string
    firstName: string
    regions: string[]
  } | null>(null)
  const [resending, setResending] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const form = useForm<InstallerRegistrationInput>({
    resolver: zodResolver(installerRegistrationSchema),
    defaultValues: {
      companyName: "",
      siret: "",
      targetSegment: "BOTH",
      powerCapacity: "mixte",
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

  async function handleResendEmail() {
    if (!submittedData?.email) return
    setResending(true)
    try {
      const res = await fetch("/api/installateurs/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submittedData.email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Impossible de renvoyer l'e-mail.")
        return
      }
      setResendSent(true)
      toast.success("E-mail de confirmation renvoyé avec succès !")
    } catch {
      toast.error("Erreur de connexion. Veuillez réessayer.")
    } finally {
      setResending(false)
    }
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
      setSubmittedData({
        email: values.email,
        companyName: values.companyName,
        firstName: values.firstName,
        regions: values.regions ?? [],
      })
      toast.success(
        data.message ??
          "Votre candidature a été transmise avec succès ! Vérifiez votre boîte mail."
      )
      if (typeof window !== "undefined") {
        const anchor = document.getElementById("candidature")
        if (anchor) {
          anchor.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  if (submittedData) {
    return (
      <div className="animate-in fade-in-0 duration-300">
        {/* En-tête de confirmation */}
        <div className="border-b border-border pb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-mono font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>CANDIDATURE BIEN REÇUE</span>
          </div>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
            Votre candidature a bien été reçue !
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed">
            Merci{submittedData.firstName ? ` ${submittedData.firstName}` : ""} ! Votre demande d&apos;adhésion pour <strong className="text-foreground">{submittedData.companyName}</strong> a été enregistrée avec succès.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          {/* Encadré d'action prioritaire : Vérification e-mail */}
          <div className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-5 sm:p-6 flex flex-col gap-4 text-left shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-2xs mt-0.5">
                <Mail className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                <span className="font-mono text-xs uppercase tracking-wider font-bold text-accent">
                  Action requise pour activer votre compte
                </span>
                <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">
                  Vérifiez votre boîte e-mail
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Un e-mail de confirmation contenant votre <strong className="text-foreground">lien de validation sécurisé</strong> vient d&apos;être envoyé à l&apos;adresse suivante :
                </p>
                <div className="mt-1 inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 font-mono text-sm font-semibold text-foreground shadow-2xs break-all">
                  <Mail className="h-4 w-4 shrink-0 text-accent" />
                  <span className="truncate">{submittedData.email}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/70 p-4 text-xs sm:text-sm text-foreground flex flex-col gap-2">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-mono text-xs font-bold">
                  !
                </span>
                <span>Veuillez cliquer sur le lien reçu par e-mail</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                Cette étape est indispensable pour certifier votre adresse professionnelle. Dès votre validation effectuée, notre cellule technique procèdera à l&apos;audit de votre agrément RESCERT Photovoltaïque et débloquera vos accès à la marketplace de chantiers solaires.
              </p>
            </div>
          </div>

          {/* Parcours des étapes de traitement */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-5 sm:p-6 flex flex-col gap-3.5">
            <span className="font-mono text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Étapes de traitement de votre dossier
            </span>
            <div className="grid gap-3 text-xs sm:text-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 font-bold text-xs mt-0.5">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-foreground">01. Enregistrement de la candidature</p>
                  <p className="text-xs text-muted-foreground">
                    Informations consignées avec succès pour vos zones d&apos;intervention{" "}
                    {submittedData.regions.length > 0 ? `(${submittedData.regions.join(", ")})` : "(Wallonie)"}.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground font-mono font-bold text-xs mt-0.5 animate-pulse">
                  02
                </div>
                <div>
                  <p className="font-semibold text-accent">02. Confirmation de votre e-mail (En attente de votre clic)</p>
                  <p className="text-xs text-muted-foreground">
                    Consultez votre boîte mail et cliquez sur le lien d&apos;activation pour valider votre demande.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 opacity-80">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground font-mono font-bold text-xs mt-0.5">
                  03
                </div>
                <div>
                  <p className="font-semibold text-foreground">03. Audit RESCERT & Déblocage Marketplace</p>
                  <p className="text-xs text-muted-foreground">
                    Vérification technique sous <span className="font-mono tabular-nums font-semibold text-foreground">48 h</span> par nos auditeurs, puis réception de vos identifiants partenaires.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action et support */}
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={resending}
                onClick={handleResendEmail}
                className="h-11 rounded-xl border-border bg-card text-foreground font-semibold hover:bg-secondary cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`h-4 w-4 mr-2 text-accent ${resending ? "animate-spin" : ""}`} />
                {resending ? "Envoi en cours…" : resendSent ? "E-mail renvoyé avec succès !" : "Renvoyer l'e-mail de validation"}
              </Button>

              <a
                href="mailto:contact@aegissolaire.com"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border/80 bg-background px-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Support : contact@aegissolaire.com
              </a>
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              💡 L&apos;e-mail arrive sous <span className="font-mono tabular-nums">60 s</span>. Pensez à vérifier vos dossiers <strong className="text-foreground">Spams / Courriers indésirables</strong> s&apos;il n&apos;apparaît pas immédiatement dans votre boîte principale.
            </p>
          </div>

          {/* Bouton pour réinitialiser / nouvelle soumission */}
          <div className="border-t border-border pt-4 text-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubmittedData(null)
                setResendSent(false)
                form.reset()
                setStep(0)
              }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Déposer une autre candidature
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="border-b border-border pb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-xs font-mono font-semibold text-primary">
          <BadgeCheck className="h-4 w-4 text-accent" />
          <span>INSCRIPTION INSTALLATEUR PARTENAIRE</span>
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
          Postuler au réseau d&apos;installateurs Aegis Solaire
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Seuls les installateurs couverts par une certification RESCERT Photovoltaïque en cours de validité en Wallonie sont éligibles.
        </p>
      </div>

      <div className="mt-8">
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
                    <FormItem id="reg-companyName" className="sm:col-span-2">
                      <FormLabel>Nom de l&apos;entreprise (dénomination sociale)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex. Solar Wallonie SRL, Toitures & Solaires SA..." className={inputClass} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="siret"
                  render={({ field }) => (
                    <FormItem id="reg-siret" className="sm:col-span-2">
                      <FormLabel>Numéro d&apos;entreprise BCE / KBO (10 chiffres)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0123.456.789 ou BE0123456789"
                          inputMode="numeric"
                          maxLength={20}
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Numéro d&apos;entreprise belge à 10 chiffres (la clé Modulo 97 sera vérifiée automatiquement).
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetSegment"
                  render={({ field }) => (
                    <FormItem id="reg-targetSegment" className="sm:col-span-1">
                      <FormLabel>Segments d&apos;intervention</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={inputClass} suppressHydrationWarning>
                            <SelectValue placeholder="Sélectionnez vos segments" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TARGET_SEGMENT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="powerCapacity"
                  render={({ field }) => (
                    <FormItem id="reg-powerCapacity" className="sm:col-span-1">
                      <FormLabel>Puissance habituelle</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={inputClass} suppressHydrationWarning>
                            <SelectValue placeholder="Sélectionnez la puissance" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {POWER_CAPACITY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormItem id="reg-firstName">
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
                    <FormItem id="reg-lastName">
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
                    <FormItem id="reg-jobTitle" className="sm:col-span-2">
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
                    <FormItem id="reg-email" className="sm:col-span-2 lg:col-span-1">
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
                    <FormItem id="reg-phone" className="sm:col-span-2 lg:col-span-1">
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
                    <FormItem id="reg-rescertRef">
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
                    <FormItem id="reg-rescertConfirmed" className="flex flex-row items-start gap-3 space-y-0 rounded-lg border border-border/60 bg-background/60 p-3">
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
                  <FormItem id="reg-regions">
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
              className="h-12 min-h-[44px] w-full rounded-xl border-border bg-card text-foreground font-semibold hover:bg-secondary sm:w-auto sm:min-w-[120px] cursor-pointer"
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
              className="h-12 min-h-[44px] w-full rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-xs cursor-pointer sm:ml-auto sm:w-auto sm:min-w-[200px]"
              onClick={goNext}
            >
              Continuer
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading}
              className="h-12 min-h-[44px] w-full rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 shadow-xs cursor-pointer disabled:opacity-60 sm:ml-auto sm:w-auto sm:min-w-[220px]"
            >
              {loading ? "Envoi en cours…" : "Envoyer la candidature"}
            </Button>
          )}
        </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
