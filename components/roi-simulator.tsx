"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Zap,
  User,
  CheckCircle2,
  Calculator,
  Loader2,
  CalendarClock,
  MessageSquare,
} from "lucide-react"
import {
  getEmailError,
  getPhoneError,
  getSurfaceError,
  getFactureError,
} from "@/lib/leads-validation"

type FormData = {
  // Step 1: Site
  surfaceType: string
  surfaceArea: string
  // Step 2: Délai projet
  projectTimeline: string
  // Step 3: Consumption
  annualElectricityBill: string
  // Step 4: Contact
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  company: string
  message: string
  marketingConsent: boolean
  /** Honeypot anti-spam : doit rester vide (champ caché). */
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
  surfaceArea: "",
  projectTimeline: "",
  annualElectricityBill: "",
  message: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  marketingConsent: false,
}

const projectTimelineOptions = [
  { value: "urgent", label: "Urgent (Moins de 3 mois)" },
  { value: "3_6_months", label: "3 à 6 mois" },
  { value: "6_plus_months", label: "Plus de 6 mois (Exploratoire)" },
] as const

const surfaceTypes = [
  { value: "parking", label: "Parking (> 1 500 m²)" },
  { value: "toiture", label: "Toiture (> 500 m²)" },
  { value: "friche", label: "Friche industrielle / terrain" },
]

const jobTitles = [
  "Directeur General",
  "Directeur Financier (CFO)",
  "Directeur des Operations (COO)",
  "Responsable RSE",
  "Responsable Achats",
  "Directeur Technique",
  "Autre",
]

function calculateROI(formData: FormData): ROIResults {
  const surfaceArea = parseInt(formData.surfaceArea) || 0
  const annualBill = parseInt(formData.annualElectricityBill) || 0

  // Simplified ROI calculation logic
  // Power: ~150W per m2 for panels
  const installedPower = Math.round((surfaceArea * 0.15) * 10) / 10 // kWc
  
  // Annual production: ~1100 kWh per kWc (ordre de grandeur France / Belgique)
  const annualProduction = Math.round(installedPower * 1100)
  
  // Electricity price assumption: 0.18 EUR/kWh
  const electricityPrice = 0.18
  const potentialSavings = annualProduction * electricityPrice
  
  // Autoconsumption rate depends on consumption vs production
  const estimatedConsumption = annualBill / electricityPrice
  const autoconsumptionRate = Math.min(
    Math.round((estimatedConsumption / annualProduction) * 100),
    85 // Cap at 85%
  )
  
  // Actual savings based on autoconsumption
  const actualSavings = Math.round(potentialSavings * (autoconsumptionRate / 100))
  
  // Installation cost: ~1200 EUR per kWc for large installations
  const installationCost = installedPower * 1200
  
  // ROI in years
  const roiYears = Math.round((installationCost / actualSavings) * 10) / 10

  return {
    estimatedROIYears: Math.min(roiYears, 15), // Cap at 15 years
    autoconsumptionRate,
    estimatedSavings: actualSavings,
    installedPower,
    annualProduction,
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
  // Time-to-fill : timestamp d'affichage du formulaire contact (étape 5) pour anti-bot
  const formContactOpenedAtRef = useRef<string | null>(null)

  const totalSteps = 5

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Messages d'erreur par champ (affichés sous les champs, empêchent de valider)
  const surfaceError = getSurfaceError(formData.surfaceType, formData.surfaceArea)
  const surfaceTypeError = formData.surfaceType === "" ? "Veuillez sélectionner le type de surface." : null
  const surfaceAreaError = formData.surfaceType !== "" ? getSurfaceError(formData.surfaceType, formData.surfaceArea) : null
  const factureError = getFactureError(formData.annualElectricityBill)
  const emailError = getEmailError(formData.email)
  const phoneError = getPhoneError(formData.phone)
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
  const jobTitleError =
    step === 5 && formData.jobTitle === "" ? "Veuillez sélectionner votre fonction." : null

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        return surfaceError === null
      case 2:
        return projectTimelineOptions.some((o) => o.value === formData.projectTimeline)
      case 3:
        return true // Réponse libre optionnelle
      case 4:
        return factureError === null
      case 5:
        return (
          emailError === null &&
          phoneError === null &&
          formData.firstName.trim().length >= 2 &&
          formData.lastName.trim().length >= 2 &&
          formData.jobTitle !== "" &&
          formData.marketingConsent === true
        )
      default:
        return false
    }
  }

  const handleNext = () => {
    if (!validateStep(step)) return
    if (step === 4) {
      // Après consommation : animation "calcul en cours" puis formulaire contact
      setIsCalculating(true)
      setTimeout(() => {
        setIsCalculating(false)
        formContactOpenedAtRef.current = new Date().toISOString()
        setStep(5)
      }, 2500)
    } else if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (isCalculating) return
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(5)) return

    setIsSubmitting(true)
    setError(null)

    // Calculate ROI
    const roiResults = calculateROI(formData)
    setResults(roiResults)

    try {
      const payload = {
        ...formData,
        surfaceArea: parseInt(formData.surfaceArea),
        annualElectricityBill: parseInt(formData.annualElectricityBill),
        projectTimeline: formData.projectTimeline,
        estimatedROIYears: roiResults.estimatedROIYears,
        autoconsumptionRate: roiResults.autoconsumptionRate,
        estimatedSavings: roiResults.estimatedSavings,
        // Anti-bot : honeypot (reste vide pour un humain)
        fax_number: formData.fax_number ?? "",
        // Time-to-fill : si soumission < 4 s après affichage étape 5 (contact), rejetée côté API
        form_opened_at: formContactOpenedAtRef.current ?? undefined,
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

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Results screen
  if (submitted && results) {
    return (
      <section id="simulator" className="scroll-mt-24 bg-primary py-12 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-card p-4 shadow-2xl sm:rounded-2xl sm:p-6 md:p-8 lg:p-10">
            <div className="mb-8 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
              Votre estimation personnalisée
            </h2>
            <p className="mb-6 text-center text-sm text-muted-foreground sm:mb-8 sm:text-base">
              Merci {formData.firstName}, voici les résultats de votre simulation
            </p>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:mb-8 sm:grid-cols-2 sm:gap-4">
              <div className="rounded-lg bg-accent/10 p-4 text-center">
                <p className="text-3xl font-bold text-accent">
                  {results.estimatedROIYears} ans
                </p>
                <p className="text-sm text-muted-foreground">
                  Retour sur investissement
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {results.autoconsumptionRate}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Taux d'autoconsommation
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-4 text-center">
                <p className="text-3xl font-bold text-foreground">
                  {results.estimatedSavings.toLocaleString("fr-FR")} EUR
                </p>
                <p className="text-sm text-muted-foreground">
                  Economies annuelles
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-4 text-center">
                <p className="text-3xl font-bold text-foreground">
                  {results.installedPower} kWc
                </p>
                <p className="text-sm text-muted-foreground">Puissance estimee</p>
              </div>
            </div>

            <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 sm:p-4">
              <p className="text-center text-xs text-foreground sm:text-sm">
                <strong>Prochaine étape :</strong> Un expert vous contactera sous
                48 h pour une étude détaillée gratuite et sans engagement.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="simulator" className="scroll-mt-24 bg-primary py-12 sm:py-24" aria-labelledby="simulator-title">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center sm:mb-8">
          <h2 id="simulator-title" className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl md:text-4xl">
            Calculez votre ROI en 2 minutes
          </h2>
          <p className="mt-3 text-base text-primary-foreground/80 sm:mt-4 sm:text-lg">
            Simulation gratuite et sans engagement
          </p>
        </div>

        <div className="rounded-xl bg-card p-4 shadow-2xl sm:rounded-2xl sm:p-6 md:p-8">
          {/* Étape "calcul en cours" – effet gated */}
          {isCalculating && (
            <div className="flex flex-col items-center justify-center py-10 sm:py-12" role="status" aria-live="polite">
              <div className="relative h-14 w-14 sm:h-16 sm:w-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div
                  className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-accent"
                  style={{ animationDuration: "1s" }}
                />
                <Calculator className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-accent" />
              </div>
              <p className="mt-6 text-lg font-medium text-foreground">
                Calcul de votre étude financière en cours…
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pour afficher votre ROI détaillé, renseignez vos coordonnées à l'étape suivante.
              </p>
            </div>
          )}

          {!isCalculating && (
          <>
          {/* Progress bar */}
          <div className="mb-8">
            <div className="mb-2 flex justify-between text-sm text-muted-foreground">
              <span>Etape {step} sur {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step 1: Site Information */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Votre site
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="surfaceType">Type de surface</Label>
                  <Select
                    value={formData.surfaceType}
                    onValueChange={(value) => updateFormData("surfaceType", value)}
                  >
                    <SelectTrigger id="surfaceType" className={`mt-1.5 ${surfaceTypeError ? "border-destructive" : ""}`} aria-invalid={!!surfaceTypeError} aria-describedby={surfaceTypeError ? "surface-type-error" : undefined}>
                      <SelectValue placeholder="Sélectionnez le type de surface" />
                    </SelectTrigger>
                    <SelectContent>
                      {surfaceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {surfaceTypeError && (
                    <p id="surface-type-error" className="mt-1.5 text-xs text-destructive" role="alert">
                      {surfaceTypeError}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="surfaceArea">Surface disponible (m²)</Label>
                  <Input
                    id="surfaceArea"
                    type="number"
                    min={formData.surfaceType === "parking" ? 1500 : 500}
                    placeholder={formData.surfaceType === "parking" ? "Ex: 2000" : "Ex: 1000"}
                    value={formData.surfaceArea}
                    onChange={(e) => updateFormData("surfaceArea", e.target.value)}
                    className={`mt-1.5 ${surfaceAreaError ? "border-destructive" : ""}`}
                    aria-invalid={!!surfaceAreaError}
                    aria-describedby={surfaceAreaError ? "surface-error" : undefined}
                  />
                  {surfaceAreaError ? (
                    <p id="surface-error" className="mt-1.5 text-xs text-destructive" role="alert">
                      {surfaceAreaError}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formData.surfaceType === "parking"
                        ? "Minimum 1 500 m² (Loi LOM – ombrières)."
                        : "Minimum 500 m² pour toiture ou friche."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Délai du projet */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <CalendarClock className="h-5 w-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Délai de votre projet
                </h3>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Indiquez votre horizon de réalisation pour adapter notre accompagnement.
                </p>
                <div className="grid gap-3 sm:grid-cols-1">
                  {projectTimelineOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={formData.projectTimeline === option.value ? "default" : "outline"}
                      className={`h-auto justify-start py-4 text-left font-normal sm:py-3 ${formData.projectTimeline === option.value ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                      onClick={() => updateFormData("projectTimeline", option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Précisions / réponse libre (optionnel, avant le calcul) */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <MessageSquare className="h-5 w-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Précisions sur votre projet
                </h3>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Optionnel : décrivez brièvement votre contexte ou vos questions. Ce message n'est pas utilisé pour le calcul du ROI et sera transmis à l'installateur partenaire.
                </p>
                <div>
                  <Label htmlFor="message">Message ou précisions (optionnel)</Label>
                  <Textarea
                    id="message"
                    placeholder="Ex : parking de 2000 m², objectif mise en conformité Loi LOM, souhait de devis PPA..."
                    value={formData.message}
                    onChange={(e) => updateFormData("message", e.target.value)}
                    className="mt-1.5 min-h-[120px] resize-y"
                    maxLength={2000}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Consumption */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Votre consommation
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="annualElectricityBill">
                    Facture électricité annuelle (€ HT)
                  </Label>
                  <Input
                    id="annualElectricityBill"
                    type="number"
                    min="5000"
                    placeholder="Ex: 25000"
                    value={formData.annualElectricityBill}
                    onChange={(e) =>
                      updateFormData("annualElectricityBill", e.target.value)
                    }
                    className={`mt-1.5 ${factureError ? "border-destructive" : ""}`}
                    aria-invalid={!!factureError}
                    aria-describedby={factureError ? "facture-error" : undefined}
                  />
                  {factureError ? (
                    <p id="facture-error" className="mt-1.5 text-xs text-destructive" role="alert">
                      {factureError}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Minimum 5 000 €/an pour une étude B2B
                    </p>
                  )}
                </div>

                <div className="rounded-lg bg-secondary p-4">
                  <div className="flex items-start gap-3">
                    <Calculator className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">
                        Pourquoi cette information ?
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Votre consommation nous permet de calculer le taux
                        d'autoconsommation optimal et le retour sur investissement
                        réel de votre projet (généralement 8 à 12 ans pour le tertiaire).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Contact – Gated content (audit + résultats détaillés) */}
          {step === 5 && (
            <div className="space-y-6">
              {/* Honeypot anti-bot : champ invisible (sr-only), les robots le remplissent souvent */}
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
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 sm:p-4">
                <p className="text-xs font-medium leading-relaxed text-foreground sm:text-sm">
                  Pour recevoir votre <strong>audit de faisabilité complet</strong> et les <strong>résultats détaillés</strong> de la simulation, indiquez vos coordonnées professionnelles ci-dessous. Un expert vous recontactera sous 48 h.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <h3 className="min-w-0 text-base font-semibold leading-snug text-foreground sm:text-xl">
                  Nom, entreprise, fonction, téléphone direct, email
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Prenom</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    className={`mt-1.5 ${firstNameError ? "border-destructive" : ""}`}
                    aria-invalid={!!firstNameError}
                    aria-describedby={firstNameError ? "firstName-error" : undefined}
                  />
                  {firstNameError && (
                    <p id="firstName-error" className="mt-1.5 text-xs text-destructive" role="alert">
                      {firstNameError}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    className={`mt-1.5 ${lastNameError ? "border-destructive" : ""}`}
                    aria-invalid={!!lastNameError}
                    aria-describedby={lastNameError ? "lastName-error" : undefined}
                  />
                  {lastNameError && (
                    <p id="lastName-error" className="mt-1.5 text-xs text-destructive" role="alert">
                      {lastNameError}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email professionnel</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@entreprise.fr"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className={`mt-1.5 ${emailError ? "border-destructive" : ""}`}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                />
                {emailError && (
                  <p id="email-error" className="mt-1.5 text-xs text-destructive" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="phone">Telephone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  className={`mt-1.5 ${phoneError ? "border-destructive" : ""}`}
                  aria-invalid={!!phoneError}
                  aria-describedby={phoneError ? "phone-error" : undefined}
                />
                {phoneError && (
                  <p id="phone-error" className="mt-1.5 text-xs text-destructive" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="jobTitle">Fonction</Label>
                <Select
                  value={formData.jobTitle}
                  onValueChange={(value) => updateFormData("jobTitle", value)}
                >
                  <SelectTrigger id="jobTitle" className={`mt-1.5 ${jobTitleError ? "border-destructive" : ""}`} aria-invalid={!!jobTitleError} aria-describedby={jobTitleError ? "jobTitle-error" : undefined}>
                    <SelectValue placeholder="Selectionnez votre fonction" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTitles.map((title) => (
                      <SelectItem key={title} value={title}>
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {jobTitleError && (
                  <p id="jobTitle-error" className="mt-1.5 text-xs text-destructive" role="alert">
                    {jobTitleError}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="company">Entreprise (optionnel)</Label>
                <Input
                  id="company"
                  placeholder="Nom de votre entreprise"
                  value={formData.company}
                  onChange={(e) => updateFormData("company", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              {step === 5 && !formData.marketingConsent && (
                <p className="text-xs text-destructive" role="alert">
                  Pour recevoir votre étude, veuillez accepter la transmission de vos données en cochant la case ci-dessous.
                </p>
              )}

              <div className={`flex items-start gap-3 rounded-lg border p-4 ${step === 5 && !formData.marketingConsent ? "border-destructive" : "border-border"}`}>
                <Checkbox
                  id="marketingConsent"
                  checked={formData.marketingConsent}
                  onCheckedChange={(checked) =>
                    updateFormData("marketingConsent", checked === true)
                  }
                />
                <div>
                  <Label
                    htmlFor="marketingConsent"
                    className="text-sm font-normal leading-relaxed"
                  >
                    J'accepte que mes données soient transmises à des installateurs partenaires pour une proposition commerciale et de recevoir les offres et actualités d'Aegis Solaire.
                  </Label>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Informations RGPD (Art. 13 & 14)</p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li><strong>Finalité :</strong> prospection commerciale et mise en relation avec des installateurs partenaires certifiés.</li>
                  <li><strong>Base légale :</strong> votre consentement.</li>
                  <li><strong>Durée de conservation :</strong> 3 ans après le dernier contact pour les prospects inactifs.</li>
                </ul>
                <p className="mt-2">
                  Vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition.{" "}
                  <a href="/politique-confidentialite" className="underline">Politique de confidentialité</a>
                  {" "}et{" "}
                  <a href="/politique-confidentialite#desinscription" className="underline">désinscription</a>.
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Navigation buttons – empilés full width sur mobile */}
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:justify-between sm:gap-4">
            {step > 1 && !isCalculating ? (
              <Button variant="outline" onClick={handleBack} className="w-full sm:order-first sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                Retour
              </Button>
            ) : (
              <div className="hidden sm:block" />
            )}

            {step < totalSteps && !isCalculating ? (
              <Button
                onClick={handleNext}
                disabled={!validateStep(step)}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            ) : step === 5 ? (
              <Button
                onClick={handleSubmit}
                disabled={!validateStep(step) || isSubmitting}
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:ml-auto sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    Voir mon ROI
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : null}
          </div>
          {step === 5 && !isCalculating && (
            <p className="mt-4 text-xs text-muted-foreground">
              Conformément au RGPD, vos données sont utilisées pour traiter votre demande de simulation. Vous disposez d'un droit d'accès et d'opposition (voir{" "}
              <a href="/politique-confidentialite" className="underline hover:text-foreground">Politique de confidentialité</a>{" "}
              en pied de page).
            </p>
          )}
          </>
          )}
        </div>
      </div>
    </section>
  )
}
