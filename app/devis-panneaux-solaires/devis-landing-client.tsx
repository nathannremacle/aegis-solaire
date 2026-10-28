"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
  Star,
  MapPin,
  HelpCircle,
  X,
  Share2,
  Info,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { getEmailError, getPhoneError } from "@/lib/leads-validation"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { trackLeadConversion, trackInitiateCheckout } from "@/components/analytics/ad-tracking"

// ── Options du formulaire B2C (Wallonie) ──
const CONSUMPTION_OPTIONS = [
  { id: "lt_3000", label: "Moins de 3.000 kWh", sublabel: "1 à 2 personnes (Facture < 85 € / mois)", billValue: 1000 },
  { id: "3000_4000", label: "3.000 – 4.000 kWh", sublabel: "2 à 3 personnes (Facture ~85 à 115 € / mois)", billValue: 1800 },
  { id: "4000_5000", label: "4.000 – 5.000 kWh", sublabel: "3 à 4 personnes (Facture ~115 à 145 € / mois)", billValue: 2400 },
  { id: "5000_6000", label: "5.000 – 6.000 kWh", sublabel: "4 à 5 personnes (Facture ~145 à 175 € / mois)", billValue: 3100 },
  { id: "gt_6000", label: "Plus de 6.000 kWh", sublabel: "Grand foyer, PAC ou borne VE (> 175 € / mois)", billValue: 4500 },
]

const PROPERTY_TYPES = [
  { id: "maison_4f", label: "Maison individuelle", sublabel: "4 façades (villa, pavillon, plain-pied)" },
  { id: "maison_mitoyenne", label: "Maison mitoyenne", sublabel: "2 ou 3 façades (ville, rangée)" },
  { id: "immeuble_commercial", label: "Bâtiment professionnel / PME", sublabel: "Accédez au simulateur B2B dédié" },
]

const OWNERSHIP_OPTIONS = [
  { id: "proprietaire", label: "Oui, je suis propriétaire", sublabel: "Décision directe d'installation" },
  { id: "locataire", label: "Non, je suis locataire", sublabel: "Accord préalable du propriétaire bailleur requis" },
  { id: "copropriete", label: "Copropriété", sublabel: "Uniquement si mandaté au nom du syndic / ACP" },
]

const ROOF_OPTIONS = [
  { id: "tuiles", label: "Toit incliné en tuiles" },
  { id: "ardoises", label: "Toit incliné en ardoises" },
  { id: "plat", label: "Toit plat (Roofing / EPDM)" },
  { id: "autre", label: "Autre / Pose au sol" },
]

const ROOF_SURFACES = [
  { id: "small", label: "< 30 m²", sublabel: "≈ 3–4 kWc", m2: 25 },
  { id: "medium", label: "30–60 m²", sublabel: "≈ 5–8 kWc", m2: 45 },
  { id: "large", label: "> 60 m²", sublabel: "> 8 kWc", m2: 75 },
]

const STEP_TITLES = [
  "PROFIL CONSOMMATION",
  "TYPE DE BÂTIMENT",
  "STATUT D'OCCUPATION",
  "SPÉCIFICATIONS TOITURE",
  "LOCALISATION EN WALLONIE",
  "COORDONNÉES DE CONTACT",
]

const STEP_QUESTIONS = [
  "Quelle est votre consommation d'électricité annuelle (estimée) ?",
  "De quel type de bâtiment s'agit-il ?",
  "Êtes-vous propriétaire du bâtiment ?",
  "Spécifications de votre toiture pour panneaux solaires",
  "Où se situe votre bâtiment en Wallonie ?",
  "Où pouvons-nous envoyer votre étude & devis gratuit ?",
]

const TOOLTIPS = {
  economies: "En autoconsommant votre électricité solaire directe et en comparant les devis d'installateurs qualifiés pour obtenir le meilleur tarif du marché.",
  rescert: "Le label officiel obligatoire en Région Wallonne garantissant la qualification technique des professionnels, la conformité RGIE et la validation du raccordement.",
  sansEngagement: "Recevez jusqu'à 3 devis gratuits et sans aucun engagement. Vous comparez les offres tranquillement chez vous et restez totalement libre de choisir l'installateur de votre choix — ou aucun.",
}

export function DevisLandingClient() {
  const [step, setStep] = useState(1)
  const totalSteps = 6

  // Form values
  const [consumption, setConsumption] = useState("")
  const [propertyType, setPropertyType] = useState("")
  const [ownership, setOwnership] = useState("proprietaire")
  const [roofType, setRoofType] = useState("tuiles")
  const [roofSurface, setRoofSurface] = useState("medium")
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
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [hasCopiedLink, setHasCopiedLink] = useState(false)
  const hasTrackedStep5 = useRef(false)

  const formOpenedAt = useRef(new Date().toISOString())
  const leadCardRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string>("")

  // Capture des UTM et fbclid + initialisation session anonyme
  const [utmData, setUtmData] = useState<{
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
    fbclid?: string
  }>({})

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      let sid = sessionStorage.getItem("aegis_funnel_sid")
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36)
        sessionStorage.setItem("aegis_funnel_sid", sid)
      }
      sessionIdRef.current = sid

      const searchParams = new URLSearchParams(window.location.search)
      const utm = {
        utm_source: searchParams.get("utm_source") || undefined,
        utm_medium: searchParams.get("utm_medium") || undefined,
        utm_campaign: searchParams.get("utm_campaign") || undefined,
        utm_content: searchParams.get("utm_content") || undefined,
        utm_term: searchParams.get("utm_term") || undefined,
        fbclid: searchParams.get("fbclid") || undefined,
      }
      setUtmData(utm)

      if (utm.fbclid && !document.cookie.includes("_fbc=")) {
        const creationTime = Date.now()
        document.cookie = `_fbc=fb.1.${creationTime}.${utm.fbclid}; path=/; max-age=${90 * 24 * 3600}; SameSite=Lax`
      }
    } catch (e) {
      console.warn("Erreur capture UTMs:", e)
    }
  }, [])

  // Télémétrie d'entonnoir 100 % anonyme
  useEffect(() => {
    if (typeof window === "undefined" || !sessionIdRef.current) return
    try {
      fetch("/api/telemetry/funnel-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          step,
          stepName: STEP_TITLES[step - 1] ?? `Step ${step}`,
          province: province || undefined,
          utmSource: utmData.utm_source,
          utmCampaign: utmData.utm_campaign,
          utmContent: utmData.utm_content,
          utmTerm: utmData.utm_term,
        }),
      }).catch(() => {})
    } catch {}
  }, [step, province, utmData.utm_source, utmData.utm_campaign, utmData.utm_content, utmData.utm_term])

  // Validation
  const emailErr = getEmailError(email)
  const phoneErr = getPhoneError(phone)
  const isFirstNameValid = firstName.trim().length >= 2
  const isLastNameValid = lastName.trim().length >= 2
  const isPostalCodeValid = postalCode.trim().length === 4
  const isAddressValid = address.trim().length >= 4

  const showFirstNameError = hasAttemptedSubmit && !isFirstNameValid
  const showLastNameError = hasAttemptedSubmit && !isLastNameValid
  const showEmailError = hasAttemptedSubmit && !!emailErr
  const showPhoneError = hasAttemptedSubmit && !!phoneErr
  const showPostalCodeError = hasAttemptedSubmit && !isPostalCodeValid
  const showAddressError = hasAttemptedSubmit && !isAddressValid
  const showConsentError = hasAttemptedSubmit && !partnerConsent

  // Détection automatique de la province wallonne via le CP belge
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

  const isStepValid = () => {
    if (step === 1) return !!consumption
    if (step === 2) return !!propertyType
    if (step === 3) return ownership === "proprietaire" || ownership === "copropriete"
    if (step === 4) return !!roofType && !!roofSurface
    if (step === 5) return postalCode.trim().length === 4
    return true
  }

  const handleNext = () => {
    if (step === 2 && propertyType === "immeuble_commercial") {
      window.location.href = "/#simulateur"
      return
    }
    if (step === 3 && ownership === "locataire") {
      return // Bloqué pour les locataires
    }
    if (step === 5 && !hasTrackedStep5.current && postalCode.trim().length === 4) {
      hasTrackedStep5.current = true
      trackInitiateCheckout({ province, postalCode: postalCode.trim() })
    }
    if (step < totalSteps) {
      setStep((s) => s + 1)
      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
        scrollToForm()
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1)
      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
        scrollToForm()
      }
    }
  }

  // Auto-advance de 180 ms sur étapes à choix unique (style Bobex)
  const handleOptionSelect = (setter: (val: string) => void, val: string) => {
    setter(val)
    if (step === 2 && val === "immeuble_commercial") {
      setTimeout(() => {
        window.location.href = "/#simulateur"
      }, 150)
      return
    }
    if (step === 3 && val === "locataire") {
      return // Ne pas avancer automatiquement pour afficher l'écran d'arrêt bienveillant
    }
    if (step < 4) {
      setTimeout(() => {
        setStep((s) => Math.min(totalSteps, s + 1))
        if (typeof window !== "undefined" && window.innerWidth <= 1024) {
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
      !isAddressValid ||
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

    const calculatedSurface =
      ROOF_SURFACES.find((r) => r.id === roofSurface)?.m2 ??
      (selectedBill >= 3100 ? 55 : selectedBill >= 2400 ? 45 : 35)

    const payload = {
      segment: "B2C",
      sourceForm: "b2c_devis_landing",
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      surfaceType: "toiture",
      surfaceArea: calculatedSurface,
      province,
      provinceFreeText: `${postalCode.trim()}${city.trim() ? ` ${city.trim()}` : ""}`,
      postalCode: postalCode.trim(),
      city: city.trim() || undefined,
      siteAddress: address.trim(),
      roofMaterial: roofMaterialMap[roofType] ?? "tuiles",
      ownershipStatus: ownershipMap[ownership] ?? "owner",
      annualElectricityBill: selectedBill,
      marketingConsent: partnerConsent,
      newsletterConsent,
      projectDetails: [
        `Consommation annuelle: ${consumption}`,
        `Type de bien: ${propertyType}`,
        `Statut: ${ownership}`,
        `Couverture: ${roofType}`,
        `Surface toiture: ${roofSurface}`,
        remarks.trim() ? `Précisions: ${remarks.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      qualificationMetadata: {
        consumptionKwh: consumption,
        propertyType,
        ownershipChoice: ownership,
        roofType,
        roofSurface,
        remarks: remarks.trim() || null,
        ...utmData,
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
      if (ownership === "proprietaire") {
        trackLeadConversion({
          segment: "B2C",
          leadId: resData?.leadId,
          value: 55,
        })
      }
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercent = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-screen bg-background bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:44px_44px] text-foreground flex flex-col justify-between font-sans selection:bg-accent/15 selection:text-foreground">
      
      {/* ── HEADER MINIMAL : Logo Aegis Solaire en haut à gauche ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 sm:pt-5 sm:pb-2 shrink-0 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Aegis Solaire - Accueil">
          <div className="relative h-12 sm:h-14 md:h-16 w-48 sm:w-60 md:w-72">
            <Image
              src="/logo.png"
              alt="Aegis Solaire"
              fill
              className="object-contain object-left"
              priority
              sizes="(max-width: 640px) 240px, 320px"
            />
          </div>
        </Link>
      </header>

      {/* ── CORPS CENTRAL : Structure Fullscreen Split-Screen Style Bobex ── */}
      <main className="flex-1 flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full my-auto">
          
          {/* ── COLONNE GAUCHE (Autorité, Réassurance & Preuve Bobex-style) ── */}
          <div className="lg:col-span-6 flex flex-col justify-center gap-5 sm:gap-6">
            
            {/* Note d'avis / Tiers de confiance */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
              <span className="font-bold text-foreground font-mono tabular-nums">4.9 sur 5</span>
              <div className="flex gap-0.5 text-accent-solar">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-accent-solar text-accent-solar" />
                ))}
              </div>
              <span className="hidden sm:inline">· Tiers de confiance n°1 en Wallonie</span>
            </div>

            {/* UN SEUL H1 PAR ROUTE (Loi stricte SEO & Accessibilité) */}
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight text-foreground font-heading leading-[1.14]">
                La meilleure offre solaire ?{" "}
                <span className="block text-primary">
                  Comparez jusqu&apos;à 3 devis.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-1">
                Une seule demande, des installateurs certifiés <strong className="text-foreground font-semibold">RESCERT</strong> locaux. Gratuit, sans engagement et réponse sous <span className="font-mono tabular-nums font-semibold text-foreground">48 h</span>.
              </p>
            </div>

            {/* 3 Avantages clés avec puces circulaires orange Bobex-style */}
            <ul className="flex flex-col gap-3 text-xs sm:text-sm text-foreground font-medium list-none p-0 m-0">
              
              <li className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
                <div className="flex items-center gap-1.5 leading-snug">
                  <span>
                    Économisez jusqu&apos;à <span className="font-mono tabular-nums font-bold">70 %</span> sur votre facture d&apos;électricité
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === "economies" ? null : "economies")}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="En savoir plus sur les économies"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
              {activeTooltip === "economies" && (
                <div className="ml-9 p-2.5 rounded-lg bg-secondary text-xs text-muted-foreground border border-border leading-relaxed">
                  {TOOLTIPS.economies}
                </div>
              )}

              <li className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
                <div className="flex items-center gap-1.5 leading-snug">
                  <span>
                    Installateurs certifiés RESCERT de votre région
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === "rescert" ? null : "rescert")}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="En savoir plus sur le label RESCERT"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
              {activeTooltip === "rescert" && (
                <div className="ml-9 p-2.5 rounded-lg bg-secondary text-xs text-muted-foreground border border-border leading-relaxed">
                  {TOOLTIPS.rescert}
                </div>
              )}

              <li className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </div>
                <div className="flex items-center gap-1.5 leading-snug">
                  <span>
                    Réponse sous <span className="font-mono tabular-nums font-semibold">48 h</span>, sans aucune obligation
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === "sansEngagement" ? null : "sansEngagement")}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="En savoir plus sur la gratuité"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
              {activeTooltip === "sansEngagement" && (
                <div className="ml-9 p-2.5 rounded-lg bg-secondary text-xs text-muted-foreground border border-border leading-relaxed">
                  {TOOLTIPS.sansEngagement}
                </div>
              )}
            </ul>

            {/* Lien interactif modal */}
            <div>
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(true)}
                className="text-xs font-semibold text-foreground underline underline-offset-4 hover:text-accent cursor-pointer transition-colors"
              >
                Comment ça marche ?
              </button>
            </div>

            {/* Bouton CTA Mobile (scroll direct vers formulaire comme Bobex mobile) */}
            <div className="block lg:hidden pt-1">
              <button
                type="button"
                onClick={scrollToForm}
                className="w-full py-3.5 px-6 rounded-xl bg-accent-solar text-accent-solar-foreground font-bold text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Recevez des devis gratuits</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Bloc Témoignage Vérifié (Exactement comme la boîte JD de Bobex) */}
            <div className="bg-card/90 border border-border rounded-2xl p-4 sm:p-5 shadow-xs flex items-start gap-3.5 max-w-md">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 font-heading">
                JD
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-0.5 text-accent-solar">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="h-3 w-3 fill-accent-solar text-accent-solar" />
                  ))}
                </div>
                <p className="text-xs text-foreground italic leading-relaxed">
                  « Un audit clair en 48 h, un écart de près de <span className="font-mono tabular-nums font-semibold">1 850 €</span> sur des panneaux de marque identique. Sans Aegis Solaire, je ne l&apos;aurais jamais su. »
                </p>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Julien Dubois · Chaudfontaine (Liège)
                </span>
              </div>
            </div>

          </div>

          {/* ── COLONNE DROITE : CARTE DU QUESTIONNAIRE (Structure Bobex) ── */}
          <div ref={leadCardRef} className="lg:col-span-6 w-full">
            <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-6px_rgba(15,23,42,0.06)] p-6 sm:p-8 flex flex-col justify-between max-w-xl mx-auto lg:max-w-none">
              
              {!submitted ? (
                <>
                  {/* En-tête de la carte Bobex-style */}
                  <div className="flex flex-col gap-2 pb-2">
                    <h2 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground font-heading">
                      Remplissez et économisez
                    </h2>
                    <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
                      En quelques étapes (<span className="font-mono tabular-nums font-semibold">45 secondes</span>), nous trouvons jusqu&apos;à <span className="font-mono tabular-nums font-semibold text-foreground">3</span> installateurs agréés près de chez vous.
                    </p>

                    {/* Badges horizontaux Bobex */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-3 py-1 rounded-full bg-secondary/80 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border border-border/60">
                        INSTALLATEURS RESCERT
                      </span>
                      <span className="px-3 py-1 rounded-full bg-secondary/80 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border border-border/60">
                        GRATUIT &amp; SANS ENGAGEMENT
                      </span>
                      <span className="px-3 py-1 rounded-full bg-secondary/80 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border border-border/60">
                        SPÉCIALISTES LOCAUX
                      </span>
                    </div>

                    {/* Barre de progression orange Bobex */}
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden mt-2 mb-1">
                      <motion.div
                        className="h-full bg-accent-solar rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.25 }}
                      />
                    </div>
                  </div>

                  {/* Formulaire & Questions */}
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pt-1">
                    {/* Honeypot invisible pour bloquer les spambots */}
                    <div className="sr-only" aria-hidden="true">
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={fax_number}
                        onChange={(e) => setFaxNumber(e.target.value)}
                      />
                    </div>

                    {/* Question en titre */}
                    <h3 className="text-lg sm:text-[20px] font-bold text-foreground font-heading tracking-tight leading-snug">
                      {STEP_QUESTIONS[step - 1]}
                    </h3>

                    <AnimatePresence mode="wait">
                      
                      {/* ── ÉTAPE 1 : Consommation annuelle ── */}
                      {step === 1 && (
                        <motion.fieldset
                          key="step1"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-2.5 border-none p-0 m-0"
                        >
                          {CONSUMPTION_OPTIONS.map((item) => {
                            const isChecked = consumption === item.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleOptionSelect(setConsumption, item.id)}
                                className={`w-full text-left py-4 px-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isChecked
                                    ? "border-accent-solar bg-accent-solar/[0.10] text-foreground font-bold ring-2 ring-accent-solar/40 shadow-xs"
                                    : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border font-medium"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between w-full pr-3">
                                  <span className="text-[15px] sm:text-[16px] font-bold text-foreground font-mono tabular-nums">
                                    {item.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5 sm:mt-0 font-normal">
                                    ({item.sublabel.replace(/^\(|\)$/g, "")})
                                  </span>
                                </div>
                                {isChecked && <Check className="h-5 w-5 text-accent-solar stroke-[3] shrink-0" />}
                              </button>
                            )
                          })}
                        </motion.fieldset>
                      )}

                      {/* ── ÉTAPE 2 : Type de bâtiment ── */}
                      {step === 2 && (
                        <motion.fieldset
                          key="step2"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-2.5 border-none p-0 m-0"
                        >
                          {PROPERTY_TYPES.map((item) => {
                            const isChecked = propertyType === item.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleOptionSelect(setPropertyType, item.id)}
                                className={`w-full text-left py-4 px-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isChecked
                                    ? "border-accent-solar bg-accent-solar/[0.10] text-foreground font-bold ring-2 ring-accent-solar/40 shadow-xs"
                                    : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border font-medium"
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[15px] sm:text-[16px] font-bold text-foreground">{item.label}</span>
                                  <span className="text-xs text-muted-foreground mt-0.5 font-normal">{item.sublabel}</span>
                                </div>
                                {isChecked && <Check className="h-5 w-5 text-accent-solar stroke-[3] shrink-0" />}
                              </button>
                            )
                          })}
                        </motion.fieldset>
                      )}

                      {/* ── ÉTAPE 3 : Statut d'occupation ── */}
                      {step === 3 && (
                        <motion.fieldset
                          key="step3"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-2.5 border-none p-0 m-0"
                        >
                          {OWNERSHIP_OPTIONS.map((item) => {
                            const isChecked = ownership === item.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleOptionSelect(setOwnership, item.id)}
                                className={`w-full text-left py-4 px-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                  isChecked
                                    ? item.id === "locataire"
                                      ? "border-destructive bg-destructive/[0.06] text-foreground font-bold ring-2 ring-destructive/40 shadow-xs"
                                      : "border-accent-solar bg-accent-solar/[0.10] text-foreground font-bold ring-2 ring-accent-solar/40 shadow-xs"
                                    : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border font-medium"
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[15px] sm:text-[16px] font-bold text-foreground">{item.label}</span>
                                  <span className="text-xs text-muted-foreground mt-0.5 font-normal">{item.sublabel}</span>
                                </div>
                                {isChecked && (
                                  <Check className={`h-5 w-5 stroke-[3] shrink-0 ${item.id === "locataire" ? "text-destructive" : "text-accent-solar"}`} />
                                )}
                              </button>
                            )
                          })}

                          {ownership === "locataire" && (
                            <div className="p-4 rounded-xl bg-destructive/[0.06] border border-destructive/25 flex flex-col gap-2.5 text-xs">
                              <span className="font-bold text-foreground">
                                Audit réservé aux propriétaires du bien
                              </span>
                              <p className="text-muted-foreground leading-relaxed">
                                En Wallonie, les démarches d&apos;installation photovoltaïque et de raccordement réseau ORES / RESA exigent d&apos;être le propriétaire légal du bâtiment. Transmettez ce lien à votre bailleur pour initier l&apos;étude.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof window !== "undefined" && navigator.clipboard) {
                                    navigator.clipboard.writeText(window.location.origin + "/devis-panneaux-solaires")
                                    setHasCopiedLink(true)
                                    setTimeout(() => setHasCopiedLink(false), 3000)
                                  }
                                }}
                                className="w-fit px-3 py-1.5 rounded-lg bg-card text-foreground border border-border text-xs font-semibold hover:bg-secondary flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                {hasCopiedLink ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-accent stroke-[3]" />
                                    <span className="text-accent">Lien copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>Copier le lien pour mon propriétaire</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </motion.fieldset>
                      )}

                      {/* ── ÉTAPE 4 : Toiture & Équipements ── */}
                      {step === 4 && (
                        <motion.fieldset
                          key="step4"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-4 border-none p-0 m-0"
                        >
                          <div className="flex flex-col gap-2">
                            <span className="text-xs sm:text-sm font-bold text-foreground">
                              Revêtement de toiture :
                            </span>
                            <div className="grid grid-cols-2 gap-2.5">
                              {ROOF_OPTIONS.map((r) => {
                                const isChecked = roofType === r.id
                                return (
                                  <button
                                    type="button"
                                    key={r.id}
                                    onClick={() => setRoofType(r.id)}
                                    className={`py-3.5 px-4 rounded-xl border text-sm font-semibold text-left transition-all cursor-pointer ${
                                      isChecked
                                        ? "border-accent-solar bg-accent-solar/[0.10] font-bold text-foreground ring-2 ring-accent-solar/40 shadow-xs"
                                        : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border"
                                    }`}
                                  >
                                    {r.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="text-xs sm:text-sm font-bold text-foreground">
                              Surface de toiture disponible :
                            </span>
                            <div className="grid grid-cols-3 gap-2.5">
                              {ROOF_SURFACES.map((s) => {
                                const isChecked = roofSurface === s.id
                                return (
                                  <button
                                    type="button"
                                    key={s.id}
                                    onClick={() => setRoofSurface(s.id)}
                                    className={`py-3 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                                      isChecked
                                        ? "border-accent-solar bg-accent-solar/[0.10] font-bold text-foreground ring-2 ring-accent-solar/40 shadow-xs"
                                        : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border font-medium"
                                    }`}
                                  >
                                    <span className="text-sm font-mono tabular-nums font-bold block">{s.label}</span>
                                    <span className="text-[11px] text-muted-foreground font-mono block mt-0.5 font-normal">{s.sublabel}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </motion.fieldset>
                      )}

                      {/* ── ÉTAPE 5 : Localisation en Wallonie ── */}
                      {step === 5 && (
                        <motion.fieldset
                          key="step5"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-4 border-none p-0 m-0"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="postalCode" className="text-xs sm:text-sm font-bold text-foreground">
                                Code postal (4 chiffres) <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="postalCode"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                placeholder="ex. 4000"
                                value={postalCode}
                                onChange={(e) => handlePostalCodeChange(e.target.value)}
                                className={`h-12 rounded-xl font-mono tabular-nums text-sm sm:text-base ${
                                  showPostalCodeError ? "border-destructive ring-1 ring-destructive" : "border-input bg-background/50 focus:bg-background"
                                }`}
                              />
                              {showPostalCodeError && (
                                <p className="text-[11px] text-destructive font-medium" role="alert">
                                  Code postal wallon requis.
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="city" className="text-xs sm:text-sm font-bold text-foreground">
                                Commune / Ville
                              </Label>
                              <Input
                                id="city"
                                placeholder="ex. Liège"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="h-12 rounded-xl text-sm sm:text-base border-input bg-background/50 focus:bg-background"
                              />
                            </div>
                          </div>

                          {postalCode.length >= 2 && (
                            <div className="p-3.5 rounded-xl bg-accent/[0.06] border border-accent/20 flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-foreground font-medium flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-accent" />
                                <span>Province détectée :</span>
                              </span>
                              <span className="font-mono text-xs sm:text-sm font-bold text-accent uppercase tracking-wider">
                                {province.replace("_", " ")} · Artisans actifs
                              </span>
                            </div>
                          )}
                        </motion.fieldset>
                      )}

                      {/* ── ÉTAPE 6 : Coordonnées de contact ── */}
                      {step === 6 && (
                        <motion.fieldset
                          key="step6"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-3.5 border-none p-0 m-0"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="firstName" className="text-xs sm:text-sm font-semibold text-foreground">
                                Prénom <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="firstName"
                                autoComplete="given-name"
                                placeholder="ex. Sophie"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className={`h-11 rounded-xl text-sm sm:text-base ${
                                  showFirstNameError ? "border-destructive ring-1 ring-destructive" : "border-input bg-background/50 focus:bg-background"
                                }`}
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="lastName" className="text-xs sm:text-sm font-semibold text-foreground">
                                Nom <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="lastName"
                                autoComplete="family-name"
                                placeholder="ex. Dupont"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className={`h-11 rounded-xl text-sm sm:text-base ${
                                  showLastNameError ? "border-destructive ring-1 ring-destructive" : "border-input bg-background/50 focus:bg-background"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="email" className="text-xs sm:text-sm font-semibold text-foreground">
                                E-mail <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                placeholder="nom@exemple.be"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`h-11 rounded-xl text-sm sm:text-base ${
                                  showEmailError ? "border-destructive ring-1 ring-destructive" : "border-input bg-background/50 focus:bg-background"
                                }`}
                              />
                              {showEmailError && (
                                <p className="text-[11px] text-destructive font-medium" role="alert">
                                  {emailErr}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="phone" className="text-xs sm:text-sm font-semibold text-foreground">
                                Téléphone <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="phone"
                                type="tel"
                                autoComplete="tel"
                                placeholder="0470 12 34 56"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`h-11 rounded-xl font-mono tabular-nums text-sm sm:text-base ${
                                  showPhoneError ? "border-destructive ring-1 ring-destructive" : "border-input bg-background/50 focus:bg-background"
                                }`}
                              />
                              {showPhoneError && (
                                <p className="text-[11px] text-destructive font-medium" role="alert">
                                  {phoneErr}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="address" className="text-xs sm:text-sm font-semibold text-foreground">
                              Adresse (Rue et numéro) <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="address"
                              autoComplete="street-address"
                              placeholder="ex. Rue de la Station 12"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              className={`h-11 rounded-xl text-sm sm:text-base ${
                                showAddressError ? "border-destructive ring-1 ring-destructive" : "border-input bg-background/50 focus:bg-background"
                              }`}
                            />
                            {showAddressError && (
                              <p className="text-[11px] text-destructive font-medium" role="alert">
                                Adresse complète requise.
                              </p>
                            )}
                          </div>

                          {/* Consentement RGPD */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-border/80">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <Checkbox
                                id="partnerConsent"
                                checked={partnerConsent}
                                onCheckedChange={(c) => setPartnerConsent(c === true)}
                                className="mt-0.5"
                              />
                              <span className="text-xs text-muted-foreground leading-relaxed">
                                J&apos;accepte la transmission de ma demande aux installateurs agréés RESCERT de ma région (afin de recevoir jusqu&apos;à <span className="font-mono tabular-nums font-semibold text-foreground">3</span> devis comparatifs sans engagement) selon la{" "}
                                <Link
                                  href="/politique-confidentialite"
                                  target="_blank"
                                  className="underline text-accent-solar font-semibold"
                                >
                                  politique de confidentialité
                                </Link>
                                .
                              </span>
                            </label>
                            {showConsentError && (
                              <p className="text-[11px] text-destructive font-medium" role="alert">
                                Veuillez accepter pour valider votre demande.
                              </p>
                            )}
                          </div>

                          {errorMessage && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                              {errorMessage}
                            </div>
                          )}
                        </motion.fieldset>
                      )}

                    </AnimatePresence>

                    {/* ── BARRE DE NAVIGATION INFÉRIEURE : Style et placement Bobex ── */}
                    <div className="pt-4 border-t border-border/70 flex items-center justify-between gap-3 mt-2">
                      {step > 1 ? (
                        <button
                          type="button"
                          onClick={handleBack}
                          className="px-5 py-3 rounded-xl border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 active:scale-[0.98]"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          <span>Retour</span>
                        </button>
                      ) : (
                        <div />
                      )}

                      {step < totalSteps ? (
                        <button
                          type="button"
                          onClick={handleNext}
                          disabled={!isStepValid()}
                          className="px-7 sm:px-8 py-3.5 rounded-xl bg-accent-solar text-accent-solar-foreground hover:bg-accent-solar/90 font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed"
                        >
                          <span>Suivant</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-7 sm:px-8 py-3.5 rounded-xl bg-accent-solar text-accent-solar-foreground hover:bg-accent-solar/90 disabled:opacity-50 font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Envoi en cours...</span>
                            </>
                          ) : (
                            <>
                              <span>Recevoir mes devis gratuits</span>
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Mention de réassurance sous les boutons (Style Bobex) */}
                    <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-2 font-medium">
                      <Lock className="h-3.5 w-3.5 text-accent-solar" />
                      <span>100 % gratuit &amp; sans engagement · Pas de spam</span>
                    </p>

                  </form>
                </>
              ) : (
                /* ── Écran de Succès : Confirmation Institutionnelle ── */
                <div className="p-6 sm:p-8 text-center flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-accent-solar/15 text-accent-solar flex items-center justify-center shadow-xs">
                    <Check className="h-8 w-8 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight font-heading">
                      Demande enregistrée avec succès
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mt-1">
                      Merci <strong className="text-foreground">{firstName}</strong>. Votre demande d&apos;audit pour la région de{" "}
                      <strong className="text-foreground capitalize">{province}</strong> a bien été transmise.
                    </p>
                  </div>

                  <div className="bg-secondary/60 border border-border rounded-xl p-4 text-left max-w-md w-full flex flex-col gap-2.5 text-xs">
                    <p className="font-semibold text-foreground flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-accent" />
                      <span>
                        Prochaines étapes (sous{" "}
                        <span className="font-mono tabular-nums font-semibold">48 h</span>) :
                      </span>
                    </p>
                    <ul className="flex flex-col gap-1.5 text-muted-foreground list-disc pl-5">
                      <li>
                        Transmission de votre demande à jusqu&apos;à{" "}
                        <span className="font-mono tabular-nums font-semibold text-foreground">3</span> installateurs agréés RESCERT de votre région.
                      </li>
                      <li>Prise de contact rapide pour valider vos spécificités toiture et vos habitudes de consommation.</li>
                      <li>Réception et comparaison de vos devis gratuits : vous êtes totalement libre de choisir votre installateur — ou aucun.</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-accent hover:underline underline-offset-4"
                    >
                      Retourner sur la page d&apos;accueil
                    </Link>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </main>

      {/* ── FOOTER DISCRET PLEIN ÉCRAN : Mentions légales obligatoires ── */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/40">
        <p className="font-mono text-[11px] text-center sm:text-left">
          Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
        </p>

        <div className="flex items-center gap-4 font-medium">
          <Link href="/mentions-legales" className="hover:text-foreground transition-colors">
            Mentions légales
          </Link>
          <Link href="/politique-confidentialite" className="hover:text-foreground transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="/cgv" className="hover:text-foreground transition-colors">
            CGV
          </Link>
        </div>
      </footer>

      {/* ── MODALE "COMMENT ÇA MARCHE ?" ── */}
      {isHowItWorksOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative bg-card border border-border rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-xl flex flex-col gap-4">
            <button
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fermer la boîte de dialogue"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
                Méthode Aegis Solaire
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-foreground font-heading">
                Comment fonctionne la mise en relation ?
              </h3>
              <p className="text-xs text-muted-foreground">
                Notre service de comparaison est 100 % gratuit et sans engagement pour les propriétaires en Wallonie.
              </p>
            </div>

            <ol className="flex flex-col gap-2.5 list-none p-0 m-0">
              {[
                {
                  step: "01",
                  title: "Remplissez votre demande en 45 secondes",
                  desc: "Indiquez votre toiture, commune et consommation approximative. Aucune carte bancaire requise.",
                },
                {
                  step: "02",
                  title: "Sélection d'installateurs RESCERT locaux",
                  desc: "Notre système sollicite jusqu'à 3 professionnels certifiés et audités de votre province pour votre projet.",
                },
                {
                  step: "03",
                  title: "Comparez jusqu'à 3 devis et économisez",
                  desc: "Vous recevez les offres chiffrées détaillées et choisissez librement la meilleure proposition — ou aucune.",
                },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border">
                  <span className="font-mono tabular-nums text-xs font-bold text-accent-solar px-2 py-0.5 rounded-md bg-accent-solar/10 shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div className="flex flex-col">
                    <strong className="text-xs sm:text-sm font-semibold text-foreground">{item.title}</strong>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsHowItWorksOpen(false)
                  scrollToForm()
                }}
                className="w-full py-3 px-5 rounded-xl bg-accent-solar text-accent-solar-foreground hover:bg-accent-solar/90 font-bold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
