"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BELGIUM_PROVINCE_GROUPS, getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Car,
  Factory,
  Sprout,
} from "lucide-react"
import {
  getEmailError,
  getPhoneError,
  getVatError,
} from "@/lib/leads-validation"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"

type FormData = {
  surfaceType: string
  surfaceRange: string
  province: string
  /** Commune, site, précision si « Autre », ou détail optionnel pour toute région */
  provinceFreeText: string
  grd: string
  electricityBillBracket: string
  annualElectricityBillCustom: string
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  company: string
  companyVat: string
  projectDetails: string
  marketingConsent: boolean
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
  surfaceType: "",
  surfaceRange: "",
  province: "",
  provinceFreeText: "",
  grd: "",
  electricityBillBracket: "",
  annualElectricityBillCustom: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  companyVat: "",
  projectDetails: "",
  marketingConsent: false,
}

const surfaceRangeOptions = [
  { value: "lt_500", label: "Moins de 500 m²" },
  { value: "m500_1500", label: "De 500 à 1 500 m²" },
  { value: "gt_1500", label: "Plus de 1 500 m²" },
] as const

const grdOptions = [
  { value: "ores", label: "Ores (Wallonie)" },
  { value: "resa", label: "Resa (Wallonie)" },
  { value: "aieg", label: "AIEG" },
  { value: "rew", label: "REW" },
  { value: "fluvius", label: "Fluvius (Flandre)" },
  { value: "unknown", label: "Je ne sais pas" },
] as const

const factureBrackets = [
  { value: "lt_50k", label: "Moins de 50 000 € / an", representative: 35_000 },
  { value: "50_100k", label: "De 50 000 € à 100 000 € / an", representative: 75_000 },
  { value: "gt_100k", label: "Plus de 100 000 € / an", representative: 120_000 },
] as const

const jobTitles = ["Dirigeant", "DAF", "Resp. RSE ou Technique", "Autre"] as const

const TRANSITION_MESSAGES = [
  "Vérification du périmètre wallon et du potentiel capacitaire…",
  "Analyse des quotas Certificats Verts (CWaPE) éligibles…",
  "Vérification des nœuds d'injection GRD (Ores/Resa/Elia)…",
  "Modélisation du TRI indicatif et des flux PPA / Tiers-investissement…",
]

const MIN_ANNUAL_BILL = 5000

function getSurfaceAreaFromChoices(surfaceType: string, surfaceRange: string): number {
  if (surfaceRange === "lt_500") return 400
  if (surfaceRange === "m500_1500") return 1000
  if (surfaceRange === "gt_1500") return 2000
  return 1000
}

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
  return b ? b.representative : 50_000
}

function calculateROI(formData: FormData): ROIResults {
  const surfaceArea = getSurfaceAreaFromChoices(formData.surfaceType, formData.surfaceRange)
  const annualBill = getAnnualBillFromBracket(formData.electricityBillBracket, formData.annualElectricityBillCustom)

  const installedPower = Math.round(surfaceArea * 0.15 * 10) / 10
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
  const rawRoi = installationCost / Math.max(actualSavings, 1)
  
  // Plafonnement du ROI B2B entre 5 et 7 ans pour refléter la stricte réalité du marché wallon
  const clampedRoi = Math.max(5.2, Math.min(6.9, rawRoi))
  const roiYears = Math.round(clampedRoi * 10) / 10

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
  /** Horodatage début de parcours — l’API exige >4 s entre ce moment et la soumission ; ne pas le fixer à l’étape contact seule (sinon soumission rapide = erreur). */
  const formContactOpenedAtRef = useRef<string | null>(null)

  const totalSteps = 5

  useEffect(() => {
    formContactOpenedAtRef.current = new Date().toISOString()
  }, [])

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const emailError = getEmailError(formData.email)
  const phoneError = getPhoneError(formData.phone)
  const vatError = getVatError(formData.companyVat)
  const firstNameError =
    step === 5
      ? formData.firstName.trim().length === 0
        ? "Le prénom est requis."
        : formData.firstName.trim().length < 2
          ? "Le prénom doit contenir au moins 2 caractères."
          : null
      : null
  const lastNameError =
    step === 5
      ? formData.lastName.trim().length === 0
        ? "Le nom est requis."
        : formData.lastName.trim().length < 2
          ? "Le nom doit contenir au moins 2 caractères."
          : null
      : null
  const jobTitleError = step === 5 && formData.jobTitle === "" ? "Veuillez sélectionner votre fonction." : null
  const companyError =
    step === 5 && formData.company.trim().length === 0 ? "Le nom de l'entreprise est requis." : null

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return formData.surfaceType !== "" && formData.surfaceRange !== ""
      case 2:
        if (formData.province === "") return false
        if (formData.province === "autre") return formData.provinceFreeText.trim().length >= 2
        return true
      case 3:
        return formData.electricityBillBracket !== "" || isCustomBillValid(formData.annualElectricityBillCustom)
      case 4:
        return true
      case 5:
        return (
          emailError === null &&
          phoneError === null &&
          vatError === null &&
          formData.firstName.trim().length >= 2 &&
          formData.lastName.trim().length >= 2 &&
          formData.jobTitle !== "" &&
          formData.company.trim().length >= 2 &&
          formData.companyVat.trim().length > 0 &&
          formData.marketingConsent === true
        )
      default:
        return false
    }
  }

  const [transitionMessageIndex, setTransitionMessageIndex] = useState(0)
  useEffect(() => {
    if (!isCalculating || step !== 4) return
    const t = setInterval(() => {
      setTransitionMessageIndex((i) => Math.min(i + 1, TRANSITION_MESSAGES.length - 1))
    }, 1500)
    return () => clearInterval(t)
  }, [isCalculating, step])

  const handleNext = () => {
    if (!validateStep(step)) return
    if (step === 3) {
      setStep(4)
      setIsCalculating(true)
      setTransitionMessageIndex(0)
      setTimeout(() => {
        setIsCalculating(false)
        setStep(5)
      }, 6000)
    } else if (step < totalSteps && step !== 4) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (isCalculating) return
    if (step > 1) {
      if (step === 5) setStep(3)
      else setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(5)) return

    setIsSubmitting(true)
    setError(null)

    const roiResults = calculateROI(formData)
    setResults(roiResults)

    const surfaceArea = getSurfaceAreaFromChoices(formData.surfaceType, formData.surfaceRange)
    const annualElectricityBill = getAnnualBillFromBracket(
      formData.electricityBillBracket,
      formData.annualElectricityBillCustom
    )
    const grdValue = formData.grd && formData.grd !== "" ? formData.grd : "unknown"

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        company: formData.company,
        companyVat: formData.companyVat,
        surfaceType: formData.surfaceType,
        surfaceArea,
        province: formData.province,
        provinceFreeText: formData.provinceFreeText.trim() || undefined,
        grd: grdValue,
        annualElectricityBill,
        marketingConsent: formData.marketingConsent,
        estimatedROIYears: roiResults.estimatedROIYears,
        autoconsumptionRate: roiResults.autoconsumptionRate,
        estimatedSavings: roiResults.estimatedSavings,
        projectDetails: formData.projectDetails.trim() || undefined,
        fax_number: formData.fax_number ?? "",
        form_opened_at: formContactOpenedAtRef.current ?? undefined,
        mediaPartnerCode: getStoredMediaPartnerRef() ?? undefined,
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

  if (submitted && results) {
    const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "#"
    return (
      <section id="simulator" className="scroll-mt-24 overflow-hidden relative bg-[radial-gradient(circle_at_top,rgba(0,29,61,1)_0%,rgba(0,10,25,1)_100%)] py-16 sm:py-32 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1548618753-157945d81c4e?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        <div className="mx-auto max-w-4xl min-w-0 px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10 md:p-12 lg:p-16"
          >
            <div className="mb-8 flex items-center justify-center">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-amber-600 shadow-[0_0_30px_rgba(255,184,0,0.5)]"
              >
                <CheckCircle2 className="h-10 w-10 text-black" />
              </motion.div>
            </div>

            <h4 className="mb-4 text-center text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-5xl drop-shadow-lg">
              Votre étude d'éligibilité est confirmée !
            </h4>
            <p className="mb-10 text-center text-base font-medium text-neutral-300 sm:mb-12 sm:text-lg max-w-2xl mx-auto">
              Un expert partenaire d&apos;Aegis Solaire vous recontacte sous 24 à 48 h pour vous présenter le dossier technique (Certificats Verts, raccordement GRD et montage financier).
            </p>

            <div className="mb-10 grid min-w-0 grid-cols-2 gap-4 sm:mb-12 sm:grid-cols-4 sm:gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-accent/20 to-transparent p-4 text-center border border-accent/20 sm:p-5"
              >
                <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-accent drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.estimatedROIYears} format={(v) => v.toFixed(1)} /> <span className="text-xl font-bold">ans</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">TRI indicatif</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-white/10 to-transparent p-4 text-center border border-white/10 sm:p-5"
              >
                <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-white drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.autoconsumptionRate} /> <span className="text-xl font-bold">%</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">Autoconso.</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="flex flex-col items-center justify-center col-span-2 rounded-2xl bg-gradient-to-b from-white/10 to-transparent p-4 text-center border border-white/10 sm:col-span-1 sm:p-5"
              >
                <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-white drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.estimatedSavings} /> <span className="text-xl font-bold">€</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">Économies / an</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="flex flex-col items-center justify-center col-span-2 rounded-2xl bg-gradient-to-b from-white/10 to-transparent p-4 text-center border border-white/10 sm:col-span-1 sm:p-5"
              >
                <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-white drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.installedPower} /> <span className="text-xl font-bold">kWc</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">Puissance</p>
              </motion.div>
            </div>

            {calendlyUrl !== "#" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 text-center">
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[56px] w-full min-w-0 items-center justify-center rounded-xl bg-accent px-6 py-4 text-center font-bold text-black shadow-[0_0_20px_rgba(255,184,0,0.4)] transition-all hover:scale-105 hover:bg-accent/90 hover:shadow-[0_0_30px_rgba(255,184,0,0.6)] sm:w-auto sm:px-10"
                >
                  <span className="break-words">Bloquer mon appel stratégique de 10 min. (Prioritaire)</span>
                </a>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section
      id="simulator"
      className="scroll-mt-24 overflow-x-hidden bg-primary py-12 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      aria-labelledby="simulator-title"
    >
      <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center sm:mb-8">
          <h4 id="simulator-title" className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl md:text-4xl">
            Simulez votre projet solaire en Wallonie
          </h4>
          <p className="mt-3 text-base text-primary-foreground/80 sm:mt-4 sm:text-lg">
            Quelques questions pour une première lecture ROI — puis votre étude de faisabilité wallonne.
          </p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl bg-card p-4 shadow-2xl sm:rounded-2xl sm:p-6 md:p-8">
          {isCalculating && step === 4 && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16" role="status" aria-live="polite">
              <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div
                  className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent"
                  style={{ animationDuration: "1.2s" }}
                />
              </div>
              <p className="mt-8 text-center text-xl font-semibold text-foreground">
                Votre étude de faisabilité wallonne est prête.
              </p>
              <p className="mt-4 max-w-md text-center text-sm text-muted-foreground transition-opacity duration-300">
                {TRANSITION_MESSAGES[transitionMessageIndex]}
              </p>
            </div>
          )}

          {!isCalculating && (
            <>
              <div className="mb-8">
                <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                  <span>
                    Étape {step} sur {totalSteps}
                  </span>
                  <span>{Math.round((step / totalSteps) * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                  />
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-8">
                  <div>
                    <h4 className="text-xl font-semibold text-foreground sm:text-2xl">
                      Quel type de surface souhaitez-vous valoriser ?
                    </h4>
                    <RadioGroup
                      value={formData.surfaceType}
                      onValueChange={(v) => {
                        updateFormData("surfaceType", v)
                        updateFormData("surfaceRange", "")
                      }}
                      className="mt-4 gap-4"
                    >
                      <label
                        className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent/60 has-[[data-state=checked]]:bg-accent/5"
                      >
                        <RadioGroupItem value="toiture" id="st-toiture" />
                        <span className="flex flex-1 items-center gap-2 text-sm font-medium leading-snug text-foreground">
                          <Factory className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                          Toiture industrielle
                        </span>
                      </label>
                      <label
                        className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent/60 has-[[data-state=checked]]:bg-accent/5"
                      >
                        <RadioGroupItem value="parking" id="st-parking" />
                        <span className="flex flex-1 items-center gap-2 text-sm font-medium leading-snug text-foreground">
                          <Car className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                          Parking
                        </span>
                      </label>
                      <label
                        className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent/60 has-[[data-state=checked]]:bg-accent/5"
                      >
                        <RadioGroupItem value="terrain" id="st-terrain" />
                        <span className="flex flex-1 items-center gap-2 text-sm font-medium leading-snug text-foreground">
                          <Sprout className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                          Terrain au sol
                        </span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="surface-range" className="text-base font-semibold text-foreground">
                      Surface estimée ?
                    </Label>
                    <Select
                      value={formData.surfaceRange}
                      onValueChange={(v) => updateFormData("surfaceRange", v)}
                    >
                      <SelectTrigger id="surface-range" className="mt-2 h-11">
                        <SelectValue placeholder="Sélectionnez une fourchette" />
                      </SelectTrigger>
                      <SelectContent>
                        {surfaceRangeOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="province" className="text-base font-semibold text-foreground">
                      Région ou province du projet
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Toute la Belgique : Wallonie, Bruxelles, Flandre — ou précisez en champ libre si besoin.
                    </p>
                    <Select
                      value={formData.province}
                      onValueChange={(v) => updateFormData("province", v)}
                    >
                      <SelectTrigger id="province" className="mt-2 h-11 w-full min-w-0">
                        <SelectValue placeholder="Sélectionnez une région" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(24rem,70vh)]">
                        {BELGIUM_PROVINCE_GROUPS.map((group) => (
                          <SelectGroup key={group.heading}>
                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {group.heading}
                            </SelectLabel>
                            {group.items.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="provinceFreeText">
                      Précision{" "}
                      <span className="font-normal text-muted-foreground">
                        {formData.province === "autre" ? "(obligatoire si « Autre »)" : "(optionnelle)"}
                      </span>
                    </Label>
                    <Textarea
                      id="provinceFreeText"
                      rows={3}
                      maxLength={400}
                      placeholder="Ex. : commune, site industriel, plusieurs sites, pays limitrophe…"
                      value={formData.provinceFreeText}
                      onChange={(e) =>
                        updateFormData("provinceFreeText", e.target.value.slice(0, 400))
                      }
                      className={`mt-2 min-h-[80px] resize-y ${
                        formData.province === "autre" && formData.provinceFreeText.trim().length < 2
                          ? "border-destructive"
                          : ""
                      }`}
                      aria-invalid={formData.province === "autre" && formData.provinceFreeText.trim().length < 2}
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formData.provinceFreeText.length}/400 — utile pour affiner le raccordement (GRD) et la zone CWaPE.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="grd" className="text-base font-semibold text-foreground">
                      Connaissez-vous votre gestionnaire de réseau (GRD) ?{" "}
                      <span className="font-normal text-muted-foreground">(optionnel)</span>
                    </Label>
                    <Select value={formData.grd || undefined} onValueChange={(v) => updateFormData("grd", v)}>
                      <SelectTrigger id="grd" className="mt-2 h-11 w-full min-w-0">
                        <SelectValue placeholder="Sélectionnez ou laissez vide" />
                      </SelectTrigger>
                      <SelectContent>
                        {grdOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h4 className="text-xl font-semibold text-foreground sm:text-2xl">
                    Montant estimé de votre facture d&apos;électricité annuelle ?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Cette donnée sert à estimer votre profil de consommation et le taux d&apos;autoconsommation plausible par rapport à la production — pilier de tout ROI wallon (réseau, pas de compensation nette pour les nouvelles installations).
                  </p>
                  <div className="grid gap-3">
                    {factureBrackets.map((b) => (
                      <Button
                        key={b.value}
                        type="button"
                        variant={
                          formData.electricityBillBracket === b.value && !formData.annualElectricityBillCustom
                            ? "default"
                            : "outline"
                        }
                        className={`h-auto min-h-[48px] break-words py-4 text-left font-normal ${
                          formData.electricityBillBracket === b.value && !formData.annualElectricityBillCustom
                            ? "bg-accent text-accent-foreground hover:bg-accent/90"
                            : ""
                        }`}
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
                    <p className="mb-3 text-sm font-medium text-foreground">Ou montant exact (€ HT / an)</p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                      <div className="w-full flex-1 sm:max-w-[14rem]">
                        <Label htmlFor="annualElectricityBillCustom" className="sr-only">
                          Facture annuelle HT
                        </Label>
                        <Input
                          id="annualElectricityBillCustom"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="ex. 78 000"
                          value={formData.annualElectricityBillCustom ?? ""}
                          onChange={(e) =>
                            updateFormData("annualElectricityBillCustom", e.target.value.replace(/[^\d\s]/g, "").slice(0, 9))
                          }
                          className="h-11"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground sm:h-11 sm:flex sm:items-center">€ HT / an</span>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Minimum {MIN_ANNUAL_BILL.toLocaleString("fr-BE")} € HT/an pour une étude B2B.</p>
                  </div>
                </div>
              )}

              {step === 5 && (() => {
                const previewResults = calculateROI(formData)
                const provinceLabel = getProvinceDisplayLabel(
                  formData.province,
                  formData.provinceFreeText || undefined
                )

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

                    <div className="relative min-w-0 rounded-lg border border-accent/30 bg-accent/5 p-4 sm:p-6">
                      <div className="absolute inset-0 rounded-lg bg-card/80 backdrop-blur-sm" aria-hidden />
                      <div className="relative min-w-0">
                        <h4 className="text-base font-semibold text-foreground sm:text-lg">
                          Votre étude de faisabilité wallonne est prête.
                        </h4>
                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          TRI indicatif {previewResults.estimatedROIYears} ans, environ {previewResults.estimatedSavings.toLocaleString("fr-BE")}{" "}
                          € d&apos;économies annuelles (ordre de grandeur), province : {provinceLabel}. Indiquez vos coordonnées pour recevoir le dossier complet.
                        </p>
                      </div>
                    </div>

                    <p className="font-medium text-foreground">Où devons-nous envoyer votre étude ?</p>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input
                          id="firstName"
                          placeholder="Prénom"
                          value={formData.firstName ?? ""}
                          onChange={(e) => updateFormData("firstName", e.target.value)}
                          className={`mt-1.5 ${firstNameError ? "border-destructive" : ""}`}
                          aria-invalid={!!firstNameError}
                          aria-describedby={firstNameError ? "firstName-error" : undefined}
                        />
                        {firstNameError && (
                          <p id="firstName-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {firstNameError}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="lastName">Nom</Label>
                        <Input
                          id="lastName"
                          placeholder="Nom"
                          value={formData.lastName ?? ""}
                          onChange={(e) => updateFormData("lastName", e.target.value)}
                          className={`mt-1.5 ${lastNameError ? "border-destructive" : ""}`}
                          aria-invalid={!!lastNameError}
                          aria-describedby={lastNameError ? "lastName-error" : undefined}
                        />
                        {lastNameError && (
                          <p id="lastName-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {lastNameError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="jobTitle">Fonction</Label>
                      <Select value={formData.jobTitle ?? ""} onValueChange={(value) => updateFormData("jobTitle", value)}>
                        <SelectTrigger
                          id="jobTitle"
                          className={`mt-1.5 ${jobTitleError ? "border-destructive" : ""}`}
                          aria-invalid={!!jobTitleError}
                          aria-describedby={jobTitleError ? "jobTitle-error" : undefined}
                        >
                          <SelectValue placeholder="Sélectionnez votre fonction" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTitles.map((title) => (
                            <SelectItem key={title} value={title}>
                              {title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {jobTitleError && (
                        <p id="jobTitle-error" className="mt-1.5 text-xs text-destructive" role="alert">
                          {jobTitleError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="company">Nom de l&apos;entreprise</Label>
                      <Input
                        id="company"
                        placeholder="Dénomination sociale"
                        value={formData.company ?? ""}
                        onChange={(e) => updateFormData("company", e.target.value)}
                        className={`mt-1.5 ${companyError ? "border-destructive" : ""}`}
                        aria-invalid={!!companyError}
                        aria-describedby={companyError ? "company-error" : undefined}
                      />
                      {companyError && (
                        <p id="company-error" className="mt-1.5 text-xs text-destructive" role="alert">
                          {companyError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="companyVat">Numéro d&apos;entreprise (TVA BE)</Label>
                      <Input
                        id="companyVat"
                        type="text"
                        placeholder="BE0123456789"
                        autoComplete="off"
                        value={formData.companyVat ?? ""}
                        onChange={(e) => updateFormData("companyVat", e.target.value)}
                        className={`mt-1.5 ${vatError ? "border-destructive" : ""}`}
                        aria-invalid={!!vatError}
                        aria-describedby={vatError ? "companyVat-error" : undefined}
                      />
                      {vatError && (
                        <p id="companyVat-error" className="mt-1.5 text-xs text-destructive" role="alert">
                          {vatError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="prenom.nom@entreprise.be"
                        value={formData.email ?? ""}
                        onChange={(e) => updateFormData("email", e.target.value)}
                        className={`mt-1.5 ${emailError ? "border-destructive" : ""}`}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? "email-error" : undefined}
                      />
                      {emailError && (
                        <p id="email-error" className="mt-1.5 text-xs text-destructive" role="alert">
                          {emailError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Téléphone direct</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+32 475 12 34 56"
                        value={formData.phone ?? ""}
                        onChange={(e) => updateFormData("phone", e.target.value)}
                        className={`mt-1.5 ${phoneError ? "border-destructive" : ""}`}
                        aria-invalid={!!phoneError}
                        aria-describedby={phoneError ? "phone-error" : undefined}
                      />
                      {phoneError && (
                        <p id="phone-error" className="mt-1.5 text-xs text-destructive" role="alert">
                          {phoneError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="projectDetails">Précisions sur votre projet (Optionnel)</Label>
                      <Textarea
                        id="projectDetails"
                        name="projectDetails"
                        rows={4}
                        maxLength={2000}
                        placeholder="Ex : Rénovation de toiture à prévoir, besoin de bornes de recharge, contraintes techniques spécifiques..."
                        value={formData.projectDetails ?? ""}
                        onChange={(e) => updateFormData("projectDetails", e.target.value.slice(0, 2000))}
                        className="mt-1.5 min-h-[100px] border-input bg-transparent text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/50 md:text-sm"
                        aria-describedby="projectDetails-hint"
                      />
                      <p id="projectDetails-hint" className="mt-1.5 text-xs text-muted-foreground">
                        {formData.projectDetails.length}/2 000 caractères
                      </p>
                    </div>

                    {step === 5 && !formData.marketingConsent && (
                      <p className="text-xs text-destructive" role="alert">
                        Pour recevoir votre étude, veuillez accepter d&apos;être recontacté en cochant la case ci-dessous.
                      </p>
                    )}

                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                        step === 5 && !formData.marketingConsent ? "border-destructive" : "border-border"
                      }`}
                    >
                      <Checkbox
                        id="marketingConsent"
                        checked={formData.marketingConsent}
                        onCheckedChange={(checked) => updateFormData("marketingConsent", checked === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm font-normal leading-relaxed text-foreground">
                        J&apos;accepte d&apos;être recontacté par Aegis Solaire et par un installateur partenaire RESCERT
                        Photovoltaïque en Wallonie pour affiner mon étude de faisabilité et mon projet photovoltaïque.
                      </span>
                    </label>

                    <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Conformité RGPD</p>
                      <p className="mt-2">
                        Conformément au RGPD, vos données sont traitées sur la base de votre consentement. Vous pouvez exercer vos
                        droits (accès, rectification, effacement, limitation, opposition) et introduire une réclamation auprès
                        de l&apos;APD (Autorité de Protection des Données,{" "}
                        <a href="https://www.autoriteprotectiondonnees.be" className="underline" target="_blank" rel="noopener noreferrer">
                          www.autoriteprotectiondonnees.be
                        </a>
                        ). Conservation maximale 3 ans après dernier contact.
                      </p>
                      <p className="mt-2">
                        <a href="/politique-confidentialite" className="underline">
                          Politique de confidentialité
                        </a>{" "}
                        et{" "}
                        <a href="/politique-confidentialite#desinscription" className="underline">
                          désinscription
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                )
              })()}

              {error && (
                <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-between sm:gap-4">
                {step > 1 && step !== 4 ? (
                  <Button variant="outline" onClick={handleBack} className="min-h-[44px] w-full sm:order-first sm:w-auto">
                    <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                    Retour
                  </Button>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {step <= 3 && (
                  <Button
                    onClick={handleNext}
                    disabled={!validateStep(step)}
                    className="min-h-[44px] w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:ml-auto sm:w-auto"
                  >
                    Continuer
                    <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                )}

                {step === 5 && (
                  <Button
                    onClick={handleSubmit}
                    disabled={!validateStep(5) || isSubmitting}
                    className="min-h-[44px] w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:ml-auto sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Recevoir mon étude de faisabilité wallonne
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
