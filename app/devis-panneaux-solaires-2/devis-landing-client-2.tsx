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
  X,
  Share2,
  Users,
  ShieldCheck,
  Building2,
  Home,
  Mail,
  PhoneCall,
  CheckCircle2,
} from "lucide-react"

import {
  Badge,
  Banner,
  Stepper,
  Step,
} from "@astryxdesign/core"

import { Checkbox } from "@/components/ui/checkbox"
import {
  getEmailError,
  formatAndValidateBelgianPhone,
  getProvinceFromPostalCode,
} from "@/lib/leads-validation"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { trackLeadConversion, trackInitiateCheckout } from "@/components/analytics/ad-tracking"
import { calculateB2CSolarROI } from "@/lib/solar-assumptions"
import { CompetitionInterstitial } from "@/components/funnel/competition-interstitial"
import { NetworkPartnersModal } from "@/components/funnel/network-partners-modal"

// ── Options du formulaire B2C (Wallonie) ──
const CONSUMPTION_OPTIONS = [
  { id: "lt_3000", label: "Moins de 3.000 kWh", sublabel: "1 à 2 personnes · Facture < 85 € / mois", billValue: 820, kwhValue: 2400 },
  { id: "3000_4000", label: "3.000 – 4.000 kWh", sublabel: "2 à 3 personnes · Facture ~85 à 115 € / mois", billValue: 1150, kwhValue: 3500 },
  { id: "4000_5000", label: "4.000 – 5.000 kWh", sublabel: "3 à 4 personnes · Facture ~115 à 145 € / mois", billValue: 1480, kwhValue: 4500 },
  { id: "5000_6000", label: "5.000 – 6.000 kWh", sublabel: "4 à 5 personnes · Facture ~145 à 175 € / mois", billValue: 1820, kwhValue: 5500 },
  { id: "gt_6000", label: "Plus de 6.000 kWh", sublabel: "Grand foyer, PAC ou borne VE (> 175 € / mois)", billValue: 2300, kwhValue: 7000 },
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
  { id: "small", label: "< 30 m²", sublabel: "≈ 2,6–3,5 kWc", m2: 22 },
  { id: "medium", label: "30–60 m²", sublabel: "≈ 4–6 kWc", m2: 42 },
  { id: "large", label: "> 60 m²", sublabel: "≈ 6,5–9 kWc", m2: 65 },
]

const STEP_LABELS = [
  "Conso",
  "Bien",
  "Statut",
  "Toiture",
  "Région",
  "Devis",
]

const STEP_QUESTIONS = [
  "Quelle est votre consommation d'électricité annuelle (estimée) ?",
  "De quel type de bâtiment s'agit-il ?",
  "Êtes-vous propriétaire du bâtiment ?",
  "Spécifications de votre toiture pour panneaux solaires",
  "Où se situe votre bâtiment en Wallonie ?",
  "À quelles coordonnées transmettre vos 3 devis comparatifs sans engagement ?",
]

export function DevisLandingClient2() {
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
  const [fullName, setFullName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [remarks, setRemarks] = useState("")
  const [contactPreference, setContactPreference] = useState<"written_first" | "direct_call">("written_first")
  const [partnerConsent, setPartnerConsent] = useState(false)
  const [newsletterConsent, setNewsletterConsent] = useState(false)
  const [fax_number, setFaxNumber] = useState("") // honeypot

  // UI States
  const [isInterstitialRunning, setIsInterstitialRunning] = useState(false)
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const [hasCopiedLink, setHasCopiedLink] = useState(false)
  const hasTrackedStep5 = useRef(false)
  const hasCapturedDraft = useRef(false)

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

      // Restauration de l'état sauvegardé en sessionStorage
      const savedState = sessionStorage.getItem("aegis_funnel_saved_state")
      if (savedState) {
        try {
          const p = JSON.parse(savedState)
          if (p.consumption) setConsumption(p.consumption)
          if (p.propertyType) setPropertyType(p.propertyType)
          if (p.ownership) setOwnership(p.ownership)
          if (p.roofType) setRoofType(p.roofType)
          if (p.roofSurface) setRoofSurface(p.roofSurface)
          if (p.province) setProvince(p.province)
          if (p.postalCode) setPostalCode(p.postalCode)
          if (p.city) setCity(p.city)
          if (p.fullName) {
            setFullName(p.fullName)
            const parts = p.fullName.trim().split(/\s+/)
            setFirstName(parts[0] || "")
            setLastName(parts.slice(1).join(" ") || "")
          } else if (p.firstName || p.lastName) {
            setFirstName(p.firstName || "")
            setLastName(p.lastName || "")
            setFullName(`${p.firstName || ""} ${p.lastName || ""}`.trim())
          }
          if (p.email) setEmail(p.email)
          if (p.phone) setPhone(p.phone)
          if (p.address) setAddress(p.address)
          if (p.contactPreference) setContactPreference(p.contactPreference)
          if (typeof p.step === "number" && p.step >= 1 && p.step <= 6) setStep(p.step)
        } catch {}
      }
    } catch (e) {
      console.warn("Erreur capture UTMs:", e)
    }
  }, [])

  // Sauvegarde continue de l'état en sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stateToSave = {
        consumption,
        propertyType,
        ownership,
        roofType,
        roofSurface,
        province,
        postalCode,
        city,
        fullName,
        firstName,
        lastName,
        email,
        phone,
        address,
        contactPreference,
        step,
      }
      sessionStorage.setItem("aegis_funnel_saved_state", JSON.stringify(stateToSave))
    } catch {}
  }, [
    consumption,
    propertyType,
    ownership,
    roofType,
    roofSurface,
    province,
    postalCode,
    city,
    fullName,
    firstName,
    lastName,
    email,
    phone,
    address,
    contactPreference,
    step,
  ])

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
          stepName: STEP_LABELS[step - 1] ?? `Step ${step}`,
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
  const phoneValidation = formatAndValidateBelgianPhone(phone)
  const phoneErr =
    phone.trim().length > 0 && !phoneValidation.isValid
      ? phoneValidation.errorMessage || "Numéro de GSM belge invalide."
      : null
  const isPhoneValid = phone.trim().length > 0 && phoneValidation.isValid

  const nameParts = fullName.trim() ? fullName.trim().split(/\s+/) : [firstName.trim(), lastName.trim()]
  const isFullNameValid =
    (nameParts.length >= 2 && nameParts[0].length >= 2 && nameParts[1].length >= 2) ||
    (firstName.trim().length >= 2 && lastName.trim().length >= 2)

  const isPostalCodeValid = postalCode.trim().length === 4
  const isAddressValid = address.trim().length >= 4

  const showFullNameError = hasAttemptedSubmit && !isFullNameValid
  const showEmailError = hasAttemptedSubmit && !!emailErr
  const showPhoneError = hasAttemptedSubmit && (!isPhoneValid || !!phoneErr)
  const showPostalCodeError = hasAttemptedSubmit && !isPostalCodeValid
  const showAddressError = hasAttemptedSubmit && !isAddressValid
  const showConsentError = hasAttemptedSubmit && !partnerConsent

  // Détection automatique de la province wallonne via le CP belge
  const handlePostalCodeChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "").slice(0, 4)
    setPostalCode(cleaned)
    if (cleaned.length >= 2) {
      const derived = getProvinceFromPostalCode(cleaned)
      if (derived === "Brabant wallon") setProvince("brabant_wallon")
      else if (derived === "Liège") setProvince("liege")
      else if (derived === "Namur") setProvince("namur")
      else if (derived === "Hainaut") setProvince("hainaut")
      else if (derived === "Luxembourg") setProvince("luxembourg")
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
      return
    }
    if (step === 5) {
      if (!isPostalCodeValid) {
        setHasAttemptedSubmit(true)
        return
      }
      if (!hasTrackedStep5.current && postalCode.trim().length === 4) {
        hasTrackedStep5.current = true
        trackInitiateCheckout({ province, postalCode: postalCode.trim() })
      }
      setIsInterstitialRunning(true)
      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
        scrollToForm()
      }
      return
    }
    if (step < totalSteps) {
      setStep((s) => s + 1)
      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
        scrollToForm()
      }
    }
  }

  const handleInterstitialComplete = () => {
    setIsInterstitialRunning(false)
    setStep(6)
    if (typeof window !== "undefined" && window.innerWidth <= 1024) {
      scrollToForm()
    }
  }

  const handleBack = () => {
    if (isInterstitialRunning) return
    if (step > 1) {
      setStep((s) => s - 1)
      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
        scrollToForm()
      }
    }
  }

  // Auto-advance de 180 ms sur étapes à choix unique
  const handleOptionSelect = (setter: (val: string) => void, val: string) => {
    setter(val)
    if (step === 2 && val === "immeuble_commercial") {
      setTimeout(() => {
        window.location.href = "/#simulateur"
      }, 150)
      return
    }
    if (step === 3 && val === "locataire") {
      return
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

  // Capture silencieuse onBlur du champ e-mail
  const handleEmailBlur = async () => {
    if (!email || hasCapturedDraft.current) return
    const err = getEmailError(email)
    if (err) return

    try {
      hasCapturedDraft.current = true
      void fetch("/api/leads/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          fullName: fullName || `${firstName} ${lastName}`.trim(),
          email: email.trim().toLowerCase(),
          postalCode,
          city,
          province,
          estimatedKwc: b2cCalc.installedPowerKwc,
          funnelData: {
            consumption,
            propertyType,
            ownership,
            roofType,
            roofSurface,
          },
          utmSource: utmData.utm_source,
          utmCampaign: utmData.utm_campaign,
          utmContent: utmData.utm_content,
          utmTerm: utmData.utm_term,
        }),
      }).catch(() => {})
    } catch {}
  }

  const selectedOption = CONSUMPTION_OPTIONS.find((c) => c.id === consumption)
  const selectedBill = selectedOption?.billValue ?? 1480
  const selectedKwh = selectedOption?.kwhValue ?? 4500

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
    (selectedBill >= 1820 ? 55 : selectedBill >= 1480 ? 42 : 28)

  const mappedRoofMaterial = roofMaterialMap[roofType] ?? "tuiles"

  const b2cCalc = calculateB2CSolarROI({
    annualBill: selectedBill,
    consumptionKwh: selectedKwh,
    surfaceAreaM2: calculatedSurface,
    roofMaterial: mappedRoofMaterial,
    propertyType,
    hasBattery: false,
    hasEv: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)

    if (
      !isFullNameValid ||
      !isPostalCodeValid ||
      !isAddressValid ||
      emailErr ||
      !phoneValidation.isValid ||
      !partnerConsent
    ) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const parts = fullName.trim() ? fullName.trim().split(/\s+/) : [firstName.trim(), lastName.trim()]
    const finalFirstName = parts[0] || firstName.trim() || "Particulier"
    const finalLastName = parts.slice(1).join(" ") || lastName.trim() || "Wallonie"

    const payload = {
      sessionId: sessionIdRef.current,
      segment: "B2C",
      sourceForm: "b2c_devis_landing_meta_astryx",
      firstName: finalFirstName,
      lastName: finalLastName,
      email: email.trim().toLowerCase(),
      phone: phoneValidation.normalized,
      contactPreference,
      surfaceType: "toiture",
      surfaceArea: calculatedSurface,
      estimatedPowerKwc: b2cCalc.installedPowerKwc,
      estimatedROIYears: b2cCalc.roiYears,
      autoconsumptionRate: b2cCalc.autoconsumptionRate,
      estimatedSavings: b2cCalc.annualSavings,
      province,
      provinceFreeText: `${postalCode.trim()}${city.trim() ? ` ${city.trim()}` : ""}`,
      postalCode: postalCode.trim(),
      city: city.trim() || undefined,
      siteAddress: address.trim(),
      roofMaterial: mappedRoofMaterial,
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
        `Règle contact client: ${contactPreference === "direct_call" ? "Appel direct autorisé (9h-18h)" : "Écrit d'abord (E-mail/SMS)"}`,
        remarks.trim() ? `Précisions: ${remarks.trim()}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      qualificationMetadata: {
        consumptionKwh: consumption,
        annualConsumptionKwh: selectedKwh,
        propertyType,
        ownershipChoice: ownership,
        roofType,
        roofSurface,
        estimatedPanelCount: b2cCalc.estimatedPanelCount,
        annualProductionKwh: b2cCalc.annualProductionKwh,
        contactPreference,
        remarks: remarks.trim() || null,
        ...utmData,
      },
      sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
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
          value: 75.9,
        })
      }
      try {
        sessionStorage.removeItem("aegis_funnel_saved_state")
      } catch {}
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
    <div suppressHydrationWarning className="min-h-dvh bg-background text-foreground flex flex-col justify-between font-sans selection:bg-accent/15 selection:text-foreground">
      
      {/* ── HEADER : Logo Aegis Solaire & Meta Trust Badges ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 sm:pt-5 sm:pb-3 shrink-0 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Aegis Solaire - Accueil">
          <div className="relative h-12 sm:h-14 md:h-16 w-48 sm:w-60 md:w-72">
            <Image
              src="/logo.png"
              alt="Aegis Solaire"
              fill
              className="object-contain object-left"
              priority
              sizes="(max-width: 640px) 240px, 320px"
              suppressHydrationWarning
            />
          </div>
        </Link>

        {/* Badges Astryx Meta dans le Header */}
        <div className="flex items-center gap-2">
          <Badge variant="blue" label="Wallonie 2026" />
          <Badge variant="green" label="Agréé RESCERT" />
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary border border-border text-xs text-muted-foreground font-mono">
            <Lock className="h-3.5 w-3.5 text-accent-solar" />
            <span className="font-semibold text-foreground tabular-nums">Étape {step}/6</span>
          </div>
        </div>
      </header>

      {/* ── CORPS CENTRAL : Structure Split-Screen Haute Conversion ── */}
      <main className="flex-1 flex items-start justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start w-full">
          
          {/* ── COLONNE GAUCHE (Autorité, Réassurance & Preuves) ── */}
          <div className="lg:col-span-6 flex flex-col justify-start gap-5 sm:gap-6 lg:sticky lg:top-4 self-start">
            
            {/* UN SEUL H1 PAR ROUTE (SEO Strict) */}
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold tracking-tight text-foreground font-heading leading-[1.14]">
                La meilleure offre solaire ?{" "}
                <span className="block text-primary">
                  Comparez jusqu&apos;à 3 devis.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mt-1">
                Une seule demande, des installateurs certifiés <strong className="text-foreground font-semibold">RESCERT</strong> locaux.
              </p>
            </div>

            {/* 3 Avantages clés avec pastilles orange circulaires */}
            <ul className="flex flex-col gap-3.5 text-sm sm:text-base text-foreground font-bold list-none p-0 m-0">
              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Installateurs locaux</span>
              </li>

              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <span>Certificats vérifiés</span>
              </li>

              <li className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-accent-solar text-accent-solar-foreground flex items-center justify-center shrink-0 shadow-2xs">
                  <Users className="h-4 w-4" />
                </div>
                <span>Gratuit et sans engagement</span>
              </li>
            </ul>

            {/* Note d'avis / Tiers de confiance */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium pt-1">
              <span className="font-bold text-foreground font-mono tabular-nums">4.9 sur 5</span>
              <div className="flex gap-0.5 text-accent-solar">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-accent-solar text-accent-solar" />
                ))}
              </div>
              <span>· Tiers de confiance n°1 en Wallonie</span>
            </div>

            {/* Bloc Témoignage Julien Dubois */}
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

            {/* Liens modales */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(true)}
                className="text-foreground underline underline-offset-4 hover:text-accent cursor-pointer transition-colors"
              >
                Comment ça marche ?
              </button>
              <button
                type="button"
                onClick={() => setIsNetworkModalOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Réseau de partenaires RESCert →
              </button>
            </div>

            {/* Bouton CTA Mobile */}
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

          </div>

          {/* ── COLONNE DROITE : CARTE INTERACTIVE META ASTRYX ── */}
          <div ref={leadCardRef} className="lg:col-span-6 w-full">
            <div className="bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_28px_-6px_rgba(15,23,42,0.06)] p-6 sm:p-7 flex flex-col justify-between max-w-xl mx-auto lg:max-w-none">
              
              {!submitted ? (
                <>
                  {isInterstitialRunning ? (
                    <div className="py-1">
                      <CompetitionInterstitial
                        postalCode={postalCode}
                        city={city}
                        province={province}
                        roofType={roofType}
                        estimatedKwc={b2cCalc.installedPowerKwc}
                        onComplete={handleInterstitialComplete}
                      />
                    </div>
                  ) : (
                    <>
                      {/* En-tête de la carte avec Meta Stepper compact intégré */}
                      <div className="flex flex-col gap-2.5 pb-2.5 border-b border-border/70">
                        
                        {/* Meta Astryx Stepper on-track compact unifié (Mobile & Desktop) */}
                        <div className="w-full">
                          <Stepper
                            activeStep={step - 1}
                            density="compact"
                            orientation="horizontal"
                            indicatorPosition="on-track"
                            horizontalOptions={{ minimumStepWidth: 35, collapsedVariant: 'withLabel' }}
                            label="Progression du devis solaire"
                            onStepClick={(targetIdx) => {
                              if (targetIdx + 1 < step) {
                                setStep(targetIdx + 1)
                              }
                            }}
                          >
                            {STEP_LABELS.map((label, idx) => (
                              <Step
                                key={label}
                                step={idx}
                                label={label}
                                status={idx < step - 1 ? "success" : idx === step - 1 ? "accent" : undefined}
                              />
                            ))}
                          </Stepper>
                        </div>

                        {/* Badges d'autorité Astryx */}
                        {step < 6 && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <Badge variant="blue" label="Certifiés RESCert" />
                            <Badge variant="neutral" label="Gratuit & sans engagement" />
                            <Badge variant="green" label="Artisans locaux" />
                          </div>
                        )}
                      </div>

                      {/* Formulaire & Questions */}
                      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5 pt-2">
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
                        <h2 className="text-lg sm:text-[19px] font-bold text-foreground font-heading tracking-tight leading-snug">
                          {STEP_QUESTIONS[step - 1]}
                        </h2>

                        <AnimatePresence mode="wait">
                          
                          {/* ── ÉTAPE 1 : Consommation annuelle ── */}
                          {step === 1 && (
                            <motion.fieldset
                              key="step1"
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{ duration: 0.18 }}
                              className="flex flex-col gap-2 border-none p-0 m-0"
                            >
                              {CONSUMPTION_OPTIONS.map((item) => {
                                const isChecked = consumption === item.id
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleOptionSelect(setConsumption, item.id)}
                                    className={`w-full text-left py-3 px-4 sm:px-4.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between group ${
                                      isChecked
                                        ? "border-accent-solar bg-accent-solar/[0.10] text-foreground font-bold ring-2 ring-accent-solar/40 shadow-xs"
                                        : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border font-medium"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 w-full pr-2">
                                      {/* Meta Radio indicator */}
                                      <div
                                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          isChecked
                                            ? "border-accent-solar bg-accent-solar text-accent-solar-foreground"
                                            : "border-muted-foreground/40 bg-card group-hover:border-foreground/60"
                                        }`}
                                      >
                                        {isChecked && <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                                      </div>

                                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between w-full">
                                        <span className="text-[15px] font-bold text-foreground font-mono tabular-nums">
                                          {item.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-0.5 sm:mt-0 font-normal">
                                          {item.sublabel}
                                        </span>
                                      </div>
                                    </div>

                                    {isChecked && (
                                      <Badge variant="blue" label="Choisi" />
                                    )}
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
                                    className={`w-full text-left py-3.5 px-4 sm:px-4.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between group ${
                                      isChecked
                                        ? "border-accent-solar bg-accent-solar/[0.10] text-foreground font-bold ring-2 ring-accent-solar/40 shadow-xs"
                                        : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border font-medium"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          isChecked
                                            ? "border-accent-solar bg-accent-solar text-accent-solar-foreground"
                                            : "border-muted-foreground/40 bg-card group-hover:border-foreground/60"
                                        }`}
                                      >
                                        {isChecked && <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                                      </div>

                                      <div className="flex flex-col">
                                        <span className="text-[15px] font-bold text-foreground flex items-center gap-2">
                                          {item.id === "immeuble_commercial" ? (
                                            <Building2 className="h-4 w-4 text-primary" />
                                          ) : (
                                            <Home className="h-4 w-4 text-primary" />
                                          )}
                                          <span>{item.label}</span>
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-0.5 font-normal pl-6">
                                          {item.sublabel}
                                        </span>
                                      </div>
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
                                    className={`w-full text-left py-3.5 px-4 sm:px-4.5 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between group ${
                                      isChecked
                                        ? item.id === "locataire"
                                          ? "border-destructive bg-destructive/[0.06] text-foreground font-bold ring-2 ring-destructive/40 shadow-xs"
                                          : "border-accent-solar bg-accent-solar/[0.10] text-foreground font-bold ring-2 ring-accent-solar/40 shadow-xs"
                                        : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border font-medium"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                          isChecked
                                            ? item.id === "locataire"
                                              ? "border-destructive bg-destructive text-white"
                                              : "border-accent-solar bg-accent-solar text-accent-solar-foreground"
                                            : "border-muted-foreground/40 bg-card group-hover:border-foreground/60"
                                        }`}
                                      >
                                        {isChecked && <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                                      </div>

                                      <div className="flex flex-col">
                                        <span className="text-[15px] font-bold text-foreground">
                                          {item.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-0.5 font-normal">
                                          {item.sublabel}
                                        </span>
                                      </div>
                                    </div>

                                    {isChecked && (
                                      <Check
                                        className={`h-5 w-5 stroke-[3] shrink-0 ${
                                          item.id === "locataire" ? "text-destructive" : "text-accent-solar"
                                        }`}
                                      />
                                    )}
                                  </button>
                                )
                              })}

                              {ownership === "locataire" && (
                                <Banner
                                  status="warning"
                                  title="Audit réservé aux propriétaires légaux du bâtiment"
                                  description="En Wallonie, les démarches d'installation et de raccordement aux gestionnaires ORES / RESA exigent d'être le propriétaire légal du bâtiment. Transmettez ce lien à votre bailleur pour initier l'étude technique."
                                  collapsible={false}
                                  endContent={
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof window !== "undefined" && navigator.clipboard) {
                                          navigator.clipboard.writeText(window.location.origin + "/devis-panneaux-solaires-2")
                                          setHasCopiedLink(true)
                                          setTimeout(() => setHasCopiedLink(false), 3000)
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-card text-foreground border border-border text-xs font-semibold hover:bg-secondary flex items-center gap-1.5 transition-colors cursor-pointer"
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
                                  }
                                />
                              )}
                            </motion.fieldset>
                          )}

                          {/* ── ÉTAPE 4 : Toiture & Surface disponible ── */}
                          {step === 4 && (
                            <motion.fieldset
                              key="step4"
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{ duration: 0.18 }}
                              className="flex flex-col gap-3.5 border-none p-0 m-0"
                            >
                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs sm:text-sm font-bold text-foreground">
                                  Revêtement de toiture :
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                  {ROOF_OPTIONS.map((r) => {
                                    const isChecked = roofType === r.id
                                    return (
                                      <button
                                        type="button"
                                        key={r.id}
                                        onClick={() => setRoofType(r.id)}
                                        className={`py-3 px-3.5 rounded-xl border text-sm font-semibold text-left transition-all duration-150 cursor-pointer flex items-center justify-between ${
                                          isChecked
                                            ? "border-accent-solar bg-accent-solar/[0.10] font-bold text-foreground ring-2 ring-accent-solar/40 shadow-xs"
                                            : "border-border/70 bg-secondary/50 text-foreground hover:bg-secondary/80 hover:border-border"
                                        }`}
                                      >
                                        <span>{r.label}</span>
                                        {isChecked && <Check className="h-4 w-4 text-accent-solar stroke-[3]" />}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <span className="text-xs sm:text-sm font-bold text-foreground">
                                  Surface de toiture disponible :
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {ROOF_SURFACES.map((s) => {
                                    const isChecked = roofSurface === s.id
                                    return (
                                      <button
                                        type="button"
                                        key={s.id}
                                        onClick={() => setRoofSurface(s.id)}
                                        className={`py-2.5 px-3 rounded-xl border text-center transition-all duration-150 cursor-pointer ${
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
                              className="flex flex-col gap-3.5 border-none p-0 m-0"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor="postalCode" className="text-xs sm:text-sm font-bold text-foreground">
                                    Code postal (4 chiffres) <span className="text-destructive">*</span>
                                  </label>
                                  <input
                                    id="postalCode"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    placeholder="ex. 4000"
                                    value={postalCode}
                                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                                    className={`h-11 px-3.5 rounded-xl font-mono tabular-nums text-base border transition-colors ${
                                      showPostalCodeError
                                        ? "border-destructive ring-2 ring-destructive/30 bg-destructive/[0.04]"
                                        : "border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    }`}
                                  />
                                  {showPostalCodeError && (
                                    <p className="text-[11px] text-destructive font-medium" role="alert">
                                      Code postal wallon requis (4 chiffres).
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor="city" className="text-xs sm:text-sm font-bold text-foreground">
                                    Commune / Ville
                                  </label>
                                  <input
                                    id="city"
                                    placeholder="ex. Liège"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="h-11 px-3.5 rounded-xl text-base border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                  />
                                </div>
                              </div>

                              {postalCode.length >= 2 && (
                                <Banner
                                  status="info"
                                  title={`Province détectée : ${getProvinceDisplayLabel(province)}`}
                                  description="Installateurs certifiés RESCert actifs et audités sur votre commune."
                                  collapsible={false}
                                />
                              )}
                            </motion.fieldset>
                          )}

                          {/* ── ÉTAPE 6 : Coordonnées & Appel d'Offres ── */}
                          {step === 6 && (
                            <motion.fieldset
                              key="step6"
                              initial={{ opacity: 0, x: 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -8 }}
                              transition={{ duration: 0.18 }}
                              className="flex flex-col gap-3 border-none p-0 m-0"
                            >
                              {/* RAPPEL CRO DE MISE EN CONCURRENCE (-18 %) */}
                              <div className="bg-card border-2 border-amber-500/30 rounded-xl p-3 sm:p-3.5 text-foreground flex flex-col gap-2 shadow-2xs">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 stroke-[3] shrink-0" />
                                    <span>
                                      3 installateurs RESCert retenus sur {postalCode} {city || getProvinceDisplayLabel(province)}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-mono text-muted-foreground font-semibold shrink-0">
                                    ~{b2cCalc.installedPowerKwc} kWc
                                  </span>
                                </div>

                                <div className="bg-secondary/70 rounded-lg p-2.5 sm:p-3 flex flex-col gap-1.5 border border-border/70">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="text-muted-foreground font-medium">Devis standard isolé</span>
                                      <span className="font-mono text-muted-foreground font-semibold tabular-nums">100 % (marge standard)</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div className="h-full w-full bg-slate-400 dark:bg-slate-500 rounded-full" />
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-1 pt-0.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-foreground">Mise en concurrence (3 devis)</span>
                                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">82 % (tarif négocié)</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                        <div className="h-full w-[82%] bg-amber-500 rounded-full" />
                                      </div>
                                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px] font-mono font-bold shrink-0 shadow-2xs tabular-nums">
                                        -18 %
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Nom & Email */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="flex flex-col gap-1">
                                  <label htmlFor="fullName" className="text-xs font-semibold text-foreground">
                                    Votre Prénom et Nom <span className="text-destructive">*</span>
                                  </label>
                                  <input
                                    id="fullName"
                                    name="name"
                                    autoComplete="name"
                                    placeholder="ex. Jean Dupont"
                                    value={fullName}
                                    onChange={(e) => {
                                      setFullName(e.target.value)
                                      const parts = e.target.value.trim().split(/\s+/)
                                      if (parts[0]) setFirstName(parts[0])
                                      if (parts.length > 1) setLastName(parts.slice(1).join(" "))
                                    }}
                                    className={`h-10 px-3 rounded-lg text-sm border transition-colors ${
                                      showFullNameError
                                        ? "border-destructive ring-2 ring-destructive/30 bg-destructive/[0.04]"
                                        : "border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    }`}
                                  />
                                  {showFullNameError && (
                                    <p className="text-[11px] text-destructive font-medium" role="alert">
                                      Prénom et nom requis.
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label htmlFor="email" className="text-xs font-semibold text-foreground">
                                    Votre adresse e-mail <span className="text-destructive">*</span>
                                  </label>
                                  <input
                                    id="email"
                                    type="email"
                                    inputMode="email"
                                    name="email"
                                    autoComplete="email"
                                    placeholder="nom@exemple.be"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={handleEmailBlur}
                                    className={`h-10 px-3 rounded-lg text-sm border transition-colors ${
                                      showEmailError
                                        ? "border-destructive ring-2 ring-destructive/30 bg-destructive/[0.04]"
                                        : "border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    }`}
                                  />
                                  {showEmailError && (
                                    <p className="text-[11px] text-destructive font-medium" role="alert">
                                      {emailErr}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Sélecteur de règle de contact client */}
                              <div className="flex flex-col gap-1 pt-0.5">
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <ShieldCheck className="h-3.5 w-3.5 text-accent-solar shrink-0" />
                                  <span>Règle de contact avec les 3 installateurs :</span>
                                </span>
                                <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={contactPreference === "written_first"}
                                    onClick={() => setContactPreference("written_first")}
                                    className={`p-2.5 rounded-lg border text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between gap-0.5 ${
                                      contactPreference === "written_first"
                                        ? "border-emerald-500/50 bg-emerald-500/[0.08] ring-1 ring-emerald-500/30"
                                        : "border-border/70 bg-secondary/40 hover:bg-secondary/70"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Mail className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        Écrit d&apos;abord (E-mail / SMS)
                                      </span>
                                      <Badge variant="green" label="Recommandé" />
                                    </div>
                                    <span className="text-[11px] text-muted-foreground leading-snug pl-5">
                                      Offres transmises par écrit avant tout appel ou visite.
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={contactPreference === "direct_call"}
                                    onClick={() => setContactPreference("direct_call")}
                                    className={`p-2.5 rounded-lg border text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between gap-0.5 ${
                                      contactPreference === "direct_call"
                                        ? "border-emerald-500/50 bg-emerald-500/[0.08] ring-1 ring-emerald-500/30"
                                        : "border-border/70 bg-secondary/40 hover:bg-secondary/70"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <PhoneCall className="h-3.5 w-3.5 text-primary" />
                                        Contact direct autorisé
                                      </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground leading-snug pl-5">
                                      Appel des 3 installateurs pour planifier l&apos;étude technique.
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {/* GSM & Adresse */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div className="flex flex-col gap-1">
                                  <label htmlFor="phone" className="text-xs font-semibold text-foreground">
                                    Votre numéro de GSM <span className="text-destructive">*</span>
                                  </label>
                                  <input
                                    id="phone"
                                    type="tel"
                                    inputMode="tel"
                                    name="tel"
                                    autoComplete="tel"
                                    placeholder="0470 12 34 56"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className={`h-10 px-3 rounded-lg font-mono tabular-nums text-sm border transition-colors ${
                                      showPhoneError
                                        ? "border-destructive ring-2 ring-destructive/30 bg-destructive/[0.04]"
                                        : "border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    }`}
                                  />
                                  {showPhoneError ? (
                                    <p className="text-[11px] text-destructive font-medium" role="alert">
                                      {phoneErr || "Numéro belge requis."}
                                    </p>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      Pour certifier l&apos;appel d&apos;offres et vous notifier par SMS.
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label htmlFor="address" className="text-xs font-semibold text-foreground">
                                    Adresse (Rue et numéro) <span className="text-destructive">*</span>
                                  </label>
                                  <input
                                    id="address"
                                    autoComplete="street-address"
                                    placeholder="ex. Rue de la Station 12"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className={`h-10 px-3 rounded-lg text-sm border transition-colors ${
                                      showAddressError
                                        ? "border-destructive ring-2 ring-destructive/30 bg-destructive/[0.04]"
                                        : "border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    }`}
                                  />
                                  {showAddressError ? (
                                    <p className="text-[11px] text-destructive font-medium" role="alert">
                                      Adresse complète requise.
                                    </p>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">
                                      Nécessaire pour le dimensionnement toiture.
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Mandat RGPD */}
                              <div className="flex flex-col gap-2 pt-1 border-t border-border/80">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                  <Checkbox
                                    id="partnerConsent"
                                    checked={partnerConsent}
                                    onCheckedChange={(c) => setPartnerConsent(c === true)}
                                    className="mt-0.5"
                                  />
                                  <span className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                                    En validant, vous mandatez Aegis Solaire pour transmettre votre cahier des charges au lot indivisible de{" "}
                                    <span className="font-mono tabular-nums font-semibold text-foreground">3</span>{" "}
                                    installateurs partenaires certifiés RESCert actifs en province de{" "}
                                    <span className="font-semibold text-foreground">
                                      {getProvinceDisplayLabel(province)}
                                    </span>{" "}
                                    afin d&apos;établir vos offres comparatives (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setIsNetworkModalOpen(true)
                                      }}
                                      className="underline text-accent-solar font-semibold hover:text-accent-solar/80 inline cursor-pointer"
                                    >
                                      Consulter les critères et partenaires du réseau
                                    </button>
                                    ). Vos données sont traitées conformément au RGPD selon notre{" "}
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
                                <Banner
                                  status="error"
                                  title="Erreur lors de l'enregistrement"
                                  description={errorMessage}
                                  collapsible={false}
                                />
                              )}
                            </motion.fieldset>
                          )}

                        </AnimatePresence>

                        {/* ── BARRE DE NAVIGATION INFÉRIEURE ── */}
                        <div className="pt-3 border-t border-border/70 flex flex-col gap-2 mt-1">
                          <div className="flex items-center justify-between gap-3">
                            {step > 1 ? (
                              <button
                                type="button"
                                onClick={handleBack}
                                disabled={isSubmitting}
                                className="h-11 px-5 rounded-xl border border-border/80 bg-secondary/80 hover:bg-secondary text-foreground font-semibold text-sm transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2 shrink-0"
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
                                className="h-11 px-7 sm:px-8 rounded-xl bg-accent-solar text-accent-solar-foreground hover:bg-accent-solar/90 font-bold text-sm sm:text-base shadow-xs hover:shadow-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                              >
                                <span>Suivant</span>
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-11 flex-1 px-5 rounded-xl bg-primary hover:bg-slate-800 text-primary-foreground font-bold text-sm sm:text-base shadow-xs hover:shadow-sm transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer text-center group"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0 text-amber-400" />
                                    <span>Lancement de l&apos;appel d&apos;offres...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Obtenir mes 3 devis comparatifs</span>
                                    <ArrowRight className="h-4 w-4 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Mention de réassurance sous les boutons */}
                          {step === totalSteps ? (
                            <p className="text-center text-[11px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-0.5 font-medium leading-relaxed">
                              <Lock className="h-3.5 w-3.5 text-accent-solar shrink-0" />
                              <span>Charte Aegis Solaire : Dossier transmis exclusivement aux 3 installateurs RESCert retenus pour votre secteur. Zéro centre d&apos;appels, zéro revente à des tiers.</span>
                            </p>
                          ) : (
                            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-1 font-medium">
                              <Lock className="h-3.5 w-3.5 text-accent-solar" />
                              <span>100 % gratuit &amp; sans engagement · Pas de spam</span>
                            </p>
                          )}
                        </div>

                      </form>
                    </>
                  )}
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
                      Merci <strong className="text-foreground">{firstName}</strong>. Votre demande d&apos;audit pour la province de{" "}
                      <strong className="text-foreground">{getProvinceDisplayLabel(province)}</strong> a bien été transmise.
                    </p>
                  </div>

                  <Banner
                    status="success"
                    title="Prochaines étapes (délai garanti 48 h) :"
                    description="Les installateurs partenaires agréés RESCert examinent votre configuration toiture et préparent leurs chiffrages détaillés."
                    collapsible={false}
                  >
                    <ul className="text-xs text-muted-foreground list-disc pl-5 flex flex-col gap-1 pt-2">
                      <li>Transmission de votre demande à jusqu&apos;à 3 installateurs agréés RESCERT de votre région.</li>
                      <li>Prise de contact rapide pour valider vos spécificités toiture et vos habitudes de consommation.</li>
                      <li>Réception et comparaison de vos devis gratuits : vous restez totalement libre de choisir l&apos;installateur qui vous convient — ou aucun.</li>
                    </ul>
                  </Banner>

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

      {/* ── FOOTER LÉGAL STRICT (INIT42 - BCE Obligatoire) ── */}
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
                Méthode Aegis Solaire &amp; Meta Astryx
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
                className="w-full py-3 px-5 rounded-xl bg-accent-solar text-accent-solar-foreground hover:bg-accent-solar/90 font-bold text-sm transition-colors duration-150 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Faire ma demande gratuite</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE RÉSEAU & CRITÈRES RESCERT (Lot indivisible 3 installateurs) ── */}
      <NetworkPartnersModal
        open={isNetworkModalOpen}
        onOpenChange={setIsNetworkModalOpen}
        province={province}
      />

    </div>
  )
}
