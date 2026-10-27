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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
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
  const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
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
    annualBill,
    creditCost: cost,
  })

  const location = getLeadLocationInfo(lead)
  const freshness = getLeadFreshness(lead.created_at, (lead as { freshness_label?: string }).freshness_label)
  const sanitized = sanitizeLeadNotes(lead.project_details, lead.message)
  const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc
  const roi = calculateLeadRoiRatio(financials.estimatedInstallerMargin, cost, financials.estimatedContractValue)

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
          <div className="space-y-1 pr-2 min-w-0">
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 overscroll-contain">
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

          {/* B. Métriques Clés en Chasse Fixe (Puissance, Facture, Marge, ROI) */}
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
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                {surfaceArea > 0 ? `~${surfaceArea} m² exploitables` : "Surface à dimensionner"}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide block font-semibold">
                Facture / Conso
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-lg font-bold text-foreground tabular-nums whitespace-nowrap">
                  {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} €/an` : (isB2B ? "Facture pro" : "Non communiquée")}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                {isB2B ? "Professionnel HT (Wallonie)" : "Résidentiel standard"}
              </span>
            </div>
          </div>

          {/* C. Estimation Financière & Marge Installateur */}
          <div className="rounded-xl border border-border bg-secondary/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Économie &amp; Marge Indicative</span>
              <span className="text-[11px] font-mono text-muted-foreground">Marché Wallonie 2026</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Montant du chantier</span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {formatRoundedCurrency(financials.estimatedContractValueRange.min).replace("~", "")} à {formatRoundedCurrency(financials.estimatedContractValueRange.max).replace("~", "")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Marge brute estimée</span>
                <span className="font-mono font-bold text-accent tabular-nums">
                  {formatRoundedCurrency(financials.estimatedInstallerMargin)}
                </span>
              </div>
            </div>
          </div>

          {/* Attribution des places B2C */}
          {!isB2B && (
            <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 space-y-2">
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
          <div className="rounded-xl border border-border bg-secondary/20 p-3.5 space-y-2.5">
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
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-primary" />
                <span>Ce qui est débloqué après paiement :</span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Garantie Aegis</span>
            </div>

            <ul className="space-y-1.5 text-xs">
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
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
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

              <div className="space-y-1.5 text-xs">
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
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3.5 space-y-2.5">
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
              Notre Cellule Technique &amp; Ingénierie vous accompagne sur ce dossier (étude de marché locale, dimensionnement onduleurs/batteries, contraintes GRD Wallonie et rentabilité B2B) en échange d&apos;un pourcentage d&apos;honoraires sur le projet, à convenir et négocier selon son envergure.
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

        {/* ── 3. Pied Fixe avec CTA Unique et Tarif Transparent ── */}
        <div className="shrink-0 border-t border-border bg-card p-4 sm:p-5 flex items-center justify-between gap-3 shadow-lg">
          <div>
            {!isPurchased ? (
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-black text-foreground tabular-nums">{cost}</span>
                  <span className="text-xs font-bold text-muted-foreground">crédits</span>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums ml-1">
                    (~{financials.leadCostEuros} € HT)
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {isDemo ? (
                    <span className="font-semibold text-accent flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Réservé aux partenaires RESCERT
                    </span>
                  ) : (
                    <>
                      Solde actuel : <strong className="font-mono text-foreground tabular-nums">{partnerCredits} crédits</strong>
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

          <div className="flex items-center gap-2">
            {!isPurchased && (
              isDemo ? (
                <Button
                  variant="default"
                  onClick={() => onPurchase(lead)}
                  className="font-bold h-11 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                >
                  <Unlock className="h-4 w-4 mr-1.5" />
                  <span>Débloquer ce dossier ({cost} crédits)</span>
                </Button>
              ) : !hasEnoughCredits ? (
                <Button
                  variant="default"
                  onClick={onRequestTopUp}
                  className="font-bold h-11 px-4 text-xs bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
                >
                  <Coins className="h-4 w-4 mr-1.5" />
                  Recharger mes crédits
                </Button>
              ) : (
                <Button
                  variant="default"
                  disabled={isBuying}
                  onClick={() => onPurchase(lead)}
                  className="font-bold h-11 px-5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
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
