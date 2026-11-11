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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { formatEurWithDecimals } from "@/lib/credit-pricing"
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
} from "@/lib/lead-display-helpers"
import { LeadGeoRadarMap } from "./lead-geo-radar-map"
import { downloadLeadVCard } from "./lib/vcard-export"

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
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false)

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
                className="relative rounded-lg overflow-hidden border border-border bg-secondary/30 group cursor-pointer"
                onClick={() => setIsImageModalOpen(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={roofImageUrl}
                  alt="Aperçu Street View de la toiture et façade"
                  className="w-full h-48 sm:h-56 object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
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
                  onClick={() => setIsImageModalOpen(true)}
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

          {/* D. Fiche Technique Déduite & Normalisée */}
          <div className="rounded-xl border border-border bg-secondary/20 p-3.5 flex flex-col gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Spécifications du Dossier
            </span>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Toiture &amp; Couverture</span>
                <span className="font-semibold text-foreground">
                  {getRoofMaterialLabel(lead.roof_material)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground text-[11px] block">Décisionnaire</span>
                <span className="font-semibold text-foreground">
                  {getOwnershipLabel(lead.ownership_status)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground text-[11px] block">Échéance</span>
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {getTimeframeLabel(lead.timeframe || lead.project_timeline)}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground text-[11px] block">Réseau &amp; GRD</span>
                <span className="font-mono font-semibold text-foreground">
                  {lead.grd ? `GRD ${lead.grd}` : "ORES / RESA"}
                </span>
              </div>
            </div>

            {/* Badges structurés supplémentaires issus de la sanitisation */}
            {sanitized.cleanBadges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                {sanitized.cleanBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px] text-foreground border border-border"
                  >
                    <span className="text-muted-foreground">{badge.label} :</span>
                    <strong className="font-medium">{badge.value}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Remarques prospect nettoyées de toute mention machine */}
            {sanitized.cleanRemarks && (
              <div className="mt-2 rounded-lg bg-card border border-border p-2.5 text-xs italic text-foreground/90">
                « {sanitized.cleanRemarks} »
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
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-black text-foreground tabular-nums">{cost}</span>
                  <span className="text-xs font-bold text-muted-foreground">crédits</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums ml-1">
                    ({formatEurWithDecimals(financials.leadCostEuros)})
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
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
              ) : !hasEnoughCredits ? (
                <Button
                  variant="default"
                  onClick={onRequestTopUp}
                  className="font-bold h-11 px-4 text-xs bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer w-full sm:w-auto"
                >
                  <Coins className="h-4 w-4 mr-1.5" />
                  Recharger mes crédits
                </Button>
              ) : (
                <Button
                  variant="default"
                  disabled={isBuying}
                  onClick={() => onPurchase(lead)}
                  className="font-bold h-11 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm w-full sm:w-auto"
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      Déblocage en cours...
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-1.5" />
                      <span>Débloquer ce dossier ({cost} crédits)</span>
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
