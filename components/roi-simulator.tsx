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
  Lock,
  AlertCircle,
  ShieldCheck,
  Zap,
} from "lucide-react"
import {
  getEmailError,
  getPhoneError,
  getVatError,
  isValidBelgianVat,
} from "@/lib/leads-validation"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { calculateB2BSolarROI } from "@/lib/solar-assumptions"
import { trackLeadConversion } from "@/components/analytics/ad-tracking"

type FormData = {
  surfaceType: string
  surfaceRange: string
  roofMaterial: string
  province: string
  provinceFreeText: string
  postalCode: string
  siteAddress: string
  ownershipStatus: string
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
  newsletterConsent: boolean
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
  roofMaterial: "",
  province: "",
  provinceFreeText: "",
  postalCode: "",
  siteAddress: "",
  ownershipStatus: "",
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
  newsletterConsent: false,
}

const surfaceRangeOptions = [
  { value: "lt_500", label: "Moins de 500 m²" },
  { value: "m500_1500", label: "De 500 à 1 500 m²" },
  { value: "gt_1500", label: "Plus de 1 500 m²" },
] as const

const roofMaterialOptions = [
  { value: "bac_acier", label: "Bac acier / profilé métallique" },
  { value: "plat_epdm", label: "Toiture plate (EPDM / Bitume)" },
  { value: "tuiles_ardoises", label: "Tuiles ou ardoises" },
  { value: "fibrociment_amiante", label: "Fibrociment / Éternit" },
  { value: "autre", label: "Autre / Ombrière de parking / Sol" },
] as const

const ownershipStatusOptions = [
  { value: "proprietaire_occupant", label: "Propriétaire occupant du site" },
  { value: "bail_emphyt_accord", label: "Bail emphytéotique ou accord propriétaire" },
  { value: "locataire_sans_accord", label: "Locataire (sans accord préalable)" },
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
  { value: "6_15k", label: "De 6 000 € à 15 000 € HT / an", representative: 10_000 },
  { value: "15_40k", label: "De 15 000 € à 40 000 € HT / an", representative: 25_000 },
  { value: "40_100k", label: "De 40 000 € à 100 000 € HT / an", representative: 65_000 },
  { value: "gt_100k", label: "Plus de 100 000 € HT / an", representative: 130_000 },
] as const

const jobTitles = ["Dirigeant", "DAF", "Resp. RSE ou Technique", "Autre"] as const

const TRANSITION_MESSAGES = [
  "Vérification du périmètre wallon et du potentiel capacitaire…",
  "Analyse des quotas Certificats Verts (CWaPE) éligibles…",
  "Vérification des nœuds d'injection GRD (Ores/Resa/Elia)…",
  "Modélisation du TRI indicatif et des flux PPA / Tiers-investissement…",
]

const MIN_ANNUAL_BILL = 3500

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
  return b ? b.representative : 25_000
}

function calculateROI(formData: FormData): ROIResults {
  const surfaceArea = getSurfaceAreaFromChoices(formData.surfaceType, formData.surfaceRange)
  const annualBill = getAnnualBillFromBracket(formData.electricityBillBracket, formData.annualElectricityBillCustom)

  const res = calculateB2BSolarROI({
    surfaceType: formData.surfaceType,
    surfaceRange: formData.surfaceRange,
    surfaceAreaM2: surfaceArea,
    annualElectricityBill: annualBill,
    grd: formData.grd,
  })

  return {
    estimatedROIYears: res.estimatedRoiYears,
    autoconsumptionRate: res.autoconsumptionRate,
    estimatedSavings: res.estimatedAnnualSavings,
    installedPower: res.installedPowerKwc,
    annualProduction: res.annualProductionKwh,
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

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const markTouched = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }))
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

  const showFirstNameError = (hasAttemptedSubmit || touchedFields.firstName) ? firstNameError : null
  const showLastNameError = (hasAttemptedSubmit || touchedFields.lastName) ? lastNameError : null
  const showJobTitleError = (hasAttemptedSubmit || touchedFields.jobTitle) ? jobTitleError : null
  const showCompanyError = (hasAttemptedSubmit || touchedFields.company) ? companyError : null
  const showVatError = (hasAttemptedSubmit || touchedFields.companyVat) ? vatError : null
  const showEmailError = (hasAttemptedSubmit || touchedFields.email) ? emailError : null
  const showPhoneError = (hasAttemptedSubmit || touchedFields.phone) ? phoneError : null
  const showConsentError = (hasAttemptedSubmit || touchedFields.marketingConsent) && !formData.marketingConsent

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return formData.surfaceType !== "" && formData.surfaceRange !== ""
      case 2:
        if (formData.province === "") return false
        if (formData.province === "autre" && formData.provinceFreeText.trim().length < 2) return false
        if (formData.postalCode.trim().length > 0 && !/^[1-9][0-9]{3}$/.test(formData.postalCode.trim())) return false
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
      if (step === 5) {
        setHasAttemptedSubmit(false)
        setStep(3)
      } else {
        setStep(step - 1)
      }
    }
  }

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true)
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
        sourceForm: "b2b_simulator",
        segment: "B2B",
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitle: formData.jobTitle,
        company: formData.company,
        companyVat: formData.companyVat,
        surfaceType: formData.surfaceType,
        surfaceArea,
        surfaceAreaM2: surfaceArea,
        roofMaterial: formData.roofMaterial || undefined,
        ownershipStatus: formData.ownershipStatus || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        siteAddress: formData.siteAddress.trim() || undefined,
        province: formData.province,
        provinceFreeText: formData.provinceFreeText.trim() || undefined,
        grd: grdValue,
        annualElectricityBill,
        annualBillEur: annualElectricityBill,
        estimatedPowerKwc: roiResults.installedPower,
        projectDriver: "reduire_facture",
        timeframe: "3_6mois",
        qualificationMetadata: {
          b2b_surface_type: formData.surfaceType,
          b2b_surface_range: formData.surfaceRange,
          b2b_roof_material: formData.roofMaterial || undefined,
          b2b_ownership_status: formData.ownershipStatus || undefined,
          b2b_postal_code: formData.postalCode.trim() || undefined,
          b2b_site_address: formData.siteAddress.trim() || undefined,
          b2b_grd: grdValue,
          b2b_bill_bracket: formData.electricityBillBracket,
          b2b_custom_bill: formData.annualElectricityBillCustom || undefined,
        },
        marketingConsent: formData.marketingConsent,
        newsletterConsent: formData.newsletterConsent,
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

      const resData = await response.json().catch(() => ({}))
      trackLeadConversion({ segment: "B2B", leadId: resData?.leadId, value: 120 })
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
      <section id="simulator" className="scroll-mt-24 overflow-hidden relative bg-primary py-16 sm:py-32 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1548618753-157945d81c4e?q=40&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        <div className="mx-auto max-w-4xl min-w-0 px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-xl sm:p-10 md:p-12 lg:p-16"
          >
            <div className="mb-8 flex items-center justify-center">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent shadow-xs"
              >
                <CheckCircle2 className="h-10 w-10 text-accent-foreground" />
              </motion.div>
            </div>

            <h2 className="mb-4 text-center text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-5xl drop-shadow-lg">
              Votre étude d'éligibilité est confirmée !
            </h2>
            <p className="mb-10 text-center text-base font-medium text-neutral-300 sm:mb-12 sm:text-lg max-w-2xl mx-auto">
              Un expert partenaire d&apos;Aegis Solaire vous recontacte sous 24 à 48 h pour vous présenter le dossier technique (Certificats Verts, raccordement GRD et montage financier).
            </p>

            <div className="mb-10 grid min-w-0 grid-cols-2 gap-4 sm:mb-12 sm:grid-cols-4 sm:gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500/20 to-transparent p-4 text-center border border-blue-400/30 sm:p-5"
              >
                <div className="font-mono tabular-nums flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-blue-400 drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.estimatedROIYears} format={(v) => v.toFixed(1)} /> <span className="text-xl font-bold">ans</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">TRI indicatif</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-white/10 to-transparent p-4 text-center border border-white/10 sm:p-5"
              >
                <div className="font-mono tabular-nums flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-white drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.autoconsumptionRate} /> <span className="text-xl font-bold">%</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">Autoconso.</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                className="flex flex-col items-center justify-center col-span-2 rounded-2xl bg-gradient-to-b from-white/10 to-transparent p-4 text-center border border-white/10 sm:col-span-1 sm:p-5"
              >
                <div className="font-mono tabular-nums flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-white drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.estimatedSavings} /> <span className="text-xl font-bold">€</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">Économies / an</p>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="flex flex-col items-center justify-center col-span-2 rounded-2xl bg-gradient-to-b from-white/10 to-transparent p-4 text-center border border-white/10 sm:col-span-1 sm:p-5"
              >
                <div className="font-mono tabular-nums flex items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-extrabold text-white drop-shadow sm:text-4xl">
                  <AnimatedCounter value={results.installedPower} /> <span className="text-xl font-bold">kWc</span>
                </div>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-300 sm:text-xs">Puissance</p>
              </motion.div>
            </div>

            {/* Note de transparence méthodologique */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-neutral-300">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                <p>
                  <strong className="text-white">Méthodologie Aegis Solaire :</strong> Cette estimation repose sur une approche prudente intégrant les tarifs des gestionnaires de réseau wallons (Ores, Resa, AIEG) et une dégradation linéaire constructeur garantie sur 25 ans. Un audit technique sur site par un ingénieur certifié <strong className="text-white">RESCERT</strong> permettra de figer votre offre financière définitive.
                </p>
              </div>
            </motion.div>

            {calendlyUrl !== "#" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 text-center">
                <a
                  href={calendlyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[56px] w-full min-w-0 items-center justify-center rounded-xl bg-accent px-6 py-4 text-center font-bold text-accent-foreground shadow-xs transition-all hover:bg-accent/90 sm:w-auto sm:px-10"
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
          <h2 id="simulator-title" className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl md:text-4xl">
            Simulez votre projet solaire en Wallonie
          </h2>
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

                  <div>
                    <Label htmlFor="roof-material" className="text-base font-semibold text-foreground">
                      Type de toiture ou de support <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                    </Label>
                    <Select
                      value={formData.roofMaterial || undefined}
                      onValueChange={(v) => updateFormData("roofMaterial", v)}
                    >
                      <SelectTrigger id="roof-material" className="mt-2 h-11">
                        <SelectValue placeholder="Sélectionnez le type de toiture" />
                      </SelectTrigger>
                      <SelectContent>
                        {roofMaterialOptions.map((o) => (
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="postalCode" className="text-sm font-semibold text-foreground">
                        Code postal du site (4 chiffres) <span className="text-accent">*</span>
                      </Label>
                      <Input
                        id="postalCode"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="ex: 4000, 5000, 6000..."
                        value={formData.postalCode}
                        onChange={(e) => updateFormData("postalCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className="mt-1.5 h-11"
                      />
                      {formData.postalCode.length > 0 && !/^[1-9][0-9]{3}$/.test(formData.postalCode) && (
                        <p className="mt-1 text-xs text-destructive">Code postal belge à 4 chiffres requis (ex : 4000).</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="siteAddress" className="text-sm font-semibold text-foreground">
                        Adresse ou zoning <span className="text-xs font-normal text-muted-foreground">(recommandé étude satellite)</span>
                      </Label>
                      <Input
                        id="siteAddress"
                        type="text"
                        placeholder="Rue, n° ou nom du zoning"
                        value={formData.siteAddress}
                        onChange={(e) => updateFormData("siteAddress", e.target.value)}
                        className="mt-1.5 h-11"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ownershipStatus" className="text-sm font-semibold text-foreground">
                      Statut d&apos;occupation du bâtiment <span className="text-xs font-normal text-muted-foreground">(optionnel)</span>
                    </Label>
                    <Select
                      value={formData.ownershipStatus || undefined}
                      onValueChange={(v) => updateFormData("ownershipStatus", v)}
                    >
                      <SelectTrigger id="ownershipStatus" className="mt-1.5 h-11 w-full min-w-0">
                        <SelectValue placeholder="Sélectionnez votre statut" />
                      </SelectTrigger>
                      <SelectContent>
                        {ownershipStatusOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
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

                    {/* BANDEAU DE PRÉ-CALCUL TECHNIQUE DÉBLOQUÉ (Teaser Before Gate) */}
                    <div className="rounded-xl border border-primary/20 bg-primary p-5 text-white shadow-md">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/15 pb-3">
                        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                          <Zap className="h-4 w-4" />
                          Pré-dimensionnement technique calculé ({provinceLabel} • Réseau {formData.grd || "Wallonie"})
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-400/30">
                          Étape 5 sur 5 • Synthèse financière prête
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-lg bg-white/10 p-3.5 backdrop-blur-xs">
                          <p className="text-xs text-neutral-300">Puissance installable estimée</p>
                          <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">{previewResults.installedPower.toLocaleString("fr-BE")} kWc</p>
                        </div>
                        <div className="rounded-lg bg-white/10 p-3.5 backdrop-blur-xs">
                          <p className="text-xs text-neutral-300">Production annuelle cible</p>
                          <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-blue-400">{previewResults.annualProduction.toLocaleString("fr-BE")} kWh/an</p>
                        </div>
                        <div className="relative overflow-hidden rounded-lg border border-blue-400/40 bg-white/5 p-3.5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-neutral-300">Gain net &amp; Certificats CWaPE</p>
                            <Lock className="h-3.5 w-3.5 text-blue-400" />
                          </div>
                          <p className="mt-1 select-none font-mono tabular-nums text-lg font-bold text-white/40 blur-[4px]">
                            {previewResults.estimatedSavings.toLocaleString("fr-BE")} € / an • ROI {previewResults.estimatedROIYears} ans
                          </p>
                          <span className="mt-1 inline-block text-[11px] font-medium text-blue-400">
                            Débloqué dès validation
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground sm:text-xl">
                        Où devons-nous afficher et envoyer votre étude de rentabilité B2B ?
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Accès immédiat à votre simulation d&apos;autoconsommation, aides Easy&apos;Green et déduction fiscale à 40%.
                      </p>
                    </div>

                    {/* Sélecteur rapide de fonction en 1 tap */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                        Votre fonction au sein de l&apos;entreprise
                      </Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {jobTitles.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              markTouched("jobTitle")
                              updateFormData("jobTitle", role)
                            }}
                            className={`h-11 rounded-lg border px-3 text-xs font-semibold transition-all ${
                              formData.jobTitle === role
                                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                      {showJobTitleError && (
                        <p id="jobTitle-error" className="mt-1.5 text-xs text-destructive" role="alert">
                          {showJobTitleError}
                        </p>
                      )}
                    </div>

                    {/* Société & Numéro de TVA Belge */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="company" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                          Raison sociale (Société) *
                        </Label>
                        <Input
                          id="company"
                          placeholder="Dénomination sociale"
                          value={formData.company ?? ""}
                          onChange={(e) => updateFormData("company", e.target.value)}
                          onBlur={() => markTouched("company")}
                          className={`h-12 w-full ${showCompanyError ? "border-destructive" : ""}`}
                          aria-invalid={!!showCompanyError}
                          aria-describedby={showCompanyError ? "company-error" : undefined}
                        />
                        {showCompanyError && (
                          <p id="company-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {showCompanyError}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <Label htmlFor="companyVat" className="block text-xs font-semibold text-neutral-700">
                            Numéro de TVA belge *
                          </Label>
                          {formData.companyVat && formData.companyVat.length > 3 && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                isValidBelgianVat(formData.companyVat) ? "text-emerald-600" : "text-amber-600"
                              }`}
                            >
                              {isValidBelgianVat(formData.companyVat) ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> TVA valide
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5" /> Format : BE 0XXX.XXX.XXX
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        <Input
                          id="companyVat"
                          type="text"
                          placeholder="BE 0123.456.789"
                          autoComplete="off"
                          value={formData.companyVat ?? ""}
                          onChange={(e) => updateFormData("companyVat", e.target.value)}
                          onBlur={() => markTouched("companyVat")}
                          className={`h-12 w-full ${
                            showVatError
                              ? "border-destructive"
                              : formData.companyVat && isValidBelgianVat(formData.companyVat)
                              ? "border-emerald-500 focus-visible:ring-emerald-400"
                              : ""
                          }`}
                          aria-invalid={!!showVatError}
                          aria-describedby={showVatError ? "companyVat-error" : undefined}
                        />
                        {showVatError && (
                          <p id="companyVat-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {showVatError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Prénom & Nom */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="firstName" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                          Prénom *
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="Prénom"
                          value={formData.firstName ?? ""}
                          onChange={(e) => updateFormData("firstName", e.target.value)}
                          onBlur={() => markTouched("firstName")}
                          className={`h-12 w-full ${showFirstNameError ? "border-destructive" : ""}`}
                          aria-invalid={!!showFirstNameError}
                          aria-describedby={showFirstNameError ? "firstName-error" : undefined}
                        />
                        {showFirstNameError && (
                          <p id="firstName-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {showFirstNameError}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                          Nom *
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Nom"
                          value={formData.lastName ?? ""}
                          onChange={(e) => updateFormData("lastName", e.target.value)}
                          onBlur={() => markTouched("lastName")}
                          className={`h-12 w-full ${showLastNameError ? "border-destructive" : ""}`}
                          aria-invalid={!!showLastNameError}
                          aria-describedby={showLastNameError ? "lastName-error" : undefined}
                        />
                        {showLastNameError && (
                          <p id="lastName-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {showLastNameError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Email & Téléphone */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                          E-mail professionnel *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          placeholder="prenom.nom@entreprise.be"
                          value={formData.email ?? ""}
                          onChange={(e) => updateFormData("email", e.target.value)}
                          onBlur={() => markTouched("email")}
                          className={`h-12 w-full ${showEmailError ? "border-destructive" : ""}`}
                          aria-invalid={!!showEmailError}
                          aria-describedby={showEmailError ? "email-error" : undefined}
                        />
                        {showEmailError && (
                          <p id="email-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {showEmailError}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                          Téléphone direct (+32 / +33) *
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="+32 475 12 34 56"
                          value={formData.phone ?? ""}
                          onChange={(e) => updateFormData("phone", e.target.value)}
                          onBlur={() => markTouched("phone")}
                          className={`h-12 w-full ${showPhoneError ? "border-destructive" : ""}`}
                          aria-invalid={!!showPhoneError}
                          aria-describedby={showPhoneError ? "phone-error" : undefined}
                        />
                        {showPhoneError && (
                          <p id="phone-error" className="mt-1.5 text-xs text-destructive" role="alert">
                            {showPhoneError}
                          </p>
                        )}
                      </div>
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

                    {showConsentError && (
                      <p className="text-xs text-destructive" role="alert">
                        Pour recevoir votre étude, veuillez accepter d&apos;être recontacté pour votre projet en cochant la case ci-dessous.
                      </p>
                    )}

                    <div className="space-y-3">
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                          showConsentError ? "border-destructive bg-destructive/5" : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <Checkbox
                          id="marketingConsent"
                          checked={formData.marketingConsent}
                          onCheckedChange={(checked) => {
                            markTouched("marketingConsent")
                            updateFormData("marketingConsent", checked === true)
                          }}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-normal leading-relaxed text-foreground">
                          <strong className="font-semibold text-foreground">Mise en relation & Étude (obligatoire) :</strong>{" "}
                          Je demande à être contacté par 1 installateur certifié RESCERT maximum membre du{" "}
                          <a href="/partenaires" className="underline font-medium hover:text-accent" target="_blank">
                            réseau de partenaires Aegis Solaire
                          </a>{" "}
                          afin d&apos;obtenir une étude de faisabilité chiffrée pour mon projet. Je suis informé(e) qu&apos;Aegis Solaire (exploitée par INIT42, BCE 1039.899.980) agit en qualité d&apos;intermédiaire rémunéré par les installateurs partenaires et je consens à la transmission de mes données à cette fin conformément à la{" "}
                          <a href="/politique-confidentialite" className="underline font-medium hover:text-accent" target="_blank">
                            Politique de Confidentialité
                          </a>.
                        </span>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
                        <Checkbox
                          id="newsletterConsent"
                          checked={formData.newsletterConsent}
                          onCheckedChange={(checked) => updateFormData("newsletterConsent", checked === true)}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-normal leading-relaxed text-muted-foreground">
                          <strong className="font-medium text-foreground">Actualités solaires (optionnel) :</strong>{" "}
                          J&apos;accepte de recevoir les veilles réglementaires (CWaPE, tarifs réseau, PEB 2026) et guides solaires d&apos;Aegis Solaire par e-mail.
                        </span>
                      </label>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground space-y-2">
                      <p className="font-medium text-foreground">Avertissement technique, réglementaire et fiscal</p>
                      <p>
                        Les résultats générés par ce simulateur reposent sur les données d&apos;irradiation moyennes PVGIS (930 kWh/kWc/an en Wallonie) et sur des hypothèses statistiques de profil de charge. Ils constituent une estimation préliminaire strictement indicative et non contractuelle. Ils ne remplacent ni une étude de stabilité de toiture, ni une étude de raccordement auprès de votre Gestionnaire de Réseau de Distribution (ORES, RESA, AIEG, REW, Fluvius), ni l&apos;avis d&apos;un expert-comptable concernant votre éligibilité effective à la Déduction pour Investissement (DPI).
                      </p>
                      <p className="pt-1 border-t border-border/60">
                        Conformément au RGPD, vos données sont traitées pour l&apos;exécution de votre demande de mise en relation. Vous pouvez exercer vos droits d&apos;accès, rectification ou suppression à tout moment auprès de{" "}
                        <a href="mailto:contact@aegissolaire.com" className="underline">contact@aegissolaire.com</a> ou auprès de l&apos;APD (
                        <a href="https://www.autoriteprotectiondonnees.be" className="underline" target="_blank" rel="noopener noreferrer">
                          Autorité de Protection des Données
                        </a>).
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
                    variant="accent"
                    size="xl"
                    disabled={!validateStep(5) || isSubmitting}
                    className="w-full sm:ml-auto sm:w-auto font-bold shadow-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        Afficher mes résultats financiers complets
                        <ArrowRight className="ml-2 h-5 w-5" />
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
