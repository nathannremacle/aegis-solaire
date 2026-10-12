"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Home,
  Building,
  Zap,
  BatteryCharging,
  Car,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react"
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
const WALLONIA_PROVINCES = [
  { value: "liege", label: "Liège" },
  { value: "hainaut", label: "Hainaut" },
  { value: "namur", label: "Namur" },
  { value: "brabant_wallon", label: "Brabant wallon" },
  { value: "luxembourg", label: "Luxembourg" },
] as const
import { getEmailError, getPhoneError } from "@/lib/leads-validation"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { trackLeadConversion } from "@/components/analytics/ad-tracking"

const PROPERTY_TYPES = [
  { id: "maison_4f", label: "Maison 4 façades", icon: Home },
  { id: "maison_mitoyenne", label: "Maison mitoyenne (2 ou 3 façades)", icon: Building },
  { id: "pro_commercial", label: "Bâtiment d'activité ou PME", icon: Zap },
]

const ROOF_TYPES = [
  { id: "tuiles", label: "Tuiles classiques", desc: "La couverture la plus fréquente en Wallonie" },
  { id: "ardoises", label: "Ardoises (naturelles ou fibro)", desc: "Nécessite des fixations spécifiques" },
  { id: "plat", label: "Toiture plate (EPDM / Roofing)", desc: "Installation sur châssis lestés inclinés" },
  { id: "autre", label: "Autre / Toiture combinée", desc: "Étudié lors de la visite technique" },
]

const BILL_RANGES = [
  { id: "lt_150", label: "Moins de 150 € / mois", value: 1400 },
  { id: "150_250", label: "De 150 € à 250 € / mois", value: 2400 },
  { id: "250_400", label: "De 250 € à 400 € / mois", value: 3900 },
  { id: "gt_400", label: "Plus de 400 € / mois", value: 5500 },
]

export function DevisLandingClient() {
  const [step, setStep] = useState(1)
  const totalSteps = 5

  const [propertyType, setPropertyType] = useState("maison_4f")
  const [roofType, setRoofType] = useState("tuiles")
  const [billRange, setBillRange] = useState("150_250")
  const [batteryInterest, setBatteryInterest] = useState("hesite")
  const [evInterest, setEvInterest] = useState("non")
  const [province, setProvince] = useState("liege")
  const [postalCode, setPostalCode] = useState("")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [partnerConsent, setPartnerConsent] = useState(false)
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  const [fax_number, setFaxNumber] = useState("")

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const formOpenedAt = useRef(new Date().toISOString())

  // Validation step 5
  const emailErr = getEmailError(email)
  const phoneErr = getPhoneError(phone)
  const isFirstNameValid = firstName.trim().length >= 2
  const isLastNameValid = lastName.trim().length >= 2

  const showFirstNameError = hasAttemptedSubmit && !isFirstNameValid
  const showLastNameError = hasAttemptedSubmit && !isLastNameValid
  const showEmailError = hasAttemptedSubmit && !!emailErr
  const showPhoneError = hasAttemptedSubmit && !!phoneErr
  const showConsentError = hasAttemptedSubmit && !partnerConsent

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 120, behavior: "smooth" })
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1)
    }
  }

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true)

    if (!isFirstNameValid || !isLastNameValid || emailErr || phoneErr || !partnerConsent) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const selectedBill = BILL_RANGES.find((b) => b.id === billRange)?.value ?? 2400
    const isPro = propertyType === "pro_commercial"

    const payload = {
      segment: isPro ? "B2B" : "B2C",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      surfaceType: roofType === "plat" ? "toiture" : "toiture",
      surfaceArea: isPro ? 500 : 40,
      province,
      annualElectricityBill: selectedBill,
      marketingConsent: partnerConsent,
      newsletterConsent,
      projectDetails: [
        `Source: Campagne Publicitaire (Landing Bobex)`,
        `Bien: ${propertyType}`,
        `Couverture: ${roofType}`,
        `Facture mensuelle: ${billRange}`,
        `Intérêt batterie: ${batteryInterest}`,
        `Véhicule électrique: ${evInterest}`,
        postalCode.trim() ? `Code postal: ${postalCode.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      fax_number,
      form_opened_at: formOpenedAt.current,
      mediaPartnerCode: getStoredMediaPartnerRef() ?? undefined,
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi")
      }

      const resData = await res.json().catch(() => ({}))
      trackLeadConversion({
        segment: isPro ? "B2B" : "B2C",
        leadId: resData?.leadId,
        value: isPro ? 120 : 35,
      })
      setSubmitted(true)
      window.scrollTo({ top: 60, behavior: "smooth" })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-foreground flex flex-col font-sans">
      {/* ── Minimalist distraction-free Header ── */}
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-36 sm:h-12 sm:w-44">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Installateurs certifiés RESCERT</span>
            </div>
            <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground">
              Wallonie 2026
            </span>
          </div>
        </div>
      </header>

      {/* ── Main Hero & Interactive Funnel ── */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10">
        {!submitted ? (
          <div>
            {/* Top Hook */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#001D3D] mb-3">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                Comparateur Gratuit · 100% Sans Engagement
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#001D3D] leading-tight">
                Recevez jusqu&apos;à 3 devis comparatifs pour vos{" "}
                <span className="text-accent underline decoration-accent/40 underline-offset-4">
                  panneaux solaires
                </span>
              </h1>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                Comparez les artisans locaux certifiés RESCERT de votre province. Économisez sur votre facture sans démarchage agressif.
              </p>

              {/* Progress Bar */}
              <div className="mt-6 max-w-md mx-auto">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1.5">
                  <span>Étape {step} sur {totalSteps}</span>
                  <span>{Math.round((step / totalSteps) * 100)} %</span>
                </div>
                <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${(step / totalSteps) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>

            {/* Funnel Card */}
            <div className="bg-white rounded-3xl border border-border shadow-xl p-5 sm:p-8 md:p-10 relative overflow-hidden">
              <AnimatePresence mode="wait">
                {/* ── STEP 1: Type de bien ── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        Quel type de bâtiment souhaitez-vous équiper ?
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Cette information permet d&apos;orienter votre dossier vers le bon spécialiste (résidentiel ou tertiaire).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {PROPERTY_TYPES.map((prop) => {
                        const Icon = prop.icon
                        const isSelected = propertyType === prop.id
                        return (
                          <button
                            key={prop.id}
                            type="button"
                            onClick={() => setPropertyType(prop.id)}
                            className={`flex flex-col items-center text-center p-5 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                                : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                            }`}
                          >
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-3 ${
                              isSelected ? "bg-accent/20 text-[#001D3D]" : "bg-neutral-100 text-neutral-600"
                            }`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-bold text-foreground">{prop.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2: Toiture ── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        Quel est le type de votre toiture ?
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Chaque type de couverture utilise un système de fixation agréé par le fabricant.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ROOF_TYPES.map((r) => {
                        const isSelected = roofType === r.id
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRoofType(r.id)}
                            className={`flex flex-col text-left p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                              isSelected
                                ? "border-accent bg-accent/5 shadow-md shadow-accent/10"
                                : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                            }`}
                          >
                            <span className="text-sm font-bold text-foreground">{r.label}</span>
                            <span className="text-xs text-muted-foreground mt-1">{r.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 3: Consommation & Équipements ── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        Votre consommation d&apos;électricité actuelle
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Pour dimensionner le nombre exact de panneaux et maximiser votre taux d&apos;autoconsommation.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {BILL_RANGES.map((b) => {
                        const isSelected = billRange === b.id
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBillRange(b.id)}
                            className={`p-4 rounded-xl border-2 text-left font-semibold text-sm transition-all ${
                              isSelected
                                ? "border-accent bg-accent/5 text-[#001D3D]"
                                : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                            }`}
                          >
                            {b.label}
                          </button>
                        )
                      })}
                    </div>

                    <div className="pt-4 border-t border-border space-y-4">
                      <div>
                        <Label className="text-sm font-semibold text-foreground">
                          Souhaitez-vous inclure une batterie domestique ?
                        </Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { id: "oui", label: "Oui" },
                            { id: "hesite", label: "À évaluer" },
                            { id: "non", label: "Non" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setBatteryInterest(opt.id)}
                              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                                batteryInterest === opt.id
                                  ? "bg-[#001D3D] text-white border-[#001D3D]"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-foreground">
                          Avez-vous ou prévoyez-vous un véhicule électrique ?
                        </Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {[
                            { id: "oui", label: "Oui, déjà équipé" },
                            { id: "prevu", label: "Prévu sous 1 an" },
                            { id: "non", label: "Non" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setEvInterest(opt.id)}
                              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                                evInterest === opt.id
                                  ? "bg-[#001D3D] text-white border-[#001D3D]"
                                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 4: Localisation en Wallonie ── */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        Dans quelle région wallonne se situe votre projet ?
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Nous sélectionnons uniquement des installateurs implantés dans votre province pour garantir un SAV de proximité.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="province" className="text-sm font-medium">
                          Province
                        </Label>
                        <Select value={province} onValueChange={setProvince}>
                          <SelectTrigger id="province" className="h-12 mt-1.5 w-full">
                            <SelectValue placeholder="Sélectionnez votre province" />
                          </SelectTrigger>
                          <SelectContent>
                            {WALLONIA_PROVINCES.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="postalCode" className="text-sm font-medium">
                          Code postal ou commune (optionnel)
                        </Label>
                        <Input
                          id="postalCode"
                          placeholder="Ex. : 4000 Liège, 5000 Namur..."
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value.slice(0, 50))}
                          className="h-12 mt-1.5"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 5: Coordonnées de contact & Consentements ── */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {/* Honeypot anti-spam */}
                    <div className="sr-only" aria-hidden="true">
                      <Label htmlFor="fax_number">Ne pas remplir</Label>
                      <Input
                        id="fax_number"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={fax_number}
                        onChange={(e) => setFaxNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-semibold mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>3 installateurs certifiés disponibles dans votre zone</span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-foreground">
                        Où souhaitez-vous recevoir vos devis comparatifs ?
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Vos coordonnées sont protégées. Elles ne seront partagées qu&apos;aux installateurs sélectionnés pour votre étude.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-sm font-medium">
                          Prénom
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="Ex. : Marc"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className={`h-12 mt-1.5 ${showFirstNameError ? "border-destructive" : ""}`}
                        />
                        {showFirstNameError && (
                          <p className="text-xs text-destructive mt-1">Le prénom est requis (min. 2 caractères).</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="lastName" className="text-sm font-medium">
                          Nom
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Ex. : Vandendriessche"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className={`h-12 mt-1.5 ${showLastNameError ? "border-destructive" : ""}`}
                        />
                        {showLastNameError && (
                          <p className="text-xs text-destructive mt-1">Le nom est requis (min. 2 caractères).</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium">
                          Adresse e-mail
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="nom@exemple.be"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`h-12 mt-1.5 ${showEmailError ? "border-destructive" : ""}`}
                        />
                        {showEmailError && (
                          <p className="text-xs text-destructive mt-1">{emailErr}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium">
                          Numéro de téléphone
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+32 470 12 34 56"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={`h-12 mt-1.5 ${showPhoneError ? "border-destructive" : ""}`}
                        />
                        {showPhoneError && (
                          <p className="text-xs text-destructive mt-1">{phoneErr}</p>
                        )}
                      </div>
                    </div>

                    {/* Double Checkbox RGPD */}
                    <div className="space-y-3 pt-2">
                      {showConsentError && (
                        <p className="text-xs text-destructive font-medium" role="alert">
                          Veuillez accepter d&apos;être recontacté pour recevoir vos devis comparatifs.
                        </p>
                      )}

                      <label
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                          showConsentError ? "border-destructive bg-destructive/5" : "border-neutral-200 bg-neutral-50/60 hover:bg-neutral-100/60"
                        }`}
                      >
                        <Checkbox
                          id="partnerConsent"
                          checked={partnerConsent}
                          onCheckedChange={(c) => setPartnerConsent(c === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs sm:text-sm text-foreground leading-relaxed">
                          <strong className="font-semibold text-[#001D3D]">Devis comparatifs (obligatoire) :</strong>{" "}
                          J&apos;accepte d&apos;être recontacté par un maximum de 3 installateurs certifiés RESCERT sélectionnés par Aegis Solaire pour recevoir mes devis personnalisés sans engagement.
                        </span>
                      </label>

                      <label className="flex items-start gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-100/60 transition-colors cursor-pointer">
                        <Checkbox
                          id="newsletterConsent"
                          checked={newsletterConsent}
                          onCheckedChange={(c) => setNewsletterConsent(c === true)}
                          className="mt-0.5"
                        />
                        <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          <strong className="font-medium text-foreground">Guides & actualités (optionnel) :</strong>{" "}
                          J&apos;accepte de recevoir par e-mail les conseils d&apos;Aegis Solaire sur les primes régionales et l&apos;autoconsommation photovoltaïque.
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span>Données confidentielles traitées selon le RGPD (APD Belgique). Zéro spam.</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {errorMessage && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="mt-8 pt-6 border-t border-border flex items-center justify-between gap-3">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="h-12 px-5 text-sm font-semibold"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Précédent
                  </Button>
                ) : (
                  <div />
                )}

                {step < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="h-12 px-6 bg-[#001D3D] text-white hover:bg-[#00152e] font-bold text-sm shadow-md ml-auto"
                  >
                    Étape suivante
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="h-12 px-7 bg-accent text-[#001D3D] hover:bg-[#e6a600] font-extrabold text-sm shadow-lg ml-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      <>
                        Recevoir mes 3 devis gratuits
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Confirmation Screen ── */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-border shadow-xl p-8 sm:p-12 text-center max-w-2xl mx-auto"
          >
            <div className="h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-md">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#001D3D]">
              Votre demande a bien été enregistrée !
            </h2>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              Merci <strong className="text-foreground">{firstName}</strong>. Votre dossier a été transmis à notre réseau d&apos;installateurs agréés RESCERT en province de{" "}
              <strong className="text-foreground capitalize">{province}</strong>.
            </p>

            <div className="mt-8 rounded-2xl bg-neutral-50 border border-neutral-200 p-6 text-left space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Prochaines étapes :
              </h3>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-[#001D3D] text-xs">
                  1
                </span>
                <span>Analyse technique préliminaire de votre toiture et de votre profil de consommation.</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-[#001D3D] text-xs">
                  2
                </span>
                <span>Prise de contact téléphonique sous 24 à 48h ouvrées par un artisan certifié local.</span>
              </div>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 font-bold text-[#001D3D] text-xs">
                  3
                </span>
                <span>Réception de vos devis comparatifs détaillés 100% gratuits et sans engagement.</span>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/">
                <Button variant="outline" className="h-11 px-6 font-semibold">
                  Retour à l&apos;accueil Aegis Solaire
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── 3 Reassurance Cards (Below Fold) ── */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-border p-5 text-center shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">100% Certifiés RESCERT</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Agrément photovoltaïque officiel vérifié auprès de la Région wallonne.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 text-center shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center mx-auto mb-3">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Réponse sous 48h</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Prise en charge rapide de votre demande par des artisans disponibles.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5 text-center shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center mx-auto mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Sans Engagement</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Vous êtes totalement libre d&apos;accepter ou non les offres reçues.
            </p>
          </div>
        </div>
      </main>

      {/* ── Minimalist Legal Footer ── */}
      <footer className="border-t border-border bg-white mt-12 py-8 text-xs text-muted-foreground">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} Aegis Solaire — Plateforme éditée par{" "}
            <strong className="text-foreground">INIT42</strong> (Nathan Remacle) · BCE 1039.899.980 · TVA BE 1039.899.980
          </p>
          <div className="flex items-center gap-4">
            <Link href="/mentions-legales" className="hover:underline">
              Mentions Légales
            </Link>
            <Link href="/politique-confidentialite" className="hover:underline">
              Confidentialité
            </Link>
            <Link href="/cgv" className="hover:underline">
              CGV
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
