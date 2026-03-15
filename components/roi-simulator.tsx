"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Zap,
  User,
  CheckCircle2,
  Loader2,
  CalendarClock,
  Landmark,
  TrendingDown,
  Leaf,
  Coins,
  Car,
  Factory,
  Sprout,
} from "lucide-react"
import {
  getEmailError,
  getPhoneError,
} from "@/lib/leads-validation"

type FormData = {
  // Écran 1 : Intention
  objective: string
  // Écran 2 : Foncier
  surfaceType: string
  surfaceRange: string
  /** Surface exacte en m² (optionnel, prioritaire sur les tranches) */
  surfaceAreaCustom: string
  // Écran 3 : Facture (tranches ou montant libre)
  electricityBillBracket: string
  /** Montant exact facture annuelle € HT (optionnel, prioritaire sur les tranches) */
  annualElectricityBillCustom: string
  /** Option IRVE : coupler avec bornes de recharge (étape 3) */
  wantsIrve: boolean
  // Écran 4 : Délai
  projectTimeline: string
  // Écran 6 : Capture
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  company: string
  marketingConsent: boolean
  message: string
  fax_number?: string
}

type ROIResults = {
  estimatedROIYears: number
  autoconsumptionRate: number
  estimatedSavings: number
  installedPower: number
  annualProduction: number
}

const initialFormData: FormData = {
  objective: "",
  surfaceType: "",
  surfaceRange: "",
  surfaceAreaCustom: "",
  electricityBillBracket: "",
  annualElectricityBillCustom: "",
  wantsIrve: false,
  projectTimeline: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  marketingConsent: false,
  message: "",
}

// Écran 1 : Objectif principal
const intentionOptions = [
  { value: "conformite", label: "Mise en conformité légale (Loi APER / Décret Tertiaire)", icon: Landmark },
  { value: "reduction_facture", label: "Réduction de la facture d'électricité (Autoconsommation)", icon: TrendingDown },
  { value: "rse", label: "Démarche RSE & Décarbonation", icon: Leaf },
  { value: "revenu", label: "Générer un nouveau revenu (Location de toiture/terrain)", icon: Coins },
] as const

// Écran 2 : Type de surface + sous-choix
const surfaceTypeOptions = [
  { value: "parking", label: "Parking extérieur", icon: Car, ranges: [{ value: "lt_1500", label: "< 1 500 m²" }, { value: "gt_1500", label: "> 1 500 m²" }] },
  { value: "toiture", label: "Toiture tertiaire ou industrielle", icon: Factory, ranges: [{ value: "lt_500", label: "< 500 m²" }, { value: "500_1000", label: "500 à 1 000 m²" }, { value: "gt_1000", label: "> 1 000 m²" }] },
  { value: "friche", label: "Terrain nu ou Friche", icon: Sprout, ranges: [] },
] as const

// Écran 3 : Facture annuelle (tranches)
const factureBrackets = [
  { value: "lt_20k", label: "Moins de 20 000 € / an", min: 5000, representative: 10000 },
  { value: "20_50k", label: "De 20 000 € à 50 000 € / an", min: 20000, representative: 35000 },
  { value: "50_100k", label: "De 50 000 € à 100 000 € / an", min: 50000, representative: 75000 },
  { value: "gt_100k", label: "Plus de 100 000 € / an", min: 100000, representative: 150000 },
] as const

// Écran 4 : Délai projet
const projectTimelineOptions = [
  { value: "urgent", label: "Urgent (Moins de 3 mois)", icon: "🔥" },
  { value: "3_6_months", label: "À moyen terme (3 à 6 mois)", icon: "☀️" },
  { value: "6_plus_months", label: "Exploratoire (Plus de 6 mois)", icon: "❄️" },
] as const

// Écran 5 : Messages de transition (1,5 s chacun)
const TRANSITION_MESSAGES = [
  "Analyse du gisement solaire en cours...",
  "Vérification des obligations réglementaires...",
  "Calcul de l'éligibilité au financement Zéro CAPEX (Tiers-investissement)...",
  "Estimation du Retour sur Investissement...",
]

// Écran 6 : Fonctions (spec)
const jobTitles = [
  "Dirigeant",
  "DAF",
  "Directeur RSE",
  "Services Généraux",
  "Autre",
]

/** Minimum accepté dans le champ "surface exacte" : 500 m² pour tous les types. Le calculateur utilise toujours la valeur réelle saisie. */
const MIN_SURFACE_CUSTOM_INPUT = 500

/** Retourne la surface utilisée pour le calcul (toujours la valeur réelle : tranche ou saisie libre). */
function getSurfaceAreaFromChoices(surfaceType: string, surfaceRange: string, surfaceAreaCustom?: string): number {
  const custom = surfaceAreaCustom ? parseInt(surfaceAreaCustom.replace(/\s/g, ""), 10) : NaN
  if (!Number.isNaN(custom) && custom >= MIN_SURFACE_CUSTOM_INPUT) return custom

  if (surfaceType === "parking") return surfaceRange === "gt_1500" ? 2000 : 1500
  if (surfaceType === "toiture") {
    if (surfaceRange === "lt_500") return 500
    if (surfaceRange === "500_1000") return 750
    if (surfaceRange === "gt_1000") return 1500
    return 750
  }
  return 1000 // friche
}

function isCustomSurfaceValid(surfaceType: string, value: string | undefined): boolean {
  if (value == null || typeof value !== "string") return false
  const n = parseInt(value.replace(/\s/g, ""), 10)
  if (Number.isNaN(n) || n <= 0) return false
  return n >= MIN_SURFACE_CUSTOM_INPUT
}

const MIN_ANNUAL_BILL = 5000

function isCustomBillValid(value: string | undefined): boolean {
  if (value == null || typeof value !== "string") return false
  const n = parseInt(value.replace(/\s/g, ""), 10)
  return !Number.isNaN(n) && n >= MIN_ANNUAL_BILL
}

function getAnnualBillFromBracket(bracket: string, custom?: string): number {
  if (custom && isCustomBillValid(custom)) {
    return parseInt(custom.replace(/\s/g, ""), 10)
  }
  const b = factureBrackets.find((x) => x.value === bracket)
  return b ? b.representative : 35000
}

function calculateROI(formData: FormData): ROIResults {
  const surfaceArea = getSurfaceAreaFromChoices(formData.surfaceType, formData.surfaceRange, formData.surfaceAreaCustom)
  const annualBill = getAnnualBillFromBracket(formData.electricityBillBracket, formData.annualElectricityBillCustom)

  const installedPower = Math.round((surfaceArea * 0.15) * 10) / 10
  const annualProduction = Math.round(installedPower * 1100)
  const electricityPrice = 0.18
  const potentialSavings = annualProduction * electricityPrice
  const estimatedConsumption = annualBill / electricityPrice
  const autoconsumptionRate = Math.min(
    Math.round((estimatedConsumption / annualProduction) * 100),
    85
  )
  const actualSavings = Math.round(potentialSavings * (autoconsumptionRate / 100))
  const installationCost = installedPower * 1200
  const roiYears = Math.round((installationCost / actualSavings) * 10) / 10

  return {
    estimatedROIYears: roiYears,
    autoconsumptionRate,
    estimatedSavings: actualSavings,
    installedPower,
    annualProduction,
  }
}

export function ROISimulator() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [results, setResults] = useState<ROIResults | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  // Time-to-fill : timestamp d'affichage du formulaire contact (étape 5) pour anti-bot
  const formContactOpenedAtRef = useRef<string | null>(null)

  const totalSteps = 7

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Messages d'erreur par champ (affichés sous les champs, empêchent de valider)
  const emailError = getEmailError(formData.email)
  const phoneError = getPhoneError(formData.phone)
  const firstNameError =
    step === 6
      ? formData.firstName.trim().length === 0
        ? "Le prénom est requis."
        : formData.firstName.trim().length < 2
          ? "Le prénom doit contenir au moins 2 caractères."
          : null
      : null
  const lastNameError =
    step === 6
      ? formData.lastName.trim().length === 0
        ? "Le nom est requis."
        : formData.lastName.trim().length < 2
          ? "Le nom doit contenir au moins 2 caractères."
          : null
      : null
  const jobTitleError =
    step === 6 && formData.jobTitle === "" ? "Veuillez sélectionner votre fonction." : null

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return formData.objective !== ""
      case 2: {
        if (formData.surfaceType === "") return false
        const opt = surfaceTypeOptions.find((o) => o.value === formData.surfaceType)
        if (opt && opt.ranges.length > 0) {
          return formData.surfaceRange !== "" || isCustomSurfaceValid(formData.surfaceType, formData.surfaceAreaCustom)
        }
        return true
      }
      case 3:
        return formData.electricityBillBracket !== "" || isCustomBillValid(formData.annualElectricityBillCustom)
      case 4:
        return projectTimelineOptions.some((o) => o.value === formData.projectTimeline)
      case 5:
        return true
      case 6:
        return (
          emailError === null &&
          phoneError === null &&
          formData.firstName.trim().length >= 2 &&
          formData.lastName.trim().length >= 2 &&
          formData.jobTitle !== "" &&
          formData.marketingConsent === true
        )
      default:
        return false
    }
  }

  const [transitionMessageIndex, setTransitionMessageIndex] = useState(0)
  useEffect(() => {
    if (!isCalculating || step !== 5) return
    const t = setInterval(() => {
      setTransitionMessageIndex((i) => Math.min(i + 1, TRANSITION_MESSAGES.length - 1))
    }, 1500)
    return () => clearInterval(t)
  }, [isCalculating, step])

  const handleNext = () => {
    if (!validateStep(step)) return
    if (step === 4) {
      setStep(5)
      setIsCalculating(true)
      setTransitionMessageIndex(0)
      setTimeout(() => {
        setIsCalculating(false)
        formContactOpenedAtRef.current = new Date().toISOString()
        setStep(6)
      }, 6000)
    } else if (step < totalSteps && step !== 5) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (isCalculating) return
    if (step > 1) {
      if (step === 6) setStep(4)
      else setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(6)) return

    setIsSubmitting(true)
    setError(null)

    const roiResults = calculateROI(formData)
    setResults(roiResults)

    const surfaceArea = getSurfaceAreaFromChoices(formData.surfaceType, formData.surfaceRange, formData.surfaceAreaCustom)
    const annualElectricityBill = getAnnualBillFromBracket(formData.electricityBillBracket, formData.annualElectricityBillCustom)

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        company: formData.company || undefined,
        message: formData.message || undefined,
        objective: formData.objective || undefined,
        surfaceType: formData.surfaceType,
        surfaceArea,
        annualElectricityBill,
        projectTimeline: formData.projectTimeline,
        wantsIrve: formData.wantsIrve,
        marketingConsent: formData.marketingConsent,
        estimatedROIYears: roiResults.estimatedROIYears,
        autoconsumptionRate: roiResults.autoconsumptionRate,
        estimatedSavings: roiResults.estimatedSavings,
        fax_number: formData.fax_number ?? "",
        form_opened_at: formContactOpenedAtRef.current ?? undefined,
      }
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Une erreur est survenue")
      }

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Écran 7 : Thank you
  if (submitted && results) {
    const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "#"
    return (
      <section id="simulator" className="scroll-mt-24 bg-primary py-12 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0 rounded-xl bg-card p-4 shadow-2xl sm:rounded-2xl sm:p-6 md:p-8 lg:p-10">
            <div className="mb-8 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
              Félicitations ! Votre audit est en route vers votre boîte mail.
            </h2>
            <p className="mb-6 text-center text-sm text-muted-foreground sm:mb-8 sm:text-base">
              Un expert en ingénierie financière partenaire d'Aegis Solaire va analyser vos données et vous contactera d'ici 24 à 48 heures pour vous présenter vos options de financement (PPA, Tiers-Investissement).
            </p>

            <div className="mb-6 grid grid-cols-2 min-w-0 gap-2 sm:mb-8 sm:gap-4">
              <div className="rounded-lg bg-accent/10 p-3 text-center sm:p-4">
                <p className="text-2xl font-bold text-accent sm:text-3xl">{results.estimatedROIYears} ans</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Retour sur investissement</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-center sm:p-4">
                <p className="text-2xl font-bold text-primary sm:text-3xl">{results.autoconsumptionRate}%</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Taux d'autoconsommation</p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center sm:p-4">
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  {results.estimatedSavings.toLocaleString("fr-FR")} EUR
                </p>
                <p className="text-xs text-muted-foreground sm:text-sm">Économies annuelles</p>
              </div>
              <div className="rounded-lg bg-secondary p-3 text-center sm:p-4">
                <p className="text-2xl font-bold text-foreground sm:text-3xl">{results.installedPower} kWc</p>
                <p className="text-xs text-muted-foreground sm:text-sm">Puissance estimée</p>
              </div>
            </div>

            {calendlyUrl !== "#" && (
              <div className="mt-6 text-center">
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] min-w-0 items-center justify-center rounded-lg bg-accent px-4 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent/90 w-full text-center sm:w-auto sm:px-6"
                >
                  <span className="break-words">Prendre un rendez-vous téléphonique de 10 min dès maintenant</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="simulator" className="scroll-mt-24 overflow-x-hidden bg-primary py-12 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]" aria-labelledby="simulator-title">
      <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center sm:mb-8">
          <h2 id="simulator-title" className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl md:text-4xl">
            Calculez votre ROI en 2 minutes
          </h2>
          <p className="mt-3 text-base text-primary-foreground/80 sm:mt-4 sm:text-lg">
            Simulation gratuite et sans engagement
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl bg-card p-4 shadow-2xl sm:rounded-2xl sm:p-6 md:p-8">
          {/* Écran 5 : Transition (messages tournants 1,5 s) */}
          {isCalculating && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16" role="status" aria-live="polite">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div
                  className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent"
                  style={{ animationDuration: "1.2s" }}
                />
              </div>
              <p className="mt-8 text-lg font-medium text-foreground transition-opacity duration-300">
                {TRANSITION_MESSAGES[transitionMessageIndex]}
              </p>
            </div>
          )}

          {!isCalculating && (
          <>
          {/* Barre de progression Étape X/7 */}
          <div className="mb-8">
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>Étape {step} sur {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Écran 1 : Intention */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Quel est l'objectif principal de votre démarche aujourd'hui ?
              </h3>
              <p className="text-sm text-muted-foreground">
                Sélectionnez la priorité de votre entreprise.
              </p>
              <div className="grid gap-3 sm:grid-cols-1">
                {intentionOptions.map((opt) => {
                  const Icon = opt.icon
                  return (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={formData.objective === opt.value ? "default" : "outline"}
                      className={`h-auto min-h-[48px] justify-start gap-3 py-4 text-left font-normal break-words ${formData.objective === opt.value ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                      onClick={() => updateFormData("objective", opt.value)}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="min-w-0">{opt.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Écran 2 : Foncier */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Quel type de surface souhaitez-vous valoriser ?
              </h3>
              <p className="text-sm text-muted-foreground">
                Aegis Solaire accompagne exclusivement les projets d'envergure professionnelle.
              </p>
              <div className="space-y-4">
                {surfaceTypeOptions.map((opt) => {
                  const Icon = opt.icon
                  const selected = formData.surfaceType === opt.value
                  return (
                    <div key={opt.value} className="space-y-2">
                      <Button
                        type="button"
                        variant={selected ? "default" : "outline"}
                        className={`w-full h-auto min-h-[48px] justify-start gap-3 py-4 text-left font-normal break-words ${selected ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                        onClick={() => {
                          updateFormData("surfaceType", opt.value)
                          updateFormData("surfaceRange", "")
                          updateFormData("surfaceAreaCustom", "")
                        }}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className="min-w-0">
                          {opt.label}
                          {opt.ranges.length > 0 && (
                            <span className="text-muted-foreground max-sm:block sm:inline"> (Sélectionner ci-dessous)</span>
                          )}
                        </span>
                      </Button>
                      {selected && opt.ranges.length > 0 && (
                        <div className="ml-4 flex flex-wrap gap-2 sm:ml-8">
                          {opt.ranges.map((r) => (
                            <Button
                              key={r.value}
                              type="button"
                              size="sm"
                              variant={formData.surfaceRange === r.value && !formData.surfaceAreaCustom ? "default" : "outline"}
                              className={formData.surfaceRange === r.value && !formData.surfaceAreaCustom ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}
                              onClick={() => {
                                updateFormData("surfaceRange", r.value)
                                updateFormData("surfaceAreaCustom", "")
                              }}
                            >
                              {r.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Surface exacte (optionnel) — prioritaire sur les tranches */}
              {formData.surfaceType && (
                <div className="border-t border-border pt-5">
                  <p className="mb-3 text-sm font-medium text-foreground">
                    Ou indiquez une surface exacte
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                    <div className="w-full flex-1 sm:max-w-[12rem]">
                      <Label htmlFor="surfaceAreaCustom" className="sr-only">
                        Surface en m²
                      </Label>
                      <Input
                        id="surfaceAreaCustom"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder={formData.surfaceType === "parking" ? "ex. 2 500" : "ex. 1 200"}
                        value={formData.surfaceAreaCustom ?? ""}
                        onChange={(e) => updateFormData("surfaceAreaCustom", e.target.value.replace(/[^\d\s]/g, "").slice(0, 9))}
                        className="h-11"
                        aria-describedby="surface-custom-hint surface-custom-error"
                      />
                    </div>
                    <span className="text-muted-foreground text-sm sm:h-11 sm:flex sm:items-center">m²</span>
                  </div>
                  <p id="surface-custom-hint" className="mt-1.5 text-xs text-muted-foreground">
                    {formData.surfaceType === "parking"
                      ? "Indiquez votre surface réelle (min. 500 m²). Le calculateur utilise cette valeur. À partir de 1 500 m², le parking est concerné par la Loi LOM (ombrières)."
                      : "Minimum 500 m² pour toiture ou friche. Le calculateur utilise la valeur indiquée."}
                  </p>
                  {formData.surfaceAreaCustom && !isCustomSurfaceValid(formData.surfaceType, formData.surfaceAreaCustom) && (
                    <p id="surface-custom-error" className="mt-1.5 text-xs text-destructive" role="alert">
                      Indiquez au moins 500 m².
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Écran 3 : Facture (tranches ou montant libre) */}
          {step === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                À combien s'élève votre facture annuelle d'électricité ?
              </h3>
              <p className="text-sm text-muted-foreground">
                Cette donnée nous permet de calculer votre potentiel d'autoconsommation.
              </p>
              <div className="grid gap-3 sm:grid-cols-1">
                {factureBrackets.map((b) => (
                  <Button
                    key={b.value}
                    type="button"
                    variant={formData.electricityBillBracket === b.value && !formData.annualElectricityBillCustom ? "default" : "outline"}
                    className={`h-auto min-h-[48px] py-4 font-normal break-words text-left ${formData.electricityBillBracket === b.value && !formData.annualElectricityBillCustom ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                    onClick={() => {
                      updateFormData("electricityBillBracket", b.value)
                      updateFormData("annualElectricityBillCustom", "")
                    }}
                  >
                    {b.label}
                  </Button>
                ))}
              </div>

              <div className="border-t border-border pt-5">
                <p className="mb-3 text-sm font-medium text-foreground">
                  Ou indiquez un montant exact
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                  <div className="w-full flex-1 sm:max-w-[14rem]">
                    <Label htmlFor="annualElectricityBillCustom" className="sr-only">
                      Facture annuelle en € HT
                    </Label>
                    <Input
                      id="annualElectricityBillCustom"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="ex. 45 000"
                      value={formData.annualElectricityBillCustom ?? ""}
                      onChange={(e) => updateFormData("annualElectricityBillCustom", e.target.value.replace(/[^\d\s]/g, "").slice(0, 9))}
                      className="h-11"
                      aria-describedby="bill-custom-hint bill-custom-error"
                    />
                  </div>
                  <span className="text-muted-foreground text-sm sm:h-11 sm:flex sm:items-center">€ HT / an</span>
                </div>
                <p id="bill-custom-hint" className="mt-1.5 text-xs text-muted-foreground">
                  Minimum 5 000 € HT/an pour une étude B2B.
                </p>
                {formData.annualElectricityBillCustom && !isCustomBillValid(formData.annualElectricityBillCustom) && (
                  <p id="bill-custom-error" className="mt-1.5 text-xs text-destructive" role="alert">
                    Indiquez au moins 5 000 € HT/an.
                  </p>
                )}
              </div>

              {/* Option IRVE (upsell Loi LOM) */}
              <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <Checkbox
                  id="wantsIrve"
                  checked={formData.wantsIrve}
                  onCheckedChange={(checked) => updateFormData("wantsIrve", checked === true)}
                />
                <div className="min-w-0">
                  <Label htmlFor="wantsIrve" className="cursor-pointer text-sm font-medium text-foreground">
                    Je souhaite coupler ce projet avec l'installation de bornes de recharge (IRVE).
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    La Loi LOM impose souvent solaire et IRVE ensemble ; cette option augmente la valeur de votre dossier.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Écran 4 : Délai projet */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                Sous quel délai souhaitez-vous concrétiser ce projet ?
              </h3>
              <p className="text-sm text-muted-foreground">
                L'étude de faisabilité et les raccordements peuvent prendre plusieurs mois.
              </p>
              <div className="grid gap-3 sm:grid-cols-1">
                {projectTimelineOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={formData.projectTimeline === opt.value ? "default" : "outline"}
                    className={`h-auto min-h-[48px] justify-start gap-2 py-4 text-left font-normal ${formData.projectTimeline === opt.value ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                    onClick={() => updateFormData("projectTimeline", opt.value)}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Écran 6 : Gated capture — messages personnalisés selon ROI, surface, facture, type, objectif */}
          {step === 6 && (() => {
            const previewResults = calculateROI(formData)
            const previewSurface = getSurfaceAreaFromChoices(formData.surfaceType, formData.surfaceRange, formData.surfaceAreaCustom)
            const previewBill = getAnnualBillFromBracket(formData.electricityBillBracket, formData.annualElectricityBillCustom)
            const roiYears = previewResults.estimatedROIYears
            const { surfaceType, objective } = formData

            const eligibleTiersInvestissement = roiYears >= 8 && roiYears <= 12 && previewSurface >= 1000 && previewBill >= 20000
            const excellentROI = roiYears < 8
            const fortPotentielROI = roiYears >= 8 && roiYears <= 12
            const potentielModere = roiYears > 12 && roiYears < 15
            const aEtudier = roiYears >= 15

            const bySurface =
              surfaceType === "parking"
                ? previewSurface >= 1500
                  ? "Pour un parking de cette envergure, la Loi LOM (ombrières) peut s'appliquer."
                  : "Votre surface est inférieure au seuil d'éligibilité Loi LOM (1 500 m²) ; une étude personnalisée peut préciser les options pour votre cas."
                : surfaceType === "toiture"
                  ? "Les toitures tertiaires et industrielles sont des gisements solaires prioritaires."
                  : surfaceType === "friche"
                    ? "La valorisation d'un terrain ou d'une friche par le solaire est un levier de revenu et de décarbonation."
                    : ""

            const byObjective =
              objective === "conformite"
                ? "Votre priorité mise en conformité sera au cœur de l'étude (obligations, échéances, risque d'amende)."
                : objective === "reduction_facture"
                  ? "L'autoconsommation et la réduction de votre facture seront au centre de notre analyse."
                  : objective === "rse"
                    ? "L'étude mettra en avant le gain carbone et la contribution à votre démarche RSE."
                    : objective === "revenu"
                      ? "Les options de valorisation (location de toiture/terrain, PPA) vous seront détaillées."
                      : ""

            let teaserTitle: string
            let teaserText: string

            if (excellentROI) {
              teaserTitle = "Excellent potentiel de rentabilité sur votre site"
              teaserText = `Le retour sur investissement estimé est inférieur à 8 ans sur votre périmètre.${bySurface ? ` ${bySurface}` : ""} Renseignez vos coordonnées pour recevoir une étude détaillée et les options de financement (dont le tiers-investissement pour les projets éligibles).${byObjective ? ` ${byObjective}` : ""}`
            } else if (eligibleTiersInvestissement) {
              teaserTitle = "Bonne nouvelle, votre site présente un fort potentiel de rentabilité !"
              teaserText = `Sur ce type de surface, le ROI moyen est estimé entre 8 et 12 ans. Votre projet est éligible à un financement intégral par un tiers-investisseur (Zéro avance de trésorerie).${bySurface ? ` ${bySurface}` : ""}${byObjective ? ` ${byObjective}` : ""}`
            } else if (fortPotentielROI) {
              teaserTitle = "Bonne nouvelle, votre site présente un fort potentiel de rentabilité !"
              teaserText = `Le retour sur investissement moyen est estimé entre 8 et 12 ans sur votre configuration.${bySurface ? ` ${bySurface}` : ""} Renseignez vos coordonnées pour recevoir une étude détaillée et les options de financement adaptées.${byObjective ? ` ${byObjective}` : ""}`
            } else if (potentielModere) {
              teaserTitle = "Votre projet présente un potentiel de rentabilité"
              teaserText = `Le retour sur investissement estimé se situe entre 12 et 15 ans. Une étude personnalisée vous précisera les chiffres réels et les options de financement (PPA, tiers-investissement selon critères).${bySurface ? ` ${bySurface}` : ""}${byObjective ? ` ${byObjective}` : ""}`
            } else {
              teaserTitle = "Votre projet mérite une étude personnalisée"
              teaserText = `Le retour sur investissement estimé dépasse 15 ans sur votre configuration actuelle. Une analyse détaillée permettra d'évaluer les leviers d'optimisation et les options de financement adaptées à votre situation.${bySurface ? ` ${bySurface}` : ""}${byObjective ? ` ${byObjective}` : ""}`
            }

            return (
            <div className="space-y-6">
              <div className="sr-only" aria-hidden="true">
                <Label htmlFor="fax_number">Ne pas remplir</Label>
                <Input
                  id="fax_number"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.fax_number ?? ""}
                  onChange={(e) => updateFormData("fax_number", e.target.value)}
                />
              </div>

              {/* Teasing : message adapté à l'éligibilité réelle (ROI, surface, facture) */}
              <div className="relative min-w-0 rounded-lg border border-accent/30 bg-accent/5 p-4 sm:p-6">
                <div className="absolute inset-0 rounded-lg bg-card/80 backdrop-blur-sm" aria-hidden />
                <div className="relative min-w-0">
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">
                    {teaserTitle}
                  </h3>
                  <p className="mt-2 break-words text-sm text-muted-foreground">
                    {teaserText}
                  </p>
                </div>
              </div>

              <p className="font-medium text-foreground">
                Découvrez votre rapport détaillé et chiffré. Où devons-nous vous l'envoyer ?
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    value={formData.firstName ?? ""}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    className={`mt-1.5 ${firstNameError ? "border-destructive" : ""}`}
                    aria-invalid={!!firstNameError}
                    aria-describedby={firstNameError ? "firstName-error" : undefined}
                  />
                  {firstNameError && (
                    <p id="firstName-error" className="mt-1.5 text-xs text-destructive" role="alert">{firstNameError}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    value={formData.lastName ?? ""}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    className={`mt-1.5 ${lastNameError ? "border-destructive" : ""}`}
                    aria-invalid={!!lastNameError}
                    aria-describedby={lastNameError ? "lastName-error" : undefined}
                  />
                  {lastNameError && (
                    <p id="lastName-error" className="mt-1.5 text-xs text-destructive" role="alert">{lastNameError}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="jobTitle">Fonction</Label>
                <Select
                  value={formData.jobTitle ?? ""}
                  onValueChange={(value) => updateFormData("jobTitle", value)}
                >
                  <SelectTrigger id="jobTitle" className={`mt-1.5 ${jobTitleError ? "border-destructive" : ""}`} aria-invalid={!!jobTitleError} aria-describedby={jobTitleError ? "jobTitle-error" : undefined}>
                    <SelectValue placeholder="Sélectionnez votre fonction" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((title) => (
                      <SelectItem key={title} value={title}>{title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {jobTitleError && (
                  <p id="jobTitle-error" className="mt-1.5 text-xs text-destructive" role="alert">{jobTitleError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="company">Nom de l'entreprise</Label>
                <Input
                  id="company"
                  placeholder="Nom de votre entreprise"
                  value={formData.company ?? ""}
                  onChange={(e) => updateFormData("company", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="email">Email professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@entreprise.fr"
                  value={formData.email ?? ""}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className={`mt-1.5 ${emailError ? "border-destructive" : ""}`}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                {emailError && (
                  <p id="email-error" className="mt-1.5 text-xs text-destructive" role="alert">{emailError}</p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Téléphone direct</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={formData.phone ?? ""}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  className={`mt-1.5 ${phoneError ? "border-destructive" : ""}`}
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? "phone-error" : undefined}
                />
                {phoneError && (
                  <p id="phone-error" className="mt-1.5 text-xs text-destructive" role="alert">{phoneError}</p>
                )}
              </div>

              {step === 6 && !formData.marketingConsent && (
                <p className="text-xs text-destructive" role="alert">
                  Pour recevoir votre audit, veuillez accepter d'être recontacté en cochant la case ci-dessous.
                </p>
              )}

              <div className={`flex items-start gap-3 rounded-lg border p-4 ${step === 6 && !formData.marketingConsent ? "border-destructive" : "border-border"}`}>
                <Checkbox
                  id="marketingConsent"
                  checked={formData.marketingConsent}
                  onCheckedChange={(checked) => updateFormData("marketingConsent", checked === true)}
                />
                <div>
                  <Label htmlFor="marketingConsent" className="text-sm font-normal leading-relaxed">
                    J'accepte d'être recontacté par Aegis Solaire et ses installateurs partenaires certifiés RGE pour évaluer mon projet.
                  </Label>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Conformité RGPD</p>
                <p className="mt-2">
                  Conformément au RGPD, vos données sont collectées sur la base de votre consentement pour traiter votre demande de simulation. Elles seront conservées pour une durée maximale de 3 ans après notre dernier contact. Vous disposez d'un droit d'accès, de rectification et d'opposition immédiate à tout moment.
                </p>
                <p className="mt-2">
                  <a href="/politique-confidentialite" className="underline">Politique de confidentialité</a>
                  {" "}et{" "}
                  <a href="/politique-confidentialite#desinscription" className="underline">désinscription</a>.
                </p>
              </div>
            </div>
            )
          })()}

          {/* Error message */}
          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Navigation : Retour + Continuer ou CTA Or */}
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-between sm:gap-4">
            {step > 1 && step !== 5 && !isCalculating ? (
              <Button variant="outline" onClick={handleBack} className="min-h-[44px] w-full sm:order-first sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                Retour
              </Button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {step <= 4 && !isCalculating && (
              <Button
                onClick={handleNext}
                disabled={!validateStep(step)}
                className="min-h-[44px] w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            )}

            {step === 6 && !isCalculating && (
              <Button
                onClick={handleSubmit}
                disabled={!validateStep(6) || isSubmitting}
                className="min-h-[44px] w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:ml-auto sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Recevoir mon audit de rentabilité complet
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </section>
  )
}
