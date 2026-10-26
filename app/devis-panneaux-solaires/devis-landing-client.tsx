"use client"

import { useState, useRef, useEffect } from "react"
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
  X,
  Star,
  Lock,
  Clock,
  ChevronDown,
  BadgeCheck,
  FileText,
  BadgeEuro,
  TrendingUp,
  BatteryFull,
  Car,
  MapPin,
  HelpCircle,
  Sparkles,
  PhoneCall,
  Flame,
  Award,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { getEmailError, getPhoneError } from "@/lib/leads-validation"
import { getStoredMediaPartnerRef } from "@/components/media-partner-ref-tracker"
import { trackLeadConversion } from "@/components/analytics/ad-tracking"

// ── Options du formulaire B2C (Wallonie) ──
const CONSUMPTION_OPTIONS = [
  { id: "lt_3000", label: "Moins de 3 000 kWh", sublabel: "1 à 2 personnes (Facture < 85 € / mois)", billValue: 1000 },
  { id: "3000_4000", label: "3 000 à 4 000 kWh", sublabel: "2 à 3 personnes (Facture ~85 à 115 € / mois)", billValue: 1800 },
  { id: "4000_5000", label: "4 000 à 5 000 kWh", sublabel: "3 à 4 personnes (Facture ~115 à 145 € / mois)", billValue: 2400 },
  { id: "5000_6000", label: "5 000 à 6 000 kWh", sublabel: "4 à 5 personnes (Facture ~145 à 175 € / mois)", billValue: 3100 },
  { id: "gt_6000", label: "Plus de 6 000 kWh", sublabel: "Grand foyer, PAC ou borne VE (> 175 € / mois)", billValue: 4500 },
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
  { id: "plat", label: "Toit plat (Roofing / EPDM)", sublabel: "Pose sur structures lestées" },
  { id: "autre", label: "Autre / Pose au sol", sublabel: "Étudié sur mesure avec l'installateur" },
]

const ROOF_SURFACES = [
  { id: "small", label: "< 30 m²", sublabel: "≈ 3 à 4 kWc (10 à 12 panneaux)", m2: 25 },
  { id: "medium", label: "30–60 m²", sublabel: "≈ 5 à 8 kWc (14 à 20 panneaux)", m2: 45 },
  { id: "large", label: "> 60 m²", sublabel: "> 8 kWc (Grand potentiel)", m2: 75 },
]

const BATTERY_INTEREST_OPTIONS = [
  { id: "oui", label: "Oui", sublabel: "Indispensable" },
  { id: "hesite", label: "À évaluer", sublabel: "Peut-être" },
  { id: "non", label: "Non", sublabel: "Panneaux seuls" },
]

const EV_CHARGER_INTEREST_OPTIONS = [
  { id: "oui", label: "Oui", sublabel: "Déjà équipé" },
  { id: "prevu", label: "Prévu", sublabel: "Prochainement" },
  { id: "non", label: "Non", sublabel: "Pas de VE" },
]

const STEP_TITLES = [
  "PROFIL CONSOMMATION",
  "TYPE DE BÂTIMENT",
  "STATUT D'OCCUPATION",
  "TOITURE & ÉQUIPEMENTS",
  "LOCALISATION EN WALLONIE",
  "COORDONNÉES DE CONTACT",
]

const FAQ_ITEMS = [
  {
    q: "Combien de devis vais-je recevoir ?",
    a: "Vous recevrez jusqu'à 3 devis chiffrés et directement comparables d'installateurs photovoltaïques certifiés RESCERT actifs dans votre province ou commune wallonne.",
  },
  {
    q: "Ce service est-il réellement 100 % gratuit et sans engagement ?",
    a: "Oui, totalement 0 €. Notre mission est de vous faire économiser du temps et de l'argent en mettant en concurrence des artisans locaux sérieux. Vous restez entièrement libre d'accepter une offre — ou de n'en choisir aucune.",
  },
  {
    q: "Pourquoi exiger exclusivement des installateurs certifiés RESCERT ?",
    a: "Le label RESCERT Photovoltaïque est la certification officielle de compétence en Wallonie. Il garantit la conformité électrique (RGIE), un dimensionnement exact et la validation technique pour les raccordements réseau ORES / RESA.",
  },
  {
    q: "Quel est le délai moyen pour recevoir mes offres ?",
    a: "Après validation de votre demande, nos installateurs partenaires prennent contact en moyenne sous 24 à 48 heures ouvrées pour affiner vos spécificités de toiture et vous transmettre votre étude chiffrée sur mesure.",
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
  const [consumption, setConsumption] = useState("")
  const [propertyType, setPropertyType] = useState("")
  const [ownership, setOwnership] = useState("proprietaire")
  const [roofType, setRoofType] = useState("tuiles")
  const [roofSurface, setRoofSurface] = useState("medium")
  const [batteryInterest, setBatteryInterest] = useState("hesite")
  const [evChargerInterest, setEvChargerInterest] = useState("non")
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
  const [showStickyBar, setShowStickyBar] = useState(false)

  const formOpenedAt = useRef(new Date().toISOString())
  const leadCardRef = useRef<HTMLDivElement>(null)

  // Capture des UTM et fbclid
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

  // Observateur de scroll pour le sticky CTA mobile
  useEffect(() => {
    const handleScroll = () => {
      if (leadCardRef.current) {
        const rect = leadCardRef.current.getBoundingClientRect()
        // Si le formulaire est dépassé vers le haut, afficher la barre
        setShowStickyBar(rect.bottom < 0)
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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

  // Auto-advance de 180 ms sur étapes à choix unique
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
        `Batterie: ${batteryInterest}`,
        `Borne VE: ${evChargerInterest}`,
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
        batteryInterest,
        evChargerInterest,
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
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-accent/15 selection:text-foreground">
      {/* ── EN-TÊTE ÉPURÉ INSTITUTIONNEL ── */}
      <header className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-2xs group-hover:bg-accent transition-colors">
              <Zap className="h-5 w-5 text-accent group-hover:text-primary-foreground transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg tracking-tight text-foreground leading-none">
                Aegis <span className="text-accent">Solaire</span>
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">
                Audit &amp; Tiers de Confiance
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary border border-border text-xs font-mono font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span>Wallonie 2026 · Réglementation CWaPE</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/[0.06] border border-primary/20 text-xs font-mono font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span>Certifiés RESCERT</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION BENTO SPLIT-SCREEN ── */}
      <section className="relative py-8 md:py-16 border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* ── COLONNE GAUCHE : Valeur ajoutée, Réassurance & Preuve ── */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              
              <div className="flex flex-col gap-3">
                {/* Eyebrow institutionnel unique */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/[0.06] border border-primary/20 text-primary text-xs font-mono font-medium w-fit shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span>Organe Indépendant · 100 % Wallonie</span>
                </div>

                {/* UN SEUL H1 PAR ROUTE (Loi stricte SEO & Accessibilité) */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground font-heading leading-[1.12]">
                  La meilleure offre solaire ?{" "}
                  <span className="block mt-1 sm:mt-2 text-primary">
                    Comparez jusqu&apos;à{" "}
                    <span className="font-mono tabular-nums underline decoration-accent decoration-2 underline-offset-8">
                      3 devis
                    </span>
                    .
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mt-1">
                  Une seule demande pour mettre en concurrence des artisans certifiés{" "}
                  <strong className="text-foreground font-semibold">RESCERT</strong> de votre province. Gratuit,
                  sans engagement et réponse garantie sous{" "}
                  <span className="font-mono tabular-nums font-semibold text-foreground">48 h</span>.
                </p>
              </div>

              {/* Bento Grid 3 Avantages clés */}
              <div className="grid grid-cols-1 gap-3 pt-1">
                {[
                  {
                    id: 1,
                    title: (
                      <>
                        Économisez jusqu&apos;à{" "}
                        <span className="font-mono tabular-nums font-bold text-accent">70 %</span> sur votre facture
                      </>
                    ),
                    desc: "Un dimensionnement optimisé selon votre profil d'autoconsommation vous protège contre la volatilité des tarifs réseau en Wallonie.",
                    icon: Zap,
                  },
                  {
                    id: 2,
                    title: "Installateurs certifiés RESCERT de votre région",
                    desc: "Chaque professionnel possède l'agrément officiel garantissant la conformité électrique RGIE et la validation par ORES / RESA.",
                    icon: ShieldCheck,
                  },
                  {
                    id: 3,
                    title: (
                      <>
                        Réponse sous <span className="font-mono tabular-nums font-semibold">48 h</span>, sans aucune obligation
                      </>
                    ),
                    desc: "Recevez jusqu'à 3 propositions techniques et financières détaillées. Vous comparez à votre rythme et décidez librement.",
                    icon: Clock,
                  },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-card shadow-xs hover:border-accent/30 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0 mt-0.5 border border-border/80">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground leading-snug">{item.title}</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">{item.desc}</span>
                      </div>
                    </div>
                  )
                })}

                {/* Lien interactif modal */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsHowItWorksOpen(true)}
                    className="text-xs font-mono font-medium text-accent hover:underline underline-offset-4 flex items-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-accent" />
                    <span>Consulter le détail de la méthode en 3 étapes</span>
                  </button>
                </div>
              </div>

              {/* Étude de cas chiffrée réelle (Conforme Livre VI CDE) */}
              <div className="pt-1">
                <div className="bg-muted/70 rounded-xl p-5 border border-border shadow-xs flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary shrink-0 shadow-2xs">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        Cas Réel Constaté · Chaudfontaine (Liège)
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/10 text-accent font-medium">
                        Audit 2026
                      </span>
                    </div>
                    <blockquote className="text-xs sm:text-sm text-foreground leading-relaxed">
                      « Pour une maison 4 façades avec{" "}
                      <span className="font-mono tabular-nums font-semibold">12 panneaux</span> (
                      <span className="font-mono tabular-nums font-semibold">5,2 kWc</span>) et onduleur hybride,
                      l&apos;écart entre les 3 offres d&apos;installateurs agréés a atteint{" "}
                      <strong className="font-mono tabular-nums font-bold text-primary">1 850 € TTC</strong> à
                      matériel rigoureusement équivalent. »
                    </blockquote>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Comparaison indépendante basée sur les offres soumises du réseau RESCERT.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ── COLONNE DROITE : LEAD CARD INTERACTIVE (Bento Multi-étapes) ── */}
            <div ref={leadCardRef} className="lg:col-span-6 scroll-mt-20 w-full">
              <div className="bg-card border border-border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col">
                
                {!submitted ? (
                  <>
                    {/* En-tête du tunnel */}
                    <div className="bg-secondary/60 border-b border-border px-5 sm:px-7 py-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          ÉTAPE 0{step} / 0{totalSteps} — {STEP_TITLES[step - 1]}
                        </span>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/[0.06] border border-primary/20 text-primary text-[11px] font-mono font-medium">
                          <BadgeCheck className="h-3.5 w-3.5 text-accent" />
                          <span>AGRÉMENT OFFICIEL</span>
                        </div>
                      </div>

                      {/* Titre et description de la carte */}
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight font-heading">
                          Remplissez et comparez
                        </h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                          En <span className="font-mono tabular-nums font-semibold text-foreground">45 s</span>, trouvez jusqu&apos;à{" "}
                          <span className="font-mono tabular-nums font-semibold text-foreground">3</span> installateurs agréés près de chez
                          vous.
                        </p>
                      </div>

                      {/* Stepper épuré avec pastilles numérotées et barre fine */}
                      <div className="flex flex-col gap-2 pt-1">
                        <div className="flex items-center justify-between gap-1.5">
                          {[1, 2, 3, 4, 5, 6].map((num) => {
                            const isDone = num < step
                            const isCurrent = num === step
                            return (
                              <div
                                key={num}
                                className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono tabular-nums text-xs font-semibold transition-all ${
                                  isDone
                                    ? "bg-primary text-primary-foreground shadow-2xs"
                                    : isCurrent
                                    ? "bg-accent text-accent-foreground ring-2 ring-accent/30 shadow-xs"
                                    : "bg-card text-muted-foreground border border-border"
                                }`}
                              >
                                {isDone ? <Check className="h-4 w-4 stroke-[2.5]" /> : `0${num}`}
                              </div>
                            )
                          })}
                        </div>
                        <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-accent"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ── Corps du Formulaire Multi-étapes ── */}
                    <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-7 flex flex-col gap-5">
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

                      <AnimatePresence mode="wait">
                        
                        {/* ── ÉTAPE 1 : Consommation annuelle ── */}
                        {step === 1 && (
                          <motion.fieldset
                            key="step1"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-4 border-none p-0 m-0"
                          >
                            <legend className="text-sm sm:text-base font-semibold text-foreground font-heading">
                              Quelle est votre consommation d&apos;électricité annuelle estimée ?
                            </legend>

                            <div className="flex flex-col gap-2.5">
                              {CONSUMPTION_OPTIONS.map((item) => {
                                const isChecked = consumption === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setConsumption, item.id)}
                                    className={`relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                                      isChecked
                                        ? "bg-accent/[0.04] border-2 border-accent text-foreground ring-1 ring-accent/20 shadow-xs"
                                        : "bg-card border border-border hover:border-accent/40 hover:bg-muted/50"
                                    }`}
                                  >
                                    <div className="flex flex-col pr-3">
                                      <span className="text-sm font-semibold text-foreground font-mono tabular-nums">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground font-mono tabular-nums mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                          ? "border-accent bg-accent text-accent-foreground"
                                          : "border-border bg-card"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={handleNext}
                                disabled={!consumption}
                                className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <span>Continuer</span>
                                <ArrowRight className="h-4 w-4 text-primary-foreground" />
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
                            className="flex flex-col gap-4 border-none p-0 m-0"
                          >
                            <legend className="text-sm sm:text-base font-semibold text-foreground font-heading">
                              De quel type de bâtiment s&apos;agit-il ?
                            </legend>

                            <div className="flex flex-col gap-2.5">
                              {PROPERTY_TYPES.map((item) => {
                                const isChecked = propertyType === item.id
                                const Icon = item.icon
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setPropertyType, item.id)}
                                    className={`relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                                      isChecked
                                        ? "bg-accent/[0.04] border-2 border-accent text-foreground ring-1 ring-accent/20 shadow-xs"
                                        : "bg-card border border-border hover:border-accent/40 hover:bg-muted/50"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3.5 pr-4">
                                      <div
                                        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                                          isChecked
                                            ? "bg-accent text-accent-foreground shadow-2xs"
                                            : "bg-secondary text-muted-foreground border border-border"
                                        }`}
                                      >
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground">
                                          {item.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground mt-0.5">
                                          {item.sublabel}
                                        </span>
                                      </div>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                          ? "border-accent bg-accent text-accent-foreground"
                                          : "border-border bg-card"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            {/* Encart architectural PME / Tertiaire vers simulateur B2B */}
                            <div className="rounded-xl border border-border bg-secondary/60 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                              <div className="flex flex-col gap-0.5">
                                <p className="font-semibold text-foreground flex items-center gap-1.5">
                                  <Zap className="h-3.5 w-3.5 text-accent shrink-0" />
                                  <span>Bâtiment d&apos;activité, commerce ou PME ?</span>
                                </p>
                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                  Accédez à notre simulateur ROI B2B dédié (PPA, tiers-investissement 0 € CAPEX).
                                </p>
                              </div>
                              <Link
                                href="/#simulateur"
                                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-card text-foreground border border-border hover:bg-secondary px-3 py-1.5 text-xs font-semibold transition-colors"
                              >
                                <span>Simulateur B2B</span>
                                <ArrowRight className="h-3 w-3 text-accent" />
                              </Link>
                            </div>

                            <div className="pt-2 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2.5 rounded-xl bg-card text-foreground border border-border hover:bg-secondary font-medium text-sm gap-1.5 flex items-center transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                disabled={!propertyType}
                                className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                              >
                                <span>Continuer</span>
                                <ArrowRight className="h-4 w-4 text-primary-foreground" />
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
                            className="flex flex-col gap-4 border-none p-0 m-0"
                          >
                            <legend className="text-sm sm:text-base font-semibold text-foreground font-heading">
                              Êtes-vous propriétaire du bâtiment ?
                            </legend>

                            <div className="flex flex-col gap-2.5">
                              {OWNERSHIP_OPTIONS.map((item) => {
                                const isChecked = ownership === item.id
                                return (
                                  <label
                                    key={item.id}
                                    onClick={() => handleOptionSelect(setOwnership, item.id)}
                                    className={`relative flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                                      isChecked
                                        ? "bg-accent/[0.04] border-2 border-accent text-foreground ring-1 ring-accent/20 shadow-xs"
                                        : "bg-card border border-border hover:border-accent/40 hover:bg-muted/50"
                                    }`}
                                  >
                                    <div className="flex flex-col pr-4">
                                      <span className="text-sm font-semibold text-foreground">
                                        {item.label}
                                      </span>
                                      <span className="text-xs text-muted-foreground mt-0.5">
                                        {item.sublabel}
                                      </span>
                                    </div>

                                    <div
                                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                        isChecked
                                          ? "border-accent bg-accent text-accent-foreground"
                                          : "border-border bg-card"
                                      }`}
                                    >
                                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                  </label>
                                )
                              })}
                            </div>

                            <div className="pt-2 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2.5 rounded-xl bg-card text-foreground border border-border hover:bg-secondary font-medium text-sm gap-1.5 flex items-center transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                              >
                                <span>Continuer</span>
                                <ArrowRight className="h-4 w-4 text-primary-foreground" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 4 : Toiture, Surface & Équipements ── */}
                        {step === 4 && (
                          <motion.fieldset
                            key="step4"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-4 border-none p-0 m-0"
                          >
                            <legend className="text-sm sm:text-base font-semibold text-foreground font-heading">
                              Spécifications toiture &amp; équipements souhaités
                            </legend>

                            {/* Type de toiture */}
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold text-foreground">Revêtement de toiture :</span>
                              <div className="grid grid-cols-2 gap-2">
                                {ROOF_OPTIONS.map((r) => {
                                  const isChecked = roofType === r.id
                                  return (
                                    <button
                                      type="button"
                                      key={r.id}
                                      onClick={() => setRoofType(r.id)}
                                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                        isChecked
                                          ? "bg-accent/[0.04] border-accent ring-1 ring-accent/20"
                                          : "bg-card border-border hover:border-accent/40 hover:bg-muted/50"
                                      }`}
                                    >
                                      <span className="text-xs font-semibold text-foreground">{r.label}</span>
                                      <span className="text-[10px] text-muted-foreground mt-0.5">{r.sublabel}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Surface disponible estimée */}
                            <div className="flex flex-col gap-1.5 pt-1">
                              <span className="text-xs font-semibold text-foreground">Surface de toiture disponible :</span>
                              <div className="grid grid-cols-3 gap-2">
                                {ROOF_SURFACES.map((s) => {
                                  const isChecked = roofSurface === s.id
                                  return (
                                    <button
                                      type="button"
                                      key={s.id}
                                      onClick={() => setRoofSurface(s.id)}
                                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                                        isChecked
                                          ? "bg-accent/[0.04] border-accent ring-1 ring-accent/20"
                                          : "bg-card border-border hover:border-accent/40 hover:bg-muted/50"
                                      }`}
                                    >
                                      <span className="text-xs font-semibold font-mono tabular-nums text-foreground block">
                                        {s.label}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono tabular-nums mt-0.5 block">
                                        {s.sublabel}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Batterie domestique */}
                            <div className="flex flex-col gap-1.5 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <BatteryFull className="h-3.5 w-3.5 text-accent" />
                                  <span>Intérêt pour une batterie domestique :</span>
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {BATTERY_INTEREST_OPTIONS.map((b) => (
                                  <button
                                    type="button"
                                    key={b.id}
                                    onClick={() => setBatteryInterest(b.id)}
                                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                                      batteryInterest === b.id
                                        ? "bg-accent/[0.04] border-accent ring-1 ring-accent/20 font-semibold text-foreground"
                                        : "bg-card border-border hover:border-accent/40 text-muted-foreground"
                                    }`}
                                  >
                                    {b.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Borne de recharge véhicule électrique */}
                            <div className="flex flex-col gap-1.5 pt-1">
                              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5 text-accent" />
                                <span>Borne de recharge pour véhicule électrique :</span>
                              </span>
                              <div className="grid grid-cols-3 gap-2">
                                {EV_CHARGER_INTEREST_OPTIONS.map((v) => (
                                  <button
                                    type="button"
                                    key={v.id}
                                    onClick={() => setEvChargerInterest(v.id)}
                                    className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer text-center ${
                                      evChargerInterest === v.id
                                        ? "bg-accent/[0.04] border-accent ring-1 ring-accent/20 font-semibold text-foreground"
                                        : "bg-card border-border hover:border-accent/40 text-muted-foreground"
                                    }`}
                                  >
                                    {v.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2.5 rounded-xl bg-card text-foreground border border-border hover:bg-secondary font-medium text-sm gap-1.5 flex items-center transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                              >
                                <span>Continuer</span>
                                <ArrowRight className="h-4 w-4 text-primary-foreground" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 5 : Localisation en Wallonie ── */}
                        {step === 5 && (
                          <motion.fieldset
                            key="step5"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-4 border-none p-0 m-0"
                          >
                            <legend className="text-sm sm:text-base font-semibold text-foreground font-heading">
                              Où se situe votre bâtiment en Wallonie ?
                            </legend>

                            <p className="text-xs text-muted-foreground">
                              Nous sélectionnons uniquement des professionnels agréés résidant et opérant dans votre zone géographique.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              <div className="flex flex-col gap-1">
                                <Label htmlFor="postalCode" className="text-xs font-semibold text-foreground">
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
                                  className={`h-11 rounded-xl font-mono tabular-nums text-base sm:text-sm ${
                                    showPostalCodeError ? "border-destructive ring-1 ring-destructive" : "border-input"
                                  }`}
                                />
                                {showPostalCodeError && (
                                  <p className="text-[11px] text-destructive font-medium" role="alert">
                                    Veuillez saisir un code postal wallon valide (4 chiffres).
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-1">
                                <Label htmlFor="city" className="text-xs font-semibold text-foreground">
                                  Commune / Ville
                                </Label>
                                <Input
                                  id="city"
                                  placeholder="ex. Liège"
                                  value={city}
                                  onChange={(e) => setCity(e.target.value)}
                                  className="h-11 rounded-xl text-base sm:text-sm border-input"
                                />
                              </div>
                            </div>

                            {/* Badge Province Détectée */}
                            {postalCode.length >= 2 && (
                              <div className="p-3 rounded-xl bg-accent/[0.06] border border-accent/20 flex items-center justify-between">
                                <span className="text-xs text-foreground font-medium flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-accent" />
                                  <span>Province détectée :</span>
                                </span>
                                <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                                  {province.replace("_", " ")}
                                </span>
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-2.5 rounded-xl bg-card text-foreground border border-border hover:bg-secondary font-medium text-sm gap-1.5 flex items-center transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleNext}
                                disabled={postalCode.trim().length !== 4}
                                className="px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-sm transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                              >
                                <span>Continuer</span>
                                <ArrowRight className="h-4 w-4 text-primary-foreground" />
                              </button>
                            </div>
                          </motion.fieldset>
                        )}

                        {/* ── ÉTAPE 6 : Coordonnées de contact (Étape finale) ── */}
                        {step === 6 && (
                          <motion.fieldset
                            key="step6"
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -12 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-3.5 border-none p-0 m-0"
                          >
                            <div>
                              <legend className="text-sm sm:text-base font-semibold text-foreground font-heading">
                                Où pouvons-nous envoyer vos 3 devis ?
                              </legend>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Vos coordonnées sont protégées et uniquement transmises aux 3 installateurs agréés sélectionnés pour votre projet.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <Label htmlFor="firstName" className="text-xs font-medium text-foreground">
                                  Prénom <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="firstName"
                                  autoComplete="given-name"
                                  placeholder="ex. Sophie"
                                  value={firstName}
                                  onChange={(e) => setFirstName(e.target.value)}
                                  className={`h-11 rounded-xl text-base sm:text-sm ${
                                    showFirstNameError ? "border-destructive ring-1 ring-destructive" : "border-input"
                                  }`}
                                />
                                {showFirstNameError && (
                                  <p className="text-[11px] text-destructive font-medium" role="alert">
                                    Prénom requis (min. 2 lettres).
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-1">
                                <Label htmlFor="lastName" className="text-xs font-medium text-foreground">
                                  Nom <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="lastName"
                                  autoComplete="family-name"
                                  placeholder="ex. Dupont"
                                  value={lastName}
                                  onChange={(e) => setLastName(e.target.value)}
                                  className={`h-11 rounded-xl text-base sm:text-sm ${
                                    showLastNameError ? "border-destructive ring-1 ring-destructive" : "border-input"
                                  }`}
                                />
                                {showLastNameError && (
                                  <p className="text-[11px] text-destructive font-medium" role="alert">
                                    Nom requis (min. 2 lettres).
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <Label htmlFor="email" className="text-xs font-medium text-foreground">
                                  E-mail <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="email"
                                  type="email"
                                  autoComplete="email"
                                  placeholder="nom@exemple.be"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className={`h-11 rounded-xl text-base sm:text-sm ${
                                    showEmailError ? "border-destructive ring-1 ring-destructive" : "border-input"
                                  }`}
                                />
                                {showEmailError && (
                                  <p className="text-[11px] text-destructive font-medium" role="alert">
                                    {emailErr}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-1">
                                <Label htmlFor="phone" className="text-xs font-medium text-foreground">
                                  Téléphone <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="phone"
                                  type="tel"
                                  autoComplete="tel"
                                  placeholder="0470 12 34 56"
                                  value={phone}
                                  onChange={(e) => setPhone(e.target.value)}
                                  className={`h-11 rounded-xl font-mono tabular-nums text-base sm:text-sm ${
                                    showPhoneError ? "border-destructive ring-1 ring-destructive" : "border-input"
                                  }`}
                                />
                                {showPhoneError && (
                                  <p className="text-[11px] text-destructive font-medium" role="alert">
                                    {phoneErr}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <Label htmlFor="address" className="text-xs font-medium text-foreground">
                                Adresse (Rue et numéro) <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="address"
                                autoComplete="street-address"
                                placeholder="ex. Rue de la Station 12"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className={`h-11 rounded-xl text-base sm:text-sm ${
                                  showAddressError ? "border-destructive ring-1 ring-destructive" : "border-input"
                                }`}
                              />
                              {showAddressError && (
                                <p className="text-[11px] text-destructive font-medium" role="alert">
                                  L&apos;adresse complète est requise pour le contrôle de faisabilité toiture.
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <Label htmlFor="remarks" className="text-xs font-medium text-foreground">
                                Précisions sur votre projet <span className="text-muted-foreground font-normal">(facultatif)</span>
                              </Label>
                              <textarea
                                id="remarks"
                                rows={2}
                                placeholder="ex. Orientation du toit, contraintes particulières, accès..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
                                className="w-full p-3 text-xs sm:text-sm border border-input rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-accent bg-card text-foreground"
                              />
                            </div>

                            {/* Consentement RGPD obligatoire */}
                            <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <Checkbox
                                  id="partnerConsent"
                                  checked={partnerConsent}
                                  onCheckedChange={(c) => setPartnerConsent(c === true)}
                                  className="mt-0.5"
                                />
                                <span className="text-xs text-muted-foreground leading-tight">
                                  J&apos;accepte que mes coordonnées soient transmises à un maximum de{" "}
                                  <span className="font-mono tabular-nums font-semibold text-foreground">3</span>{" "}
                                  installateurs agréés RESCERT pour recevoir mes devis comparatifs gratuits conformément à la{" "}
                                  <Link
                                    href="/politique-confidentialite"
                                    target="_blank"
                                    className="underline text-accent font-semibold"
                                  >
                                    politique de confidentialité
                                  </Link>
                                  .
                                </span>
                              </label>
                              {showConsentError && (
                                <p className="text-[11px] text-destructive font-medium" role="alert">
                                  Veuillez cocher cette case pour valider votre demande.
                                </p>
                              )}

                              <label className="flex items-start gap-2.5 cursor-pointer">
                                <Checkbox
                                  id="newsletterConsent"
                                  checked={newsletterConsent}
                                  onCheckedChange={(c) => setNewsletterConsent(c === true)}
                                  className="mt-0.5"
                                />
                                <span className="text-xs text-muted-foreground leading-tight">
                                  Je souhaite recevoir occasionnellement les analyses et conseils d&apos;Aegis Solaire (facultatif).
                                </span>
                              </label>
                            </div>

                            {errorMessage && (
                              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium">
                                {errorMessage}
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={handleBack}
                                className="px-4 py-3 rounded-xl bg-card text-foreground border border-border hover:bg-secondary font-medium text-sm gap-1.5 flex items-center transition-colors cursor-pointer"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Retour</span>
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 py-3.5 px-6 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 rounded-xl font-bold text-sm sm:text-base transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                              >
                                {isSubmitting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Transmission en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Recevoir mes 3 devis gratuits</span>
                                    <ArrowRight className="h-4 w-4" />
                                  </>
                                )}
                              </button>
                            </div>

                            <p className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
                              <Lock className="h-3 w-3 text-accent" />
                              <span>100 % gratuit &amp; sans engagement · Chiffrement SSL 256 bits</span>
                            </p>
                          </motion.fieldset>
                        )}

                      </AnimatePresence>
                    </form>
                  </>
                ) : (
                  /* ── Écran de Succès : Confirmation Institutionnelle ── */
                  <div className="p-8 sm:p-12 text-center flex flex-col items-center gap-5">
                    <div className="h-16 w-16 rounded-2xl bg-primary/[0.08] border border-primary/20 text-primary flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="h-9 w-9 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-heading">
                        Demande enregistrée avec succès
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed mt-2">
                        Merci <strong className="text-foreground">{firstName}</strong>. Votre demande de devis comparatifs pour la région de{" "}
                        <strong className="text-foreground capitalize">{province}</strong> a bien été prise en charge.
                      </p>
                    </div>

                    <div className="bg-secondary/60 border border-border rounded-xl p-5 text-left max-w-md w-full flex flex-col gap-3 text-xs sm:text-sm">
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-accent" />
                        <span>
                          Prochaines étapes (sous{" "}
                          <span className="font-mono tabular-nums font-semibold">48 h</span>) :
                        </span>
                      </p>
                      <ul className="flex flex-col gap-2 text-muted-foreground list-disc pl-5">
                        <li>
                          Sélection de jusqu&apos;à{" "}
                          <span className="font-mono tabular-nums font-semibold text-foreground">3</span> installateurs agréés RESCERT de votre province.
                        </li>
                        <li>Prise de contact rapide pour affiner les contraintes de votre toiture.</li>
                        <li>Réception de vos offres comparables et sans engagement.</li>
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
        </div>
      </section>

      {/* ── BANDEAU DE RÉASSURANCE (Trust Bar - 4 Piliers Bento) ── */}
      <section className="py-8 md:py-10 bg-secondary/50 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            
            <div className="flex flex-col items-center gap-1.5 p-3">
              <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-card border border-border text-primary shadow-2xs mb-1">
                <ShieldCheck className="h-5 w-5 text-accent" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">100 %</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Agréés RESCERT Wallonie</p>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-3">
              <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-card border border-border text-foreground shadow-2xs mb-1">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">Jusqu&apos;à 3</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Devis comparatifs détaillés</p>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-3">
              <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-card border border-border text-foreground shadow-2xs mb-1">
                <BadgeEuro className="h-5 w-5 text-accent" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">0 €</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Gratuit &amp; sans engagement</p>
            </div>

            <div className="flex flex-col items-center gap-1.5 p-3">
              <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-card border border-border text-primary shadow-2xs mb-1">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground">48 h</p>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">Délai moyen de réponse</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION COMPARATIVE : SANS AEGIS VS AVEC AEGIS SOLAIRE ── */}
      <section className="py-16 md:py-24 border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
              Protection du Consommateur Wallon
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Pourquoi passer par Aegis Solaire plutôt qu&apos;un démarchage direct ?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Le marché solaire belge compte des écarts de prix injustifiés pouvant dépasser 3 000 €. Notre audit remet l&apos;équilibre en votre faveur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Sans Aegis */}
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center font-bold text-sm">
                    ✕
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">Sans comparaison neutre</h3>
                </div>
                <span className="font-mono text-xs text-muted-foreground">Méthode classique</span>
              </div>

              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold text-sm">✕</span>
                  <span>Un seul devis présenté avec prix gonflé sans élément de comparaison.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold text-sm">✕</span>
                  <span>Risque d&apos;artisan non agréé RESCERT (refus de réception RGIE par ORES / RESA).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold text-sm">✕</span>
                  <span>Pression commerciale et démarchage téléphonique intempestif.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-destructive font-bold text-sm">✕</span>
                  <span>Sur-dimensionnement ou sous-dimensionnement de la puissance kWc.</span>
                </li>
              </ul>
            </div>

            {/* Avec Aegis Solaire */}
            <div className="bg-secondary/40 border-2 border-accent/40 rounded-2xl p-6 sm:p-8 flex flex-col gap-5 shadow-xs relative">
              <div className="absolute -top-3 right-6 bg-accent text-accent-foreground px-3 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                Norme de Confiance
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                    ✓
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">Avec Aegis Solaire</h3>
                </div>
                <span className="font-mono text-xs font-semibold text-accent">100 % Wallonie</span>
              </div>

              <ul className="flex flex-col gap-3 text-xs sm:text-sm text-foreground font-medium">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5 stroke-[3]" />
                  <span>Jusqu&apos;à 3 devis complets et directement comparables ligne par ligne.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5 stroke-[3]" />
                  <span>Exclusivement des artisans avec certification RESCERT vérifiée à la date du jour.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5 stroke-[3]" />
                  <span>Zéro harcèlement : vos coordonnées ne sont transmises qu&apos;aux 3 candidats retenus.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-accent shrink-0 mt-0.5 stroke-[3]" />
                  <span>Économie moyenne constatée de 1 400 € à 2 200 € TTC à matériel équivalent.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-10">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-2 py-3.5 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm transition-all shadow-xs cursor-pointer"
            >
              <span>Comparer 3 devis dès maintenant</span>
              <ArrowRight className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE EN 3 ÉTAPES ── */}
      <section className="py-16 md:py-24 border-b border-border bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
              Processus Transparent &amp; Simplifié
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Comment fonctionne la mise en concurrence en 3 étapes ?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              De votre simulation en ligne jusqu&apos;à la signature de votre devis certifié.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Remplissez le formulaire (45 s)",
                desc: "Indiquez votre type de toiture, commune wallonne et consommation annuelle. Le formulaire est instantané et 100 % gratuit.",
              },
              {
                num: "02",
                title: "Sélection d'experts certifiés",
                desc: "Notre système attribue votre projet à un maximum de 3 artisans certifiés RESCERT actifs dans votre province pour une analyse technique.",
              },
              {
                num: "03",
                title: "Comparez et économisez",
                desc: "Recevez les offres chiffrées chez vous. Comparez les garanties, les rendements, les prix et décidez en toute liberté avec qui signer.",
              },
            ].map((stepItem, idx) => (
              <div
                key={idx}
                className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col gap-3 relative hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl sm:text-4xl font-extrabold text-foreground/20 font-mono tabular-nums">
                    {stepItem.num}
                  </span>
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-accent">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">{stepItem.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{stepItem.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RETOURS D'EXPÉRIENCE & AVIS VÉRIFIÉS EN WALLONIE ── */}
      <section className="py-16 md:py-24 border-b border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
              Retours d&apos;Expérience Vérifiés
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Ce que disent les propriétaires wallons
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Des témoignages authentiques de particuliers ayant fait jouer la concurrence via Aegis Solaire.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Julien Dubois",
                location: "Chaudfontaine (Province de Liège)",
                quote:
                  "Trois devis reçus en 48 heures, un écart de près de 1 850 € sur des panneaux de marque identique. Sans comparaison, j'aurais payé bien trop cher.",
                stat: "1 850 € économisés",
              },
              {
                name: "Marc & Laurence",
                location: "Wavre (Brabant wallon)",
                quote:
                  "Très rassurant de ne parler qu'à des installateurs ayant le certificat RESCERT à jour. Dossier RGIE et déclaration ORES traités sans aucun accroc.",
                stat: "Installation 6,4 kWc",
              },
              {
                name: "Thierry Vanderstraeten",
                location: "Namur (Province de Namur)",
                quote:
                  "Le formulaire a pris moins d'une minute. Les deux artisans qui sont venus sur place étaient très pro et n'ont poussé aucune vente forcée.",
                stat: "Réponse en 24 h",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-accent/30 transition-colors"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5 text-accent-solar">
                      {[...Array(5)].map((_, idx) => (
                        <Star key={idx} className="h-3.5 w-3.5 fill-accent-solar text-accent-solar" />
                      ))}
                    </div>
                    <span className="font-mono text-xs font-semibold text-primary bg-primary/[0.06] border border-primary/20 px-2 py-0.5 rounded-md">
                      {t.stat}
                    </span>
                  </div>
                  <blockquote className="text-xs sm:text-sm text-foreground leading-relaxed">
                    « {t.quote} »
                  </blockquote>
                </div>

                <div className="pt-3 border-t border-border flex flex-col">
                  <span className="text-xs font-bold text-foreground">{t.name}</span>
                  <span className="text-[11px] text-muted-foreground">{t.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOIRE AUX QUESTIONS (Accordion Accessible) ── */}
      <section className="py-16 md:py-24 border-b border-border bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-12 flex flex-col gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
              Réponses d&apos;Ingénieurs
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Foire aux questions
            </h2>
            <p className="text-sm text-muted-foreground">
              Toutes les réponses pour aborder votre transition photovoltaïque en Wallonie en toute sérénité.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openFaqIndex === index
              return (
                <div
                  key={index}
                  className="border border-border rounded-xl overflow-hidden bg-card transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="w-full text-left p-4 sm:p-5 font-semibold text-sm sm:text-base text-foreground flex items-center justify-between gap-4 hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-5 pt-1 sm:px-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border bg-card">
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER LÉGAL INSTITUTIONNEL ── */}
      <footer className="bg-primary text-primary-foreground/80 py-12 md:py-16 border-t border-border text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1.5 max-w-md">
            <p className="font-bold text-primary-foreground text-sm font-heading">
              Aegis Solaire · Comparateur indépendant d&apos;installateurs solaires en Wallonie
            </p>
            <p className="text-primary-foreground/60 leading-relaxed font-mono text-[11px]">
              Édité par INIT42 (Nathan Remacle) · BCE n° 1039.899.980 · TVA BE 1039.899.980 · Liège, Belgique
            </p>
          </div>

          <div className="flex items-center gap-6 flex-wrap font-medium text-xs">
            <Link href="/mentions-legales" className="hover:text-primary-foreground transition-colors">
              Mentions légales
            </Link>
            <Link href="/politique-confidentialite" className="hover:text-primary-foreground transition-colors">
              Politique de confidentialité
            </Link>
            <Link href="/cgv" className="hover:text-primary-foreground transition-colors">
              CGV
            </Link>
          </div>
        </div>
      </footer>

      {/* ── STICKY BAR MOBILE AU SCROLL ── */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-card/95 backdrop-blur-md border-t border-border shadow-lg sm:hidden flex items-center justify-between gap-3"
          >
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground font-heading">
                Comparez 3 devis RESCERT
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Gratuit · Réponse sous 48 h
              </span>
            </div>
            <button
              onClick={scrollToForm}
              className="py-2.5 px-4 rounded-xl bg-accent text-accent-foreground font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Lancer en 45 s</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE "COMMENT ÇA MARCHE ?" ── */}
      {isHowItWorksOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative bg-card border border-border rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl flex flex-col gap-5">
            <button
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fermer la boîte de dialogue"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
                Guide explicatif
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground font-heading">
                Comment fonctionne la mise en concurrence ?
              </h3>
              <p className="text-xs text-muted-foreground">
                Notre mission est 100 % gratuite et sans engagement pour les particuliers en Wallonie.
              </p>
            </div>

            <ol className="flex flex-col gap-3 list-none p-0 m-0">
              {[
                {
                  step: "01",
                  title: "Remplissez votre demande en 45 secondes",
                  desc: "Indiquez votre toiture, commune et consommation approximative. Aucune carte bancaire requise.",
                },
                {
                  step: "02",
                  title: "Sélection d'artisans RESCERT locaux",
                  desc: "Nous sollicitons jusqu'à 3 professionnels certifiés de votre province pour une analyse technique.",
                },
                {
                  step: "03",
                  title: "Comparez les devis et économisez",
                  desc: "Vous recevez les offres chiffrées et pouvez choisir la meilleure proposition en toute sérénité — ou aucune.",
                },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border">
                  <span className="font-mono tabular-nums text-xs font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10 shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <div className="flex flex-col">
                    <strong className="text-xs sm:text-sm font-semibold text-foreground">{item.title}</strong>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setIsHowItWorksOpen(false)
                  scrollToForm()
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
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
