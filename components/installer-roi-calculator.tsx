"use client"

import { useState, useMemo } from "react"
import { TrendingUp, Coins, Calculator, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type ProjectType = "mixed" | "b2c" | "b2b"

export function InstallerRoiCalculator() {
  const [projectType, setProjectType] = useState<ProjectType>("mixed")
  const [leadsPerMonth, setLeadsPerMonth] = useState<number>(6)
  const [conversionRate, setConversionRate] = useState<number>(33) // 33% = 1 chantier sur 3

  // Paramètres économiques par segment
  const economics = useMemo(() => {
    switch (projectType) {
      case "b2c":
        return {
          avgCreditCost: 2,
          avgCreditEuro: 23.96, // ~11.98€ / crédit
          avgContractValue: 14500, // 14 500 € par installation résidentielle
          avgGrossMargin: 3600, // ~25% marge brute installateur
          label: "Résidentiel B2C (8 à 20 kWc)",
        }
      case "b2b":
        return {
          avgCreditCost: 8,
          avgCreditEuro: 95.84, // ~11.98€ / crédit
          avgContractValue: 160000, // toiture tertiaire PME
          avgGrossMargin: 28000, // marge brute tertiaire
          label: "Tertiaire & PME B2B (50 à 400 kWc)",
        }
      case "mixed":
      default:
        return {
          avgCreditCost: 4,
          avgCreditEuro: 47.92,
          avgContractValue: 48000,
          avgGrossMargin: 9500,
          label: "Mixte (70% Résidentiel / 30% Tertiaire)",
        }
    }
  }, [projectType])

  // Calculs financiers
  const calculations = useMemo(() => {
    const totalCredits = leadsPerMonth * economics.avgCreditCost
    const totalCreditCostEuro = leadsPerMonth * economics.avgCreditEuro
    const signedProjects = Math.max(1, Math.round((leadsPerMonth * conversionRate) / 100))
    const totalTurnover = signedProjects * economics.avgContractValue
    const totalGrossMargin = signedProjects * economics.avgGrossMargin
    const netReturn = totalGrossMargin - totalCreditCostEuro
    const roiMultiplier = Math.round(totalGrossMargin / (totalCreditCostEuro || 1))

    return {
      totalCredits,
      totalCreditCostEuro,
      signedProjects,
      totalTurnover,
      totalGrossMargin,
      netReturn,
      roiMultiplier,
    }
  }, [leadsPerMonth, conversionRate, economics])

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)]">
      {/* En-tête du calculateur */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-mono font-semibold text-primary">
            <Calculator className="h-3.5 w-3.5 text-accent" />
            <span>SIMULATEUR DE RENTABILITÉ INSTALLATEUR</span>
          </div>
          <h3 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground font-heading">
            Calculez votre retour sur investissement
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Ajustez votre volume mensuel et observez la rentabilité de votre carnet de commandes.
          </p>
        </div>

        {/* Badge multiplicateur moyen */}
        <div className="shrink-0 rounded-xl border border-accent/30 bg-accent/[0.06] p-3 text-center sm:text-right">
          <span className="text-[11px] font-mono text-muted-foreground uppercase block font-medium">
            Multiplicateur ROI estimé
          </span>
          <span className="font-mono text-2xl sm:text-3xl font-extrabold text-accent tabular-nums">
            x{calculations.roiMultiplier}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonne gauche : Paramètres et Sliders */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* 1. Choix du segment */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
              1. Type de chantiers visés
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProjectType("mixed")}
                className={`rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer text-center ${
                  projectType === "mixed"
                    ? "border-accent bg-accent/10 text-foreground ring-1 ring-accent font-bold"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                Mixte (B2C &amp; B2B)
              </button>
              <button
                type="button"
                onClick={() => setProjectType("b2c")}
                className={`rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer text-center ${
                  projectType === "b2c"
                    ? "border-accent bg-accent/10 text-foreground ring-1 ring-accent font-bold"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                Résidentiel B2C
              </button>
              <button
                type="button"
                onClick={() => setProjectType("b2b")}
                className={`rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer text-center ${
                  projectType === "b2b"
                    ? "border-accent bg-accent/10 text-foreground ring-1 ring-accent font-bold"
                    : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                Tertiaire B2B
              </button>
            </div>
          </div>

          {/* 2. Curseur : Chantiers débloqués / mois */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="leads-slider" className="text-xs font-bold text-foreground">
                2. Chantiers débloqués par mois
              </label>
              <span className="font-mono text-sm font-bold text-accent tabular-nums bg-card px-2.5 py-0.5 rounded-md border border-border">
                {leadsPerMonth} dossiers / mois
              </span>
            </div>
            <input
              id="leads-slider"
              type="range"
              min={2}
              max={20}
              step={1}
              value={leadsPerMonth}
              onChange={(e) => setLeadsPerMonth(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>2 chantiers (test)</span>
              <span>10 chantiers (équipe active)</span>
              <span>20 chantiers (structure régionale)</span>
            </div>
          </div>

          {/* 3. Curseur : Taux de signature estimé */}
          <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="rate-slider" className="text-xs font-bold text-foreground">
                3. Taux de transformation en devis signé
              </label>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums bg-card px-2.5 py-0.5 rounded-md border border-border">
                {conversionRate} % (env. 1 sur {Math.round(100 / conversionRate)})
              </span>
            </div>
            <input
              id="rate-slider"
              type="range"
              min={20}
              max={50}
              step={5}
              value={conversionRate}
              onChange={(e) => setConversionRate(Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Moyenne observée sur Aegis Solaire : <strong className="text-foreground">30% à 40%</strong> grâce aux pièces justificatives toiture et compteurs déjà vérifiés.
            </p>
          </div>
        </div>

        {/* Colonne droite : Synthèse financière Bento */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-2xl border-2 border-accent/40 bg-secondary/40 p-5 flex flex-col gap-4">
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-bold">
              Bilan Financier Mensuel Estimé
            </span>

            {/* Marge brute */}
            <div className="border-b border-border pb-3">
              <span className="text-xs text-muted-foreground block">Marge brute estimée pour votre entreprise :</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-3xl sm:text-4xl font-extrabold text-accent tabular-nums">
                  ~{calculations.totalGrossMargin.toLocaleString("fr-BE")} €
                </span>
                <span className="text-xs font-mono font-bold text-accent">HT / mois</span>
              </div>
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Basé sur <strong className="font-mono tabular-nums text-foreground">{calculations.signedProjects} chantier(s) signé(s)</strong> pour un C.A. de ~{calculations.totalTurnover.toLocaleString("fr-BE")} € HT.
              </span>
            </div>

            {/* Coût des crédits */}
            <div className="flex items-center justify-between text-xs border-b border-border pb-3">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-accent" />
                Budget crédits requis :
              </span>
              <div className="text-right">
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {calculations.totalCredits} crédits
                </span>
                <span className="text-muted-foreground font-mono ml-1 tabular-nums">
                  (~{Math.round(calculations.totalCreditCostEuro)} € HT)
                </span>
              </div>
            </div>

            {/* Gain net après déduction des crédits */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Bénéfice net d&apos;exploitation :</span>
              <span className="font-mono font-extrabold text-foreground tabular-nums text-sm">
                +{Math.round(calculations.netReturn).toLocaleString("fr-BE")} € HT
              </span>
            </div>

            {/* CTA d'action */}
            <a href="#tarifs" className="w-full mt-2">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs rounded-xl h-11 cursor-pointer shadow-xs">
                Découvrir les packs de crédits
                <ArrowRight className="h-3.5 w-3.5 ml-1.5 text-accent" />
              </Button>
            </a>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
            <span>Aucune commission de fin de chantier réclamée par Aegis Solaire.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
