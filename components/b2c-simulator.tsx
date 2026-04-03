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
  roofType: string
  orientation: string
  roofSize: string
  annualBillBracket: string
  annualBillCustom: string
  householdSize: string
  evInterest: string
  batteryInterest: string
  province: string
  projectDetails: string
  firstName: string
  lastName: string
  email: string
  phone: string
  marketingConsent: boolean
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
  roofType: "",
  orientation: "",
  roofSize: "",
  annualBillBracket: "",
  annualBillCustom: "",
  householdSize: "",
  evInterest: "",
  batteryInterest: "",
  province: "",
  projectDetails: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  marketingConsent: false,
}

const ROOF_TYPES = [
  { id: "tuiles", label: "Tuiles", emoji: "🏠" },
  { id: "ardoises", label: "Ardoises", emoji: "🏡" },
  { id: "plat", label: "Toit plat", emoji: "🏢" },
  { id: "zinc", label: "Zinc / Autre", emoji: "🏗️" },
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
  { id: "lt_1200", label: "Moins de 1 200 € / an", value: 1000 },
  { id: "1200_2400", label: "1 200 € – 2 400 € / an", value: 1800 },
  { id: "2400_4000", label: "2 400 € – 4 000 € / an", value: 3200 },
  { id: "gt_4000", label: "Plus de 4 000 € / an", value: 5000 },
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
  "Analyse de votre profil de consommation résidentiel…",
  "Calcul du dimensionnement optimal pour votre toiture…",
  "Estimation des primes habitation Région Wallonne…",
  "Modélisation du tarif prosumer et du compteur bidirectionnel…",
]

const TOTAL_STEPS = 6

/* ═══════════════════════════ Calculation ═════════════════════ */

function calculateB2CROI(d: B2CFormData): B2CResults {
  const roof = ROOF_SIZES.find((r) => r.id === d.roofSize)
  const orient = ORIENTATIONS.find((o) => o.id === d.orientation)
  const bill = d.annualBillCustom
    ? Math.max(parseInt(d.annualBillCustom.replace(/\s/g, ""), 10) || 0, 500)
    : BILL_BRACKETS.find((b) => b.id === d.annualBillBracket)?.value ?? 1800

  const baseKwc = roof?.kWc ?? 6
  const orientFactor = orient?.factor ?? 0.9
  const installedPower = Math.round(baseKwc * 10) / 10

  // ~950 kWh/kWc in Belgium (residential average)
  const annualProduction = Math.round(installedPower * 950 * orientFactor)

  const elecPrice = 0.32
  const consumption = bill / elecPrice

  // Autoconsumption: base 30-40%, +15-25% with battery, +5-10% with EV
  let autoRate = Math.min(Math.round((consumption / Math.max(annualProduction, 1)) * 100), 45)
  if (d.batteryInterest === "oui") autoRate = Math.min(autoRate + 25, 85)
  else if (d.batteryInterest === "hesite") autoRate = Math.min(autoRate + 10, 70)
  if (d.evInterest === "oui" || d.evInterest === "prevu") autoRate = Math.min(autoRate + 8, 85)
  autoRate = Math.max(autoRate, 25)

  const selfConsumedValue = annualProduction * (autoRate / 100) * elecPrice
  // Injection: prosumer tariff ~ 0.03-0.05 €/kWh
  const injectedValue = annualProduction * ((100 - autoRate) / 100) * 0.04
  const annualSavings = Math.round(selfConsumedValue + injectedValue)

  // Installation cost: ~1500 €/kWc residential, +5000-8000€ for battery
  let installCost = installedPower * 1500
  if (d.batteryInterest === "oui") installCost += 6500
  else if (d.batteryInterest === "hesite") installCost += 3000

  // Walloon residential prime: ~200-400€/kWc for first 6 kWc (simplified)
  const primeKwc = Math.min(installedPower, 6)
  const primeAmount = primeKwc * 300
  const netCost = installCost - primeAmount

  const rawRoi = netCost / Math.max(annualSavings, 1)
  const roiYears = Math.round(Math.max(7, Math.min(12, rawRoi)) * 10) / 10

  const co2Avoided = Math.round((annualProduction * 0.0004) * 10) / 10

  return {
    installedPower,
    annualProduction,
    autoconsumptionRate: autoRate,
    annualSavings,
    roiYears,
    co2Avoided,
    monthlyGain: Math.round(annualSavings / 12),
    gain25Years: Math.round(annualSavings * 25),
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
  const openedAt = useRef(new Date().toISOString())

  const up = (k: keyof B2CFormData, v: string | boolean) =>
    setFd((p) => ({ ...p, [k]: v }))

  /* ── Validation per step ── */
  const valid = (s: number) => {
    switch (s) {
      case 1:
        return fd.roofType !== "" && fd.orientation !== "" && fd.roofSize !== ""
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
          fd.phone.trim().length >= 8 &&
          fd.marketingConsent
        )
      default:
        return false
    }
  }

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
    if (!valid(6) || !results) return
    setIsSubmitting(true)
    setError(null)

    try {
      const roofKwc = ROOF_SIZES.find((r) => r.id === fd.roofSize)?.kWc ?? 6
      const surfaceArea = Math.round(roofKwc * 6)
      const annualBill = fd.annualBillCustom
        ? Math.max(parseInt(fd.annualBillCustom.replace(/\s/g, ""), 10) || 500, 500)
        : BILL_BRACKETS.find((b) => b.id === fd.annualBillBracket)?.value ?? 1800

      const payload = {
        segment: "B2C",
        firstName: fd.firstName,
        lastName: fd.lastName,
        email: fd.email,
        phone: fd.phone,
        surfaceType: "toiture" as const,
        surfaceArea,
        province: fd.province,
        annualElectricityBill: annualBill,
        projectDetails: [
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
        estimatedROIYears: results.roiYears,
        autoconsumptionRate: results.autoconsumptionRate,
        estimatedSavings: results.annualSavings,
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
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Un conseiller expert résidentiel wallon vous recontactera très
            prochainement avec votre dossier personnalisé.
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
                      Type de toiture
                    </Label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {ROOF_TYPES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => up("roofType", r.id)}
                          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                            fd.roofType === r.id
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border bg-muted/40 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className="text-2xl">{r.emoji}</span>
                          <span className="text-sm font-semibold">{r.label}</span>
                        </button>
                      ))}
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
                          className={`rounded-xl border-2 p-3.5 text-left text-sm font-medium transition-all ${
                            fd.annualBillBracket === b.id && !fd.annualBillCustom
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {b.label}
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
                        onChange={(e) => up("firstName", e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="b2c-ln">Nom</Label>
                      <Input
                        id="b2c-ln"
                        placeholder="Dupont"
                        value={fd.lastName}
                        onChange={(e) => up("lastName", e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="b2c-email">E-mail</Label>
                    <Input
                      id="b2c-email"
                      type="email"
                      placeholder="jean.dupont@email.be"
                      value={fd.email}
                      onChange={(e) => up("email", e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="b2c-phone">Téléphone</Label>
                    <Input
                      id="b2c-phone"
                      type="tel"
                      placeholder="+32 475 12 34 56"
                      value={fd.phone}
                      onChange={(e) => up("phone", e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-accent/40 has-[[data-state=checked]]:bg-accent/5">
                    <Checkbox
                      checked={fd.marketingConsent}
                      onCheckedChange={(c) => up("marketingConsent", c === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-relaxed text-foreground">
                      J&apos;accepte d&apos;être recontacté par Aegis Solaire et un installateur
                      RESCERT pour affiner mon étude personnalisée.
                    </span>
                  </label>

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

                <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-between">
                  {step > 1 ? (
                    <Button variant="outline" onClick={back} className="min-h-[48px] w-full sm:w-auto">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Retour
                    </Button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  {step <= 4 && (
                    <Button
                      onClick={next}
                      disabled={!valid(step)}
                      className="min-h-[48px] w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:ml-auto sm:w-auto"
                    >
                      {step === 4 ? "Calculer mon étude" : "Continuer"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  {step === 6 && (
                    <Button
                      onClick={submit}
                      disabled={!valid(6) || isSubmitting}
                      className="min-h-[48px] w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:ml-auto sm:w-auto"
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
                    </Button>
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
