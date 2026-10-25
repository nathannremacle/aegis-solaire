"use client"

import * as React from "react"
import {
  X,
  Zap,
  MapPin,
  Calendar,
  Building2,
  FileCheck2,
  Lock,
  Unlock,
  Coins,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import {
  getSurfaceTypeLabel,
  getRoofMaterialLabel,
  getTimeframeLabel,
  getOwnershipLabel,
  getProjectDriverLabel,
} from "@/lib/lead-display-helpers"

interface LeadDetailModalProps {
  lead: any
  partnerCredits: number
  isBuying: boolean
  onClose: () => void
  onPurchase: (lead: any) => void
  onRequestTopUp: () => void
}

export default function LeadDetailModal({
  lead,
  partnerCredits,
  isBuying,
  onClose,
  onPurchase,
  onRequestTopUp,
}: LeadDetailModalProps) {
  if (!lead) return null

  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const takenSlots = lead.taken_slots ?? Math.max(0, maxSlots - remainingSlots)
  const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
  const hasEnoughCredits = partnerCredits >= cost

  const surfaceArea = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
  const annualBill = Math.max(0, Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0)

  const financials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea,
    surfaceType: lead.surface_type,
    annualBill,
    creditCost: cost,
  })

  const provinceLabel = getProvinceDisplayLabel(lead.province, lead.province_free_text)
  const city = lead.city?.trim() || provinceLabel
  const postalCode = lead.postal_code?.trim() || lead.masked_postal_code || "—"
  const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Fermer la fiche"
        >
          <X className="h-5 w-5" />
        </button>

        {/* En-tête Dossier */}
        <div className="flex flex-wrap items-center gap-2 pr-8">
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
              isB2B
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground border border-border"
            }`}
          >
            {isB2B ? "B2B • Exclusivité 100% (1 seul artisan)" : `B2C • ${remainingSlots} place(s) sur ${maxSlots}`}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            Dossier #{lead.id.slice(0, 8)}
          </span>
        </div>

        <div className="mt-2">
          <h2 className="text-xl font-bold text-foreground">
            Projet Solaire {isB2B ? "Professionnel" : "Résidentiel"} à {city}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            <span>
              {city} ({postalCode}) · Région : {provinceLabel}
            </span>
          </p>
        </div>

        {/* Badges de réassurance technique */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-border py-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-semibold text-foreground border border-border">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Téléphone Contrôlé
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-semibold text-foreground border border-border">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Propriétaire Vérifié
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-semibold text-foreground border border-border">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Cadastre / Satellite OK
          </span>
          {lead.grd && (
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground border border-border uppercase">
              GRD : {lead.grd}
            </span>
          )}
        </div>

        {/* Scarcity Slots B2C */}
        {!isB2B && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-3">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Attribution limitée à 3 installateurs maximum :</span>
              <span className="font-mono tabular-nums text-accent font-bold">
                {remainingSlots} place(s) restante(s)
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {Array.from({ length: maxSlots }).map((_, idx) => {
                const isTaken = idx < takenSlots
                return (
                  <div
                    key={idx}
                    className={`rounded-lg px-2.5 py-2 text-center font-mono text-xs font-bold transition-all ${
                      isTaken
                        ? "bg-secondary text-muted-foreground border border-border line-through"
                        : "bg-card text-foreground border border-dashed border-accent shadow-2xs"
                    }`}
                  >
                    {isTaken ? `● Place ${idx + 1} : Attribuée` : `○ Place ${idx + 1} : DISPONIBLE`}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Caractéristiques Techniques (Grille 2 colonnes) */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs text-muted-foreground">Puissance estimée du générateur</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                {powerKwc > 0 ? `${powerKwc} kWc` : "À dimensionner"}
              </span>
              <span className="text-xs text-muted-foreground">
                (~{surfaceArea} m² exploitables)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs text-muted-foreground">Consommation & Facture annuelle</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} € HT / an` : "—"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs text-muted-foreground">Toiture & Couverture</span>
            <div className="mt-1 font-semibold text-sm text-foreground">
              {getRoofMaterialLabel(lead.roof_material)}
            </div>
            <span className="text-xs text-muted-foreground">
              {getSurfaceTypeLabel(lead.surface_type)}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3.5">
            <span className="text-xs text-muted-foreground">Statut du demandeur</span>
            <div className="mt-1 font-semibold text-sm text-foreground">
              {getOwnershipLabel(lead.ownership_status)}
            </div>
            <span className="text-xs text-muted-foreground">
              Délai souhaité : {getTimeframeLabel(lead.timeframe || lead.project_timeline)}
            </span>
          </div>
        </div>

        {/* Objectif et Précisions du prospect */}
        <div className="mt-3.5 rounded-xl border border-border bg-background/60 p-3.5">
          <span className="text-xs text-muted-foreground">Motivation & Déclencheur du projet</span>
          <p className="mt-1 text-sm font-medium text-foreground">
            {getProjectDriverLabel(lead.project_driver)}
          </p>
          {(lead.project_details || lead.message) && (
            <div className="mt-2 rounded-lg bg-card border border-border p-3 text-xs italic text-muted-foreground">
              « {lead.project_details || lead.message} »
            </div>
          )}
        </div>

        {/* Prévisions Financières Artisan */}
        <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estimations économiques pour votre devis
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              Marge indicative ~22%
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Montant estimé du chantier</span>
              <div className="mt-0.5 font-mono text-base font-bold text-foreground tabular-nums">
                {financials.estimatedContractValueRange.min.toLocaleString("fr-BE")} € à {financials.estimatedContractValueRange.max.toLocaleString("fr-BE")} € HT
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Marge brute prévisionnelle</span>
              <div className="mt-0.5 font-mono text-base font-bold text-accent tabular-nums">
                ~{financials.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT
              </div>
            </div>
          </div>
        </div>

        {/* Coordonnées verrouillées */}
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium">
              <Lock className="h-3.5 w-3.5 text-accent" /> Coordonnées directes du prospect (Nom, Téléphone, E-mail, Adresse)
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Débloquées instantanément
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground/70">
            <div>Contact : {lead.first_name || "Client"} {lead.last_name ? lead.last_name.slice(0, 1) + "***" : "***"}</div>
            <div>Téléphone : +32 4** ** ** ** [Vérifié]</div>
            <div>E-mail : ********@*****.*** [Vérifié]</div>
            <div>Adresse : {city} ({postalCode}) [Numéro masqué]</div>
          </div>
        </div>

        {/* Action Déblocage & Tarif */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-foreground tabular-nums">{cost}</span>
              <span className="text-sm font-semibold text-muted-foreground">crédits</span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                (~{financials.leadCostEuros.toFixed(2)} € HT)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Votre solde actuel :{" "}
              <strong className="font-mono text-foreground tabular-nums">{partnerCredits} crédits</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!hasEnoughCredits ? (
              <Button
                variant="accent"
                onClick={onRequestTopUp}
                className="w-full sm:w-auto font-bold h-11 px-5"
              >
                <Coins className="h-4 w-4 mr-2" />
                Solde insuffisant • Recharger
              </Button>
            ) : (
              <Button
                variant="default"
                disabled={isBuying}
                onClick={() => onPurchase(lead)}
                className="w-full sm:w-auto font-bold h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isBuying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Déblocage en cours...
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Débloquer ce dossier ({cost} crédits)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
