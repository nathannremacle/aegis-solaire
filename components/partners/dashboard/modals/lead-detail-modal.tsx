"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import {
  X,
  MapPin,
  Lock,
  Unlock,
  Coins,
  ShieldCheck,
  Loader2,
  Phone,
  Mail,
  Home,
  CheckCircle2,
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
  const modalContentRef = useRef<HTMLDivElement>(null)

  // Fermeture clavier (Escape) & Verrouillage du scroll arrière-plan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (!lead) return null

  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const takenSlots = lead.taken_slots ?? Math.max(0, maxSlots - remainingSlots)
  const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
  const hasEnoughCredits = partnerCredits >= cost

  const isPurchased = Boolean(
    lead.already_purchased ||
    lead.purchase_id ||
    (lead.email && !lead.email.includes("***") && !lead.email.includes("—"))
  )

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
  const maskedPostalCode =
    lead.masked_postal_code ||
    (lead.postal_code ? `${String(lead.postal_code).slice(0, 2)}XX` : "—")
  const postalCode = isPurchased ? (lead.postal_code || maskedPostalCode) : maskedPostalCode
  const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        // Clic sur l'overlay extérieur pour quitter la fiche
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-lead-title"
    >
      <div
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* En-tête fixe (ne défile jamais) */}
        <div className="shrink-0 flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-border bg-card">
          <div className="space-y-1.5 pr-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                  isB2B
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground border border-border"
                }`}
              >
                {isB2B ? "B2B • Exclusivité 100% (1 seul artisan)" : `B2C • ${remainingSlots} place(s) sur ${maxSlots}`}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                Dossier #{lead.id ? lead.id.slice(0, 8) : "REF"}
              </span>
              {isPurchased && (
                <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent border border-accent/20">
                  <CheckCircle2 className="h-3 w-3" /> Débloqué
                </span>
              )}
            </div>

            <h2 id="modal-lead-title" className="text-lg sm:text-xl font-bold text-foreground truncate">
              Projet Solaire {isB2B ? "Professionnel" : "Résidentiel"} à {city}
            </h2>

            <p className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>
                {city} ({postalCode}) · Région : {provinceLabel}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer la fiche (Echap ou clic extérieur)"
            title="Fermer la fiche"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps de fiche défilant (accessible sur tous les écrans sans coupure) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
          {/* Badges de réassurance technique */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-semibold text-foreground border border-border">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" /> Téléphone Contrôlé
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-semibold text-foreground border border-border">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" /> Propriétaire Décisionnaire
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-semibold text-foreground border border-border">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" /> Cadastre / Satellite OK
            </span>
            {lead.grd && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground border border-border uppercase">
                GRD : {lead.grd}
              </span>
            )}
          </div>

          {/* Scarcity Slots B2C */}
          {!isB2B && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5">
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
                      className={`rounded-lg px-2 py-1.5 text-center font-mono text-xs font-bold transition-all ${
                        isTaken
                          ? "bg-secondary text-muted-foreground border border-border line-through"
                          : "bg-card text-foreground border border-dashed border-accent shadow-2xs"
                      }`}
                    >
                      {isTaken ? `● Place ${idx + 1} : Attribuée` : `○ Place ${idx + 1} : DISPO`}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Caractéristiques Techniques (Grille 2 colonnes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
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

            <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
              <span className="text-xs text-muted-foreground">Consommation & Facture annuelle</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                  {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} € HT / an` : "—"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
              <span className="text-xs text-muted-foreground">Toiture & Couverture</span>
              <div className="mt-1 font-semibold text-sm text-foreground">
                {getRoofMaterialLabel(lead.roof_material)}
              </div>
              <span className="text-xs text-muted-foreground">
                {getSurfaceTypeLabel(lead.surface_type)}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
              <span className="text-xs text-muted-foreground">Statut du demandeur</span>
              <div className="mt-1 font-semibold text-sm text-foreground">
                {getOwnershipLabel(lead.ownership_status)}
              </div>
              <span className="text-xs text-muted-foreground">
                Délai souhaité : {getTimeframeLabel(lead.timeframe || lead.project_timeline)}
              </span>
            </div>
          </div>

          {/* Motivation & Précisions du prospect */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3.5">
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
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Estimations économiques pour votre devis
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                Marge indicative ~22%
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

          {/* Coordonnées (Verrouillées ou Débloquées) */}
          <div className="rounded-xl border border-dashed border-border bg-card p-3.5">
            {isPurchased ? (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Coordonnées directes et complètes du prospect :</span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Contact :</span>
                    <strong className="text-foreground">{lead.first_name} {lead.last_name} {lead.company ? `(${lead.company})` : ""}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-accent shrink-0" />
                    <a href={`tel:${lead.phone}`} className="font-mono font-bold text-primary hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-accent shrink-0" />
                    <a href={`mailto:${lead.email}`} className="font-mono text-primary hover:underline truncate">
                      {lead.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-foreground truncate">{lead.site_address || `${city} (${postalCode})`}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Lock className="h-3.5 w-3.5 text-accent" /> Coordonnées directes (Nom, Téléphone, E-mail, Adresse)
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Déblocage instantané
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono text-muted-foreground/75">
                  <div>Contact : {lead.first_name || "Client"} {lead.last_name ? lead.last_name.slice(0, 1) + "***" : "***"}</div>
                  <div>Téléphone : +32 4** ** ** ** [Vérifié]</div>
                  <div>E-mail : ********@*****.*** [Vérifié]</div>
                  <div>Adresse : {city} ({maskedPostalCode}) [Numéro masqué]</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pied de fiche fixe (toujours accessible sans défiler) */}
        <div className="shrink-0 border-t border-border bg-secondary/30 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            {!isPurchased ? (
              <>
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
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Dossier dans votre <strong className="text-foreground">Pipeline CRM</strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-11 sm:h-10 px-3.5 cursor-pointer shrink-0"
            >
              Fermer
            </Button>

            {!isPurchased && (
              !hasEnoughCredits ? (
                <Button
                  variant="accent"
                  onClick={onRequestTopUp}
                  className="font-bold h-11 sm:h-10 px-4 text-xs flex-1 sm:flex-initial cursor-pointer justify-center"
                >
                  <Coins className="h-4 w-4 mr-1.5" />
                  Recharger
                </Button>
              ) : (
                <Button
                  variant="default"
                  disabled={isBuying}
                  onClick={() => onPurchase(lead)}
                  className="font-bold h-11 sm:h-10 px-4 text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial cursor-pointer justify-center"
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Déblocage en cours...
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-1.5" />
                      Débloquer ({cost} crédits)
                    </>
                  )}
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
