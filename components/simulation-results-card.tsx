import { ShieldCheck, CalendarCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SimulationResultsCardProps {
  isB2C?: boolean
  powerKwc: number
  productionKwh: number
  annualSavingsMin: number
  annualSavingsMax: number
  selfConsumptionRate: number
  paybackYears: string
  onBookAudit?: () => void
}

export function SimulationResultsCard({
  isB2C = false,
  powerKwc,
  productionKwh,
  annualSavingsMin,
  annualSavingsMax,
  selfConsumptionRate,
  paybackYears,
  onBookAudit,
}: SimulationResultsCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-lg sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Rapport préliminaire généré et envoyé par email
          </span>
          <h3 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
            Synthèse de rentabilité photovoltaïque
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-neutral-500">Référentiel réglementaire</span>
          <p className="text-xs font-bold text-foreground">
            {isB2C ? "Wallonie • RESCERT & RGIE" : "CWaPE • Plan PACE 2030"}
          </p>
        </div>
      </div>

      {/* Grille des 4 KPIs avec fourchette réaliste sans sur-promesse */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Puissance recommandée</p>
          <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-foreground">
            {powerKwc.toLocaleString("fr-BE")} kWc
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Dimensionnement optimal toiture</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Production annuelle estimée</p>
          <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-foreground">
            {productionKwh.toLocaleString("fr-BE")} kWh
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Données d&apos;ensoleillement IRM Belgique</p>
        </div>

        <div className="rounded-xl border border-accent/40 bg-accent/[0.05] p-4 shadow-xs">
          <p className="text-xs font-bold text-foreground">Économies nettes estimées</p>
          <p className="mt-1 font-mono tabular-nums text-xl font-extrabold text-accent">
            {annualSavingsMin.toLocaleString("fr-BE")} € – {annualSavingsMax.toLocaleString("fr-BE")} €<span className="text-xs font-semibold">/an</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Fourchette prudente hors inflation énergétique
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">
            {isB2C ? "Temps d'amortissement" : "ROI & Autoconsommation"}
          </p>
          <p className="mt-1 font-mono tabular-nums text-2xl font-bold text-emerald-600">{paybackYears}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Autoconsommation estimée : <strong className="font-mono tabular-nums">{selfConsumptionRate}%</strong>
          </p>
        </div>
      </div>

      {/* Note de transparence méthodologique (Tiers de confiance) */}
      <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <strong className="text-foreground">Méthodologie Aegis Solaire :</strong> Cette estimation repose sur une approche prudente intégrant les tarifs des gestionnaires de réseau wallons (Ores, Resa, AIEG) et une dégradation linéaire constructeur garantie sur 25 ans. Un audit technique sur site par un ingénieur certifié <strong>RESCERT</strong> permettra de figer votre offre financière définitive.
          </p>
        </div>
      </div>

      {/* Prochaine action immédiate (Conversion post-lead) */}
      <div className="mt-6 flex flex-col items-stretch justify-between gap-4 rounded-xl bg-primary p-5 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-white">
            Validez gratuitement votre étude de faisabilité sur place
          </p>
          <p className="text-xs text-neutral-300 mt-0.5">
            Un expert Aegis Solaire vérifie votre charpente, votre raccordement GRD et vos aides éligibles.
          </p>
        </div>
        <Button
          type="button"
          variant="accent"
          size="lg"
          onClick={onBookAudit}
          className="shrink-0"
        >
          <CalendarCheck className="h-4 w-4" />
          <span>Planifier ma visite technique</span>
        </Button>
      </div>
    </div>
  )
}
