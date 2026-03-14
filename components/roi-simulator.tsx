"use client"

import { useState } from "react"
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
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  Zap,
  User,
  CheckCircle2,
  Calculator,
  Loader2,
} from "lucide-react"

type FormData = {
  // Step 1: Site
  surfaceType: string
  surfaceArea: string
  // Step 2: Consumption
  annualElectricityBill: string
  // Step 3: Contact
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
  company: string
  marketingConsent: boolean
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
  annualElectricityBill: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  company: "",
  marketingConsent: false,
}

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
  
  // Annual production: ~1100 kWh per kWc in France
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

  const totalSteps = 3

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1: {
        const area = parseInt(formData.surfaceArea) || 0
        const minArea = formData.surfaceType === "parking" ? 1500 : 500
        return formData.surfaceType !== "" && area >= minArea
      }
      case 2:
        return parseInt(formData.annualElectricityBill) >= 5000
      case 3:
        return (
          formData.firstName.length >= 2 &&
          formData.lastName.length >= 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
          formData.phone.length >= 10 &&
          formData.jobTitle !== ""
        )
      default:
        return false
    }
  }

  const handleNext = () => {
    if (!validateStep(step)) return
    if (step === 2) {
      // Effet gated : animation "calcul en cours" avant d'afficher la capture B2B
      setIsCalculating(true)
      setTimeout(() => {
        setIsCalculating(false)
        setStep(3)
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
    if (!validateStep(3)) return

    setIsSubmitting(true)
    setError(null)

    // Calculate ROI
    const roiResults = calculateROI(formData)
    setResults(roiResults)

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          surfaceArea: parseInt(formData.surfaceArea),
          annualElectricityBill: parseInt(formData.annualElectricityBill),
          estimatedROIYears: roiResults.estimatedROIYears,
          autoconsumptionRate: roiResults.autoconsumptionRate,
          estimatedSavings: roiResults.estimatedSavings,
        }),
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
      <section id="simulator" className="bg-primary py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-card p-8 shadow-2xl sm:p-12">
            <div className="mb-8 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
                <CheckCircle2 className="h-8 w-8 text-accent" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-2xl font-bold text-foreground sm:text-3xl">
              Votre estimation personnalisee
            </h2>
            <p className="mb-8 text-center text-muted-foreground">
              Merci {formData.firstName}, voici les resultats de votre simulation
            </p>

            <div className="mb-8 grid gap-4 sm:grid-cols-2">
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

            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <p className="text-center text-sm text-foreground">
                <strong>Prochaine etape :</strong> Un expert vous contactera sous
                48h pour une etude detaillee gratuite et sans engagement.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="simulator" className="bg-primary py-16 sm:py-24" aria-labelledby="simulator-title">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 id="simulator-title" className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Calculez votre ROI en 2 minutes
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Simulation gratuite et sans engagement
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-2xl sm:p-8">
          {/* Étape "calcul en cours" – effet gated */}
          {isCalculating && (
            <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
              <div className="relative h-16 w-16">
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
                    <SelectTrigger id="surfaceType" className="mt-1.5">
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
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formData.surfaceType === "parking"
                      ? "Minimum 1 500 m² (Loi LOM – ombrières)."
                      : "Minimum 500 m² pour toiture ou friche."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Consumption */}
          {step === 2 && (
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
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Minimum 5 000 €/an pour une étude B2B
                  </p>
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

          {/* Step 3: Contact – Gated content (audit + résultats détaillés) */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <p className="text-sm font-medium text-foreground">
                  Pour recevoir votre <strong>audit de faisabilité complet</strong> et les <strong>résultats détaillés</strong> de la simulation, indiquez vos coordonnées professionnelles ci-dessous. Un expert vous recontactera sous 48 h.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  Nom, entreprise, fonction, téléphone direct, email
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Prenom</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    className="mt-1.5"
                  />
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
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telephone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="jobTitle">Fonction</Label>
                <Select
                  value={formData.jobTitle}
                  onValueChange={(value) => updateFormData("jobTitle", value)}
                >
                  <SelectTrigger id="jobTitle" className="mt-1.5">
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

              <div className="flex items-start gap-3 rounded-lg border border-border p-4">
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

          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between gap-4">
            {step > 1 && !isCalculating ? (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            ) : (
              <div />
            )}

            {step < totalSteps && !isCalculating ? (
              <Button
                onClick={handleNext}
                disabled={!validateStep(step)}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : step === totalSteps ? (
              <Button
                onClick={handleSubmit}
                disabled={!validateStep(step) || isSubmitting}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
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
          </>
          )}
        </div>
      </div>
    </section>
  )
}
