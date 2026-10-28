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
import { CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, Loader2, Sparkles } from "lucide-react"

const STEP_FIELDS: (keyof InstallerRegistrationInput)[][] = [
  ["companyName", "siret", "targetSegment", "powerCapacity"],
  ["firstName", "lastName", "jobTitle", "email", "phone"],
  ["rescertPhotovoltaicRef", "rescertPhotovoltaicConfirmed"],
  ["regions"],
]

const STEP_META = [
  { title: "Structure & Numéro BCE", hint: "Raison sociale et numéro d'entreprise BCE / KBO vérifié." },
  { title: "Contact Opérationnel", hint: "Coordonnées directes pour la réception des opportunités." },
  { title: "Agrément RESCERT", hint: "Référence d'installateur certifié pour la Wallonie." },
  { title: "Zones Prioritaires", hint: "Provinces d'intervention sélectionnées pour votre profil." },
] as const

const inputClass =
  "h-11 min-h-[44px] rounded-md border-input bg-card text-foreground placeholder:text-muted-foreground/60 text-sm shadow-2xs transition-colors focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"

interface InstallerVipInvitationFormProps {
  initialFirstName?: string
  initialCompanyName?: string
  inviterName?: string
}

export function InstallerVipInvitationForm({
  initialFirstName = "",
  initialCompanyName = "",
  inviterName = "Direction des Partenariats",
}: InstallerVipInvitationFormProps) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<InstallerRegistrationInput>({
    resolver: zodResolver(installerRegistrationSchema),
    defaultValues: {
      companyName: initialCompanyName,
      siret: "",
      targetSegment: "BOTH",
      powerCapacity: "mixte",
      firstName: initialFirstName,
      lastName: "",
      jobTitle: "Gérant / Installateur",
      email: "",
      phone: "",
      rescertPhotovoltaicRef: "",
      rescertPhotovoltaicConfirmed: true,
      regions: ["Liège"],
      invitedBy: inviterName,
    },
  })

  const totalSteps = STEP_FIELDS.length

  async function goNext() {
    const fields = STEP_FIELDS[step]
    const valid = await form.trigger(fields)
    if (valid) {
      setStep((s) => Math.min(s + 1, totalSteps - 1))
    }
  }

  function goPrev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function onSubmit(values: InstallerRegistrationInput) {
    setLoading(true)
    try {
      const payload = {
        ...values,
        invitedBy: inviterName,
      }
      const res = await fetch("/api/installateurs/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'enregistrement.")
        return
      }
      setSubmitted(true)
      toast.success("Invitation activée avec succès !")
    } catch {
      toast.error("Une erreur de communication est survenue. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 sm:p-10 text-center shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)] animate-in fade-in duration-300">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-primary/[0.08] text-primary border border-primary/20">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-sm bg-primary/[0.06] border border-primary/20 px-2.5 py-1 text-xs font-mono font-medium text-primary mb-3">
          <span>ENRÔLEMENT RÉSEAU INSTALLATEURS</span>
        </div>
        <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Bienvenue dans le réseau, {form.getValues("firstName") || "cher confrère"} !
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed font-sans">
          Votre activation sur recommandation directe de <strong className="text-foreground">{inviterName}</strong> a été enregistrée par notre équipe technique.
        </p>

        <div className="mx-auto mt-6 max-w-md rounded-md border border-border bg-secondary/40 p-4 text-left text-xs sm:text-sm text-foreground flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground font-mono text-xs font-semibold tabular-nums">1</span>
            <span>Contrôle de votre certificat RESCERT et paramétrage de vos provinces d'attribution.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground font-mono text-xs font-semibold tabular-nums">2</span>
            <span>Appel direct de notre équipe technique pour valider votre compte et vos accès live.</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-primary text-primary-foreground font-mono text-xs font-semibold tabular-nums">3</span>
            <span>Réception des dossiers qualifiés à la main sur votre zone prioritaire ({form.getValues("regions")?.join(", ")}).</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(false)
              form.reset()
              setStep(0)
            }}
            className="w-full sm:w-auto rounded-md border-border font-mono text-xs"
          >
            Enregistrer une autre structure
          </Button>
          <Button
            asChild
            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-mono text-xs font-medium shadow-xs"
          >
            <a href="/partenaires/login">
              Accéder à l'espace membre
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </a>
          </Button>
        </div>
      </div>
    )
  }

  const stepNumber = String(step + 1).padStart(2, "0")
  const totalStepsStr = String(totalSteps).padStart(2, "0")

  return (
    <div className="rounded-lg border border-border bg-card shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)] overflow-hidden">
      {/* Tunnel Header */}
      <div className="bg-secondary/50 border-b border-border px-5 py-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              ÉTAPE <span className="font-mono tabular-nums font-semibold text-foreground">{stepNumber}</span> / <span className="font-mono tabular-nums">{totalStepsStr}</span> — {STEP_META[step].title.toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{STEP_META[step].hint}</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-sm bg-primary/[0.06] border border-primary/20 px-2.5 py-1 text-xs font-mono font-medium text-primary self-start sm:self-auto">
            <Sparkles className="h-3 w-3 text-accent" />
            <span>PARRAINAGE : {inviterName.toUpperCase()}</span>
          </div>
        </div>

        {/* Progress Bar fine */}
        <div className="mt-4 h-1 w-full bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 rounded-full"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-5 [padding-bottom:max(0.5rem,env(safe-area-inset-bottom))]"
            noValidate
          >
            {/* Étape 1 : Entreprise */}
            {step === 0 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-medium">Nom de l'entreprise / Société</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex. Coretec Energy, Energreen, SolWallonie..."
                          autoComplete="organization"
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
                  name="siret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-medium">
                        Numéro d'entreprise BCE / KBO (<span className="font-mono tabular-nums">10</span> chiffres)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="0123.456.789 ou BE0123456789"
                          inputMode="numeric"
                          className={`${inputClass} font-mono tabular-nums`}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Contrôle algorithmique de la clé Modulo <span className="font-mono tabular-nums">97</span> (Banque-Carrefour des Entreprises).
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="targetSegment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-sm font-medium">Segment souhaité</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className={inputClass}>
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-border">
                            {TARGET_SEGMENT_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm">
                                {opt.label}
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
                      <FormItem>
                        <FormLabel className="text-foreground text-sm font-medium">Puissances traitées</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className={inputClass}>
                              <SelectValue placeholder="Choisir..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-card border-border">
                            {POWER_CAPACITY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs sm:text-sm font-mono">
                                {opt.label}
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

            {/* Étape 2 : Contact direct */}
            {step === 1 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-sm font-medium">Prénom</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Christophe"
                            autoComplete="given-name"
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
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-sm font-medium">Nom</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Dupont"
                            autoComplete="family-name"
                            className={inputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-medium">Votre fonction dans l'entreprise</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Gérant, Directeur technique, Responsable chantiers..."
                          className={inputClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground text-sm font-medium">Adresse e-mail professionnelle</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="c.dupont@votre-societe.be"
                            autoComplete="email"
                            className={`${inputClass} font-mono`}
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
                      <FormItem>
                        <FormLabel className="text-foreground text-sm font-medium">Numéro de téléphone mobile</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+32 470 12 34 56"
                            autoComplete="tel"
                            className={`${inputClass} font-mono tabular-nums`}
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

            {/* Étape 3 : RESCERT Photovoltaïque */}
            {step === 2 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <div className="rounded-md border border-border bg-secondary/40 p-4 text-xs sm:text-sm text-foreground flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">Exigence de qualification technique :</p>
                    <p className="text-muted-foreground leading-relaxed">
                      Aegis Solaire garantit aux maîtres d'ouvrage que seuls des installateurs certifiés interviennent sur leurs toitures. Si vous n'avez pas votre numéro sous la main, inscrivez simplement <em className="text-foreground">« En cours avec Fabrice »</em>.
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="rescertPhotovoltaicRef"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground text-sm font-medium">
                        Numéro ou Référence RESCERT Photovoltaïque
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex. 03/XXXX ou En cours"
                          className={`${inputClass} font-mono`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rescertPhotovoltaicConfirmed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 rounded-md border border-border bg-card p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                        />
                      </FormControl>
                      <div className="flex flex-col gap-0.5 leading-snug">
                        <FormLabel className="text-xs sm:text-sm font-medium text-foreground cursor-pointer">
                          Je certifie que notre structure dispose des compétences requises ou est en cours de renouvellement RESCERT Photovoltaïque en Wallonie.
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Étape 4 : Zones d'intervention */}
            {step === 3 && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                <FormField
                  control={form.control}
                  name="regions"
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel className="text-foreground text-sm font-medium">
                          Sélectionnez vos provinces prioritaires en Wallonie
                        </FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Votre profil ne recevra d'alertes que pour les chantiers géolocalisés dans ces zones.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {INSTALLER_REGIONS.map((region) => {
                          const checked = field.value?.includes(region)
                          return (
                            <label
                              key={region}
                              className={`flex cursor-pointer items-center gap-2.5 rounded-md border p-3 text-xs sm:text-sm transition-all ${
                                checked
                                  ? "border-2 border-primary bg-primary/[0.04] text-foreground font-semibold ring-1 ring-primary/10"
                                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-secondary/30"
                              }`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  if (c) {
                                    field.onChange([...(field.value || []), region])
                                  } else {
                                    field.onChange(
                                      field.value?.filter((r: string) => r !== region)
                                    )
                                  }
                                }}
                              />
                              <span>{region}</span>
                            </label>
                          )
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-md border border-border bg-secondary/40 p-3.5 text-xs text-muted-foreground flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong className="text-foreground">Activation ciblée :</strong> Vos identifiants vous permettront de filtrer votre flux par province dès la première connexion.
                  </span>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              {step > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={goPrev}
                  disabled={loading}
                  className="rounded-md border-border font-mono text-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Précédent
                </Button>
              ) : (
                <div />
              )}

              {step < totalSteps - 1 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-mono text-xs font-medium px-5 py-2.5 shadow-xs"
                >
                  Continuer
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-mono text-xs font-semibold px-6 py-2.5 shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Activation en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-accent mr-1.5" />
                      Activer mon accès installateur
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
