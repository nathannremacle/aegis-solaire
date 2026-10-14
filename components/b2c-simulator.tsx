"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { BELGIUM_PROVINCE_GROUPS } from "@/lib/belgium-regions"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { calculateB2CSolarROI } from "@/lib/solar-assumptions"
import { trackLeadConversion } from "@/components/analytics/ad-tracking"
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sun,
  BatteryFull,
  Car,
  Compass,
  Home,
  Users,
  Zap,
  Leaf,
} from "lucide-react"

/* ═══════════════════════════ Types ═══════════════════════════ */

type B2CFormData = {
  ownershipStatus: string
  roofType: string
  orientation: string
  roofSize: string
  annualBillBracket: string
  annualBillCustom: string
  householdSize: string
  evInterest: string
  batteryInterest: string
  province: string
  postalCode: string
  siteAddress: string
  projectDetails: string
  firstName: string
  lastName: string
  email: string
  phone: string
  fax_number?: string
  marketingConsent: boolean
  newsletterConsent: boolean
}

type B2CResults = {
  installedPower: number
  annualProduction: number
  autoconsumptionRate: number
  annualSavings: number
  roiYears: number
  co2Avoided: number
  monthlyGain: number
  gain25Years: number
}

/* ═══════════════════════════ Constants ═══════════════════════ */

const INITIAL: B2CFormData = {
  ownershipStatus: "proprietaire_occupant",
  roofType: "",
  orientation: "",
  roofSize: "",
  annualBillBracket: "",
  annualBillCustom: "",
  householdSize: "",
  evInterest: "",
  batteryInterest: "",
  province: "",
  postalCode: "",
  siteAddress: "",
  projectDetails: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  fax_number: "",
  marketingConsent: false,
  newsletterConsent: false,
}

const OWNERSHIP_OPTIONS = [
  { id: "proprietaire_occupant", label: "Propriétaire occupant" },
  { id: "copropriete", label: "Copropriétaire" },
  { id: "locataire_sans_accord", label: "Locataire" },
]

function RoofTilesIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Pignon toiture en pente */}
      <path d="M2 12L12 3l10 9" />
      <path d="M4 11v8.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V11" />
      {/* Ondulations de tuiles galbées caractéristiques */}
      <path d="M6.5 13.5c1.4-1.3 3-1.3 4.5 0 1.4-1.3 3-1.3 4.5 0 1-1 2-1 2.5 0" />
      <path d="M8.5 9.5c1.1-1.1 2.4-1.1 3.5 0 1.1-1.1 2.4-1.1 3.5 0" />
      <line x1="12" y1="3" x2="12" y2="5.5" />
    </svg>
  )
}

function RoofSlatesIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Pignon toiture en pente */}
      <path d="M2 12L12 3l10 9" />
      <path d="M4 11v8.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V11" />
      {/* Rangs d'ardoises plates avec joints décalés en quinconce */}
      <line x1="6" y1="13.5" x2="18" y2="13.5" />
      <line x1="8.5" y1="9.5" x2="15.5" y2="9.5" />
      <line x1="12" y1="3" x2="12" y2="9.5" />
      <line x1="9.5" y1="9.5" x2="9.5" y2="13.5" />
      <line x1="14.5" y1="9.5" x2="14.5" y2="13.5" />
      <line x1="7" y1="13.5" x2="7" y2="17" />
      <line x1="12" y1="13.5" x2="12" y2="17" />
      <line x1="17" y1="13.5" x2="17" y2="17" />
    </svg>
  )
}

function RoofFlatIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Acrotère / parapet horizontal supérieur d'une toiture terrasse */}
      <line x1="3" y1="4.5" x2="21" y2="4.5" />
      <line x1="5" y1="4.5" x2="5" y2="8" />
      <line x1="12" y1="4.5" x2="12" y2="8" />
      <line x1="19" y1="4.5" x2="19" y2="8" />
      {/* Dalle / toiture plate horizontale proéminente */}
      <line x1="2" y1="8" x2="22" y2="8" />
      <line x1="2" y1="10.5" x2="22" y2="10.5" />
      {/* Corps de la maison cubique contemporaine */}
      <rect x="4" y="10.5" width="16" height="9.5" rx="0.5" />
      <line x1="12" y1="14" x2="12" y2="20" />
      <rect x="8" y="14" width="8" height="6" />
    </svg>
  )
}

function RoofZincIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Pignon toiture en pente */}
      <path d="M2 12L12 3l10 9" />
      <path d="M4 11v8.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V11" />
      {/* Joints debout métalliques continus verticaux du faîtage à l'égout */}
      <line x1="6.5" y1="9.5" x2="6.5" y2="19.5" />
      <line x1="9.5" y1="6.5" x2="9.5" y2="19.5" />
      <line x1="12" y1="3" x2="12" y2="19.5" />
      <line x1="14.5" y1="6.5" x2="14.5" y2="19.5" />
      <line x1="17.5" y1="9.5" x2="17.5" y2="19.5" />
    </svg>
  )
}

const ROOF_TYPES = [
  { id: "tuiles", label: "Tuiles", icon: RoofTilesIcon },
  { id: "ardoises", label: "Ardoises", icon: RoofSlatesIcon },
  { id: "plat", label: "Toit plat", icon: RoofFlatIcon },
  { id: "zinc", label: "Zinc / Autre", icon: RoofZincIcon },
]

const ORIENTATIONS = [
  { id: "sud", label: "Plein Sud", factor: 1.0 },
  { id: "sud_est_ouest", label: "Sud-Est / Sud-Ouest", factor: 0.93 },
  { id: "est_ouest", label: "Est / Ouest", factor: 0.82 },
  { id: "unknown", label: "Je ne sais pas", factor: 0.9 },
]

const ROOF_SIZES = [
  { id: "small", label: "Petit (< 30 m²)", kWc: 3 },
  { id: "medium", label: "Moyen (30 – 60 m²)", kWc: 6 },
  { id: "large", label: "Grand (60 – 100 m²)", kWc: 9 },
  { id: "xlarge", label: "Très grand (> 100 m²)", kWc: 12 },
]

const BILL_BRACKETS = [
  { id: "lt_1200", label: "Moins de 1 200 € / an", sublabel: "≈ 2 500 à 3 500 kWh", value: 1000 },
  { id: "1200_2400", label: "1 200 € – 2 400 € / an", sublabel: "≈ 3 500 à 6 000 kWh", value: 1800 },
  { id: "2400_4000", label: "2 400 € – 4 000 € / an", sublabel: "≈ 6 000 à 10 000 kWh", value: 3200 },
  { id: "gt_4000", label: "Plus de 4 000 € / an", sublabel: "> 10 000 kWh", value: 5000 },
]

const HOUSEHOLD_SIZES = [
  { id: "1_2", label: "1 – 2 personnes", icon: Users },
  { id: "3_4", label: "3 – 4 personnes", icon: Users },
  { id: "5_plus", label: "5 personnes ou +", icon: Users },
]

const EV_OPTIONS = [
  { id: "oui", label: "Oui, j'en ai un" },
  { id: "prevu", label: "Prévu prochainement" },
  { id: "non", label: "Non" },
]

const BATTERY_OPTIONS = [
  { id: "oui", label: "Oui, c'est indispensable" },
  { id: "hesite", label: "Peut-être, à évaluer" },
  { id: "non", label: "Non, uniquement panneaux" },
]

const TRANSITION_MESSAGES = [
  "Analyse du gisement solaire régional wallon (930 kWh/kWc)…",
  "Dimensionnement de la puissance optimale pour votre toiture…",
  "Modélisation de l'autoconsommation et des flux d'injection…",
  "Vérification du compteur bidirectionnel Ores / Resa…",
]

const TOTAL_STEPS = 6

/* ═══════════════════════════ Calculation ═════════════════════ */

function calculateB2CROI(d: B2CFormData): B2CResults {
  const roof = ROOF_SIZES.find((r) => r.id === d.roofSize)
  const orient = ORIENTATIONS.find((o) => o.id === d.orientation)
  const bill = d.annualBillCustom
    ? Math.max(parseInt(d.annualBillCustom.replace(/\s/g, ""), 10) || 0, 500)
    : BILL_BRACKETS.find((b) => b.id === d.annualBillBracket)?.value ?? 1800

  const res = calculateB2CSolarROI({
    roofKwc: roof?.kWc ?? 6,
    orientationFactor: orient?.factor ?? 0.9,
    annualBill: bill,
    hasBattery: (d.batteryInterest as "oui" | "hesite" | "non") || "non",
    hasEv: (d.evInterest as "oui" | "prevu" | "non") || "non",
  })

  return {
    installedPower: res.installedPowerKwc,
    annualProduction: res.annualProductionKwh,
    autoconsumptionRate: res.autoconsumptionRate,
    annualSavings: res.annualSavings,
    roiYears: res.roiYears,
    co2Avoided: res.co2AvoidedTons,
    monthlyGain: res.monthlyGain,
    gain25Years: res.gain25Years,
  }
}

/* ═══════════════════════════ Component ═══════════════════════ */

export function B2CSimulator() {
  const [step, setStep] = useState(1)
  const [fd, setFd] = useState<B2CFormData>(INITIAL)
  const [results, setResults] = useState<B2CResults | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msgIdx, setMsgIdx] = useState(0)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const openedAt = useRef(new Date().toISOString())

  const up = (k: keyof B2CFormData, v: string | boolean) =>
    setFd((p) => ({ ...p, [k]: v }))

  const markTouched = (f: string) => setTouched((p) => ({ ...p, [f]: true }))

  /* ── Validation per step ── */
  const valid = (s: number) => {
    switch (s) {
      case 1:
        return fd.ownershipStatus !== "" && fd.roofType !== "" && fd.orientation !== "" && fd.roofSize !== ""
      case 2:
        return (
          (fd.annualBillBracket !== "" || (fd.annualBillCustom !== "" && parseInt(fd.annualBillCustom.replace(/\s/g, ""), 10) >= 500)) &&
          fd.householdSize !== ""
        )
      case 3:
        return fd.evInterest !== "" && fd.batteryInterest !== "" && fd.province !== ""
      case 4:
        return true
      case 5:
        return true
      case 6:
        return (
          fd.firstName.trim().length >= 2 &&
          fd.lastName.trim().length >= 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email) &&
          fd.phone.trim().replace(/[\s.-]/g, "").length >= 8 &&
          /^[1-9][0-9]{3}$/.test(fd.postalCode.trim()) &&
          fd.marketingConsent
        )
      default:
        return false
    }
  }

  // Error helpers for Step 6
  const firstNameError = fd.firstName.trim().length < 2 ? "Prénom requis (2 caractères minimum)" : null
  const lastNameError = fd.lastName.trim().length < 2 ? "Nom requis (2 caractères minimum)" : null
  const emailError = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email) ? "Format d'adresse e-mail invalide" : null
  const phoneError = fd.phone.trim().replace(/[\s.-]/g, "").length < 8 ? "Numéro de téléphone requis (au moins 8 chiffres)" : null
  const postalCodeError = !/^[1-9][0-9]{3}$/.test(fd.postalCode.trim()) ? "Code postal belge à 4 chiffres requis (ex: 4000)" : null
  const consentError = !fd.marketingConsent ? "Vous devez accepter d'être recontacté pour recevoir votre étude" : null

  const showFirstNameError = (hasAttemptedSubmit || touched.firstName) ? firstNameError : null
  const showLastNameError = (hasAttemptedSubmit || touched.lastName) ? lastNameError : null
  const showEmailError = (hasAttemptedSubmit || touched.email) ? emailError : null
  const showPhoneError = (hasAttemptedSubmit || touched.phone) ? phoneError : null
  const showPostalCodeError = (hasAttemptedSubmit || touched.postalCode) ? postalCodeError : null
  const showConsentError = (hasAttemptedSubmit || touched.marketingConsent) ? consentError : null

  /* ── Loading messages cycle ── */
  useEffect(() => {
    if (!isCalculating) return
    const t = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, TRANSITION_MESSAGES.length - 1))
    }, 1500)
    return () => clearInterval(t)
  }, [isCalculating])

  /* ── Navigation ── */
  const next = () => {
    if (!valid(step)) return
    if (step === 4) {
      setStep(5)
      setIsCalculating(true)
      setMsgIdx(0)
      setTimeout(() => {
        setResults(calculateB2CROI(fd))
        setIsCalculating(false)
        setStep(6)
      }, 6000)
    } else if (step < TOTAL_STEPS && step !== 5) {
      setStep(step + 1)
    }
  }

  const back = () => {
    if (isCalculating) return
    if (step === 6) setStep(4)
    else if (step > 1) setStep(step - 1)
  }

  /* ── Submit ── */
  const submit = async () => {
    setHasAttemptedSubmit(true)
    if (!valid(6) || !results) return
    setIsSubmitting(true)
    setError(null)

    try {
      const roofKwc = ROOF_SIZES.find((r) => r.id === fd.roofSize)?.kWc ?? 6
      const surfaceArea = Math.round(roofKwc * 6)
      const annualBill = fd.annualBillCustom
        ? Math.max(parseInt(fd.annualBillCustom.replace(/\s/g, ""), 10) || 500, 500)
        : BILL_BRACKETS.find((b) => b.id === fd.annualBillBracket)?.value ?? 1800

      const mappedRoofMaterial =
        fd.roofType === "tuiles"
          ? "tuiles"
          : fd.roofType === "ardoises"
          ? "ardoises"
          : fd.roofType === "plat"
          ? "plat_epdm"
          : "zinc_autre"

      const mappedOwnership =
        fd.ownershipStatus === "copropriete"
          ? "co_ownership"
          : fd.ownershipStatus === "locataire_sans_accord"
          ? "tenant_unauthorized"
          : "owner"

      const payload = {
        sourceForm: "b2c_simulator",
        segment: "B2C",
        firstName: fd.firstName,
        lastName: fd.lastName,
        email: fd.email,
        phone: fd.phone,
        surfaceType: "toiture" as const,
        surfaceArea,
        surfaceAreaM2: surfaceArea,
        roofMaterial: mappedRoofMaterial,
        ownershipStatus: mappedOwnership,
        postalCode: fd.postalCode.trim(),
        siteAddress: fd.siteAddress.trim() || undefined,
        province: fd.province,
        annualElectricityBill: annualBill,
        annualBillEur: annualBill,
        estimatedPowerKwc: roofKwc,
        projectDriver: "reduire_facture",
        timeframe: "immediat_3mois",
        qualificationMetadata: {
          b2c_ownership_status: fd.ownershipStatus,
          b2c_roof_type: fd.roofType,
          b2c_roof_size: fd.roofSize,
          b2c_orientation: fd.orientation,
          b2c_household_size: fd.householdSize,
          b2c_ev_interest: fd.evInterest,
          b2c_battery_interest: fd.batteryInterest,
          b2c_postal_code: fd.postalCode.trim(),
          b2c_site_address: fd.siteAddress.trim() || undefined,
        },
        projectDetails: [
          `Statut: ${fd.ownershipStatus}`,
          `Toiture: ${fd.roofType}`,
          `Orientation: ${fd.orientation}`,
          `Taille toiture: ${fd.roofSize} (~${roofKwc} kWc)`,
          `Ménage: ${fd.householdSize}`,
          `VE: ${fd.evInterest}`,
          `Batterie: ${fd.batteryInterest}`,
          fd.projectDetails.trim() ? `Notes: ${fd.projectDetails.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        marketingConsent: fd.marketingConsent,
        newsletterConsent: fd.newsletterConsent,
        estimatedROIYears: results.roiYears,
        autoconsumptionRate: results.autoconsumptionRate,
        estimatedSavings: results.annualSavings,
        fax_number: fd.fax_number ?? "",
        form_opened_at: openedAt.current,
        mediaPartnerCode: getStoredMediaPartnerRef() ?? undefined,
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'envoi")
      }
      const resData = await res.json().catch(() => ({}))
      trackLeadConversion({ segment: "B2C", leadId: resData?.leadId, value: 35 })
      setSubmitted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const anim = { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } }

  /* ═══════════ Success state ═══════════ */
  if (submitted && results) {
    return (
      <div
        id="b2c-simulator"
        className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
      >
        <div className="p-6 sm:p-10">
          <div className="mb-6 flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15"
            >
              <CheckCircle2 className="h-8 w-8 text-accent" />
            </motion.div>
          </div>
          <h3 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
            Votre étude est confirmée !
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground leading-relaxed">
            Un e-mail récapitulatif complet vient de vous être envoyé à <strong>{fd.email}</strong>. Jusqu&apos;à 3 installateurs certifiés RESCERT de votre région vous recontacteront avec vos devis comparatifs sans engagement.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {[
              { v: results.roiYears, u: "ans", l: "Amortissement" },
              { v: results.annualSavings, u: "€/an", l: "Économies" },
              { v: results.autoconsumptionRate, u: "%", l: "Autoconsommation" },
              { v: results.gain25Years, u: "€", l: "Gain sur 25 ans" },
            ].map((d, i) => (
              <motion.div
                key={d.l}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex flex-col items-center rounded-2xl border border-accent/20 bg-accent/5 p-4 text-center"
              >
                <span className="text-2xl font-extrabold text-accent sm:text-3xl">
                  <AnimatedCounter value={d.v} format={(n) => d.u === "ans" ? n.toFixed(1) : n.toLocaleString("fr-BE")} />
                </span>
                <span className="text-xs font-medium text-muted-foreground">{d.u}</span>
                <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-foreground/70">
                  {d.l}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ═══════════ Main form ═══════════ */
  const displayStep = step <= 4 ? step : step === 5 ? 5 : 5
  const displayTotal = 5

  return (
    <div
      id="b2c-simulator"
      className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
    >
      {/* Progress */}
      <div className="h-1.5 w-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-accent"
          animate={{ width: `${(Math.min(step, 5) / displayTotal) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="p-5 sm:p-8 md:p-10">
        {/* ── Loading screen (step 5) ── */}
        {isCalculating && step === 5 && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16" role="status">
            <div className="relative h-16 w-16 sm:h-20 sm:w-20">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div
                className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent"
                style={{ animationDuration: "1.2s" }}
              />
            </div>
            <p className="mt-6 text-center text-lg font-semibold text-foreground sm:text-xl">
              Calcul de votre étude en cours…
            </p>
            <p className="mt-3 max-w-md text-center text-sm text-muted-foreground transition-opacity duration-300">
              {TRANSITION_MESSAGES[msgIdx]}
            </p>
          </div>
        )}

        {/* ── Form steps ── */}
        {!isCalculating && (
          <>
            {step !== 5 && (
              <div className="mb-6">
                <div className="mb-2 flex justify-between text-sm text-muted-foreground">
                  <span>Étape {Math.min(step, 5)} sur {displayTotal}</span>
                  <span>{Math.round((Math.min(step, 5) / displayTotal) * 100)} %</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${(Math.min(step, 5) / displayTotal) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ── STEP 1 : Toiture ── */}
              {step === 1 && (
                <motion.div key="s1" {...anim} className="space-y-7">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                      Parlons de votre toiture
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ces informations nous permettent de dimensionner votre installation.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      Statut d&apos;occupation du logement
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {OWNERSHIP_OPTIONS.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => up("ownershipStatus", o.id)}
                          className={`rounded-xl border-2 p-3 text-center text-sm font-semibold transition-all ${
                            fd.ownershipStatus === o.id
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      Type de toiture
                    </Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {ROOF_TYPES.map((r) => {
                        const Icon = r.icon
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => up("roofType", r.id)}
                            className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 p-4 transition-all ${
                              fd.roofType === r.id
                                ? "border-accent bg-accent/10 text-accent shadow-sm"
                                : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <div
                              className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                                fd.roofType === r.id
                                  ? "bg-accent/20 text-accent"
                                  : "bg-muted text-foreground/70"
                              }`}
                            >
                              <Icon className="h-6 w-6" aria-hidden="true" />
                            </div>
                            <span className="text-sm font-semibold">{r.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      <Compass className="mr-1.5 inline h-4 w-4 text-accent" />
                      Orientation principale
                    </Label>
                    <RadioGroup
                      value={fd.orientation}
                      onValueChange={(v) => up("orientation", v)}
                      className="gap-3"
                    >
                      {ORIENTATIONS.map((o) => (
                        <label
                          key={o.id}
                          className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/5"
                        >
                          <RadioGroupItem value={o.id} />
                          <span className="text-sm font-medium text-foreground">{o.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      Surface de toiture exploitable
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {ROOF_SIZES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => up("roofSize", s.id)}
                          className={`rounded-xl border-2 p-3.5 text-left text-sm font-medium transition-all ${
                            fd.roofSize === s.id
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {s.label}
                          <span className="mt-0.5 block text-xs text-muted-foreground">≈ {s.kWc} kWc</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 2 : Consommation ── */}
              {step === 2 && (
                <motion.div key="s2" {...anim} className="space-y-7">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                      Votre consommation d&apos;énergie
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pour estimer précisément vos économies et votre taux d&apos;autoconsommation.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      <Zap className="mr-1.5 inline h-4 w-4 text-accent" />
                      Facture d&apos;électricité annuelle
                    </Label>
                    <div className="grid gap-2.5">
                      {BILL_BRACKETS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            up("annualBillBracket", b.id)
                            up("annualBillCustom", "")
                          }}
                          className={`rounded-xl border-2 p-3.5 text-left text-sm font-medium transition-all flex items-center justify-between ${
                            fd.annualBillBracket === b.id && !fd.annualBillCustom
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className="font-semibold">{b.label}</span>
                          <span className="text-xs text-muted-foreground font-normal">{b.sublabel}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-end gap-3 border-t border-border pt-4">
                      <div className="flex-1">
                        <Label htmlFor="b2c-bill-custom" className="text-sm text-muted-foreground">
                          Ou montant exact
                        </Label>
                        <Input
                          id="b2c-bill-custom"
                          type="text"
                          inputMode="numeric"
                          placeholder="ex. 2 800"
                          value={fd.annualBillCustom}
                          onChange={(e) => {
                            up("annualBillCustom", e.target.value.replace(/[^\d\s]/g, "").slice(0, 7))
                            up("annualBillBracket", "")
                          }}
                          className="mt-1.5 h-11"
                        />
                      </div>
                      <span className="pb-2.5 text-sm text-muted-foreground">€ / an</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      <Users className="mr-1.5 inline h-4 w-4 text-accent" />
                      Taille du ménage
                    </Label>
                    <RadioGroup
                      value={fd.householdSize}
                      onValueChange={(v) => up("householdSize", v)}
                      className="gap-3"
                    >
                      {HOUSEHOLD_SIZES.map((h) => (
                        <label
                          key={h.id}
                          className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/5"
                        >
                          <RadioGroupItem value={h.id} />
                          <span className="text-sm font-medium text-foreground">{h.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3 : Équipements & Localisation ── */}
              {step === 3 && (
                <motion.div key="s3" {...anim} className="space-y-7">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                      Équipements &amp; Localisation
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      <Car className="mr-1.5 inline h-4 w-4 text-accent" />
                      Véhicule électrique ?
                    </Label>
                    <RadioGroup
                      value={fd.evInterest}
                      onValueChange={(v) => up("evInterest", v)}
                      className="gap-3"
                    >
                      {EV_OPTIONS.map((o) => (
                        <label
                          key={o.id}
                          className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/5"
                        >
                          <RadioGroupItem value={o.id} />
                          <span className="text-sm font-medium text-foreground">{o.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      <BatteryFull className="mr-1.5 inline h-4 w-4 text-accent" />
                      Batterie domestique ?
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Maximise votre autonomie et protège des tarifs dynamiques.
                    </p>
                    <RadioGroup
                      value={fd.batteryInterest}
                      onValueChange={(v) => up("batteryInterest", v)}
                      className="gap-3"
                    >
                      {BATTERY_OPTIONS.map((o) => (
                        <label
                          key={o.id}
                          className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent/5"
                        >
                          <RadioGroupItem value={o.id} />
                          <span className="text-sm font-medium text-foreground">{o.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-foreground">
                      <Home className="mr-1.5 inline h-4 w-4 text-accent" />
                      Province d&apos;installation
                    </Label>
                    <Select
                      value={fd.province}
                      onValueChange={(v) => up("province", v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Sélectionnez votre province" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(24rem,70vh)]">
                        {BELGIUM_PROVINCE_GROUPS.map((g) => (
                          <SelectGroup key={g.heading}>
                            <SelectLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              {g.heading}
                            </SelectLabel>
                            {g.items.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 4 : Description libre ── */}
              {step === 4 && (
                <motion.div key="s4" {...anim} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground sm:text-2xl">
                      Décrivez votre projet
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Situation particulière, contraintes, questions — tout ce qui nous
                      aidera à affiner votre étude personnalisée.
                    </p>
                  </div>

                  <Textarea
                    rows={5}
                    maxLength={2000}
                    placeholder="Ex. : toiture récemment rénovée, ombrage partiel d'un arbre côté sud, intéressé par une borne de recharge, budget maximal de 15 000 €, copropriété…"
                    value={fd.projectDetails}
                    onChange={(e) => up("projectDetails", e.target.value.slice(0, 2000))}
                    className="min-h-[120px] resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    {fd.projectDetails.length} / 2 000 — optionnel mais très utile pour personnaliser votre dossier.
                  </p>
                </motion.div>
              )}

              {/* ── STEP 6 : Résultats + Coordonnées ── */}
              {step === 6 && results && (
                <motion.div key="s6" {...anim} className="space-y-6">
                  {/* Results preview */}
                  <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 sm:p-6">
                    <h3 className="text-lg font-bold text-foreground sm:text-xl">
                      <Sun className="mr-2 inline h-5 w-5 text-accent" />
                      Votre estimation personnalisée
                    </h3>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { v: results.roiYears, u: "ans", l: "Amortissement", fmt: (n: number) => n.toFixed(1) },
                        { v: results.monthlyGain, u: "€/mois", l: "Économie mensuelle", fmt: (n: number) => n.toLocaleString("fr-BE") },
                        { v: results.annualSavings, u: "€/an", l: "Économie annuelle", fmt: (n: number) => n.toLocaleString("fr-BE") },
                        { v: results.autoconsumptionRate, u: "%", l: "Autoconsommation", fmt: (n: number) => String(n) },
                        { v: results.installedPower, u: "kWc", l: "Puissance", fmt: (n: number) => String(n) },
                        { v: results.co2Avoided, u: "t CO₂/an", l: "CO₂ évité", fmt: (n: number) => n.toFixed(1) },
                      ].map((d) => (
                        <div key={d.l} className="text-center">
                          <p className="text-xl font-extrabold text-accent sm:text-2xl">
                            <AnimatedCounter value={d.v} format={d.fmt} />
                          </p>
                          <p className="text-xs text-muted-foreground">{d.u}</p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground/60">
                            {d.l}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-3">
                      <Leaf className="h-5 w-5 shrink-0 text-accent" />
                      <p className="text-sm text-foreground">
                        Sur 25 ans, votre installation pourrait vous faire économiser{" "}
                        <strong className="text-accent">
                          {results.gain25Years.toLocaleString("fr-BE")} €
                        </strong>
                        .
                      </p>
                    </div>
                  </div>

                  {/* Contact form */}
                  <p className="font-medium text-foreground">
                    Recevez votre dossier complet gratuitement :
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="b2c-fn">Prénom</Label>
                      <Input
                        id="b2c-fn"
                        placeholder="Jean"
                        value={fd.firstName}
                        onBlur={() => markTouched("firstName")}
                        onChange={(e) => up("firstName", e.target.value)}
                        className={`h-12 ${showFirstNameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {showFirstNameError && (
                        <p className="text-xs text-destructive">{showFirstNameError}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="b2c-ln">Nom</Label>
                      <Input
                        id="b2c-ln"
                        placeholder="Dupont"
                        value={fd.lastName}
                        onBlur={() => markTouched("lastName")}
                        onChange={(e) => up("lastName", e.target.value)}
                        className={`h-12 ${showLastNameError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {showLastNameError && (
                        <p className="text-xs text-destructive">{showLastNameError}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="b2c-email">E-mail</Label>
                    <Input
                      id="b2c-email"
                      type="email"
                      placeholder="jean.dupont@email.be"
                      value={fd.email}
                      onBlur={() => markTouched("email")}
                      onChange={(e) => up("email", e.target.value)}
                      className={`h-12 ${showEmailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {showEmailError && (
                      <p className="text-xs text-destructive">{showEmailError}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="b2c-phone">Téléphone</Label>
                    <Input
                      id="b2c-phone"
                      type="tel"
                      placeholder="+32 475 12 34 56"
                      value={fd.phone}
                      onBlur={() => markTouched("phone")}
                      onChange={(e) => up("phone", e.target.value)}
                      className={`h-12 ${showPhoneError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    />
                    {showPhoneError && (
                      <p className="text-xs text-destructive">{showPhoneError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="b2c-postal">Code postal (4 chiffres) <span className="text-accent">*</span></Label>
                      <Input
                        id="b2c-postal"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="ex. 4000"
                        value={fd.postalCode}
                        onBlur={() => markTouched("postalCode")}
                        onChange={(e) => up("postalCode", e.target.value.replace(/\D/g, "").slice(0, 4))}
                        className={`h-12 ${showPostalCodeError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      />
                      {showPostalCodeError && (
                        <p className="text-xs text-destructive">{showPostalCodeError}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="b2c-address">
                        Adresse / Rue et n° <span className="text-xs font-normal text-muted-foreground">(recommandé pour étude satellite)</span>
                      </Label>
                      <Input
                        id="b2c-address"
                        type="text"
                        placeholder="Rue des Saules 14"
                        value={fd.siteAddress}
                        onChange={(e) => up("siteAddress", e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent/40 has-[[data-state=checked]]:bg-accent/5 ${showConsentError ? "border-destructive bg-destructive/5" : "border-border"}`}>
                      <Checkbox
                        checked={fd.marketingConsent}
                        onCheckedChange={(c) => {
                          markTouched("marketingConsent")
                          up("marketingConsent", c === true)
                        }}
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-relaxed text-foreground">
                        <strong className="font-semibold text-foreground">Devis comparatifs (obligatoire) :</strong>{" "}
                        J&apos;accepte d&apos;être recontacté par un maximum de trois (3) installateurs partenaires
                        certifiés RESCERT en Wallonie sélectionnés par Aegis Solaire pour recevoir des offres sans engagement.
                      </span>
                    </label>
                    {showConsentError && (
                      <p className="text-xs text-destructive">{showConsentError}</p>
                    )}

                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent/40 has-[[data-state=checked]]:bg-accent/5">
                      <Checkbox
                        checked={fd.newsletterConsent}
                        onCheckedChange={(c) => up("newsletterConsent", c === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-relaxed text-muted-foreground">
                        <strong className="font-medium text-foreground">Guides & conseils solaires (optionnel) :</strong>{" "}
                        J&apos;accepte de recevoir par e-mail les actualités sur les primes régionales, les tarifs injection et les guides photovoltaïques d&apos;Aegis Solaire.
                      </span>
                    </label>
                  </div>

                  <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Conformité RGPD</p>
                    <p className="mt-1.5">
                      Vos données sont traitées sur base de votre consentement (RGPD). Droits :
                      accès, rectification, effacement — APD :{" "}
                      <a href="https://www.autoriteprotectiondonnees.be" className="underline" target="_blank" rel="noopener noreferrer">
                        autoriteprotectiondonnees.be
                      </a>
                      .{" "}
                      <a href="/politique-confidentialite" className="underline">
                        Politique de confidentialité
                      </a>
                    </p>
                  </div>

                  {/* Honeypot invisible */}
                  <div className="hidden" aria-hidden="true">
                    <input
                      type="text"
                      name="fax_number"
                      tabIndex={-1}
                      autoComplete="off"
                      value={fd.fax_number ?? ""}
                      onChange={(e) => up("fax_number", e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Navigation buttons ── */}
            {!isCalculating && step !== 5 && (
              <>
                {error && (
                  <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
                  {step > 1 ? (
                    <Button variant="outline" onClick={back} className="min-h-[48px] w-full border-slate-300 font-semibold sm:w-auto">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  {step <= 4 && (
                    <button
                      type="button"
                      onClick={next}
                      disabled={!valid(step)}
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#001D3D] to-[#00152e] px-8 font-sans text-sm font-bold text-white shadow-md transition-all hover:bg-[#002855] active:scale-[0.99] disabled:opacity-50 sm:ml-auto sm:w-auto"
                    >
                      {step === 4 ? "Calculer mon étude" : "Continuer"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  )}

                  {step === 6 && (
                    <button
                      type="button"
                      onClick={submit}
                      disabled={isSubmitting}
                      className="inline-flex min-h-[50px] w-full items-center justify-center rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-8 font-sans text-sm font-extrabold text-slate-950 shadow-[0_4px_0_#b45309,0_8px_16px_rgba(245,158,11,0.25)] transition-all hover:from-amber-300 hover:to-amber-400 active:translate-y-1 active:shadow-[0_1px_0_#b45309] disabled:opacity-50 sm:ml-auto sm:w-auto"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi…
                        </>
                      ) : (
                        <>
                          Recevoir mon dossier gratuit
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
