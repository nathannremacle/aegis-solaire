"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Zap,
  MapPin,
  Eye,
  Unlock,
  Phone,
  Mail,
  Home,
  Download,
  AlertTriangle,
  Sparkles,
  Building2,
  Users,
  Compass,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface MarketplaceInteractiveTourProps {
  isOpen: boolean
  onClose: () => void
  onInspectSample?: () => void
  hasLeads: boolean
}

const TOUR_STEPS = [
  {
    stepNumber: "01",
    badge: "MODÈLES & PROTECTION DES PRIX",
    title: "Ciblez les bons chantiers selon votre zone",
    subtitle:
      "Fini la guerre des prix destructrice des comparateurs traditionnels à 15 devis. Sur Aegis Solaire, la concurrence est strictement plafonnée pour préserver vos marges.",
  },
  {
    stepNumber: "02",
    badge: "INSPECTION TECHNIQUE & ÉTUDE EXPERT",
    title: "Analysez la faisabilité et sollicitez un expert",
    subtitle:
      "Chaque fiche dispose d'un audit technique complet accessible gratuitement en 1 clic. Vous pouvez également solliciter notre Cellule Technique pour une étude de marché locale ou de dimensionnement.",
  },
  {
    stepNumber: "03",
    badge: "DÉBLOCAGE INSTANTANÉ & CRM",
    title: "Obtenez les coordonnées directes vérifiées",
    subtitle:
      "Quand un chantier vous intéresse, débloquez-le avec vos crédits. Les coordonnées directes sont révélées et synchronisées immédiatement dans votre CRM.",
  },
  {
    stepNumber: "04",
    badge: "SÉCURITÉ & GARANTIE 100%",
    title: "Garantie Anti-Fake : Vous n'achetez jamais à perte",
    subtitle:
      "Si un numéro est erroné ou le projet injoignable, déclarez un litige en 1 clic dans votre CRM : nos équipes vérifient et recréditent immédiatement vos crédits.",
  },
]

export function MarketplaceInteractiveTour({
  isOpen,
  onClose,
  onInspectSample,
  hasLeads,
}: MarketplaceInteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0)

  // Navigation clavier : Flèche Droite (Suivant), Flèche Gauche (Précédent), Escape (Fermer)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      } else if (e.key === "ArrowRight") {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1)
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1)
        }
      }
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, currentStep, onClose])

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === TOUR_STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* ── 1. Barre de progression supérieure (Stepper animé) ── */}
        <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent">
                <Compass className="h-3.5 w-3.5" />
                VISITE GUIDÉE INTERACTIVE
              </span>
              <span className="font-mono text-xs font-bold text-muted-foreground tabular-nums">
                {currentStep + 1} / {TOUR_STEPS.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Fermer le tutoriel (Échap)"
              aria-label="Fermer le tutoriel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 4 segments de progression interactifs */}
          <div className="grid grid-cols-4 gap-1.5">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className="group py-1 cursor-pointer"
                title={`Aller à l'étape ${idx + 1}`}
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? "bg-accent shadow-xs"
                      : idx < currentStep
                      ? "bg-primary"
                      : "bg-secondary"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Corps du Slide interactif ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {/* Titre et Contexte */}
          <div className="space-y-1.5">
            <span className="font-mono text-[11px] font-bold tracking-wider text-accent uppercase">
              {step.badge}
            </span>
            <h2 id="tour-title" className="text-xl sm:text-2xl font-heading font-extrabold text-foreground tracking-tight">
              {step.title}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {step.subtitle}
            </p>
          </div>

          {/* ── Micro-Simulation UI selon l'étape ── */}
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 sm:p-5">
            {/* Simulation Étape 01 : Comparaison B2B vs B2C */}
            {currentStep === 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {/* Option B2B */}
                  <div className="rounded-xl border border-primary/30 bg-card p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-md bg-primary text-primary-foreground px-2 py-0.5 text-xs font-bold">
                        B2B · 100% Exclusif
                      </span>
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      1 seul installateur sur le dossier
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Aucun concurrent sur cette opportunité. Idéal pour les chantiers PME, hangars, surfaces commerciales et toitures industrielles.
                    </p>
                  </div>

                  {/* Option B2C */}
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-md bg-secondary text-foreground border border-border px-2 py-0.5 text-xs font-bold">
                        B2C · Max 3 installateurs
                      </span>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      Concurrence saine et plafonnée
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Chaque particulier ne reçoit que 3 devis maximum. Vous êtes sûr d&apos;être écouté et d&apos;obtenir un rendez-vous sur place.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 p-2.5 text-xs text-accent">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    Filtrez par province en haut à gauche pour n&apos;afficher que les chantiers de votre secteur (Liège, Namur, Hainaut, Brabant wallon, Luxembourg).
                  </span>
                </div>
              </div>
            )}

            {/* Simulation Étape 02 : Aperçu Fiche Technique */}
            {currentStep === 1 && (
              <div className="space-y-3 text-left">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-start justify-between gap-3 border-b border-border pb-2.5">
                    <div>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">Exemple de fiche</span>
                      <h4 className="font-bold text-sm text-foreground">Herve (4650) · Toiture inclinée</h4>
                      <p className="text-[11px] text-muted-foreground">Province de Liège · Propriétaire occupant</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-black text-foreground tabular-nums">8.2</span>
                      <span className="text-xs font-bold text-muted-foreground ml-1">kWc</span>
                    </div>
                  </div>

                  {/* Données techniques clés */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Surface toiture</span>
                      <span className="font-semibold text-foreground">48 m² · Tuiles</span>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Facture actuelle</span>
                      <span className="font-mono font-bold text-foreground tabular-nums">2 450 €/an</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                    <span className="text-muted-foreground">Marge brute estimée installateur</span>
                    <span className="font-mono font-bold text-accent tabular-nums">~3 200 € HT</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-2.5 text-xs text-foreground">
                  <Eye className="h-4 w-4 text-accent shrink-0" />
                  <span>
                    Cliquez sur <strong className="font-semibold">« Inspecter »</strong> sur n&apos;importe quelle carte : le tiroir s&apos;ouvre avec la carte de localisation, l&apos;audit électrique et les notes du client.
                  </span>
                </div>
              </div>
            )}

            {/* Simulation Étape 03 : Déblocage & CRM */}
            {currentStep === 2 && (
              <div className="space-y-3 text-left">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Dossier débloqué instantanément
                    </span>
                    <span className="rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-mono text-[10px] font-bold px-1.5 py-0.5">
                      2 crédits dépensés
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                      <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="font-mono font-bold text-foreground">+32 472 84 XX XX</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                      <Mail className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="font-mono text-foreground truncate">marc.dupont@prospect.be</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <Home className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-foreground truncate">Rue de la Station 14, 4650 Herve</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-2.5 text-xs text-foreground">
                  <Download className="h-4 w-4 text-accent shrink-0" />
                  <span>
                    Chaque dossier débloqué rejoint votre onglet <strong className="font-semibold">Mon CRM</strong>, avec bouton d&apos;export vCard en 1 clic directement vers votre carnet d&apos;adresses.
                  </span>
                </div>
              </div>
            )}

            {/* Simulation Étape 04 : Garantie Anti-Fake */}
            {currentStep === 3 && (
              <div className="space-y-3 text-left">
                <div className="rounded-xl border border-emerald-500/30 bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Garantie Anti-Fake Aegis Solaire</h4>
                      <p className="text-xs text-muted-foreground">Votre investissement est protégé à 100%</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Numéro invalide ou non attribué ? Remboursé immédiatement en crédits.</span>
                    </div>
                    <div className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Projet déjà installé ou faux contact ? Litige traité sous 24h ouvrées.</span>
                    </div>
                    <div className="flex items-start gap-2 text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Aucun abonnement mensuel : vous ne payez que ce que vous choisissez.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-accent/10 border border-accent/20 p-2.5 text-xs text-accent">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>
                    Vous disposez d&apos;un solde initial de crédits pour démarrer. Vous pouvez recharger votre compte à tout moment selon votre carnet de commandes.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Pied de navigation du tutoriel ── */}
        <div className="shrink-0 flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-border bg-card">
          <div>
            {!isFirst ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Précédent</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Passer
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isLast ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
              >
                <span>Étape suivante</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {hasLeads && onInspectSample && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onInspectSample()
                    }}
                    className="rounded-xl text-xs font-semibold cursor-pointer border-border hover:bg-secondary text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-accent" />
                    <span>Inspecter un dossier d&apos;exemple</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={onClose}
                  className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                >
                  <span>Explorer les chantiers</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
