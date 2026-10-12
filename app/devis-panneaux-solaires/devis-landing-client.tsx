"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ShieldCheck,
  CheckCircle2,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Home,
  Building,
  Zap,
  HelpCircle,
  X,
  Star,
  Lock,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  Mail,
  ChevronDown,
  Award,
  BadgeCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { getEmailError, getPhoneError } from "@/lib/leads-validation"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { trackLeadConversion } from "@/components/analytics/ad-tracking"

// ── Données des étapes du formulaire ──
const CONSUMPTION_OPTIONS = [
  { id: "lt_3000", label: "Moins de 3.000 kWh", sublabel: "1 à 2 personnes", billValue: 1200 },
  { id: "3000_4000", label: "3.000 à 4.000 kWh", sublabel: "2 à 3 personnes", billValue: 1800 },
  { id: "4000_5000", label: "4.000 à 5.000 kWh", sublabel: "3 à 4 personnes (standard)", billValue: 2400 },
  { id: "5000_6000", label: "5.000 à 6.000 kWh", sublabel: "4 à 5 personnes", billValue: 3100 },
  { id: "gt_6000", label: "Plus de 6.000 kWh", sublabel: "Grand foyer, pompe à chaleur ou borne VE", billValue: 4500 },
]

const PROPERTY_TYPES = [
  { id: "maison_4f", label: "Maison individuelle", sublabel: "4 façades", icon: Home },
  { id: "maison_mitoyenne", label: "Maison mitoyenne", sublabel: "2 ou 3 façades", icon: Building },
  { id: "pme", label: "Bâtiment d'activité / PME", sublabel: "Surface commerciale ou atelier", icon: Zap },
]

const OWNERSHIP_OPTIONS = [
  { id: "proprietaire", label: "Oui, je suis propriétaire", sublabel: "Décision d'investissement directe" },
  { id: "locataire", label: "Non, je suis locataire", sublabel: "Accord du propriétaire nécessaire" },
  { id: "copropriete", label: "Copropriété", sublabel: "Décision via syndic / ACP" },
]

const ROOF_OPTIONS = [
  { id: "tuiles", label: "Toit incliné en tuiles", sublabel: "Couverture standard en Wallonie" },
  { id: "ardoises", label: "Toit incliné en ardoises", sublabel: "Fixations spécifiques requises" },
  { id: "plat", label: "Toit plat (Roofing / EPDM)", sublabel: "Pose sur bacs lestés inclinés" },
  { id: "autre", label: "Autre / Pose au sol", sublabel: "Étudié lors de la visite technique" },
]

const WALLONIA_PROVINCES = [
  { value: "liege", label: "Liège" },
  { value: "hainaut", label: "Hainaut" },
  { value: "namur", label: "Namur" },
  { value: "brabant_wallon", label: "Brabant wallon" },
  { value: "luxembourg", label: "Luxembourg" },
] as const

const FAQ_ITEMS = [
  {
    q: "Combien de devis vais-je recevoir ?",
    a: "Vous recevrez jusqu'à 4 devis comparatifs détaillés d'installateurs photovoltaïques certifiés RESCERT actifs directement dans votre commune ou province.",
  },
  {
    q: "Ce service est-il réellement 100 % gratuit et sans engagement ?",
    a: "Oui, totalement. Aegis Solaire met en relation les particuliers et entreprises avec des artisans locaux. Vous ne payez rien pour recevoir les devis et restez totalement libre de choisir l'offre qui vous convient — ou aucune.",
  },
  {
    q: "Pourquoi exiger la certification RESCERT ?",
    a: "La certification RESCERT Photovoltaïque est le label de référence en Wallonie. Elle garantit que l'artisan maîtrise les normes de sécurité électrique (RGIE), le dimensionnement optimal et vous permet de bénéficier des démarches administratives conformes auprès d'Ores ou Resa.",
  },
  {
    q: "Quel est le délai pour recevoir mes devis ?",
    a: "La majorité de nos installateurs partenaires prennent contact sous 24 à 48 heures ouvrées pour valider vos contraintes de toiture et vous transmettre une offre chiffrée sur mesure.",
  },
  {
    q: "Comment fonctionne l'autoconsommation avec la fin du compteur qui tourne à l'envers ?",
    a: "En Wallonie, les nouvelles installations disposent d'un compteur bidirectionnel communicant. L'électricité solaire consommée en direct sur site est 100 % gratuite (économie sur votre tarif réseau). Le surplus non consommé est racheté via un contrat d'injection auprès de votre fournisseur.",
  },
]

export function DevisLandingClient() {
  const [step, setStep] = useState(1)
  const totalSteps = 6

  // Form values
  const [consumption, setConsumption] = useState("4000_5000")
  const [propertyType, setPropertyType] = useState("maison_4f")
  const [ownership, setOwnership] = useState("proprietaire")
  const [roofType, setRoofType] = useState("tuiles")
  const [province, setProvince] = useState("liege")
  const [postalCode, setPostalCode] = useState("")
  const [city, setCity] = useState("")

  // Contact fields (Step 6)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [remarks, setRemarks] = useState("")
  const [partnerConsent, setPartnerConsent] = useState(false)
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  const [fax_number, setFaxNumber] = useState("") // honeypot

  // UI States
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null)

  const formOpenedAt = useRef(new Date().toISOString())
  const leadCardRef = useRef<HTMLDivElement>(null)

  // Validation
  const emailErr = getEmailError(email)
  const phoneErr = getPhoneError(phone)
  const isFirstNameValid = firstName.trim().length >= 2
  const isLastNameValid = lastName.trim().length >= 2
  const isPostalCodeValid = postalCode.trim().length >= 4

  const showFirstNameError = hasAttemptedSubmit && !isFirstNameValid
  const showLastNameError = hasAttemptedSubmit && !isLastNameValid
  const showEmailError = hasAttemptedSubmit && !!emailErr
  const showPhoneError = hasAttemptedSubmit && !!phoneErr
  const showPostalCodeError = hasAttemptedSubmit && !isPostalCodeValid
  const showConsentError = hasAttemptedSubmit && !partnerConsent

  const scrollToForm = () => {
    leadCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleNext = () => {
    if (step < totalSteps) {
      setStep((s) => s + 1)
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        scrollToForm()
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1)
    }
  }

  const handleOptionSelect = (setter: (val: string) => void, val: string) => {
    setter(val)
    // Quick auto-advance for single click convenience on steps 1..4
    if (step < 5) {
      setTimeout(() => {
        setStep((s) => Math.min(totalSteps, s + 1))
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
          scrollToForm()
        }
      }, 200)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)

    if (
      !isFirstNameValid ||
      !isLastNameValid ||
      !isPostalCodeValid ||
      emailErr ||
      phoneErr ||
      !partnerConsent
    ) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const selectedBill = CONSUMPTION_OPTIONS.find((c) => c.id === consumption)?.billValue ?? 2400
    const isPro = propertyType === "pme"

    const payload = {
      segment: isPro ? "B2B" : "B2C",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      surfaceType: roofType === "plat" ? "toiture" : "toiture",
      surfaceArea: isPro ? 400 : 45,
      province,
      provinceFreeText: `${postalCode.trim()}${city.trim() ? ` ${city.trim()}` : ""}`,
      annualElectricityBill: selectedBill,
      marketingConsent: partnerConsent,
      newsletterConsent,
      projectDetails: [
        `Source: Campagne Publicitaire Bobex-Style`,
        `Consommation annuelle: ${consumption}`,
        `Type de bien: ${propertyType}`,
        `Statut: ${ownership}`,
        `Couverture: ${roofType}`,
        address.trim() ? `Adresse: ${address.trim()}` : "",
        remarks.trim() ? `Précisions: ${remarks.trim()}` : "",
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
        throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement.")
      }

      const resData = await res.json().catch(() => ({}))
      trackLeadConversion({
        segment: isPro ? "B2B" : "B2C",
        leadId: resData?.leadId,
        value: isPro ? 120 : 40,
      })
      setSubmitted(true)
      window.scrollTo({ top: 80, behavior: "smooth" })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate percentage for clean continuous progress bar
  const progressPercent = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-[#F8C630] selection:text-[#002A45]">
      {/* ── Entête épurée sans liens de fuite ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="relative h-9 w-36 sm:h-11 sm:w-44">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden min-[480px]:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Installateurs certifiés RESCERT</span>
            </div>
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#001D3D] bg-[#F8C630] hover:bg-[#DEB12C] px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-xl shadow-sm transition-all"
            >
              <span>Comparer les devis</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Split Hero Above-The-Fold (Desktop 2 colonnes / Mobile empilé) ── */}
      <section className="relative overflow-hidden py-6 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* ── Colonne Gauche : Copywriting fort & Réassurance Bobex ── */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              
              {/* Badge Trust & Preuve sociale */}
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700 mb-3 sm:mb-4 flex-wrap">
                <span className="font-bold text-[#001D3D]">4.9 / 5</span>
                <span className="text-amber-500 flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-800">Réseau d&apos;experts agréés en Wallonie</span>
              </div>

              {/* Titre Principal percutant */}
              <h1 className="text-2xl min-[480px]:text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#001D3D] leading-[1.12]">
                La meilleure offre solaire ?{" "}
                <span className="block mt-1 sm:mt-2 text-transparent bg-clip-text bg-gradient-to-r from-[#001D3D] via-[#0b3864] to-[#001D3D]">
                  Comparez <span className="underline decoration-[#F8C630] decoration-4 underline-offset-4">jusqu&apos;à 4 devis</span>.
                </span>
              </h1>

              {/* Sous-titre */}
              <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Une seule demande, des <strong>installateurs certifiés RESCERT</strong> proches de chez vous. Service <strong>100 % gratuit</strong>, sans engagement et réponse sous 48 h.
              </p>

              {/* Bullets clés avec infobulles interactives */}
              <ul className="mt-6 space-y-3.5 max-w-xl">
                {[
                  {
                    id: 1,
                    text: "Économisez jusqu'à 70 % sur votre facture d'électricité",
                    tooltip:
                      "Une installation solaire dimensionnée pour votre foyer couvre vos besoins en journée et protège durablement votre pouvoir d'achat contre la hausse des grilles tarifaires belges.",
                  },
                  {
                    id: 2,
                    text: "Installateurs certifiés RESCERT de votre région",
                    tooltip:
                      "Tous les installateurs de notre réseau sont préalablement vérifiés : agrément RESCERT actif en Wallonie, assurances décennales et conformité RGIE stricte.",
                  },
                  {
                    id: 3,
                    text: "Réponse sous 48 h, sans aucune obligation",
                    tooltip:
                      "Vous recevez les devis comparatifs détaillés directement chez vous. Vous étudiez les propositions à tête reposée et décidez librement si vous donnez suite ou non.",
                  },
                ].map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-[#001D3D] text-[#F8C630] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                    <div className="text-sm sm:text-base font-semibold text-slate-800 leading-snug">
                      <span>{item.text}</span>
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === item.id ? null : item.id)}
                        className="inline-flex ml-1.5 text-slate-400 hover:text-[#001D3D] transition-colors"
                        aria-label="Plus d'informations"
                      >
                        <HelpCircle className="h-4 w-4 inline" />
                      </button>
                      {activeTooltip === item.id && (
                        <div className="mt-2 text-xs font-normal text-slate-600 bg-white p-3 rounded-xl border border-slate-200 shadow-md">
                          {item.tooltip}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {/* Lien modale "Comment ça marche ?" */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsHowItWorksOpen(true)}
                  className="text-xs sm:text-sm font-bold text-slate-700 underline underline-offset-4 hover:text-[#001D3D] transition-colors"
                >
                  Comment ça marche ?
                </button>
              </div>

              {/* Bouton mobile pour scroller directement sur le formulaire */}
              <div className="mt-6 lg:hidden">
                <button
                  onClick={scrollToForm}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-[#F8C630] text-[#001D3D] font-extrabold text-base shadow-md hover:bg-[#DEB12C] transition-all"
                >
                  <span>Recevoir mes devis gratuits</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              {/* Avis client authentique sous les puces (comme sur Bobex) */}
              <div className="mt-8 pt-6 border-t border-slate-200/80 max-w-xl">
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-full bg-[#001D3D] text-[#F8C630] font-black flex items-center justify-center text-sm shrink-0">
                    JD
                  </div>
                  <div>
                    <div className="flex gap-0.5 text-amber-400 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                      ))}
                    </div>
                    <blockquote className="text-xs sm:text-sm italic text-slate-700 leading-relaxed">
                      « Trois devis reçus en 48 heures, un écart de près de 1.850 € pour des panneaux de même marque. Sans comparaison, j&apos;aurais payé bien trop cher. »
                    </blockquote>
                    <p className="mt-1.5 text-xs text-slate-500 font-medium">
                      <strong className="text-slate-800">Julien Dubois</strong> · Chaudfontaine (Province de Liège)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Colonne Droite : La Lead Card (Formulaire interactif Bobex-Style) ── */}
            <div ref={leadCardRef} className="lg:col-span-6 scroll-mt-24">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-5 sm:p-7 md:p-8">
                
                {!submitted ? (
                  <>
                    {/* Header de la Lead Card */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Installateurs RESCERT
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Étape {step} / {totalSteps}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-[#001D3D] mt-2.5 tracking-tight">
                        Remplissez et économisez
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        En 45 secondes, trouvez jusqu&apos;à 4 installateurs agréés près de chez vous.
                      </p>

                      {/* Tags de réassurance Bobex */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {["Gratuit & sans engagement", "Spécialistes locaux", "Réponse 48h"].map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#001D3D] bg-slate-100 px-2.5 py-1 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Barre de progression fluide */}
                    <div className="mb-6">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[#F8C630]"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>

                    {/* ── Contenu des étapes ── */}
                    <form onSubmit={handleSubmit} noValidate>
                      {/* Honeypot anti-spam */}
                      <div className="sr-only" aria-hidden="true">
                        <input
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={fax_number}
                          onChange={(e) => setFaxNumber(e.target.value)}
                        />
                      </div>

                      <AnimatePresence mode="wait">
                        {/* ── ÉTAPE 1 : Consommation annuelle ── */}
                        {step === 1 && (
                          <motion.fieldset
                            key="step1"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-bold text-slate-800 mb-2 block">
                              Quelle est votre consommation d&apos;électricité annuelle (estimée) ?
                            </legend>

                            <div className="space-y-2">
                              {CONSUMPTION_OPTIONS.map((item) => {
                                const isChecked = consumption === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setConsumption, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#001D3D] bg-slate-50 ring-1 ring-[#001D3D]"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm sm:text-base font-bold text-[#001D3D]">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-slate-500 mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        isChecked
                                          ? "border-[#001D3D] bg-[#001D3D] text-[#F8C630]"
                                          : "border-slate-300"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-3 flex justify-end">
                              <Button
                                type="button"
                                onClick={handleNext}
                                className="w-full sm:w-auto px-6 h-12 bg-[#F8C630] hover:bg-[#DEB12C] text-[#001D3D] font-bold text-sm rounded-xl shadow-sm gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 2 : Type de bâtiment ── */}
                        {step === 2 && (
                          <motion.fieldset
                            key="step2"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-bold text-slate-800 mb-2 block">
                              De quel type de bâtiment s&apos;agit-il ?
                            </legend>

                            <div className="space-y-2">
                              {PROPERTY_TYPES.map((item) => {
                                const isChecked = propertyType === item.id
                                const Icon = item.icon
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setPropertyType, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#001D3D] bg-slate-50 ring-1 ring-[#001D3D]"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                          isChecked ? "bg-[#001D3D] text-[#F8C630]" : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm sm:text-base font-bold text-[#001D3D]">
                                          {item.label}
                                        </span>
                                        <span className="text-xs text-slate-500 mt-0.5">
                                          {item.sublabel}
                                        </span>
                                      </div>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        isChecked
                                          ? "border-[#001D3D] bg-[#001D3D] text-[#F8C630]"
                                          : "border-slate-300"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 font-semibold gap-1.5"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </Button>
                              <Button
                                type="button"
                                onClick={handleNext}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#DEB12C] text-[#001D3D] font-bold text-sm rounded-xl shadow-sm gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 3 : Propriétaire ou locataire ── */}
                        {step === 3 && (
                          <motion.fieldset
                            key="step3"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-bold text-slate-800 mb-2 block">
                              Êtes-vous propriétaire du bâtiment ?
                            </legend>

                            <div className="space-y-2">
                              {OWNERSHIP_OPTIONS.map((item) => {
                                const isChecked = ownership === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setOwnership, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#001D3D] bg-slate-50 ring-1 ring-[#001D3D]"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm sm:text-base font-bold text-[#001D3D]">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-slate-500 mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        isChecked
                                          ? "border-[#001D3D] bg-[#001D3D] text-[#F8C630]"
                                          : "border-slate-300"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 font-semibold gap-1.5"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </Button>
                              <Button
                                type="button"
                                onClick={handleNext}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#DEB12C] text-[#001D3D] font-bold text-sm rounded-xl shadow-sm gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 4 : Toiture & Revêtement ── */}
                        {step === 4 && (
                          <motion.fieldset
                            key="step4"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-bold text-slate-800 mb-2 block">
                              Quel est le type de votre toiture ?
                            </legend>

                            <div className="space-y-2">
                              {ROOF_OPTIONS.map((item) => {
                                const isChecked = roofType === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setRoofType, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#001D3D] bg-slate-50 ring-1 ring-[#001D3D]"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm sm:text-base font-bold text-[#001D3D]">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-slate-500 mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        isChecked
                                          ? "border-[#001D3D] bg-[#001D3D] text-[#F8C630]"
                                          : "border-slate-300"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 font-semibold gap-1.5"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </Button>
                              <Button
                                type="button"
                                onClick={handleNext}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#DEB12C] text-[#001D3D] font-bold text-sm rounded-xl shadow-sm gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 5 : Localisation Wallonne (Province & CP) ── */}
                        {step === 5 && (
                          <motion.fieldset
                            key="step5"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            <legend className="text-sm sm:text-base font-bold text-slate-800 mb-2 block">
                              Dans quelle région wallonne se situe votre projet ?
                            </legend>

                            <div>
                              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                Sélectionnez votre province
                              </Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                {WALLONIA_PROVINCES.map((prov) => {
                                  const isSelected = province === prov.value
                                  return (
                                    <button
                                      key={prov.value}
                                      type="button"
                                      onClick={() => setProvince(prov.value)}
                                      className={`p-3 rounded-xl border-2 text-center font-bold text-xs sm:text-sm transition-all ${
                                        isSelected
                                          ? "border-[#001D3D] bg-[#001D3D] text-[#F8C630] shadow-sm"
                                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                      }`}
                                    >
                                      {prov.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                              <div>
                                <Label htmlFor="postalCode" className="text-xs font-bold text-slate-600">
                                  Code postal (4 chiffres) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="postalCode"
                                  inputMode="numeric"
                                  pattern="[0-9]{4}"
                                  maxLength={4}
                                  placeholder="Ex. : 4000"
                                  value={postalCode}
                                  onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                  className={`h-12 mt-1 rounded-xl text-base ${showPostalCodeError ? "border-red-500" : ""}`}
                                />
                                {showPostalCodeError && (
                                  <p className="text-xs text-red-500 mt-1 font-medium">Code postal belge requis (4 chiffres).</p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="city" className="text-xs font-bold text-slate-600">
                                  Commune (facultatif)
                                </Label>
                                <Input
                                  id="city"
                                  placeholder="Ex. : Liège, Namur, Wavre..."
                                  value={city}
                                  onChange={(e) => setCity(e.target.value.slice(0, 60))}
                                  className="h-12 mt-1 rounded-xl text-base"
                                />
                              </div>
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 font-semibold gap-1.5"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </Button>
                              <Button
                                type="button"
                                onClick={() => {
                                  if (postalCode.trim().length >= 4) {
                                    handleNext()
                                  } else {
                                    setHasAttemptedSubmit(true)
                                  }
                                }}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#DEB12C] text-[#001D3D] font-bold text-sm rounded-xl shadow-sm gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 6 : Coordonnées de contact ── */}
                        {step === 6 && (
                          <motion.fieldset
                            key="step6"
                            initial={{ opacity: 0, x: 15 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -15 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            <legend className="text-sm sm:text-base font-bold text-slate-800 mb-1 block">
                              Où pouvons-nous vous transmettre vos devis ?
                            </legend>
                            <p className="text-xs text-slate-500 mb-3">
                              Vos coordonnées ne sont transmises qu&apos;aux installateurs sélectionnés pour votre étude.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="firstName" className="text-xs font-bold text-slate-700">
                                  Prénom <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="firstName"
                                  autoComplete="given-name"
                                  placeholder="Ex. : Julien"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                  className={`h-11 mt-1 rounded-xl text-sm ${showFirstNameError ? "border-red-500" : ""}`}
                                />
                                {showFirstNameError && (
                                  <p className="text-[11px] text-red-500 mt-1">Prénom requis (min. 2 lettres).</p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="lastName" className="text-xs font-bold text-slate-700">
                                  Nom <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="lastName"
                                  autoComplete="family-name"
                                  placeholder="Ex. : Dubois"
                                  value={lastName}
                                  onChange={(e) => setLastName(e.target.value)}
                                  className={`h-11 mt-1 rounded-xl text-sm ${showLastNameError ? "border-red-500" : ""}`}
                                />
                                {showLastNameError && (
                                  <p className="text-[11px] text-red-500 mt-1">Nom requis (min. 2 lettres).</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                                  E-mail <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="email"
                                  type="email"
                                  autoComplete="email"
                                  placeholder="nom@exemple.be"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className={`h-11 mt-1 rounded-xl text-sm ${showEmailError ? "border-red-500" : ""}`}
                                />
                                {showEmailError && (
                                  <p className="text-[11px] text-red-500 mt-1">{emailErr}</p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="phone" className="text-xs font-bold text-slate-700">
                                  Téléphone <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="phone"
                                  type="tel"
                                  autoComplete="tel"
                                  placeholder="0470 12 34 56"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  className={`h-11 mt-1 rounded-xl text-sm ${showPhoneError ? "border-red-500" : ""}`}
                                />
                                {showPhoneError && (
                                  <p className="text-[11px] text-red-500 mt-1">{phoneErr}</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="address" className="text-xs font-bold text-slate-700">
                                Adresse (Rue et numéro)
                              </Label>
                              <Input
                                id="address"
                                autoComplete="street-address"
                                placeholder="Ex. : Rue de la Station 24"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="h-11 mt-1 rounded-xl text-sm"
                              />
                            </div>

                            <div>
                              <Label htmlFor="remarks" className="text-xs font-bold text-slate-700">
                                Précisions sur votre projet <span className="text-slate-400 font-normal">(facultatif)</span>
                              </Label>
                              <textarea
                                id="remarks"
                                rows={2}
                                placeholder="Ex. : Présence d'un compteur bi-horaire, souhait d'ajouter une batterie, orientation sud..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
                                className="w-full mt-1 p-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#001D3D]"
                              />
                            </div>

                            {/* Cases à cocher RGPD */}
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <Checkbox
                                  id="partnerConsent"
                                  checked={partnerConsent}
                                  onCheckedChange={(c) => setPartnerConsent(c === true)}
                                  className="mt-0.5"
                                />
                                <span className="text-xs text-slate-600 leading-tight">
                                  J&apos;accepte que mes coordonnées soient transmises à un maximum de 4 installateurs certifiés RESCERT pour recevoir mes devis comparatifs gratuits conformément à la{" "}
                                  <Link href="/politique-confidentialite" target="_blank" className="underline text-[#001D3D]">
                                    politique de confidentialité
                                  </Link>.
                                </span>
                              </label>
                              {showConsentError && (
                                <p className="text-[11px] text-red-500 font-medium">Ce consentement est requis pour recevoir vos devis.</p>
                              )}

                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <Checkbox
                                  id="newsletterConsent"
                                  checked={newsletterConsent}
                                  onCheckedChange={(c) => setNewsletterConsent(c === true)}
                                  className="mt-0.5"
                                />
                                <span className="text-xs text-slate-500 leading-tight">
                                  Je souhaite recevoir occasionnellement les actualités solaires et conseils d&apos;Aegis Solaire (facultatif).
                                </span>
                              </label>
                            </div>

                            {errorMessage && (
                              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                                {errorMessage}
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-between gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="px-4 h-12 rounded-xl text-slate-700 font-semibold gap-1.5"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </Button>
                              <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 h-12 bg-[#F8C630] hover:bg-[#DEB12C] text-[#001D3D] font-extrabold text-sm sm:text-base rounded-xl shadow-md gap-2"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Envoi en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Recevoir mes devis gratuits</span>
                                    <ArrowRight className="h-4 w-4" />
                                  </>
                                )}
                              </Button>
                            </div>

                            <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1.5">
                              <Lock className="h-3 w-3" />
                              <span>100 % gratuit &amp; sans engagement · Vos données restent confidentielles</span>
                            </p>
                          </motion.fieldset>
                        )}
                      </AnimatePresence>
                    </form>
                  </>
                ) : (
                  /* ── ÉCRAN DE SUCCÈS ── */
                  <div className="py-8 text-center space-y-4">
                    <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-black text-[#001D3D]">
                      Demande enregistrée avec succès !
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      Merci <strong className="text-slate-800">{firstName}</strong>. Votre demande de devis comparatifs pour la région de{" "}
                      <strong className="text-slate-800 capitalize">{province}</strong> a bien été prise en compte.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2 text-xs sm:text-sm text-slate-700">
                      <p className="font-bold text-[#001D3D] flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        Prochaines étapes (sous 48 h) :
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        <li>Sélection de jusqu&apos;à 4 installateurs certifiés RESCERT locaux.</li>
                        <li>Prise de contact téléphonique pour affiner l&apos;exposition de votre toiture.</li>
                        <li>Envoi de vos devis chiffrés et comparables sans engagement.</li>
                      </ul>
                    </div>
                    <div className="pt-2">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#001D3D] hover:underline"
                      >
                        Retourner sur la page d&apos;accueil
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── BARRE DE CONFIANCE (Trust Bar) ── */}
      <section className="bg-white border-y border-slate-200 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-[#001D3D]">100 %</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">Installateurs agréés RESCERT</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-[#001D3D]">Jusqu&apos;à 4</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">Devis comparatifs détaillés</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-[#001D3D]">0 €</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">Gratuit et sans engagement</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-black text-[#001D3D]">48 h</p>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">Délai moyen de prise de contact</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE EN 3 ÉTAPES ── */}
      <section className="py-12 sm:py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-[#001D3D] bg-slate-200/60 px-3 py-1 rounded-full">
              Processus simple &amp; transparent
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#001D3D] mt-3">
              Comment ça marche en 3 étapes ?
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Nous facilitons la comparaison pour vous éviter les arnaques et les prix excessifs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Remplissez le formulaire (45 sec)",
                desc: "Indiquez votre type de bien, toiture et consommation estimée. Nous ciblons les installateurs disposant des qualifications adaptées à votre projet.",
              },
              {
                num: "02",
                title: "Sélection d'experts locaux",
                desc: "Nous transmettons votre demande à des installateurs certifiés RESCERT de votre province. Une brève prise de contact permet d'affiner votre étude.",
              },
              {
                num: "03",
                title: "Comparez jusqu'à 4 devis",
                desc: "Recevez les offres détaillées directement chez vous. Comparez les garanties constructeurs, les prix et choisissez librement avec qui travailler — ou personne.",
              },
            ].map((stepItem, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm relative overflow-hidden"
              >
                <span className="text-4xl font-black text-slate-200 block mb-3">
                  {stepItem.num}
                </span>
                <h3 className="text-lg font-bold text-[#001D3D] mb-2">{stepItem.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{stepItem.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-[#F8C630] hover:bg-[#DEB12C] text-[#001D3D] font-bold text-sm shadow-sm transition-all"
            >
              <span>Lancer ma comparaison maintenant</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ── */}
      <section className="py-12 sm:py-16 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[#001D3D]">
              Foire aux questions
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Toutes les réponses pour aborder votre transition solaire en toute sérénité.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div
                  key={index}
                  className="border border-slate-200 rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left p-4 sm:p-5 font-bold text-sm sm:text-base text-[#001D3D] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-[#001D3D]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 pt-1 sm:px-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ÉPURÉ ── */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-200">
              Aegis Solaire · Économie d&apos;énergie et conformité en Wallonie
            </p>
            <p className="text-slate-500 mt-1">
              Édité par INIT42 (Nathan Remacle) · BCE 1039.899.980 · Liège, Belgique
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/mentions-legales" className="hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="/politique-confidentialite" className="hover:text-white transition-colors">
              Politique de confidentialité
            </Link>
            <Link href="/cgv" className="hover:text-white transition-colors">
              CGV
            </Link>
          </div>
        </div>
      </footer>

      {/* ── MODALE "COMMENT ÇA MARCHE ?" (Interactive How-To) ── */}
      <AnimatePresence>
        {isHowItWorksOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative"
            >
              <button
                onClick={() => setIsHowItWorksOpen(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-xl font-black text-[#001D3D] mb-4 pr-8">
                Comment ça marche en 3 étapes
              </h3>

              <ol className="space-y-4 text-xs sm:text-sm text-slate-600">
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#001D3D] text-[#F8C630] font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="block text-slate-800 font-bold mb-0.5">
                      Remplissez le formulaire en 45 secondes
                    </strong>
                    Indiquez vos besoins en quelques clics. Service 100 % gratuit et sans engagement.
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#001D3D] text-[#F8C630] font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="block text-slate-800 font-bold mb-0.5">
                      Sélection d&apos;artisans RESCERT agréés
                    </strong>
                    Nous transmettons votre projet à des professionnels reconnus proches de chez vous.
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#001D3D] text-[#F8C630] font-black text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="block text-slate-800 font-bold mb-0.5">
                      Recevez jusqu&apos;à 4 devis comparatifs
                    </strong>
                    Comparez les offres tranquillement chez vous. Vous êtes totalement libre de choisir votre installateur — ou aucun.
                  </div>
                </li>
              </ol>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setIsHowItWorksOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#001D3D] text-white font-bold text-sm hover:bg-[#002A45] transition-colors"
                >
                  Compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
