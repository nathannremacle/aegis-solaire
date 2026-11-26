"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  CheckCircle2,
  Printer,
  ShieldCheck,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildDetailedDpiSimulation } from "@/lib/b2b-cfo-brief"

interface DpiCalculatorClientProps {
  isAuthenticatedPartner: boolean
  partnerCompanyName: string | null
}

function formatEur(val: number): string {
  return `${Math.round(val).toLocaleString("fr-BE")} €`
}

export function DpiCalculatorClient({
  isAuthenticatedPartner,
  partnerCompanyName,
}: DpiCalculatorClientProps) {
  const [powerKwc, setPowerKwc] = React.useState<number>(60)
  const [capexPerWc, setCapexPerWc] = React.useState<number>(0.98)
  const [annualBillEur, setAnnualBillEur] = React.useState<number>(28000)
  const [electricityPrice, setElectricityPrice] = React.useState<number>(0.24)
  const [selfConsumptionPct, setSelfConsumptionPct] = React.useState<number>(70)
  const [isocRate, setIsocRate] = React.useState<0.2 | 0.25>(0.25)
  const [clientCompanyName, setClientCompanyName] = React.useState<string>("")
  const [clientProvince, setClientProvince] = React.useState<string>("Liège")
  const [customInstallerName, setCustomInstallerName] = React.useState<string>(
    partnerCompanyName || ""
  )

  const sim = React.useMemo(
    () =>
      buildDetailedDpiSimulation({
        powerKwc,
        capexPerWc,
        annualBillEur,
        electricityPriceEurKwh: electricityPrice,
        selfConsumptionRate: selfConsumptionPct / 100,
        isocRate,
        clientCompanyName,
        clientProvince,
        installerCompanyName: isAuthenticatedPartner
          ? customInstallerName || partnerCompanyName || "Installateur Partenaire RESCERT"
          : "Aperçu Aegis Solaire (Marque Blanche réservée aux partenaires)",
      }),
    [
      powerKwc,
      capexPerWc,
      annualBillEur,
      electricityPrice,
      selfConsumptionPct,
      isocRate,
      clientCompanyName,
      clientProvince,
      isAuthenticatedPartner,
      customInstallerName,
      partnerCompanyName,
    ]
  )

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne Paramètres (masquée à l'impression) */}
        <div className="lg:col-span-5 rounded-3xl border border-border bg-card p-6 flex flex-col gap-5 shadow-xs print:hidden">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Calculator className="h-5 w-5 text-accent shrink-0" />
            <h2 className="text-lg font-bold text-foreground font-heading">
              Paramètres du chantier B2B
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dpi-kwc" className="text-xs font-semibold">
                Puissance installée (kWc)
              </Label>
              <Input
                id="dpi-kwc"
                type="number"
                min={5}
                max={2000}
                step={5}
                value={powerKwc}
                onChange={(e) => setPowerKwc(Number(e.target.value) || 5)}
                className="font-mono tabular-nums rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dpi-capex" className="text-xs font-semibold">
                Prix clé-en-main (€ HT / Wc)
              </Label>
              <Input
                id="dpi-capex"
                type="number"
                min={0.55}
                max={2.5}
                step={0.02}
                value={capexPerWc}
                onChange={(e) => setCapexPerWc(Number(e.target.value) || 0.95)}
                className="font-mono tabular-nums rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dpi-bill" className="text-xs font-semibold">
                Facture élec. annuelle (€ HT)
              </Label>
              <Input
                id="dpi-bill"
                type="number"
                min={1000}
                max={2000000}
                step={1000}
                value={annualBillEur}
                onChange={(e) => setAnnualBillEur(Number(e.target.value) || 1000)}
                className="font-mono tabular-nums rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dpi-elec" className="text-xs font-semibold">
                Prix kWh réseau évité (€)
              </Label>
              <Input
                id="dpi-elec"
                type="number"
                min={0.1}
                max={0.6}
                step={0.01}
                value={electricityPrice}
                onChange={(e) => setElectricityPrice(Number(e.target.value) || 0.24)}
                className="font-mono tabular-nums rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dpi-auto" className="text-xs font-semibold">
                Autoconsommation estimée (%)
              </Label>
              <Input
                id="dpi-auto"
                type="number"
                min={25}
                max={95}
                step={5}
                value={selfConsumptionPct}
                onChange={(e) => setSelfConsumptionPct(Number(e.target.value) || 65)}
                className="font-mono tabular-nums rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-foreground">Taux ISoc client</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { rate: 0.2 as const, label: "20 % PME" },
                  { rate: 0.25 as const, label: "25 % Std" },
                ].map((opt) => (
                  <button
                    key={opt.rate}
                    type="button"
                    onClick={() => setIsocRate(opt.rate)}
                    className={`h-10 rounded-xl border font-mono text-xs font-bold tabular-nums cursor-pointer transition-colors ${
                      isocRate === opt.rate
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dpi-client" className="text-xs font-semibold">
                Nom du prospect B2B (facultatif)
              </Label>
              <Input
                id="dpi-client"
                type="text"
                placeholder="Ex. Menuiserie Ardennaise SA"
                value={clientCompanyName}
                onChange={(e) => setClientCompanyName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dpi-prov" className="text-xs font-semibold">
                Province
              </Label>
              <Input
                id="dpi-prov"
                type="text"
                placeholder="Liège"
                value={clientProvince}
                onChange={(e) => setClientProvince(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {isAuthenticatedPartner && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
              <Label htmlFor="dpi-installer" className="text-xs font-semibold">
                En-tête marque blanche (votre entreprise)
              </Label>
              <Input
                id="dpi-installer"
                type="text"
                value={customInstallerName}
                onChange={(e) => setCustomInstallerName(e.target.value)}
                className="rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Colonne Note Financière CFO (zone imprimable PDF) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 flex flex-col gap-6 shadow-xs print:border-0 print:shadow-none print:p-0">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                  Note de Synthèse Financière B2B · Wallonie 2026
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground font-heading">
                  {sim.clientCompanyName} —{" "}
                  <span className="font-mono tabular-nums">{sim.powerKwc} kWc</span>
                </h2>
                <span className="text-xs text-muted-foreground">
                  Établi par : <strong className="text-foreground">{sim.installerCompanyName}</strong> · Province : {sim.clientProvince}
                </span>
              </div>

              <Button
                type="button"
                onClick={() => window.print()}
                size="sm"
                className="rounded-xl text-xs font-bold gap-2 cursor-pointer print:hidden"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>
                  {isAuthenticatedPartner
                    ? "Exporter en PDF (Marque Blanche)"
                    : "Imprimer / Aperçu PDF"}
                </span>
              </Button>
            </div>

            {/* 4 KPI financiers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border bg-secondary/40 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">CAPEX Brut HTVA</span>
                <span className="font-mono text-lg sm:text-xl font-extrabold text-foreground tabular-nums">
                  {formatEur(sim.estimatedCapexHtva)}
                </span>
                <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
                  {sim.capexPerWc.toFixed(2).replace(".", ",")} €/Wc
                </span>
              </div>

              <div className="rounded-2xl border border-[var(--aegis-availability-text)]/30 bg-[var(--aegis-availability-bg)]/50 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-[var(--aegis-availability-text)]">
                  Économie ISoc DPI 40 %
                </span>
                <span className="font-mono text-lg sm:text-xl font-extrabold text-[var(--aegis-availability-text)] tabular-nums">
                  -{formatEur(sim.isocTaxShieldEur)}
                </span>
                <span className="font-mono text-[10.5px] text-[var(--aegis-availability-text)] tabular-nums">
                  Base {formatEur(sim.dpi40DeductionBaseEur)} · ISoc {sim.isocRatePercent} %
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/40 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">CAPEX Net Après DPI</span>
                <span className="font-mono text-lg sm:text-xl font-extrabold text-foreground tabular-nums">
                  {formatEur(sim.netEffectiveCapexEur)}
                </span>
                <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
                  Économie an 1 : {formatEur(sim.annualSavingsYear1Eur)}
                </span>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/40 p-4 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-muted-foreground">Amortissement Net</span>
                <span className="font-mono text-lg sm:text-xl font-extrabold text-accent tabular-nums">
                  {sim.paybackYearsWithDpi.toFixed(1).replace(".", ",")} ans
                </span>
                <span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
                  vs {sim.paybackYearsWithoutDpi.toFixed(1).replace(".", ",")} ans sans DPI
                </span>
              </div>
            </div>

            {/* Tableau de synthèse CFO */}
            <div className="rounded-2xl border border-border bg-background p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <TrendingUp className="h-4 w-4 text-accent shrink-0" />
                <span>Synthèse financière à joindre au devis</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Production annuelle (930 kWh/kWc)</span>
                  <span className="font-mono font-bold text-foreground tabular-nums">
                    {sim.annualProductionKwh.toLocaleString("fr-BE")} kWh/an
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Part autoconsommée</span>
                  <span className="font-mono font-bold text-foreground tabular-nums">
                    {sim.selfConsumedKwh.toLocaleString("fr-BE")} kWh/an
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Gain net cumulé 15 ans</span>
                  <span className="font-mono font-bold text-foreground tabular-nums">
                    {formatEur(sim.cumulativeNetGain15YearsEur)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">Gain net cumulé 25 ans</span>
                  <span className="font-mono font-bold text-[var(--aegis-availability-text)] tabular-nums">
                    {formatEur(sim.cumulativeNetGain25YearsEur)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="rounded-xl border border-border bg-secondary/30 p-3 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground block">Certificats Verts CWaPE</strong>
                    {sim.cvEligible
                      ? "Éligible (> 10 kVA) sous réserve de dépôt préalable Démarche 2945 SPW Énergie."
                      : "Installation <= 10 kVA : rentabilité portée par l'autoconsommation directe."}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-secondary/30 p-3 flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-foreground block">Financement Easy&apos;Green (WE)</strong>
                    {sim.easyGreenEligible
                      ? "Éligible : dette subordonnée sans garantie réelle jusqu'à 100 % du CAPEX."
                      : "Autofinancement direct ou tiers-investissement selon stratégie de bilan."}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {sim.disclaimer}
            </p>
          </div>

          {!isAuthenticatedPartner && (
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
              <div className="flex flex-col gap-1">
                <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  <span>Réservé aux partenaires RESCERT Aegis Solaire</span>
                </div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Exportez cette Note CFO en PDF à votre nom d&apos;entreprise
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  L&apos;inscription est <strong className="font-mono tabular-nums text-foreground">100 % gratuite</strong> et sans abonnement : vous débloquez la marque blanche PDF et recevez nos projets B2B exclusifs en Wallonie.
                </p>
              </div>
              <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-2 shrink-0">
                <Link href="/partenaires?from=outil-dpi#candidature">
                  <span>Créer mon accès gratuit</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}

          {isAuthenticatedPartner && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
                <span>Connecté en tant que partenaire agréé — mode Marque Blanche actif.</span>
              </div>
              <Link href="/partenaires/dashboard" className="text-xs font-bold text-accent hover:underline">
                Retour au portail &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
