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
  Users,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  detectCityPostalContradiction,
  getEmailError,
  getPersonNameError,
  formatAndValidateBelgianPhone,
  getWalloonProvinceKeyFromPostalCode,
  hasBelgianHouseNumber,
} from "@/lib/leads-validation"
import {
  BelgianLocalityField,
  BelgianStreetNumberFields,
} from "@/components/address/belgian-address-fields"
import {
  PhoneOtpVerificationCard,
  useLeadPhoneOtp,
} from "@/components/leads/phone-otp-verification-card"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import {
  trackLeadConversion,
  trackInitiateCheckout,
  trackSimulatorStart,
  trackOwnerQualified,
  trackContactInitiated,
} from "@/components/analytics/ad-tracking"
import { calculateB2CSolarROI } from "@/lib/solar-assumptions"
import {
  getConsumptionLabel,
  getOwnershipLabel,
  getPropertyTypeLabel,
  getRoofMaterialLabel,
  getRoofSurfaceLabel,
} from "@/lib/lead-display-helpers"
import { CompetitionInterstitial } from "@/components/funnel/competition-interstitial"
import { NetworkPartnersModal } from "@/components/funnel/network-partners-modal"

// ── Options du formulaire B2C (Wallonie) ──
// Étape 1 formulée en facture mensuelle (donnée connue de tous) au lieu des kWh annuels
// (inconnus de la majorité des visiteurs Meta). Les `id`, `billValue` et `kwhValue`
// restent strictement identiques : aucune incidence sur le calcul ROI ni sur les leads stockés.
const CONSUMPTION_OPTIONS = [
  { id: "lt_3000", label: "Moins de 85 € / mois", sublabel: "1–2 pers.", kwhHint: "< 3 000 kWh", billValue: 820, kwhValue: 2400 },
  { id: "3000_4000", label: "85 – 115 € / mois", sublabel: "2–3 pers.", kwhHint: "3 000–4 000 kWh", billValue: 1150, kwhValue: 3500 },
  { id: "4000_5000", label: "115 – 145 € / mois", sublabel: "3–4 pers.", kwhHint: "4 000–5 000 kWh", billValue: 1480, kwhValue: 4500 },
  { id: "5000_6000", label: "145 – 175 € / mois", sublabel: "4–5 pers.", kwhHint: "5 000–6 000 kWh", billValue: 1820, kwhValue: 5500 },
  { id: "gt_6000", label: "Plus de 175 € / mois", sublabel: "PAC, VE", kwhHint: "> 6 000 kWh", billValue: 2300, kwhValue: 7000 },
]

// Continuité du message annonce → landing (message match) selon l'utm_content Meta
const AD_HOOK_LINES: Record<string, string> = {
  V2_AD1_ECART_1850_GPT: "Jusqu'à 1 850 € d'écart entre deux devis pour une installation équivalente.",
  V2_AD2_RENTABILITE_2026_GPT: "Ce que le solaire rapporte vraiment en 2026, chiffré par des installateurs locaux.",
  V2_AD3_ANTI_DEMARCHAGE_GPT: "Sans démarchage : vous êtes contacté par écrit d'abord, et restez libre de tout refuser.",
}

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

const STEP_TITLES = [
  "TYPE DE BÂTIMENT",
  "PROFIL CONSOMMATION",
  "STATUT D'OCCUPATION",
  "SPÉCIFICATIONS TOITURE",
  "LOCALISATION EN WALLONIE",
  "COORDONNÉES DE CONTACT",
]

const STEP_QUESTIONS = [
  "De quel type de bâtiment s'agit-il ?",
  "Combien payez-vous d'électricité par mois (environ) ?",
  "Êtes-vous propriétaire du bâtiment ?",
  "Spécifications de votre toiture pour panneaux solaires",
  "Où se situe votre bâtiment en Wallonie ?",
  "À quelles coordonnées transmettre vos 3 devis comparatifs sans engagement ?",
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
  const [province, setProvince] = useState("")
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
  const phoneOtp = useLeadPhoneOtp()
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false)
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null)
  const [hasCopiedLink, setHasCopiedLink] = useState(false)
  const hasTrackedStep5 = useRef(false)
  const hasCapturedDraft = useRef(false)
  const hasTrackedStart = useRef(false)
  const hasTrackedOwner = useRef(false)
  const hasTrackedContact = useRef(false)
  const hasFiredInitiateCheckoutCapiRef = useRef(false)
  const trackedTelemetryStepsRef = useRef<Set<number>>(new Set())
  const provinceRef = useRef(province)
  provinceRef.current = province
  const [isUtmReady, setIsUtmReady] = useState(false)

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

      const hasFbcCookie = /(?:^|;\s*)_fbc=/.test(document.cookie)
      if (utm.fbclid && !hasFbcCookie) {
        const creationTime = Date.now()
        const hostname = window.location.hostname
        const isProdDomain = hostname === "aegissolaire.com" || hostname.endsWith(".aegissolaire.com")
        const domainAttr = isProdDomain ? "; domain=.aegissolaire.com" : ""
        const secureAttr = window.location.protocol === "https:" ? "; Secure" : ""
        document.cookie = `_fbc=fb.1.${creationTime}.${utm.fbclid}; path=/${domainAttr}; max-age=${90 * 24 * 3600}; SameSite=Lax${secureAttr}`
      }

      // Restauration de l'état sauvegardé en sessionStorage (résistance au refresh WebView Meta)
      const savedState = sessionStorage.getItem("aegis_funnel_saved_state")
      if (savedState) {
        try {
          const p = JSON.parse(savedState)
          if (p.consumption) setConsumption(p.consumption)
          if (p.propertyType) setPropertyType(p.propertyType)
          if (p.ownership) setOwnership(p.ownership)
          if (p.roofType) setRoofType(p.roofType)
          if (p.roofSurface) setRoofSurface(p.roofSurface)
          if (p.postalCode) {
            const cleanRestoredCp = String(p.postalCode).replace(/\D/g, "").slice(0, 4)
            setPostalCode(cleanRestoredCp)
            const derivedKey = cleanRestoredCp.length === 4 ? getWalloonProvinceKeyFromPostalCode(cleanRestoredCp) : null
            setProvince(derivedKey ?? "")
          } else if (p.province) {
            setProvince(p.province)
          }
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
    } finally {
      setIsUtmReady(true)
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

  // Télémétrie d'entonnoir 100 % anonyme (dédupliquée par étape après hydratation UTM)
  useEffect(() => {
    if (!isUtmReady || typeof window === "undefined" || !sessionIdRef.current) return
    if (trackedTelemetryStepsRef.current.has(step)) return
    trackedTelemetryStepsRef.current.add(step)
    try {
      const metaPvEventId =
        step === 1
          ? (window as unknown as { __aegisMetaPvEventId?: string }).__aegisMetaPvEventId
          : undefined
      fetch("/api/telemetry/funnel-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          step,
          stepName: STEP_TITLES[step - 1] ?? `Step ${step}`,
          province: provinceRef.current || undefined,
          utmSource: utmData.utm_source,
          utmCampaign: utmData.utm_campaign,
          utmContent: utmData.utm_content,
          utmTerm: utmData.utm_term,
          ...(metaPvEventId
            ? {
                metaPageViewEventId: metaPvEventId,
                fbclid: utmData.fbclid || undefined,
                sourceUrl: window.location.href,
              }
            : {}),
        }),
      }).catch(() => {})
    } catch {}
  }, [isUtmReady, step, utmData.utm_source, utmData.utm_campaign, utmData.utm_content, utmData.utm_term, utmData.fbclid])

  // Validation
  const emailErr = getEmailError(email)
  const phoneValidation = formatAndValidateBelgianPhone(phone)
  const phoneErr = phone.trim().length > 0 && !phoneValidation.isValid ? (phoneValidation.errorMessage || "Numéro de GSM belge invalide.") : null
  const isPhoneValid = phone.trim().length > 0 && phoneValidation.isValid

  const nameParts = fullName.trim() ? fullName.trim().split(/\s+/) : [firstName.trim(), lastName.trim()]
  const resolvedFirstName = nameParts[0] || firstName.trim()
  const resolvedLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : lastName.trim()
  const fullNameErr =
    resolvedFirstName.length < 2 || resolvedLastName.length < 2
      ? "Indiquez votre prénom et votre nom."
      : getPersonNameError(resolvedFirstName, "prénom") || getPersonNameError(resolvedLastName, "nom")
  const isFullNameValid = !fullNameErr

  const cleanedPostalCode = postalCode.trim()
  const walloonProvinceKey =
    cleanedPostalCode.length === 4 ? getWalloonProvinceKeyFromPostalCode(cleanedPostalCode) : null
  const isPostalCodeValid = walloonProvinceKey !== null
  const isNonWalloonCompleteCp = cleanedPostalCode.length === 4 && walloonProvinceKey === null
  const geoContradictionErr = detectCityPostalContradiction({
    postalCode: cleanedPostalCode,
    city,
    siteAddress: address,
    walloniaOnly: true,
  })
  const isAddressValid = hasBelgianHouseNumber(address) && !geoContradictionErr

  const showFullNameError = hasAttemptedSubmit && !isFullNameValid
  const showFirstNameError = hasAttemptedSubmit && !isFullNameValid
  const showLastNameError = hasAttemptedSubmit && !isFullNameValid
  const showEmailError = hasAttemptedSubmit && !!emailErr
  const showPhoneError = hasAttemptedSubmit && (!isPhoneValid || !!phoneErr)
  const showPostalCodeError = isNonWalloonCompleteCp || (hasAttemptedSubmit && !isPostalCodeValid)
  const showAddressError = hasAttemptedSubmit && !isAddressValid
  const showConsentError = hasAttemptedSubmit && !partnerConsent

  // Détection stricte de la province wallonne via le code postal complet (4 chiffres)
  const handlePostalCodeChange = (raw: string) => {
    const cleaned = raw.replace(/\D/g, "").slice(0, 4)
    setPostalCode(cleaned)
    if (cleaned.length === 4) {
      const derivedKey = getWalloonProvinceKeyFromPostalCode(cleaned)
      setProvince(derivedKey ?? "")
    } else {
      setProvince("")
    }
  }

  const scrollToForm = () => {
    leadCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const isStepValid = () => {
    if (step === 1) return !!propertyType
    if (step === 2) return !!consumption
    if (step === 3) return ownership === "proprietaire" || ownership === "copropriete"
    if (step === 4) return !!roofType && !!roofSurface
    if (step === 5) return isPostalCodeValid
    return true
  }

  const handleNext = () => {
    if (step === 1 && propertyType === "immeuble_commercial") {
      window.location.href = "/#simulateur"
      return
    }
    if (step === 1 && !hasTrackedStart.current && propertyType) {
      hasTrackedStart.current = true
      trackSimulatorStart({ consumption: consumption || propertyType })
    }
    if (step === 3 && ownership === "locataire") {
      return // Bloqué pour les locataires
    }
    if (step === 3 && (ownership === "proprietaire" || ownership === "copropriete") && !hasTrackedOwner.current) {
      hasTrackedOwner.current = true
      trackOwnerQualified({ ownership, propertyType })
    }
    if (step === 5) {
      if (!isPostalCodeValid) {
        setHasAttemptedSubmit(true)
        return
      }
      const icEventId = `event_ic_${sessionIdRef.current}`
      const activeProvince = walloonProvinceKey ?? province
      if (!hasTrackedStep5.current) {
        hasTrackedStep5.current = true
        trackInitiateCheckout({
          province: activeProvince,
          postalCode: cleanedPostalCode,
          eventId: icEventId,
        })
      }
      if (!hasFiredInitiateCheckoutCapiRef.current) {
        hasFiredInitiateCheckoutCapiRef.current = true
        void fetch("/api/telemetry/funnel-step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            step: 5,
            skipDbLog: true,
            metaEventName: "InitiateCheckout",
            eventId: icEventId,
            postalCode: cleanedPostalCode,
            province: activeProvince,
            fbclid: utmData.fbclid,
            sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
          }),
        }).catch(() => {})
      }
      // Déclenche l'interstitiel de mise en concurrence de 3000 ms
      setIsInterstitialRunning(true)
      return
    }
    if (step < totalSteps) {
      setStep((s) => s + 1)
    }
  }

  const handleInterstitialComplete = () => {
    setIsInterstitialRunning(false)
    setStep(6)
  }

  const handleBack = () => {
    if (isInterstitialRunning) return
    phoneOtp.resetOtp()
    if (step > 1) {
      setStep((s) => s - 1)
    }
  }

  // Auto-advance de 180 ms sur étapes à choix unique (style Bobex)
  const handleOptionSelect = (setter: (val: string) => void, val: string) => {
    setter(val)
    if (step === 1 && val === "immeuble_commercial") {
      setTimeout(() => {
        window.location.href = "/#simulateur"
      }, 150)
      return
    }
    if (step === 1 && !hasTrackedStart.current) {
      hasTrackedStart.current = true
      trackSimulatorStart({ consumption: val })
    }
    if (step === 3 && val === "locataire") {
      return // Ne pas avancer automatiquement pour afficher l'écran d'arrêt bienveillant
    }
    if (step === 3 && (val === "proprietaire" || val === "copropriete") && !hasTrackedOwner.current) {
      hasTrackedOwner.current = true
      trackOwnerQualified({ ownership: val, propertyType })
    }
    if (step < 4) {
      setTimeout(() => {
        setStep((s) => Math.min(totalSteps, s + 1))
      }, 180)
    }
  }

  // Capture silencieuse onBlur du champ e-mail
  const handleEmailBlur = async () => {
    if (!email || hasCapturedDraft.current) return
    const err = getEmailError(email)
    if (err) return

    const contactEventId = `event_contact_${sessionIdRef.current}`
    if (!hasTrackedContact.current) {
      hasTrackedContact.current = true
      trackContactInitiated({
        email: email.trim(),
        postalCode: cleanedPostalCode,
        province,
        eventId: contactEventId,
      })
    }

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
          postalCode: cleanedPostalCode,
          city,
          province,
          estimatedKwc: b2cCalc.installedPowerKwc,
          eventId: contactEventId,
          fbclid: utmData.fbclid,
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
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

  const submitFinalLead = async (
    phoneVerificationToken?: string
  ): Promise<{ ok: true; leadId: string } | { ok: false }> => {
    setIsSubmitting(true)
    setErrorMessage(null)

    const parts = fullName.trim() ? fullName.trim().split(/\s+/) : [firstName.trim(), lastName.trim()]
    const finalFirstName = parts[0] || firstName.trim() || "Particulier"
    const finalLastName = parts.slice(1).join(" ") || lastName.trim() || "Wallonie"

    const payload = {
      sessionId: sessionIdRef.current,
      segment: "B2C",
      sourceForm: "b2c_devis_landing",
      firstName: finalFirstName,
      lastName: finalLastName,
      email: email.trim().toLowerCase(),
      phone: phoneValidation.normalized,
      phoneVerificationToken,
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
        `Consommation annuelle: ${getConsumptionLabel(consumption)}`,
        `Type de bien: ${getPropertyTypeLabel(propertyType)}`,
        `Statut d'occupation: ${getOwnershipLabel(ownership)}`,
        `Couverture toiture: ${getRoofMaterialLabel(roofType)}`,
        `Surface toiture: ${getRoofSurfaceLabel(roofSurface)}`,
        `Préférence contact: ${contactPreference === "direct_call" ? "Appel direct autorisé (9h-18h)" : "Écrit d'abord (E-mail/SMS)"}`,
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
      if (ownership === "proprietaire" && !resData?.alreadyTracked) {
        trackLeadConversion({
          segment: "B2C",
          leadId: resData?.leadId,
          value: 64.9,
        })
      }
      try {
        sessionStorage.removeItem("aegis_funnel_saved_state")
      } catch {}
      return { ok: true, leadId: String(resData?.leadId || "") }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue")
      return { ok: false }
    } finally {
      setIsSubmitting(false)
    }
  }

  const finishSubmissionSuccess = () => {
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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

    setErrorMessage(null)

    const parts = fullName.trim() ? fullName.trim().split(/\s+/) : [firstName.trim(), lastName.trim()]
    const finalFirstName = parts[0] || firstName.trim() || "Particulier"
    const finalLastName = parts.slice(1).join(" ") || lastName.trim() || "Wallonie"

    await phoneOtp.executeSoftOtpSubmit({
      phone: phoneValidation.normalized,
      segment: "B2C",
      email: email.trim().toLowerCase(),
      firstName: finalFirstName,
      lastName: finalLastName,
      postalCode: postalCode.trim(),
      fax_number,
      form_opened_at: formOpenedAt.current,
      sessionId: sessionIdRef.current,
      saveLead: submitFinalLead,
      onComplete: finishSubmissionSuccess,
    })
  }

  const progressPercent = Math.round((step / totalSteps) * 100)

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col justify-between font-sans selection:bg-accent/15 selection:text-foreground [overflow-anchor:none]">
      
      {/* ── HEADER MINIMAL : Logo Aegis Solaire en haut à gauche ── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2.5 pb-1.5 sm:pt-5 sm:pb-2 shrink-0 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Aegis Solaire - Accueil">
          <div className="relative h-9 sm:h-14 md:h-16 w-36 sm:w-60 md:w-72">
            <Image
              src="/logo.png"
              alt="Aegis Solaire"
              fill
              className="object-contain object-left"
              priority
              sizes="(max-width: 640px) 180px, 320px"
            />
          </div>
        </Link>
      </header>

      {/* ── CORPS CENTRAL : Structure Mobile-First + Split-Screen Desktop ── */}
      <main className="flex-1 flex items-start justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 sm:py-4 lg:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr] gap-4 sm:gap-6 lg:gap-x-14 lg:gap-y-6 items-start w-full">
          
          {/* ── BLOC 1 : H1 & Promesse (Compact mobile above-the-fold) ── */}
          <div className="order-1 lg:order-none lg:col-span-6 lg:col-start-1 lg:row-start-1 flex flex-col gap-1 sm:gap-2">
            <h1 className="text-[22px] leading-[1.15] sm:text-4xl lg:text-[40px] font-bold tracking-tight text-foreground font-heading lg:leading-[1.14]">
              La meilleure offre solaire ?{" "}
              <span className="text-primary sm:block">
                Comparez jusqu&apos;à 3 devis.
              </span>
            </h1>

            <p className="text-xs sm:text-base text-muted-foreground leading-snug sm:leading-relaxed mt-0.5 sm:mt-1">
              {(utmData.utm_content && AD_HOOK_LINES[utmData.utm_content]) || (
                <>
                  Une seule demande, des installateurs certifiés <strong className="text-foreground font-semibold">RESCERT</strong> locaux.
                </>
              )}
            </p>
          </div>

          {/* ── BLOC 2 (Desktop Colonne Gauche Bas / Mobile sous le formulaire) : Autorité & Preuves ── */}
          <div className="order-3 lg:order-none lg:col-span-6 lg:col-start-1 lg:row-start-2 flex flex-col justify-start gap-5 sm:gap-6 self-start">

            {/* 3 Avantages clés avec pastilles orange circulaires (comme sur la référence) */}
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

            {/* Bloc Témoignage Vérifié (Julien Dubois) */}
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

          </div>

          {/* ── BLOC 3 : CARTE DU QUESTIONNAIRE (Directement au-dessus de la ligne de flottaison mobile) ── */}
          <div ref={leadCardRef} className="order-2 lg:order-none lg:col-span-6 lg:col-start-7 lg:row-start-1 lg:row-span-2 w-full">
            <div className="bg-[var(--aegis-surface)] border border-[var(--aegis-border)] rounded-[14px] shadow-2xs p-4 sm:p-8 flex flex-col justify-between max-w-xl mx-auto lg:max-w-none">
              
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
                      {/* En-tête de la carte unifié avec Étape X sur 6 */}
                      <div className="flex flex-col gap-2.5 pb-3 border-b border-[var(--aegis-divider)]">
                        <div className="flex items-center justify-between gap-4">
                          <div className="h-2 flex-1 bg-[var(--aegis-divider)] rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-accent-solar rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.25 }}
                            />
                          </div>
                          <span className="text-[13px] font-bold text-[var(--aegis-ink)] shrink-0 font-mono tabular-nums">
                            Étape {step} sur {totalSteps}
                          </span>
                        </div>

                        {step < 6 && (
                          <div className="hidden sm:flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-[5px] bg-[var(--aegis-preference-bg)] text-[11px] font-semibold text-[var(--aegis-preference-label)] border border-[var(--aegis-preference-accent)]/40">
                              Certifiés RESCert
                            </span>
                            <span className="px-2.5 py-0.5 rounded-[5px] bg-[var(--aegis-surface-subtle)] text-[11px] font-medium text-[var(--aegis-ink)] border border-[var(--aegis-border)]">
                              Gratuit &amp; sans engagement
                            </span>
                            <span className="px-2.5 py-0.5 rounded-[5px] bg-[var(--aegis-surface-subtle)] text-[11px] font-medium text-[var(--aegis-ink)] border border-[var(--aegis-border)]">
                              Artisans locaux
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Formulaire & Questions */}
                      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 pt-4">
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

                        {/* Question en titre (h2 dans la hiérarchie sous le h1 unique de page) */}
                        <h2 className="text-[20px] sm:text-[22px] font-bold text-[var(--aegis-ink)] tracking-[-0.02em] leading-[1.25]">
                          {STEP_QUESTIONS[step - 1]}
                        </h2>

                    <AnimatePresence mode="wait">
                      
                      {/* ── ÉTAPE 1 : Type de bâtiment (0 friction cognitive) ── */}
                      {step === 1 && (
                        <motion.fieldset
                          key="step1"
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
                                className={`w-full text-left min-h-[48px] py-3.5 px-4 sm:px-5 rounded-[8px] border transition-colors duration-150 cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
                                  isChecked
                                    ? "border-2 border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)] text-[var(--aegis-ink)] font-bold"
                                    : "border-[var(--aegis-input-border)]/45 bg-[var(--aegis-surface)] text-[var(--aegis-ink)] hover:bg-[var(--aegis-surface-subtle)] hover:border-[var(--aegis-ink)]/50 font-medium"
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span className="text-[15px] sm:text-[16px] font-bold text-[var(--aegis-ink)]">{item.label}</span>
                                  <span className="text-[13px] text-[var(--aegis-muted)] mt-0.5 font-normal">{item.sublabel}</span>
                                </div>
                                {isChecked && (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-solar text-accent-solar-foreground shrink-0">
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </motion.fieldset>
                      )}

                      {/* ── ÉTAPE 2 : Consommation mensuelle / annuelle ── */}
                      {step === 2 && (
                        <motion.fieldset
                          key="step2"
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
                                className={`w-full text-left min-h-[48px] py-3 px-4 sm:px-5 rounded-[8px] border transition-colors duration-150 cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
                                  isChecked
                                    ? "border-2 border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)] text-[var(--aegis-ink)] font-bold"
                                    : "border-[var(--aegis-input-border)]/45 bg-[var(--aegis-surface)] text-[var(--aegis-ink)] hover:bg-[var(--aegis-surface-subtle)] hover:border-[var(--aegis-ink)]/50 font-medium"
                                }`}
                              >
                                <span className="text-[15px] sm:text-[16px] font-bold text-[var(--aegis-ink)] font-mono tabular-nums whitespace-nowrap">
                                  {item.label}
                                </span>
                                <span className="flex items-center gap-2.5 shrink-0">
                                  <span
                                    className={`text-[12px] font-mono tabular-nums text-right ${
                                      isChecked ? "text-[var(--aegis-preference-label)] font-semibold" : "text-[var(--aegis-muted)] font-normal"
                                    }`}
                                  >
                                    {item.sublabel}
                                    <span className="hidden sm:inline"> · {item.kwhHint}</span>
                                  </span>
                                  {isChecked && (
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-solar text-accent-solar-foreground shrink-0">
                                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </span>
                                  )}
                                </span>
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
                                className={`w-full text-left min-h-[48px] py-3.5 px-4 sm:px-5 rounded-[8px] border transition-colors duration-150 cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
                                  isChecked
                                    ? item.id === "locataire"
                                      ? "border-2 border-[var(--aegis-danger-text)] bg-[var(--aegis-danger-bg)] text-[var(--aegis-danger-text)] font-bold"
                                      : "border-2 border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)] text-[var(--aegis-ink)] font-bold"
                                    : "border-[var(--aegis-input-border)]/45 bg-[var(--aegis-surface)] text-[var(--aegis-ink)] hover:bg-[var(--aegis-surface-subtle)] hover:border-[var(--aegis-ink)]/50 font-medium"
                                }`}
                              >
                                <div className="flex flex-col">
                                  <span
                                    className={`text-[15px] sm:text-[16px] font-bold ${
                                      isChecked && item.id === "locataire"
                                        ? "text-[var(--aegis-danger-text)]"
                                        : "text-[var(--aegis-ink)]"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                  <span className="text-[13px] text-[var(--aegis-muted)] mt-0.5 font-normal">{item.sublabel}</span>
                                </div>
                                {isChecked && (
                                  item.id === "locataire" ? (
                                    <Check className="h-4 w-4 stroke-[2.75] shrink-0 text-[var(--aegis-danger-text)]" />
                                  ) : (
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-solar text-accent-solar-foreground shrink-0">
                                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                                    </span>
                                  )
                                )}
                              </button>
                            )
                          })}

                          {ownership === "locataire" && (
                            <div className="p-4 rounded-[8px] bg-[var(--aegis-danger-bg)] border border-[var(--aegis-danger-text)]/25 flex flex-col gap-2.5 text-[13px]">
                              <span className="font-bold text-[var(--aegis-danger-text)]">
                                Audit réservé aux propriétaires du bien
                              </span>
                              <p className="text-[var(--aegis-ink)] leading-[1.5]">
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
                                className="w-fit min-h-[40px] px-3.5 py-1.5 rounded-[6px] bg-[var(--aegis-surface)] text-[var(--aegis-ink)] border border-[var(--aegis-border)] text-[13px] font-semibold hover:bg-[var(--aegis-surface-subtle)] flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                              >
                                {hasCopiedLink ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-[var(--aegis-availability-text)] stroke-[2.75]" />
                                    <span className="text-[var(--aegis-availability-text)]">Lien copié !</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="h-3.5 w-3.5 text-[var(--aegis-muted)]" />
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
                            <span className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                              Revêtement de toiture
                            </span>
                            <div className="grid grid-cols-2 gap-2.5">
                              {ROOF_OPTIONS.map((r) => {
                                const isChecked = roofType === r.id
                                return (
                                  <button
                                    type="button"
                                    key={r.id}
                                    onClick={() => setRoofType(r.id)}
                                    className={`min-h-[48px] py-3 px-4 rounded-[8px] border text-[14px] text-left transition-colors duration-150 cursor-pointer flex items-center justify-between gap-2 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
                                      isChecked
                                        ? "border-2 border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)] font-bold text-[var(--aegis-ink)]"
                                        : "border-[var(--aegis-input-border)]/45 bg-[var(--aegis-surface)] text-[var(--aegis-ink)] font-semibold hover:bg-[var(--aegis-surface-subtle)] hover:border-[var(--aegis-ink)]/50"
                                    }`}
                                  >
                                    <span>{r.label}</span>
                                    {isChecked && (
                                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-solar text-accent-solar-foreground shrink-0">
                                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                              Surface de toiture disponible
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {ROOF_SURFACES.map((s) => {
                                const isChecked = roofSurface === s.id
                                return (
                                  <button
                                    type="button"
                                    key={s.id}
                                    onClick={() => setRoofSurface(s.id)}
                                    className={`min-h-[56px] py-3 px-3 rounded-[8px] border text-center transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
                                      isChecked
                                        ? "border-2 border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)] font-bold text-[var(--aegis-ink)]"
                                        : "border-[var(--aegis-input-border)]/45 bg-[var(--aegis-surface)] text-[var(--aegis-ink)] hover:bg-[var(--aegis-surface-subtle)] hover:border-[var(--aegis-ink)]/50 font-medium"
                                    }`}
                                  >
                                    <span className="text-[15px] font-mono tabular-nums font-bold block text-[var(--aegis-ink)]">{s.label}</span>
                                    <span
                                      className={`text-[12px] font-mono tabular-nums block mt-0.5 ${
                                        isChecked ? "text-[var(--aegis-preference-label)] font-semibold" : "text-[var(--aegis-muted)] font-normal"
                                      }`}
                                    >
                                      {s.sublabel}
                                    </span>
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
                              <Label htmlFor="postalCode" className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                                Code postal (4 chiffres) <span className="text-[var(--aegis-danger-text)]">*</span>
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
                                className={`h-[46px] rounded-[6px] font-mono tabular-nums text-[15px] bg-[var(--aegis-surface)] text-[var(--aegis-ink)] placeholder:text-[var(--aegis-muted)]/85 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] focus-visible:ring-0 ${
                                  showPostalCodeError
                                    ? "border-[var(--aegis-danger-text)] bg-[var(--aegis-danger-bg)]/40 focus-visible:border-[var(--aegis-danger-text)]"
                                    : "border-[var(--aegis-input-border)] focus-visible:border-[var(--aegis-ink)]"
                                }`}
                              />
                              {showPostalCodeError && (
                                <p className="text-[12px] text-[var(--aegis-danger-text)] font-medium" role="alert">
                                  {isNonWalloonCompleteCp
                                    ? "Zone hors Wallonie (code postal wallon requis : 1300-1499 ou 4000-7999)."
                                    : "Code postal wallon requis (4 chiffres)."}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="city" className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                                Commune / Localité
                              </Label>
                              <BelgianLocalityField
                                id="city"
                                postalCode={cleanedPostalCode}
                                value={city}
                                onChange={setCity}
                                placeholder="ex. Namêche / Andenne"
                                editorial
                              />
                            </div>
                          </div>

                          {walloonProvinceKey && (
                            <div className="px-3.5 py-3 rounded-[8px] bg-[var(--aegis-availability-bg)] border border-[var(--aegis-border)] flex items-center justify-between gap-3">
                              <span className="text-[13px] text-[var(--aegis-availability-text)] font-medium flex items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span>Province détectée</span>
                              </span>
                              <span className="font-mono tabular-nums text-[13px] font-semibold text-[var(--aegis-availability-text)]">
                                {getProvinceDisplayLabel(walloonProvinceKey)} · Artisans actifs
                              </span>
                            </div>
                          )}

                          {isNonWalloonCompleteCp && (
                            <div
                              role="alert"
                              className="p-3.5 rounded-[8px] bg-[var(--aegis-danger-bg)] border border-[var(--aegis-danger-text)]/25 flex items-start gap-2.5 text-[var(--aegis-danger-text)]"
                            >
                              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                              <div className="flex flex-col gap-0.5 text-[13px] leading-[1.45]">
                                <span className="font-bold">Zone non couverte ({cleanedPostalCode})</span>
                                <span className="text-[var(--aegis-ink)]">
                                  Notre comparateur RESCert intervient exclusivement en Wallonie (codes postaux{" "}
                                  <span className="font-mono tabular-nums font-semibold">1300-1499</span> et{" "}
                                  <span className="font-mono tabular-nums font-semibold">4000-7999</span>).
                                </span>
                              </div>
                            </div>
                          )}
                        </motion.fieldset>
                      )}

                      {/* ── ÉTAPE 6 : Coordonnées & Mise en concurrence ── */}
                      {step === 6 && (
                        <motion.fieldset
                          key="step6"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.18 }}
                          className="flex flex-col gap-4 border-none p-0 m-0"
                        >
                          {phoneOtp.challenge.active ? (
                            <PhoneOtpVerificationCard
                              challenge={phoneOtp.challenge}
                              cooldown={phoneOtp.cooldown}
                              onCodeChange={phoneOtp.setCode}
                              onVerify={async (codeOverride) => {
                                const check = await phoneOtp.submitCode(
                                  phoneValidation.normalized,
                                  codeOverride
                                )
                                if (check.ok) {
                                  finishSubmissionSuccess()
                                }
                              }}
                              onResend={async (channel) => {
                                const parts = fullName.trim()
                                  ? fullName.trim().split(/\s+/)
                                  : [firstName.trim(), lastName.trim()]
                                await phoneOtp.sendOtpRequest({
                                  phone: phoneValidation.normalized,
                                  segment: "B2C",
                                  email: email.trim().toLowerCase(),
                                  firstName: parts[0] || firstName.trim(),
                                  lastName: parts.slice(1).join(" ") || lastName.trim(),
                                  postalCode: postalCode.trim(),
                                  channel,
                                  fax_number,
                                  form_opened_at: formOpenedAt.current,
                                  sessionId: sessionIdRef.current,
                                })
                              }}
                              onEditPhone={phoneOtp.resetOtp}
                              onSkip={() => {
                                phoneOtp.resetOtp()
                                finishSubmissionSuccess()
                              }}
                              editorial
                              submitLabel="Confirmer et finaliser en priorité"
                            />
                          ) : (
                            <>
                          {/* ── RAPPEL VISUEL : Effet de la mise en concurrence (-18 %) ── */}
                          <div className="bg-[var(--aegis-summary)] border border-[var(--aegis-preference-accent)]/50 rounded-[8px] p-3.5 sm:p-4 text-[var(--aegis-ink)] flex flex-col gap-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--aegis-ink)]">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-solar text-accent-solar-foreground shrink-0">
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </span>
                                <span>3 installateurs RESCert sélectionnés sur {postalCode} {city || getProvinceDisplayLabel(province)}</span>
                              </div>
                              <span className="px-2 py-0.5 rounded-[5px] bg-[var(--aegis-preference-bg)] border border-[var(--aegis-preference-accent)]/40 text-[12px] font-mono tabular-nums text-[var(--aegis-preference-label)] font-bold shrink-0">
                                env. {b2cCalc.installedPowerKwc} kWc
                              </span>
                            </div>

                            {/* Jauge comparative claire 100 % vs 82 % */}
                            <div className="bg-[var(--aegis-surface)] rounded-[6px] p-2.5 sm:p-3 flex flex-col gap-2 border border-[var(--aegis-border)]">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[12px]">
                                  <span className="text-[var(--aegis-muted)] font-medium">Devis standard isolé</span>
                                  <span className="font-mono tabular-nums text-[var(--aegis-muted)] font-semibold">100 % (marge standard)</span>
                                </div>
                                <div className="h-2 w-full bg-[var(--aegis-divider)] rounded-full overflow-hidden">
                                  <div className="h-full w-full bg-[var(--aegis-input-border)] rounded-full" />
                                </div>
                              </div>

                              <div className="flex flex-col gap-1 pt-0.5">
                                <div className="flex items-center justify-between text-[12px]">
                                  <span className="font-bold text-[var(--aegis-ink)]">Mise en concurrence (3 devis)</span>
                                  <span className="font-mono tabular-nums text-[var(--aegis-availability-text)] font-bold">82 % (tarif négocié)</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <div className="flex-1 h-2.5 bg-[var(--aegis-surface-subtle)] rounded-full overflow-hidden border border-[var(--aegis-border)]">
                                    <div className="h-full w-[82%] bg-accent-solar rounded-full" />
                                  </div>
                                  <span className="px-2 py-0.5 rounded-[5px] bg-accent-solar text-accent-solar-foreground text-[12px] font-mono tabular-nums font-bold shrink-0">
                                    -18 %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* ── Rangée 1 : Prénom/Nom + Adresse E-mail ── */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Champ 1 : fullName */}
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="fullName" className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                                Prénom et nom <span className="text-[var(--aegis-danger-text)]">*</span>
                              </Label>
                              <Input
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
                                className={`h-[46px] rounded-[6px] text-[14px] bg-[var(--aegis-surface)] text-[var(--aegis-ink)] placeholder:text-[var(--aegis-muted)]/85 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] focus-visible:ring-0 ${
                                  showFullNameError
                                    ? "border-[var(--aegis-danger-text)] bg-[var(--aegis-danger-bg)]/40 focus-visible:border-[var(--aegis-danger-text)]"
                                    : "border-[var(--aegis-input-border)] focus-visible:border-[var(--aegis-ink)]"
                                }`}
                              />
                              {showFullNameError && (
                                <p className="text-[12px] text-[var(--aegis-danger-text)] font-medium" role="alert">
                                  {fullNameErr || "Indiquez votre prénom et votre nom."}
                                </p>
                              )}
                            </div>

                            {/* Champ 2 : email avec capture silencieuse onBlur */}
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="email" className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                                Adresse e-mail <span className="text-[var(--aegis-danger-text)]">*</span>
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                inputMode="email"
                                name="email"
                                autoComplete="email"
                                placeholder="nom@exemple.be"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={handleEmailBlur}
                                className={`h-[46px] rounded-[6px] text-[14px] bg-[var(--aegis-surface)] text-[var(--aegis-ink)] placeholder:text-[var(--aegis-muted)]/85 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] focus-visible:ring-0 ${
                                  showEmailError
                                    ? "border-[var(--aegis-danger-text)] bg-[var(--aegis-danger-bg)]/40 focus-visible:border-[var(--aegis-danger-text)]"
                                    : "border-[var(--aegis-input-border)] focus-visible:border-[var(--aegis-ink)]"
                                }`}
                              />
                              {showEmailError && (
                                <p className="text-[12px] text-[var(--aegis-danger-text)] font-medium" role="alert">
                                  {emailErr}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* ── Rangée 2 : Sélecteur de règle de contact ── */}
                          <div className="flex flex-col gap-1.5 pt-0.5">
                            <Label className="text-[13px] font-semibold text-[var(--aegis-ink)] flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-[var(--aegis-focus)] shrink-0" />
                              <span>Premier contact souhaité avec les 3 installateurs</span>
                            </Label>
                            <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Option 1: written_first */}
                              <button
                                type="button"
                                role="radio"
                                aria-checked={contactPreference === "written_first"}
                                onClick={() => setContactPreference("written_first")}
                                className={`p-3 rounded-[8px] border text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between gap-1.5 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
                                  contactPreference === "written_first"
                                    ? "border-2 border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)]"
                                    : "border-[var(--aegis-input-border)]/45 bg-[var(--aegis-surface)] hover:bg-[var(--aegis-surface-subtle)] hover:border-[var(--aegis-ink)]/50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[13px] font-bold text-[var(--aegis-ink)] flex items-center gap-1.5">
                                    <span
                                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        contactPreference === "written_first"
                                          ? "border-[var(--aegis-preference-accent)] bg-accent-solar text-accent-solar-foreground"
                                          : "border-[var(--aegis-input-border)] bg-[var(--aegis-surface)]"
                                      }`}
                                    >
                                      {contactPreference === "written_first" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                    </span>
                                    Écrit d&apos;abord (e-mail / SMS)
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-[5px] bg-accent-solar text-accent-solar-foreground border border-[var(--aegis-preference-accent)] text-[11px] font-bold">
                                    Recommandé
                                  </span>
                                </div>
                                <span
                                  className={`text-[12px] leading-[1.4] pl-5.5 ${
                                    contactPreference === "written_first"
                                      ? "text-[var(--aegis-preference-label)] font-medium"
                                      : "text-[var(--aegis-muted)]"
                                  }`}
                                >
                                  Offres transmises par écrit avant tout appel ou visite.
                                </span>
                              </button>

                              {/* Option 2: direct_call */}
                              <button
                                type="button"
                                role="radio"
                                aria-checked={contactPreference === "direct_call"}
                                onClick={() => setContactPreference("direct_call")}
                                className={`p-3 rounded-[8px] border text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between gap-1.5 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] ${
                                  contactPreference === "direct_call"
                                    ? "border-2 border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)]"
                                    : "border-[var(--aegis-input-border)]/45 bg-[var(--aegis-surface)] hover:bg-[var(--aegis-surface-subtle)] hover:border-[var(--aegis-ink)]/50"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[13px] font-bold text-[var(--aegis-ink)] flex items-center gap-1.5">
                                    <span
                                      className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                        contactPreference === "direct_call"
                                          ? "border-[var(--aegis-preference-accent)] bg-accent-solar text-accent-solar-foreground"
                                          : "border-[var(--aegis-input-border)] bg-[var(--aegis-surface)]"
                                      }`}
                                    >
                                      {contactPreference === "direct_call" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                    </span>
                                    Contact direct autorisé
                                  </span>
                                </div>
                                <span
                                  className={`text-[12px] leading-[1.4] pl-5.5 ${
                                    contactPreference === "direct_call"
                                      ? "text-[var(--aegis-preference-label)] font-medium"
                                      : "text-[var(--aegis-muted)]"
                                  }`}
                                >
                                  Appel des 3 installateurs pour planifier l&apos;étude technique.
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* ── Rangée 3 : Numéro de GSM + Adresse postale ── */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Champ 4 : GSM belge */}
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="phone" className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                                Numéro de GSM <span className="text-[var(--aegis-danger-text)]">*</span>
                              </Label>
                              <Input
                                id="phone"
                                type="tel"
                                inputMode="tel"
                                name="tel"
                                autoComplete="tel"
                                placeholder="0470 12 34 56"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onFocus={(e) =>
                                  setTimeout(
                                    () => e.target.scrollIntoView({ behavior: "smooth", block: "center" }),
                                    300
                                  )
                                }
                                className={`h-[46px] rounded-[6px] font-mono tabular-nums text-[14px] bg-[var(--aegis-surface)] text-[var(--aegis-ink)] placeholder:text-[var(--aegis-muted)]/85 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] focus-visible:ring-0 ${
                                  showPhoneError
                                    ? "border-[var(--aegis-danger-text)] bg-[var(--aegis-danger-bg)]/40 focus-visible:border-[var(--aegis-danger-text)]"
                                    : "border-[var(--aegis-input-border)] focus-visible:border-[var(--aegis-ink)]"
                                }`}
                              />
                              {showPhoneError ? (
                                <p className="text-[12px] text-[var(--aegis-danger-text)] font-medium" role="alert">
                                  {phoneErr || "Numéro belge requis (format 04XX XX XX XX)."}
                                </p>
                              ) : (
                                <span className="text-[12px] text-[var(--aegis-muted)]">
                                  Pour certifier l&apos;appel d&apos;offres et vous notifier par SMS.
                                </span>
                              )}
                            </div>

                            {/* Champ 5 : Adresse structurée (Rue + Numéro SPW ICAR) */}
                            <div className="flex flex-col gap-1.5">
                              <Label htmlFor="address" className="text-[13px] font-semibold text-[var(--aegis-ink)]">
                                Adresse du bien (rue et n°) <span className="text-[var(--aegis-danger-text)]">*</span>
                              </Label>
                              <BelgianStreetNumberFields
                                streetId="address"
                                houseId="address-number"
                                value={address}
                                onChange={setAddress}
                                postalCode={cleanedPostalCode}
                                city={city}
                                onSuggestionSelect={(s) => {
                                  if (
                                    s.section &&
                                    (!city.trim() ||
                                      city.trim().toLowerCase() === s.city.toLowerCase())
                                  ) {
                                    setCity(s.section)
                                  }
                                }}
                                showError={showAddressError}
                                required
                                requireHouseNumber
                                inputHeightClass="h-[46px]"
                                editorial
                              />
                              {showAddressError && geoContradictionErr ? (
                                <p className="text-[12px] text-[var(--aegis-danger-text)] font-medium" role="alert">
                                  {geoContradictionErr}
                                </p>
                              ) : !showAddressError ? (
                                <span className="text-[12px] text-[var(--aegis-muted)]">
                                  Nécessaire pour situer votre toiture (étude satellite).
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Consentement RGPD conforme APD & modale réseau */}
                          <div className="flex flex-col gap-2 pt-3 border-t border-[var(--aegis-divider)]">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <Checkbox
                                id="partnerConsent"
                                checked={partnerConsent}
                                onCheckedChange={(c) => setPartnerConsent(c === true)}
                                className="mt-0.5 border-[var(--aegis-input-border)] data-[state=checked]:bg-[var(--aegis-ink)] data-[state=checked]:border-[var(--aegis-ink)] focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                              />
                              <span className="text-[12px] text-[var(--aegis-muted)] leading-[1.5]">
                                En validant, vous mandatez Aegis Solaire pour transmettre votre cahier des charges au lot indivisible de{" "}
                                <span className="font-mono tabular-nums font-semibold text-[var(--aegis-ink)]">3</span>{" "}
                                installateurs partenaires certifiés RESCert actifs en province de{" "}
                                <span className="font-semibold text-[var(--aegis-ink)]">
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
                                  className="underline underline-offset-4 text-[var(--aegis-link)] font-semibold hover:text-[var(--aegis-ink)] inline cursor-pointer"
                                >
                                  Consulter les critères et partenaires du réseau
                                </button>
                                ). Vos données sont traitées conformément au RGPD selon notre{" "}
                                <Link
                                  href="/politique-confidentialite"
                                  target="_blank"
                                  className="underline underline-offset-4 text-[var(--aegis-link)] font-semibold hover:text-[var(--aegis-ink)]"
                                >
                                  politique de confidentialité
                                </Link>
                                .
                              </span>
                            </label>
                            {showConsentError && (
                              <p className="text-[12px] text-[var(--aegis-danger-text)] font-medium" role="alert">
                                Veuillez accepter ces conditions pour valider votre demande.
                              </p>
                            )}
                          </div>
                            </>
                          )}

                          {errorMessage && (
                            <div
                              role="alert"
                              className="p-3 rounded-[8px] bg-[var(--aegis-danger-bg)] border border-[var(--aegis-danger-text)]/25 text-[13px] text-[var(--aegis-danger-text)] font-medium"
                            >
                              {errorMessage}
                            </div>
                          )}
                        </motion.fieldset>
                      )}

                    </AnimatePresence>

                    {/* ── BARRE DE NAVIGATION INFÉRIEURE ── */}
                    <div className="pt-4 border-t border-[var(--aegis-divider)] flex flex-col gap-3 mt-1">
                      <div className="flex items-center justify-between gap-3">
                        {step > 1 ? (
                          <button
                            type="button"
                            onClick={handleBack}
                            disabled={isSubmitting}
                            className="h-[46px] px-5 rounded-[6px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] hover:bg-[var(--aegis-surface-subtle)] text-[var(--aegis-ink)] font-semibold text-[14px] transition-colors duration-150 cursor-pointer flex items-center justify-center gap-2 shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
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
                            className="h-[46px] px-7 sm:px-8 rounded-[6px] bg-accent-solar hover:bg-accent-solar/90 text-accent-solar-foreground border border-[var(--aegis-preference-accent)] font-bold text-[15px] transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:bg-[var(--aegis-surface-subtle)] disabled:text-[var(--aegis-muted)] disabled:border-[var(--aegis-border)] disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                          >
                            <span>Suivant</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        ) : !phoneOtp.challenge.active ? (
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-[48px] flex-1 px-5 rounded-[6px] bg-accent-solar hover:bg-accent-solar/90 disabled:opacity-65 text-accent-solar-foreground border border-[var(--aegis-preference-accent)] font-bold text-[15px] transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer text-center focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                <span>Envoi de votre demande…</span>
                              </>
                            ) : (
                              <>
                                <span>Obtenir mes 3 devis comparatifs</span>
                                <ArrowRight className="h-4 w-4 shrink-0" />
                              </>
                            )}
                          </button>
                        ) : null}
                      </div>

                      {/* Mention de réassurance sous les boutons */}
                      {step === totalSteps ? (
                        <p className="text-center text-[12px] text-[var(--aegis-muted)] flex items-center justify-center gap-1.5 pt-0.5 leading-[1.45]">
                          <Lock className="h-3.5 w-3.5 text-accent-solar shrink-0" />
                          <span>Charte Aegis Solaire : dossier transmis exclusivement aux 3 installateurs RESCert retenus pour votre secteur. Zéro centre d&apos;appels, zéro revente à des tiers.</span>
                        </p>
                      ) : (
                        <p className="text-center text-[12px] text-[var(--aegis-muted)] flex items-center justify-center gap-1.5 pt-0.5">
                          <Lock className="h-3.5 w-3.5 text-accent-solar shrink-0" />
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
                <div className="p-4 sm:p-6 text-center flex flex-col items-center gap-4">
                  <div className="h-12 w-12 rounded-[14px] bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-accent)] border border-[var(--aegis-preference-accent)]/40 flex items-center justify-center">
                    <Check className="h-6 w-6 stroke-[2.75]" />
                  </div>
                  <div>
                    <h2 className="text-[22px] sm:text-[24px] font-bold text-[var(--aegis-ink)] tracking-[-0.02em] leading-[1.2]">
                      Demande enregistrée avec succès
                    </h2>
                    <p className="text-[14px] text-[var(--aegis-muted)] max-w-md mx-auto leading-[1.5] mt-1.5">
                      Merci <strong className="text-[var(--aegis-ink)]">{firstName}</strong>. Votre demande d&apos;audit pour la province de{" "}
                      <strong className="text-[var(--aegis-ink)]">{getProvinceDisplayLabel(province)}</strong> a bien été transmise.
                    </p>
                  </div>

                  <div className="bg-[var(--aegis-summary)] border border-[var(--aegis-border)] rounded-[8px] p-4 text-left max-w-md w-full flex flex-col gap-2.5 text-[13px]">
                    <p className="font-semibold text-[var(--aegis-ink)] flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5 text-accent-solar shrink-0" />
                      <span>
                        Prochaines étapes (sous{" "}
                        <span className="font-mono tabular-nums font-bold text-[var(--aegis-ink)]">48 h</span>)
                      </span>
                    </p>
                    <ul className="flex flex-col gap-1.5 text-[var(--aegis-muted)] list-disc pl-5 leading-[1.45]">
                      <li>
                        Transmission de votre demande à jusqu&apos;à{" "}
                        <span className="font-mono tabular-nums font-bold text-[var(--aegis-ink)]">3</span> installateurs agréés RESCert de votre région.
                      </li>
                      <li>Prise de contact rapide pour valider vos spécificités toiture et vos habitudes de consommation.</li>
                      <li>Réception et comparaison de vos devis gratuits : vous êtes totalement libre de choisir votre installateur — ou aucun.</li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/"
                      className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px] rounded-[5px]"
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
