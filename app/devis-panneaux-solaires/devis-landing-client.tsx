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
  Clock,
  ChevronDown,
  BadgeCheck,
  Sparkles,
  MapPin,
  FileText,
  BadgeEuro,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { getEmailError, getPhoneError } from "@/lib/leads-validation"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { trackLeadConversion } from "@/components/analytics/ad-tracking"

// ── Options du formulaire inspirées de Bobex ──
const CONSUMPTION_OPTIONS = [
  { id: "lt_3000", label: "Moins de 3.000 kWh", sublabel: "1 à 2 personnes (petit foyer)", billValue: 1200 },
  { id: "3000_4000", label: "3.000 à 4.000 kWh", sublabel: "2 à 3 personnes", billValue: 1800 },
  { id: "4000_5000", label: "4.000 à 5.000 kWh", sublabel: "3 à 4 personnes (standard belge)", billValue: 2400 },
  { id: "5000_6000", label: "5.000 à 6.000 kWh", sublabel: "4 à 5 personnes", billValue: 3100 },
  { id: "gt_6000", label: "Plus de 6.000 kWh", sublabel: "Grand foyer, pompe à chaleur ou borne VE", billValue: 4500 },
]

const PROPERTY_TYPES = [
  { id: "maison_4f", label: "Maison individuelle", sublabel: "4 façades (villa, pavillon)", icon: Home },
  { id: "maison_mitoyenne", label: "Maison mitoyenne", sublabel: "2 ou 3 façades (ville, rangée)", icon: Building },
]

const OWNERSHIP_OPTIONS = [
  { id: "proprietaire", label: "Oui, je suis propriétaire", sublabel: "Décision directe d'installation" },
  { id: "locataire", label: "Non, je suis locataire", sublabel: "Accord préalable du propriétaire requis" },
  { id: "copropriete", label: "Copropriété", sublabel: "Décision soumise au syndic / ACP" },
]

const ROOF_OPTIONS = [
  { id: "tuiles", label: "Toit incliné en tuiles", sublabel: "Revêtement le plus fréquent en Wallonie" },
  { id: "ardoises", label: "Toit incliné en ardoises", sublabel: "Fixations et crochets spécifiques" },
  { id: "plat", label: "Toit plat (Roofing / EPDM)", sublabel: "Pose sur structures lestées orientées sud/est-ouest" },
  { id: "autre", label: "Autre / Pose au sol", sublabel: "Étudié sur mesure avec l'installateur" },
]

const WALLONIA_PROVINCES = [
  { value: "liege", label: "Liège", prefix: ["4"] },
  { value: "hainaut", label: "Hainaut", prefix: ["7", "6"] },
  { value: "namur", label: "Namur", prefix: ["5"] },
  { value: "brabant_wallon", label: "Brabant wallon", prefix: ["13", "14"] },
  { value: "luxembourg", label: "Luxembourg", prefix: ["66", "67", "68", "69"] },
] as const

const FAQ_ITEMS = [
  {
    q: "Combien de devis vais-je recevoir ?",
    a: "Vous recevrez jusqu'à 3 devis chiffrés et comparables d'installateurs photovoltaïques certifiés RESCERT actifs directement dans votre province ou commune.",
  },
  {
    q: "Ce service est-il réellement 100 % gratuit et sans engagement ?",
    a: "Oui, totalement 0 €. Notre mission est de vous faire économiser du temps et de l'argent en mettant en concurrence des artisans locaux sérieux. Vous êtes entièrement libre d'accepter une offre — ou de n'en choisir aucune.",
  },
  {
    q: "Pourquoi exiger des installateurs certifiés RESCERT ?",
    a: "Le label RESCERT Photovoltaïque est la certification officielle de compétence en Wallonie. Il garantit la conformité électrique (RGIE), un dimensionnement conforme et la validation technique pour les raccordements réseau Ores / Resa.",
  },
  {
    q: "Quel est le délai pour recevoir mes offres ?",
    a: "Après validation de votre demande, nos installateurs partenaires prennent contact en moyenne sous 24 à 48 heures ouvrées pour affiner vos spécificités de toiture et vous transmettre votre devis sur mesure.",
  },
  {
    q: "Comment fonctionne l'autoconsommation avec le compteur communicant ?",
    a: "En Wallonie, les nouvelles installations fonctionnent avec un compteur bidirectionnel. L'électricité solaire consommée en direct sur place évite l'achat au tarif fort du réseau. Le surplus non consommé est racheté via un contrat d'injection auprès de votre fournisseur.",
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
  const isPostalCodeValid = postalCode.trim().length === 4

  const showFirstNameError = hasAttemptedSubmit && !isFirstNameValid
  const showLastNameError = hasAttemptedSubmit && !isLastNameValid
  const showEmailError = hasAttemptedSubmit && !!emailErr
  const showPhoneError = hasAttemptedSubmit && !!phoneErr
  const showPostalCodeError = hasAttemptedSubmit && !isPostalCodeValid
  const showConsentError = hasAttemptedSubmit && !partnerConsent

  // Détection intelligente de la province au fur et à mesure de la frappe du CP
  const handlePostalCodeChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "").slice(0, 4)
    setPostalCode(cleaned)
    if (cleaned.length >= 2) {
      if (cleaned.startsWith("4")) setProvince("liege")
      else if (cleaned.startsWith("7") || (cleaned.startsWith("6") && Number(cleaned) < 6600)) setProvince("hainaut")
      else if (cleaned.startsWith("5")) setProvince("namur")
      else if (cleaned.startsWith("13") || cleaned.startsWith("14")) setProvince("brabant_wallon")
      else if (cleaned.startsWith("66") || cleaned.startsWith("67") || cleaned.startsWith("68") || cleaned.startsWith("69")) setProvince("luxembourg")
    }
  }

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
      if (typeof window !== "undefined" && window.innerWidth <= 768) {
        scrollToForm()
      }
    }
  }

  const handleOptionSelect = (setter: (val: string) => void, val: string) => {
    setter(val)
    if (step < 5) {
      setTimeout(() => {
        setStep((s) => Math.min(totalSteps, s + 1))
        if (typeof window !== "undefined" && window.innerWidth <= 768) {
          scrollToForm()
        }
      }, 180)
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

    const roofMaterialMap: Record<string, "tuiles" | "ardoises" | "plat_epdm" | "zinc_autre"> = {
      tuiles: "tuiles",
      ardoises: "ardoises",
      plat: "plat_epdm",
      autre: "zinc_autre",
    }

    const ownershipMap: Record<string, "owner" | "tenant_unauthorized" | "co_ownership"> = {
      proprietaire: "owner",
      locataire: "tenant_unauthorized",
      copropriete: "co_ownership",
    }

    const payload = {
      segment: "B2C",
      sourceForm: "b2c_devis_landing",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      surfaceType: "toiture",
      surfaceArea: selectedBill >= 3100 ? 55 : selectedBill >= 2400 ? 45 : 35,
      province,
      provinceFreeText: `${postalCode.trim()}${city.trim() ? ` ${city.trim()}` : ""}`,
      postalCode: postalCode.trim(),
      city: city.trim() || undefined,
      siteAddress: address.trim() || undefined,
      roofMaterial: roofMaterialMap[roofType] ?? "tuiles",
      ownershipStatus: ownershipMap[ownership] ?? "owner",
      annualElectricityBill: selectedBill,
      marketingConsent: partnerConsent,
      newsletterConsent,
      projectDetails: [
        `Source: Landing Bobex-Style (B2C)`,
        `Consommation annuelle: ${consumption}`,
        `Type de bien: ${propertyType}`,
        `Statut: ${ownership}`,
        `Couverture: ${roofType}`,
        address.trim() ? `Adresse: ${address.trim()}` : "",
        remarks.trim() ? `Précisions: ${remarks.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      qualificationMetadata: {
        consumptionKwh: consumption,
        propertyType,
        ownershipChoice: ownership,
        roofType,
        remarks: remarks.trim() || null,
      },
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
        segment: "B2C",
        leadId: resData?.leadId,
        value: 40,
      })
      setSubmitted(true)
      window.scrollTo({ top: 80, behavior: "smooth" })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercent = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-[#F6F9FC] text-slate-800 flex flex-col font-sans selection:bg-[#F8C630] selection:text-[#002A45]">
      
      {/* ── Entête épurée Bobex-Style (Minimaliste, pas de fuite de trafic) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Aegis Solaire, accueil">
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

          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 px-3.5 py-1 text-xs font-bold text-emerald-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Installateurs certifiés RESCERT</span>
            </div>
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#002A45] bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl shadow-[0_4px_0_0_#DEB12C] transition-all"
            >
              <span>Comparer les devis</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION PRINCIPALE ── */}
      <section className="relative overflow-hidden py-6 sm:py-10 lg:py-14 bg-gradient-to-b from-[#FAFCFE] via-[#F4F7F9] to-[#EAEFF4]">
        
        {/* Grille technique & halos d'ambiance d'arrière-plan */}
        <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `radial-gradient(#002A45 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
            }}
          />
          <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] bg-amber-200/30 rounded-full blur-[110px]" />
          <div className="absolute -bottom-32 left-10 w-[450px] h-[450px] bg-sky-200/30 rounded-full blur-[110px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* ── EN-TÊTE MOBILE ULTRA-PUNCHY (Le formulaire apparaît immédiatement au-dessus sur mobile) ── */}
          <div className="lg:hidden mb-6 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200/80 px-3 py-1 rounded-full shadow-xs mb-3">
              <span className="font-extrabold text-[#002A45]">4.9 / 5</span>
              <span className="text-amber-500 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
              <span className="text-slate-300">·</span>
              <span>1.800+ demandes en Wallonie</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#002A45] leading-[1.18]">
              La meilleure offre solaire&nbsp;?{" "}
              <span className="block mt-1">
                Comparez <span className="underline decoration-[#F8C630] decoration-4 underline-offset-4">jusqu&apos;à 3 devis</span>.
              </span>
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Gratuit, sans engagement et réponse sous 48 h par des artisans agréés RESCERT.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* ── COLONNE GAUCHE (DESKTOP) : Accroche forte, puces et avis client ── */}
            <div className="lg:col-span-6 flex flex-col justify-start">
              
              {/* Badge Preuve Sociale (Desktop) */}
              <div className="hidden lg:inline-flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3 bg-white/90 border border-slate-200/80 w-fit px-3.5 py-1 rounded-full shadow-xs">
                <span className="font-extrabold text-[#002A45]">4.9 / 5</span>
                <span className="text-amber-500 flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-slate-800">Réseau d&apos;experts agréés en Wallonie</span>
              </div>

              {/* Titre Principal Desktop (Sans retour à la ligne orphelin) */}
              <h1 className="hidden lg:block text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-[#002A45] leading-[1.12]">
                <span className="block">La meilleure offre solaire&nbsp;?</span>
                <span className="block mt-2">
                  Comparez <span className="relative inline-block px-1 text-[#002A45]"><span className="relative z-10">jusqu&apos;à 3 devis</span><span className="absolute bottom-1 left-0 right-0 h-3 bg-[#F8C630]/70 -rotate-1 rounded-sm -z-0"></span></span>.
                </span>
              </h1>

              {/* Sous-titre Desktop */}
              <p className="hidden lg:block mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Une seule demande, des <strong>installateurs certifiés RESCERT locaux</strong>. Gratuit, sans aucun engagement et réponse garantie sous 48 h.
              </p>

              {/* 3 Avantages clés Bobex avec infobulles interactives */}
              <div className="hidden lg:block mt-6">
                <ul className="space-y-3.5 max-w-xl">
                  {[
                    {
                      id: 1,
                      text: "Économisez jusqu'à 70 % sur votre facture d'électricité",
                      tooltip:
                        "Une installation dimensionnée selon votre profil couvre vos consommations journalières et vous prémunit contre la volatilité des tarifs réseau en Wallonie.",
                    },
                    {
                      id: 2,
                      text: "Installateurs certifiés RESCERT de votre région",
                      tooltip:
                        "Tous les professionnels du réseau possèdent le certificat RESCERT Photovoltaïque en règle, garantissant la conformité RGIE et l'accès aux démarches GRD (Ores/Resa).",
                    },
                    {
                      id: 3,
                      text: "Réponse sous 48 h, sans aucune obligation",
                      tooltip:
                        "Vous recevez jusqu'à 4 propositions techniques et financières détaillées. Vous comparez tranquillement depuis chez vous et décidez librement de signer ou non.",
                    },
                  ].map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <span className="h-6 w-6 rounded-full bg-[#002A45] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </span>
                      <div className="text-sm sm:text-base font-semibold text-slate-800 leading-snug">
                        <span>{item.text}</span>
                        <button
                          type="button"
                          onClick={() => setActiveTooltip(activeTooltip === item.id ? null : item.id)}
                          className="inline-flex ml-1.5 text-slate-400 hover:text-[#002A45] transition-colors align-middle"
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

                {/* Lien interactif modal "Comment ça marche ?" */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setIsHowItWorksOpen(true)}
                    className="text-xs sm:text-sm font-bold text-slate-700 underline underline-offset-4 hover:text-[#002A45] transition-colors"
                  >
                    Comment ça marche ?
                  </button>
                </div>
              </div>

              {/* Témoignage client authentique façon Bobex (Desktop) */}
              <div className="hidden lg:block mt-8 pt-6 border-t border-slate-200/80 max-w-xl">
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-full bg-[#002A45] text-[#F8C630] font-black flex items-center justify-center text-sm shrink-0">
                    JD
                  </div>
                  <div>
                    <div className="flex gap-0.5 text-amber-400 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <blockquote className="text-xs sm:text-sm italic text-slate-700 leading-relaxed">
                      « Trois devis reçus en 48 heures, un écart de près de 1.850 € pour des panneaux de même puissance. Sans comparaison, j&apos;aurais payé bien trop cher. »
                    </blockquote>
                    <p className="mt-1.5 text-xs text-slate-500 font-medium">
                      <strong className="text-slate-800">Julien Dubois</strong> · Chaudfontaine (Province de Liège)
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ── COLONNE DROITE : La Lead Card (LE FORMULAIRE AU PREMIER PLAN) ── */}
            <div ref={leadCardRef} className="lg:col-span-6 scroll-mt-20 w-full">
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_rgba(0,42,69,0.08)] overflow-hidden p-5 sm:p-7 md:p-8">
                
                {!submitted ? (
                  <>
                    {/* Header de la Lead Card */}
                    <div className="mb-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                          Installateurs RESCERT
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          Étape {step} sur {totalSteps}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-[#002A45] tracking-tight">
                        Remplissez et économisez
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        En 45 secondes, trouvez jusqu&apos;à 3 installateurs agréés près de chez vous.
                      </p>

                      {/* Micro-badges de réassurance */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {["Gratuit & sans engagement", "Spécialistes locaux", "Réponse 48h"].map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#002A45] bg-slate-100 px-2.5 py-0.5 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stepper connecté à 6 étapes + Barre fluide */}
                    <div className="mb-6 pt-1">
                      <div className="flex items-center justify-between mb-2 px-1">
                        {[1, 2, 3, 4, 5, 6].map((num) => {
                          const isDone = num < step
                          const isCurrent = num === step
                          return (
                            <div
                              key={num}
                              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                                isDone
                                  ? "bg-emerald-600 text-white"
                                  : isCurrent
                                  ? "bg-[#002A45] text-[#F8C630] ring-2 ring-[#002A45]/20"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : num}
                            </div>
                          )
                        })}
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[#F8C630]"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>

                    {/* ── Formulaire Multi-étapes ── */}
                    <form onSubmit={handleSubmit} noValidate>
                      {/* Honeypot invisible */}
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
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-extrabold text-[#002A45] mb-2 block">
                              Quelle est votre consommation d&apos;électricité annuelle (estimée)&nbsp;?
                            </legend>

                            <div className="space-y-2">
                              {CONSUMPTION_OPTIONS.map((item) => {
                                const isChecked = consumption === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setConsumption, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#002A45] bg-[#002A45]/[0.03] shadow-xs"
                                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-[#F8FAFD]"
                                    }`}
                                  >
                                    <div className="flex flex-col pr-4">
                                      <span className="text-sm sm:text-base font-extrabold text-[#002A45]">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-slate-500 mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                          ? "border-[#002A45] bg-[#002A45] text-[#F8C630]"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-3 flex justify-end">
                              <button
                                type="button"
                                onClick={handleNext}
                                className="w-full sm:w-auto px-6 h-12 bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-extrabold text-sm rounded-xl shadow-[0_4px_0_0_#DEB12C] transition-all flex items-center justify-center gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 2 : Type de bâtiment ── */}
                        {step === 2 && (
                          <motion.fieldset
                            key="step2"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-extrabold text-[#002A45] mb-2 block">
                              De quel type de bâtiment s&apos;agit-il&nbsp;?
                            </legend>

                            <div className="space-y-2">
                              {PROPERTY_TYPES.map((item) => {
                                const isChecked = propertyType === item.id
                                const Icon = item.icon
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setPropertyType, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#002A45] bg-[#002A45]/[0.03] shadow-xs"
                                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-[#F8FAFD]"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 pr-4">
                                      <div
                                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                          isChecked ? "bg-[#002A45] text-[#F8C630]" : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm sm:text-base font-extrabold text-[#002A45]">
                                          {item.label}
                                        </span>
                                        <span className="text-xs text-slate-500 mt-0.5">
                                          {item.sublabel}
                                        </span>
                                      </div>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                          ? "border-[#002A45] bg-[#002A45] text-[#F8C630]"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            {/* Encart orientation PME / Tertiaire vers B2B */}
                            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                              <div>
                                <p className="font-extrabold text-[#001D3D] flex items-center gap-1.5">
                                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                                  <span>Bâtiment d&apos;activité, commerce ou PME ?</span>
                                </p>
                                <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                                  Accédez à notre simulateur de rentabilité B2B dédié (PPA, tiers-investissement zéro CAPEX &amp; ombrières).
                                </p>
                              </div>
                              <Link
                                href="/#simulateur"
                                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#001D3D] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#002D5A] transition-colors"
                              >
                                <span>Simulateur B2B</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-sm gap-1.5 flex items-center transition-all"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-extrabold text-sm rounded-xl shadow-[0_4px_0_0_#DEB12C] transition-all flex items-center gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 3 : Propriétaire ou locataire ── */}
                        {step === 3 && (
                          <motion.fieldset
                            key="step3"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-extrabold text-[#002A45] mb-2 block">
                              Êtes-vous propriétaire du bâtiment&nbsp;?
                            </legend>

                            <div className="space-y-2">
                              {OWNERSHIP_OPTIONS.map((item) => {
                                const isChecked = ownership === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setOwnership, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#002A45] bg-[#002A45]/[0.03] shadow-xs"
                                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-[#F8FAFD]"
                                    }`}
                                  >
                                    <div className="flex flex-col pr-4">
                                      <span className="text-sm sm:text-base font-extrabold text-[#002A45]">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-slate-500 mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                          ? "border-[#002A45] bg-[#002A45] text-[#F8C630]"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-sm gap-1.5 flex items-center transition-all"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-extrabold text-sm rounded-xl shadow-[0_4px_0_0_#DEB12C] transition-all flex items-center gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 4 : Type de toiture ── */}
                        {step === 4 && (
                          <motion.fieldset
                            key="step4"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                          >
                            <legend className="text-sm sm:text-base font-extrabold text-[#002A45] mb-2 block">
                              Quel est le type de votre toiture&nbsp;?
                            </legend>

                            <div className="space-y-2">
                              {ROOF_OPTIONS.map((item) => {
                                const isChecked = roofType === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setRoofType, item.id)}
                                    className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all ${
                                      isChecked
                                        ? "border-[#002A45] bg-[#002A45]/[0.03] shadow-xs"
                                        : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-[#F8FAFD]"
                                    }`}
                                  >
                                    <div className="flex flex-col pr-4">
                                      <span className="text-sm sm:text-base font-extrabold text-[#002A45]">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-slate-500 mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                          ? "border-[#002A45] bg-[#002A45] text-[#F8C630]"
                                          : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-sm gap-1.5 flex items-center transition-all"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-extrabold text-sm rounded-xl shadow-[0_4px_0_0_#DEB12C] transition-all flex items-center gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 5 : Localisation Wallonne (Province & CP) ── */}
                        {step === 5 && (
                          <motion.fieldset
                            key="step5"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-4"
                          >
                            <legend className="text-sm sm:text-base font-extrabold text-[#002A45] mb-1 block">
                              Où se situe votre habitation en Wallonie&nbsp;?
                            </legend>

                            <div>
                              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                                1. Province wallonne
                              </Label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {WALLONIA_PROVINCES.map((prov) => {
                                  const isSelected = province === prov.value
                                  return (
                                    <button
                                      key={prov.value}
                                      type="button"
                                      onClick={() => setProvince(prov.value)}
                                      className={`p-3 rounded-xl border-2 text-center font-extrabold text-xs sm:text-sm transition-all ${
                                        isSelected
                                          ? "border-[#002A45] bg-[#002A45] text-[#F8C630] shadow-sm"
                                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
                                <Label htmlFor="postalCode" className="text-xs font-bold text-slate-700 block">
                                  2. Code postal (4 chiffres) <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="postalCode"
                                  inputMode="numeric"
                                  pattern="[0-9]{4}"
                                  maxLength={4}
                                  placeholder="ex. 4000"
                                  value={postalCode}
                                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                                  className={`h-12 mt-1.5 rounded-xl text-base font-semibold ${
                                    showPostalCodeError ? "border-red-500 ring-1 ring-red-500" : "border-slate-300"
                                  }`}
                                />
                                {showPostalCodeError && (
                                  <p className="text-xs text-red-500 mt-1 font-semibold">
                                    Veuillez indiquer un code postal belge à 4 chiffres.
                                  </p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="city" className="text-xs font-bold text-slate-700 block">
                                  3. Commune <span className="text-slate-400 font-normal">(facultatif)</span>
                                </Label>
                                <Input
                                  id="city"
                                  placeholder="ex. Liège, Namur, Wavre..."
                                  value={city}
                                  onChange={(e) => setCity(e.target.value.slice(0, 60))}
                                  className="h-12 mt-1.5 rounded-xl text-base border-slate-300"
                                />
                              </div>
                            </div>

                            <div className="pt-3 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-5 h-12 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-sm gap-1.5 flex items-center transition-all"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isPostalCodeValid) {
                                    handleNext()
                                  } else {
                                    setHasAttemptedSubmit(true)
                                  }
                                }}
                                className="px-6 h-12 bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-extrabold text-sm rounded-xl shadow-[0_4px_0_0_#DEB12C] transition-all flex items-center gap-2"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 6 : Coordonnées de contact (Bobex Final Step) ── */}
                        {step === 6 && (
                          <motion.fieldset
                            key="step6"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3.5"
                          >
                            <div>
                              <legend className="text-sm sm:text-base font-extrabold text-[#002A45] block">
                                Où pouvons-nous envoyer vos devis&nbsp;?
                              </legend>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Vos données ne sont transmises qu&apos;aux installateurs agréés sélectionnés pour votre projet.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <Label htmlFor="firstName" className="text-xs font-bold text-slate-700">
                                  Prénom <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="firstName"
                                  autoComplete="given-name"
                                  placeholder="ex. Sophie"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                  className={`h-11 mt-1 rounded-xl text-sm ${
                                    showFirstNameError ? "border-red-500 ring-1 ring-red-500" : "border-slate-300"
                                  }`}
                                />
                                {showFirstNameError && (
                                  <p className="text-[11px] text-red-500 mt-1 font-semibold">Prénom requis (min. 2 lettres).</p>
                                )}
                              </div>

                              <div>
                                <Label htmlFor="lastName" className="text-xs font-bold text-slate-700">
                                  Nom <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="lastName"
                                  autoComplete="family-name"
                                  placeholder="ex. Dupont"
                                  value={lastName}
                                  onChange={(e) => setLastName(e.target.value)}
                                  className={`h-11 mt-1 rounded-xl text-sm ${
                                    showLastNameError ? "border-red-500 ring-1 ring-red-500" : "border-slate-300"
                                  }`}
                                />
                                {showLastNameError && (
                                  <p className="text-[11px] text-red-500 mt-1 font-semibold">Nom requis (min. 2 lettres).</p>
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
                                  className={`h-11 mt-1 rounded-xl text-sm ${
                                    showEmailError ? "border-red-500 ring-1 ring-red-500" : "border-slate-300"
                                  }`}
                                />
                                {showEmailError && (
                                  <p className="text-[11px] text-red-500 mt-1 font-semibold">{emailErr}</p>
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
                                  className={`h-11 mt-1 rounded-xl text-sm ${
                                    showPhoneError ? "border-red-500 ring-1 ring-red-500" : "border-slate-300"
                                  }`}
                                />
                                {showPhoneError && (
                                  <p className="text-[11px] text-red-500 mt-1 font-semibold">{phoneErr}</p>
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
                                placeholder="ex. Rue de la Station 12"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="h-11 mt-1 rounded-xl text-sm border-slate-300"
                              />
                            </div>

                            <div>
                              <Label htmlFor="remarks" className="text-xs font-bold text-slate-700">
                                Précisions sur votre projet <span className="text-slate-400 font-normal">(facultatif)</span>
                              </Label>
                              <textarea
                                id="remarks"
                                rows={2}
                                placeholder="ex. Orientation du toit, ajout d'une batterie, accès facile..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
                                className="w-full mt-1 p-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#002A45]"
                              />
                            </div>

                            {/* Case consentement RGPD obligatoire */}
                            <div className="space-y-2 pt-1 border-t border-slate-100">
                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <Checkbox
                                  id="partnerConsent"
                                  checked={partnerConsent}
                                  onCheckedChange={(c) => setPartnerConsent(c === true)}
                                  className="mt-0.5"
                                />
                                <span className="text-xs text-slate-600 leading-tight">
                                  J&apos;accepte que mes coordonnées soient transmises à un maximum de 3 installateurs agréés RESCERT pour recevoir mes devis comparatifs gratuits conformément à la{" "}
                                  <Link href="/politique-confidentialite" target="_blank" className="underline text-[#002A45] font-semibold">
                                    politique de confidentialité
                                  </Link>.
                                </span>
                              </label>
                              {showConsentError && (
                                <p className="text-[11px] text-red-500 font-bold">Veuillez cocher cette case pour valider votre demande.</p>
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
                              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
                                {errorMessage}
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 h-12 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold text-sm gap-1.5 flex items-center transition-all"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 h-12 bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-black text-sm sm:text-base rounded-xl shadow-[0_4px_0_0_#DEB12C] transition-all flex items-center justify-center gap-2"
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
                              </button>
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
                  /* ── Écran de Succès (Confirmation rassurante) ── */
                  <div className="py-8 text-center space-y-4">
                    <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <h3 className="text-2xl font-black text-[#002A45]">
                      Demande enregistrée avec succès&nbsp;!
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      Merci <strong className="text-slate-800">{firstName}</strong>. Votre demande de devis comparatifs pour la région de{" "}
                      <strong className="text-slate-800 capitalize">{province}</strong> a bien été prise en compte.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2 text-xs sm:text-sm text-slate-700">
                      <p className="font-bold text-[#002A45] flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        Prochaines étapes (sous 48 h) :
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        <li>Sélection de jusqu&apos;à 3 installateurs certifiés RESCERT de votre province.</li>
                        <li>Brève prise de contact pour affiner les contraintes de votre toiture.</li>
                        <li>Envoi de vos devis comparables sans engagement.</li>
                      </ul>
                    </div>
                    <div className="pt-2">
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs font-bold text-[#002A45] hover:underline"
                      >
                        Retourner sur la page d&apos;accueil
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── EN-DESSOUS DU FORMULAIRE SUR MOBILE : Puces réassurance et Avis ── */}
          <div className="lg:hidden mt-10 space-y-6">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
              <h3 className="text-base font-extrabold text-[#002A45] mb-3">
                Pourquoi comparer avec Aegis Solaire&nbsp;?
              </h3>
              <ul className="space-y-3">
                {[
                  {
                    id: 1,
                    text: "Économisez jusqu'à 70 % sur votre facture d'électricité",
                  },
                  {
                    id: 2,
                    text: "Installateurs certifiés RESCERT de votre région",
                  },
                  {
                    id: 3,
                    text: "Réponse sous 48 h, sans aucune obligation",
                  },
                ].map((item) => (
                  <li key={item.id} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                    <span className="h-5 w-5 rounded-full bg-[#002A45] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsHowItWorksOpen(true)}
                  className="text-xs font-bold text-slate-700 underline underline-offset-4"
                >
                  Comment ça marche ?
                </button>
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="text-xs font-extrabold text-[#002A45] flex items-center gap-1"
                >
                  <span>Démarrer</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Avis client Mobile */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-[#002A45] text-[#F8C630] font-black flex items-center justify-center text-xs shrink-0">
                JD
              </div>
              <div>
                <div className="flex gap-0.5 text-amber-400 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="text-xs italic text-slate-700 leading-relaxed">
                  « Trois devis reçus en 48 heures, un écart de près de 1.850 €. Sans comparaison, j&apos;aurais payé bien trop cher. »
                </blockquote>
                <p className="mt-1 text-[11px] text-slate-500">
                  <strong className="text-slate-800">Julien Dubois</strong> · Chaudfontaine (Province de Liège)
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── BARRE DE CONFIANCE (Trust Bar 4 piliers Bobex) ── */}
      <section className="bg-white border-y border-slate-200/90 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center">
            
            <div className="space-y-1">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 mb-1">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002A45]">100 %</p>
              <p className="text-xs sm:text-sm font-bold text-slate-600">Agréés RESCERT Wallonie</p>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-amber-50 text-amber-700 mb-1">
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002A45]">Jusqu&apos;à 3</p>
              <p className="text-xs sm:text-sm font-bold text-slate-600">Devis comparatifs détaillés</p>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 text-blue-700 mb-1">
                <BadgeEuro className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002A45]">0 €</p>
              <p className="text-xs sm:text-sm font-bold text-slate-600">Gratuit &amp; sans engagement</p>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-purple-50 text-purple-700 mb-1">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-2xl sm:text-3xl font-black text-[#002A45]">48 h</p>
              <p className="text-xs sm:text-sm font-bold text-slate-600">Délai moyen de prise de contact</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE EN 3 ÉTAPES (Explication Bobex) ── */}
      <section className="py-12 sm:py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#002A45] bg-slate-200/70 px-3 py-1 rounded-full">
              Processus simple &amp; transparent
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#002A45] mt-3">
              Comment ça marche en 3 étapes&nbsp;?
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Nous facilitons la comparaison pour vous éviter les prix excessifs et les installateurs non qualifiés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Remplissez le formulaire (45 sec)",
                desc: "Indiquez votre type de bien, votre toiture et votre commune wallonne. Le formulaire est instantané et 100 % gratuit.",
              },
              {
                num: "02",
                title: "Sélection d'experts certifiés",
                desc: "Nous transmettons votre demande à des installateurs certifiés RESCERT actifs dans votre région pour une analyse technique sur mesure.",
              },
              {
                num: "03",
                title: "Comparez jusqu'à 4 devis",
                desc: "Recevez les offres chiffrées chez vous. Comparez les garanties, les rendements, les prix et décidez en toute liberté avec qui signer.",
              },
            ].map((stepItem, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs relative overflow-hidden"
              >
                <span className="text-4xl font-black text-[#002A45]/15 block mb-2 font-mono">
                  {stepItem.num}
                </span>
                <h3 className="text-lg font-bold text-[#002A45] mb-2">{stepItem.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{stepItem.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 py-3.5 px-7 rounded-xl bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-extrabold text-sm shadow-[0_4px_0_0_#DEB12C] transition-all"
            >
              <span>Lancer ma comparaison maintenant</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION INTERACTIF ── */}
      <section className="py-12 sm:py-16 bg-white border-t border-slate-200/90">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[#002A45]">
              Foire aux questions
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Toutes les réponses pour aborder votre projet solaire en Wallonie en toute sérénité.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div
                  key={index}
                  className="border border-slate-200/90 rounded-2xl overflow-hidden transition-all shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left p-4 sm:p-5 font-bold text-sm sm:text-base text-[#002A45] flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-slate-400 shrink-0 transition-transform ${
                        isOpen ? "rotate-180 text-[#002A45]" : ""
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

      {/* ── FOOTER LÉGAL ALLÉGÉ INIT42 ── */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="font-semibold text-slate-200">
              Aegis Solaire · Comparateur indépendant d&apos;installateurs solaires en Wallonie
            </p>
            <p className="text-slate-500 mt-1">
              Édité par INIT42 (Nathan Remacle) · BCE 1039.899.980 · Liège, Belgique
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center font-medium">
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

      {/* ── MODALE "COMMENT ÇA MARCHE ?" ── */}
      {isHowItWorksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <button
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-all"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl sm:text-2xl font-black text-[#002A45] mb-2 pr-8">
              Comment ça marche en 3 étapes&nbsp;?
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Notre service est 100 % gratuit pour les particuliers et entreprises wallonnes.
            </p>

            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-full bg-[#002A45] text-[#F8C630] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="block text-sm font-bold text-slate-900">
                    Remplissez votre demande en 45 secondes
                  </strong>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Indiquez votre type de toiture, commune et consommation approximative. Aucune carte bancaire requise.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-full bg-[#002A45] text-[#F8C630] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="block text-sm font-bold text-slate-900">
                    Sélection d&apos;artisans RESCERT locaux
                  </strong>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Nous sollicitons jusqu&apos;à 4 professionnels certifiés de votre province pour une prise de contact rapide.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-full bg-[#002A45] text-[#F8C630] font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="block text-sm font-bold text-slate-900">
                    Comparez les devis et économisez
                  </strong>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Vous recevez les offres chiffrées et pouvez choisir la meilleure proposition en toute sérénité — ou aucune.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setIsHowItWorksOpen(false)
                  scrollToForm()
                }}
                className="w-full py-3 px-5 rounded-xl bg-[#F8C630] hover:bg-[#F2BA1F] active:translate-y-[2px] active:shadow-[0_1px_0_0_#DEB12C] text-[#002A45] font-extrabold text-sm shadow-[0_4px_0_0_#DEB12C] transition-all flex items-center justify-center gap-2"
              >
                <span>Faire ma demande gratuite</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
