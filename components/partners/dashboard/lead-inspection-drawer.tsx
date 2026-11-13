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
  ExternalLink,
  Building2,
  Calendar,
  Zap,
  Download,
  AlertCircle,
  FileCheck,
  Sparkles,
  Clock,
  Camera,
  Maximize2,
  Sliders,
  UserCheck,
  Ruler,
  Layers,
  MessageSquare,
  CreditCard,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { formatEurWithDecimals, calculateLeadDirectFinancials } from "@/lib/credit-pricing"
import {
  getLeadLocationInfo,
  sanitizeLeadNotes,
  formatRoundedCurrency,
  calculateLeadRoiRatio,
  getLeadFreshness,
  getRoofMaterialLabel,
  getSurfaceTypeLabel,
  getTimeframeLabel,
  getOwnershipLabel,
  getProjectDriverLabel,
  getPropertyTypeLabel,
  getRoofSurfaceLabel,
  getConsumptionLabel,
} from "@/lib/lead-display-helpers"
import { LeadGeoRadarMap } from "./lead-geo-radar-map"
import { downloadLeadVCard } from "./lib/vcard-export"
import { DirectLeadPaymentModal } from "./modals/direct-lead-payment-modal"
import { useLeadInspectionTimer } from "@/lib/client/partner-tracker"

interface LeadInspectionDrawerProps {
  lead: any
  partnerCredits: number
  isBuying: boolean
  onClose: () => void
  onPurchase: (lead: any) => void
  onRequestTopUp: () => void
  onRequestExpert?: (lead: any) => void
}

export function LeadInspectionDrawer({
  lead,
  partnerCredits,
  isBuying,
  onClose,
  onPurchase,
  onRequestTopUp,
  onRequestExpert,
}: LeadInspectionDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const [isDirectPayOpen, setIsDirectPayOpen] = React.useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false)

  const isLeadAlreadyPurchased = Boolean(
    !lead?.is_demo_preview &&
      (lead?.already_purchased ||
        lead?.purchase_id ||
        (lead?.email && !lead.email.includes("***") && !lead.email.includes("—")))
  )

  const { recordRoofZoom, recordUnlockIntent } = useLeadInspectionTimer({
    lead,
    source: isLeadAlreadyPurchased ? "crm_drawer" : "marketplace_drawer",
    partnerCredits,
    enabled: Boolean(lead),
  })

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
  const cost = lead.credit_cost ?? (isB2B ? 9 : 3)
  const hasEnoughCredits = partnerCredits >= cost

  const directFinancials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: cost,
  })

  const isDemo = Boolean(lead.is_demo_preview)
  const isPurchased = isDemo
    ? false
    : Boolean(
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
    roofMaterial: lead.roof_material,
    annualBill,
    creditCost: cost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details ?? lead.message,
    qualificationMetadata: lead.qualification_metadata,
  })

  const location = getLeadLocationInfo(lead)
  const freshness = getLeadFreshness(lead.created_at, (lead as { freshness_label?: string }).freshness_label)
  const sanitized = sanitizeLeadNotes(lead.project_details, lead.message)
  const specs = sanitized.specs

  // Spécifications techniques consolidées et dédoublonnées à 100%
  const propertyTypeDisplay =
    specs.propertyType ||
    (lead.qualification_metadata?.propertyType
      ? getPropertyTypeLabel(lead.qualification_metadata.propertyType)
      : null) ||
    (lead.surface_type ? getSurfaceTypeLabel(lead.surface_type) : "Maison d'habitation")

  const roofMaterialDisplay =
    (lead.roof_material ? getRoofMaterialLabel(lead.roof_material) : null) ||
    specs.roofMaterial ||
    "Tuiles"

  const roofSurfaceDisplay =
    specs.roofSurface ||
    (lead.surface_area_m2 ? `${lead.surface_area_m2} m²` : null) ||
    (lead.surface_area ? getRoofSurfaceLabel(String(lead.surface_area)) : null) ||
    "Moyenne (~35 à 60 m²)"

  const ownershipDisplay =
    (lead.ownership_status ? getOwnershipLabel(lead.ownership_status) : null) ||
    specs.ownership ||
    "Propriétaire occupant"

  const timeframeDisplay = getTimeframeLabel(lead.timeframe || lead.project_timeline)
  const grdDisplay = lead.grd ? `GRD ${lead.grd.toUpperCase()}` : "ORES / RESA"

  const consumptionDisplay =
    specs.consumption ||
    (lead.qualification_metadata?.consumptionKwh
      ? getConsumptionLabel(String(lead.qualification_metadata.consumptionKwh))
      : null) ||
    (lead.annual_bill_eur ? `${lead.annual_bill_eur.toLocaleString("fr-BE")} €/an` : null) ||
    (lead.annual_electricity_bill ? `${lead.annual_electricity_bill.toLocaleString("fr-BE")} €/an` : null)

  const contactPreferenceDisplay =
    specs.contactPreference || lead.qualification_metadata?.contactPreference || null

  const hasBattery = specs.hasBattery || lead.qualification_metadata?.battery === true
  const hasIrve = specs.hasIrve || lead.qualification_metadata?.ev_charger === true

  const powerKwc = financials.estimatedPowerKwc
  const displaySurfaceArea = financials.normalizedSurfaceAreaM2
  const displayAnnualBill = financials.normalizedAnnualBill
  const roi = calculateLeadRoiRatio(financials.estimatedInstallerMargin, cost, financials.estimatedContractValue)
  const roofImageUrl = (lead.qualification_metadata?.roof_image_url ||
    lead.qualification_metadata?.site_image_url ||
    lead.qualificationMetadata?.roof_image_url ||
    lead.qualificationMetadata?.site_image_url ||
    lead.roof_image_url ||
    lead.site_image_url) as string | undefined

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full sm:max-w-[540px] h-full bg-card border-l border-border shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* ── 1. En-tête Fixe Haute Densité ── */}
        <div className="shrink-0 flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border bg-card">
          <div className="flex flex-col gap-1 pr-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                  isB2B
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground border border-border"
                }`}
              >
                {isB2B ? "B2B • Exclusif 100%" : `B2C • ${remainingSlots}/${maxSlots} places`}
              </span>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotClass}`} />
                <span suppressHydrationWarning>{freshness.label}</span>
              </span>

              <span className="font-mono text-[10px] text-muted-foreground/80 tabular-nums">
                Ref #{lead.id ? lead.id.slice(0, 8).toUpperCase() : "SOLAR"}
              </span>
            </div>

            <h2 id="drawer-title" className="text-lg sm:text-xl font-bold text-foreground truncate">
              {location.fullTitle}
            </h2>

            <p className="text-xs text-muted-foreground truncate">
              {location.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer le panneau"
            title="Fermer le panneau (Échap)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── 2. Corps Déroulant Haute Richesse Métier ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 overscroll-contain">
          {/* A. Carte Tactique avec Cercle de Floutage 3 km */}
          <div>
            <LeadGeoRadarMap
              city={location.city}
              postalCode={location.postalCode}
              provinceLabel={location.provinceLabel}
              isPurchased={isPurchased}
              siteAddress={lead.site_address}
              coords={location.coords}
            />
          </div>

          {/* Visuel Street View du Bâtiment & Toiture (si disponible) */}
          {roofImageUrl && (
            <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  Visuel Façade &amp; Toiture (Street View)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  Dossier inspecté
                </span>
              </div>

              <div
                className="relative rounded-lg overflow-hidden border border-border bg-secondary/30 group cursor-pointer aspect-[4/5] max-h-[500px]"
                onClick={() => {
                  setIsImageModalOpen(true)
                  recordRoofZoom()
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={roofImageUrl}
                  alt="Aperçu Street View de la toiture et façade"
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                  <span className="text-xs font-semibold text-white drop-shadow-sm flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Cliquer pour agrandir
                  </span>
                  <span className="text-[10px] font-mono text-white/80">
                    Aperçu géolocalisé
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Vérification technique préalable : pente, couverture &amp; orientation visibles.</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsImageModalOpen(true)
                    recordRoofZoom()
                  }}
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  Voir en grand &rarr;
                </button>
              </p>
            </div>
          )}

          {/* Modal Lightbox Agrandie */}
          {isImageModalOpen && roofImageUrl && (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
              onClick={() => setIsImageModalOpen(false)}
            >
              <div
                className="relative max-w-4xl w-full max-h-[90vh] bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-3.5 border-b border-border bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm text-foreground">
                      Visuel de la maison &amp; toiture — {location.city || "Chantier"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(false)}
                    className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-2 overflow-auto flex items-center justify-center bg-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={roofImageUrl}
                    alt="Visuel agrandi"
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg"
                  />
                </div>
                <div className="p-3 border-t border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">
                    Réf #{lead.id ? lead.id.slice(0, 8).toUpperCase() : ""} · Google Street View
                  </span>
                  <a
                    href={roofImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    <span>Ouvrir l&apos;image originale</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* B. Métriques Clés en Chasse Fixe (Puissance, Facture, Production, Rentabilité) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide block font-semibold">
                Puissance Estimée
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-xl sm:text-2xl font-black text-foreground tabular-nums whitespace-nowrap">
                  {powerKwc > 0 ? powerKwc : "—"}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-tight">
                  kWc
                </span>
                <span className="text-[11px] font-mono tabular-nums text-muted-foreground ml-1">
                  ({financials.estimatedPanelCount} panneaux)
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                {displaySurfaceArea > 0 ? `~${financials.usableSurfaceM2} m² utiles (${displaySurfaceArea} m² bruts)` : "Surface à dimensionner"}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide block font-semibold">
                Facture / Conso
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
                  {displayAnnualBill > 0 ? `${displayAnnualBill.toLocaleString("fr-BE")} €/an` : (isB2B ? "Facture pro" : "Non communiquée")}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                ≈ {financials.estimatedAnnualConsumptionKwh.toLocaleString("fr-BE")} kWh/an ({isB2B ? "HT" : "TTC"})
              </span>
            </div>
          </div>

          {/* C. Estimation Financière, Rentabilité Client & Marge Installateur */}
          <div className="rounded-xl border border-border bg-secondary/50 p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Dimensionnement &amp; Rentabilité Estimée</span>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground">Marché Wallonie 2026</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-border text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Devis HT estimé</span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {formatRoundedCurrency(financials.estimatedContractValueRange.min).replace("~", "")} à {formatRoundedCurrency(financials.estimatedContractValueRange.max).replace("~", "")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Marge brute installateur ({financials.installerMarginPercent} %)</span>
                <span className="font-mono font-bold text-accent tabular-nums">
                  {formatRoundedCurrency(financials.estimatedInstallerMargin)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Production &amp; Autoconso.</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {financials.annualProductionKwh.toLocaleString("fr-BE")} kWh/an · {financials.autoconsumptionRate} %
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Économie &amp; ROI client</span>
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  ≈ {financials.revenueEstimatePerYear.toLocaleString("fr-BE")} €/an · {financials.estimatedRoiYears} ans
                </span>
              </div>
            </div>
          </div>

          {/* Attribution des places B2C */}
          {!isB2B && (
            <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground block">
                  Créneaux B2C Aegis Solaire
                </span>
                <span className="font-mono text-[10px] font-semibold text-primary">
                  {takenSlots} / {maxSlots} attribué{takenSlots > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 pt-1">
                {Array.from({ length: maxSlots }).map((_, idx) => {
                  const isTaken = idx < takenSlots
                  const buyer = lead.buyers?.[idx]
                  return (
                    <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {isTaken ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span>Place {idx + 1} :</span>
                        <strong className="font-sans font-medium">
                          {isTaken
                            ? buyer?.companyName
                              ? buyer.companyName
                              : "Réservée par un installateur certifié"
                            : "Disponible"}
                        </strong>
                      </span>
                      {isTaken && buyer?.purchasedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          le {new Date(buyer.purchasedAt).toLocaleDateString("fr-BE")}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* D. Fiche Technique Déduite & Spécifications Structurées (Zéro Redondance) */}
          <div className="rounded-xl border border-border bg-secondary/20 p-4 flex flex-col gap-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 font-mono">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                Spécifications du Dossier
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Audit Technique Vérifié
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* Type de bien */}
              <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                  <Home className="h-3 w-3 text-primary shrink-0" />
                  Type de bien
                </span>
                <span className="font-semibold text-foreground text-xs mt-1 leading-snug">
                  {propertyTypeDisplay}
                </span>
              </div>

              {/* Toiture & Couverture */}
              <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                  <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                  Toiture &amp; Couverture
                </span>
                <span className="font-semibold text-foreground text-xs mt-1 leading-snug">
                  {roofMaterialDisplay}
                </span>
              </div>

              {/* Surface toiture */}
              <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                  <Ruler className="h-3 w-3 text-muted-foreground shrink-0" />
                  Surface toiture
                </span>
                <span className="font-mono font-semibold text-foreground text-xs mt-1 tabular-nums leading-snug">
                  {roofSurfaceDisplay}
                </span>
              </div>

              {/* Décisionnaire */}
              <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                  <UserCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                  Décisionnaire
                </span>
                <span className="font-semibold text-foreground text-xs mt-1 leading-snug">
                  {ownershipDisplay}
                </span>
              </div>

              {/* Consommation annuelle si disponible */}
              {consumptionDisplay && (
                <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                    <Zap className="h-3 w-3 text-accent-solar shrink-0" />
                    Consommation annuelle
                  </span>
                  <span className="font-mono font-semibold text-foreground text-xs mt-1 tabular-nums leading-snug">
                    {consumptionDisplay}
                  </span>
                </div>
              )}

              {/* Échéance */}
              <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                  <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                  Échéance du projet
                </span>
                <span className="font-semibold text-foreground text-xs mt-1 flex items-center gap-1.5 leading-snug">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  {timeframeDisplay}
                </span>
              </div>

              {/* Préférence de contact */}
              {contactPreferenceDisplay && (
                <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                    <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                    Préférence de contact
                  </span>
                  <span className="font-semibold text-foreground text-xs mt-1 leading-snug">
                    {contactPreferenceDisplay}
                  </span>
                </div>
              )}

              {/* Réseau & GRD */}
              <div className="flex flex-col p-2.5 rounded-lg bg-card border border-border/60">
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="h-3 w-3 text-muted-foreground shrink-0" />
                  Réseau &amp; GRD
                </span>
                <span className="font-mono font-semibold text-foreground text-xs mt-1 leading-snug">
                  {grdDisplay}
                </span>
              </div>
            </div>

            {/* Options additionnelles détectées (Batterie / IRVE) */}
            {(hasBattery || hasIrve) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
                {hasBattery && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-solar/10 text-accent-solar border border-accent-solar/20 px-2.5 py-1 text-xs font-semibold">
                    <Zap className="h-3 w-3" />
                    Intérêt stockage batterie
                  </span>
                )}
                {hasIrve && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-semibold">
                    <Zap className="h-3 w-3" />
                    Borne de recharge véhicule (IRVE)
                  </span>
                )}
              </div>
            )}

            {/* Remarque manuscrite libre saisie par le prospect */}
            {sanitized.cleanRemarks && (
              <div className="rounded-lg bg-card border border-border p-3 text-xs text-foreground/90 flex flex-col gap-1.5 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-primary" />
                  Précisions formulées par le demandeur
                </span>
                <p className="italic leading-relaxed text-foreground">
                  « {sanitized.cleanRemarks} »
                </p>
              </div>
            )}
          </div>

          {/* E. Checklist de ce qui est débloqué après achat */}
          <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-primary" />
                <span>Ce qui est débloqué après paiement :</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Garantie Aegis</span>
            </div>

            <ul className="flex flex-col gap-1.5 text-xs">
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Nom complet du décideur {isB2B ? "et raison sociale entreprise" : ""}</span>
              </li>
              {isB2B && (
                <li className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Numéro BCE / TVA vérifié</span>
                </li>
              )}
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Numéro de téléphone direct (contrôlé par SMS/appel)</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Adresse email directe du prospect</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Adresse exacte du chantier (numéro et rue)</span>
              </li>
              <li className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Export vCard en 1 clic + intégration directe dans votre CRM</span>
              </li>
            </ul>
          </div>

          {/* F. Section Débloquée si déjà acheté */}
          {isPurchased && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Dossier Débloqué — Coordonnées Directes</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadLeadVCard(lead)}
                  className="h-7 px-2 text-[11px] font-mono cursor-pointer"
                >
                  <Download className="h-3 w-3 mr-1" />
                  vCard
                </Button>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-16">Contact :</span>
                  <strong className="text-foreground">
                    {lead.first_name} {lead.last_name} {lead.company ? `(${lead.company})` : ""}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <a href={`tel:${lead.phone}`} className="font-mono font-bold text-accent hover:underline">
                    {lead.phone}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                  <a href={`mailto:${lead.email}`} className="font-mono text-accent hover:underline truncate">
                    {lead.email}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-foreground truncate">{lead.site_address || `${location.city} (${location.postalCode})`}</span>
                </div>
              </div>
            </div>
          )}

          {/* G. Accompagnement Cellule Technique & Étude Expert */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-accent" />
                <span>Besoin d&apos;une étude expert ou dimensionnement ?</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-wider bg-accent/15 px-1.5 py-0.5 rounded">
                % Projet · À négocier
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Notre Cellule Technique vous accompagne sur ce dossier (étude de marché locale, dimensionnement onduleurs/batteries, contraintes GRD Wallonie et rentabilité B2B) en échange d&apos;un pourcentage d&apos;honoraires sur le projet, à convenir et négocier selon son envergure.
            </p>
            {onRequestExpert && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onRequestExpert(lead)}
                className="w-full h-8 text-xs font-bold border-accent/40 bg-card hover:bg-accent/10 text-foreground cursor-pointer gap-1.5 shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>Solliciter un expert pour ce dossier (% projet à négocier)</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── 3. Pied Fixe avec CTA Unique et Tarif Transparent (Sticky Bottom Bar Adaptatif) ── */}
        <div className="shrink-0 border-t border-border bg-card p-3.5 sm:p-5 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
            {!isPurchased ? (
              <div className="flex sm:flex-col items-baseline sm:items-start justify-between w-full sm:w-auto gap-2">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-mono text-2xl font-black text-foreground tabular-nums">{cost}</span>
                    <span className="text-xs font-bold text-muted-foreground">crédits</span>
                    <span className="text-xs text-muted-foreground font-medium">ou</span>
                    <span className="font-mono text-base sm:text-lg font-black text-foreground tabular-nums">
                      {directFinancials.priceHtva.toFixed(2)} € <span className="text-xs font-normal text-muted-foreground">HT</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                    ({directFinancials.priceTtc.toFixed(2)} € TTC · TVA 21% comprise)
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground text-right sm:text-left">
                  {isDemo ? (
                    <span className="font-semibold text-accent flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Réservé aux partenaires RESCERT
                    </span>
                  ) : (
                    <>
                      Solde : <strong className="font-mono text-foreground tabular-nums">{partnerCredits} crédits</strong>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs font-semibold text-emerald-600">
                ✓ Dossier présent dans votre CRM
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {!isPurchased && (
              isDemo ? (
                <Button
                  variant="default"
                  onClick={() => onPurchase(lead)}
                  className="font-bold h-11 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm w-full sm:w-auto"
                >
                  <Unlock className="h-4 w-4 mr-1.5" />
                  <span>Débloquer ce dossier ({cost} crédits)</span>
                </Button>
              ) : hasEnoughCredits ? (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      recordUnlockIntent("direct_pay")
                      setIsDirectPayOpen(true)
                    }}
                    className="font-bold h-11 px-3.5 text-xs border-border hover:bg-secondary cursor-pointer w-full sm:w-auto shadow-2xs"
                    title="Payer directement en euros par Bancontact/Carte sans débiter vos crédits"
                  >
                    <CreditCard className="h-4 w-4 mr-1.5 text-accent" />
                    <span>Payer {directFinancials.priceHtva.toFixed(2)} € HT</span>
                  </Button>
                  <Button
                    variant="default"
                    disabled={isBuying}
                    onClick={() => {
                      recordUnlockIntent("credits")
                      onPurchase(lead)
                    }}
                    className="font-bold h-11 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm w-full sm:w-auto"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Déblocage...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-1.5" />
                        <span>Débloquer ({cost} crédits)</span>
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      recordUnlockIntent("insufficient_credits")
                      onRequestTopUp()
                    }}
                    className="font-bold h-11 px-3.5 text-xs border-border hover:bg-secondary cursor-pointer w-full sm:w-auto"
                  >
                    <Coins className="h-4 w-4 mr-1.5 text-accent" />
                    Recharger des crédits
                  </Button>
                  <Button
                    variant="default"
                    type="button"
                    onClick={() => {
                      recordUnlockIntent("direct_pay")
                      setIsDirectPayOpen(true)
                    }}
                    className="font-bold h-11 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm w-full sm:w-auto gap-1.5"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Payer {directFinancials.priceHtva.toFixed(2)} € HT en direct</span>
                  </Button>
                </>
              )
            )}
          </div>
        </div>

        {/* Modal de confirmation de paiement direct en € */}
        <DirectLeadPaymentModal
          lead={lead}
          isOpen={isDirectPayOpen}
          onClose={() => setIsDirectPayOpen(false)}
          onSwitchToCredits={() => {
            setIsDirectPayOpen(false)
            if (hasEnoughCredits) {
              onPurchase(lead)
            } else {
              onRequestTopUp()
            }
          }}
          partnerCredits={partnerCredits}
        />
      </div>
    </div>
  )
}
