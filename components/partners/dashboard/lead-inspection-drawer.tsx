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
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatEurWithDecimals,
  calculateLeadComplementFinancials,
  calculateLeadDirectFinancials,
  calculateOrderFinancials,
  getExclusiveCreditCost,
} from "@/lib/credit-pricing"
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
  getPropertyTypeLabel,
  getRoofSurfaceLabel,
  getConsumptionLabel,
} from "@/lib/lead-display-helpers"
import { getLeadVerificationSummary } from "@/lib/lead-verification-display"
import { LeadGeoRadarMap } from "./lead-geo-radar-map"
import { downloadLeadVCard } from "./lib/vcard-export"
import { DirectLeadPaymentModal } from "./modals/direct-lead-payment-modal"
import { useLeadInspectionTimer } from "@/lib/client/partner-tracker"
import {
  AI_PROJECTION_BADGE_SHORT,
  AI_PROJECTION_EXPLANATION_BODY,
  AI_PROJECTION_EXPLANATION_TITLE,
  getLeadImageItems,
} from "@/lib/lead-images"

interface LeadInspectionDrawerProps {
  lead: any
  partnerCredits: number
  hasValidMandate?: boolean
  isBuying: boolean
  onClose: () => void
  onPurchase: (lead: any, opts?: { exclusive?: boolean; paymentMode?: "credits" | "direct" | "exclusive" }) => void
  onOneClickSuccess?: (lead: any, purchaseData: any) => void
  onRequestTopUp: () => void
  onRequestExpert?: (lead: any) => void
}

export function LeadInspectionDrawer({
  lead,
  partnerCredits,
  hasValidMandate = false,
  isBuying,
  onClose,
  onPurchase,
  onOneClickSuccess,
  onRequestTopUp,
  onRequestExpert,
}: LeadInspectionDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)
  const [isDirectPayOpen, setIsDirectPayOpen] = React.useState(false)
  const [directPayExclusive, setDirectPayExclusive] = React.useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false)
  const [activeImageIndex, setActiveImageIndex] = React.useState(0)
  const [showAiDisclaimer, setShowAiDisclaimer] = React.useState(false)
  const [showMicroFeedback, setShowMicroFeedback] = React.useState(false)
  const [microFeedbackSent, setMicroFeedbackSent] = React.useState(false)

  const roofImageItems = getLeadImageItems(lead)
  const safeImageIndexHook =
    roofImageItems.length > 0 ? Math.min(activeImageIndex, roofImageItems.length - 1) : 0

  useEffect(() => {
    setActiveImageIndex(0)
    setIsImageModalOpen(false)
    setShowAiDisclaimer(false)
    setShowMicroFeedback(false)
    setMicroFeedbackSent(false)
  }, [lead?.id])

  useEffect(() => {
    if (!lead?.id || lead?.is_demo_preview) return
    const alreadyBought = Boolean(
      lead?.already_purchased ||
        lead?.purchase_id ||
        (lead?.email && !lead.email.includes("***") && !lead.email.includes("—"))
    )
    if (alreadyBought) return

    try {
      const lastTs = Number(localStorage.getItem("aegis_micro_feedback_ts") || "0")
      if (Number.isFinite(lastTs) && lastTs > 0 && Date.now() - lastTs < 14 * 24 * 60 * 60 * 1000) {
        return
      }
    } catch {
      // localStorage indisponible
    }

    const timer = window.setTimeout(() => {
      setShowMicroFeedback(true)
    }, 20000)
    return () => window.clearTimeout(timer)
  }, [lead?.id, lead?.is_demo_preview, lead?.already_purchased, lead?.purchase_id, lead?.email])

  const submitMicroFeedback = async (
    reason: "out_of_zone" | "too_small" | "competition" | "price"
  ) => {
    setMicroFeedbackSent(true)
    try {
      localStorage.setItem("aegis_micro_feedback_ts", String(Date.now()))
    } catch {
      // non-blocking
    }
    try {
      await fetch("/api/partners/feedback-1click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead?.id || null,
          reason,
          source: "drawer_in_app",
        }),
      })
    } catch {
      // non-blocking
    }
  }

  const dismissMicroFeedback = () => {
    setShowMicroFeedback(false)
    try {
      localStorage.setItem("aegis_micro_feedback_ts", String(Date.now()))
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    setShowAiDisclaimer(false)
  }, [lead?.id, safeImageIndexHook])

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

  // Fermeture clavier (Escape : ferme d'abord la lightbox si ouverte, sinon le drawer) & navigation photo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isImageModalOpen) {
          setIsImageModalOpen(false)
        } else {
          onClose()
        }
      } else if (isImageModalOpen && roofImageItems.length > 1) {
        if (e.key === "ArrowLeft") {
          e.preventDefault()
          setActiveImageIndex(
            (prev) => (prev - 1 + roofImageItems.length) % roofImageItems.length
          )
        } else if (e.key === "ArrowRight") {
          e.preventDefault()
          setActiveImageIndex((prev) => (prev + 1) % roofImageItems.length)
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
  }, [onClose, isImageModalOpen, roofImageItems.length])

  if (!lead) return null

  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 2 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const takenSlots = lead.taken_slots ?? Math.max(0, maxSlots - remainingSlots)
  const cost = lead.credit_cost ?? (isB2B ? 13 : 3)
  const exclusiveCredits = getExclusiveCreditCost({ segment: lead.segment, credit_cost: cost })
  const exclusivePriceHtva = calculateOrderFinancials(exclusiveCredits).priceHtva
  const isQuoteAudit =
    lead.allocation_mode === "quote_audit_2" ||
    lead.qualification_metadata?.lead_intent_type === "quote_audit_ready"
  const hasEnoughCredits = partnerCredits >= cost

  const directFinancials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: cost,
  })
  const complementFinancials = calculateLeadComplementFinancials({
    segment: lead.segment,
    credit_cost: cost,
    availableCredits: partnerCredits,
  })
  const exclusiveComplementFinancials = calculateLeadComplementFinancials({
    segment: lead.segment,
    credit_cost: cost,
    exclusive: true,
    availableCredits: partnerCredits,
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
  const freshness = getLeadFreshness(
    lead.created_at,
    (lead as { freshness_label?: string }).freshness_label,
    lead.reconfirmed_at || lead.qualification_metadata?.reconfirmed_at
  )
  const canTakeExclusiveB2C = takenSlots === 0 && maxSlots > 1 && !isPurchased
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
  const safeImageIndex = safeImageIndexHook
  const activePhoto = roofImageItems[safeImageIndex] ?? null
  const activeRoofImageUrl = activePhoto?.url ?? null
  const firstRealPhotoIndex = roofImageItems.findIndex((i) => !i.isAiProjection)

  const verificationSummary = getLeadVerificationSummary({
    segment: lead.segment,
    phone: lead.phone,
    email: lead.email,
    postal_code: lead.postal_code,
    company_vat: lead.company_vat,
    phone_verified: lead.phone_verified,
    phone_verification_method: lead.phone_verification_method,
    phone_carrier: lead.phone_carrier,
    phone_line_type: lead.phone_line_type,
    email_verified: lead.email_verified,
    email_delivery_status: lead.email_delivery_status,
    qualification_metadata: lead.qualification_metadata,
  })

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
        className="relative flex flex-col w-full sm:max-w-[540px] h-[100dvh] bg-card border-l border-border shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* ── 1. En-tête Fixe Compact ── */}
        <div className="shrink-0 flex items-start justify-between gap-2.5 px-4 py-3 sm:p-5 border-b border-border bg-card">
          <div className="flex flex-col gap-0.5 pr-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                  isQuoteAudit
                    ? "bg-emerald-600 text-white"
                    : isB2B
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground border border-border"
                }`}
              >
                {isQuoteAudit
                  ? `Contre-Offre • ${remainingSlots}/${maxSlots} places`
                  : isB2B && maxSlots <= 1
                    ? "B2B • Exclusif 100%"
                    : isB2B
                      ? `B2B • ${remainingSlots}/${maxSlots} places`
                      : `B2C • ${remainingSlots}/${maxSlots} places`}
              </span>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotClass}`} />
                <span suppressHydrationWarning>{freshness.label}</span>
              </span>

              <span className="font-mono text-[10.5px] text-muted-foreground/80 tabular-nums whitespace-nowrap">
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
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label="Fermer le panneau"
            title="Fermer le panneau (Échap)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── 2. Corps Déroulant Mobile-First (Photos d'abord, puis Métriques, Rentabilité & Carte) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 flex flex-col gap-3.5 sm:gap-4 overscroll-contain">
          {/* A. Visuels Street View / Toiture du Bâtiment en priorité */}
          {activePhoto && activeRoofImageUrl && (
            <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-foreground uppercase tracking-wider min-w-0">
                  <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    <span className="sm:hidden">Photos du bâtiment</span>
                    <span className="hidden sm:inline">Visuel Façade &amp; Toiture</span>
                  </span>
                  {roofImageItems.length > 1 && (
                    <span className="font-mono tabular-nums text-[10.5px] px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border normal-case shrink-0">
                      {roofImageItems.length}
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span className="sm:hidden">Inspecté</span>
                  <span className="hidden sm:inline">Dossier inspecté</span>
                </span>
              </div>

              <div
                className="relative rounded-lg overflow-hidden border border-border bg-secondary/30 group cursor-pointer aspect-[3/2]"
                onClick={() => {
                  setIsImageModalOpen(true)
                  recordRoofZoom()
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeRoofImageUrl}
                  alt={`Aperçu ${safeImageIndex + 1} de la toiture et façade`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                {roofImageItems.length > 1 && (
                  <span className="absolute top-2 right-2 rounded-md bg-foreground/80 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-background backdrop-blur-xs">
                    {safeImageIndex + 1} / {roofImageItems.length}
                  </span>
                )}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between px-3 ${activePhoto.isAiProjection ? "pb-10" : "pb-3"
                    }`}
                >
                  <span className="text-xs font-semibold text-white drop-shadow-sm flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Cliquer pour agrandir
                  </span>
                  <span className="text-[10px] font-mono text-white/80">
                    Aperçu géolocalisé
                  </span>
                </div>
                {activePhoto.isAiProjection && (
                  <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-2 bg-foreground/85 text-background px-2.5 py-1.5 backdrop-blur-xs">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold min-w-0 truncate">
                      <span className="h-2 w-2 rounded-full bg-accent-solar shrink-0" />
                      <span className="truncate">{AI_PROJECTION_BADGE_SHORT}</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowAiDisclaimer((v) => !v)
                      }}
                      aria-expanded={showAiDisclaimer}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-background/15 hover:bg-background/25 text-background shrink-0 transition-colors cursor-pointer"
                    >
                      <Info className="h-3 w-3" />
                      <span>{showAiDisclaimer ? "Masquer" : "Infos"}</span>
                    </button>
                  </div>
                )}
              </div>

              {activePhoto.isAiProjection && showAiDisclaimer && (
                <div className="rounded-lg border border-border border-l-2 border-l-accent-solar bg-secondary/70 p-2.5 text-[11px] leading-relaxed text-foreground flex flex-col gap-1">
                  <strong className="font-bold text-foreground">
                    {AI_PROJECTION_EXPLANATION_TITLE}
                  </strong>
                  <p className="text-muted-foreground">
                    {AI_PROJECTION_EXPLANATION_BODY}
                  </p>
                  {firstRealPhotoIndex >= 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex(firstRealPhotoIndex)}
                      className="self-start font-mono tabular-nums font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Voir la photo réelle (n°{firstRealPhotoIndex + 1}) &rarr;
                    </button>
                  )}
                </div>
              )}

              {roofImageItems.length > 1 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {roofImageItems.map((item, idx) => {
                    const isSelected = idx === safeImageIndex
                    return (
                      <button
                        key={item.url}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        aria-label={`Afficher la photo ${idx + 1}`}
                        className={`relative rounded-md overflow-hidden border aspect-[3/2] cursor-pointer transition-opacity ${isSelected
                          ? "border-primary ring-1 ring-primary opacity-100"
                          : "border-border opacity-75 hover:opacity-100"
                          }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={`Miniature ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {item.isAiProjection && (
                          <span className="pointer-events-none absolute bottom-1 left-1 rounded px-1 py-0.5 bg-foreground/85 text-background font-mono text-[9px] font-bold">
                            3D
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground flex items-center justify-between gap-2">
                <span>Vérification technique préalable : pente, couverture &amp; orientation visibles.</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsImageModalOpen(true)
                    recordRoofZoom()
                  }}
                  className="text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                >
                  Voir en grand &rarr;
                </button>
              </p>
            </div>
          )}

          {/* Modal Lightbox Agrandie */}
          {isImageModalOpen && activePhoto && activeRoofImageUrl && (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
              onClick={() => setIsImageModalOpen(false)}
            >
              <div
                className="relative max-w-4xl w-full max-h-[90vh] bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-3.5 border-b border-border bg-secondary/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Camera className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-bold text-sm text-foreground truncate">
                      Visuel de la maison &amp; toiture — {location.city || "Chantier"}
                    </span>
                    {roofImageItems.length > 1 && (
                      <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                        {safeImageIndex + 1} / {roofImageItems.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsImageModalOpen(false)}
                    className="p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer shrink-0"
                    aria-label="Fermer l’aperçu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="relative p-2 overflow-auto flex items-center justify-center bg-black/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeRoofImageUrl}
                    alt={`Visuel agrandi ${safeImageIndex + 1}`}
                    className="max-h-[62vh] w-auto max-w-full object-contain rounded-lg"
                  />
                  {roofImageItems.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex(
                            (safeImageIndex - 1 + roofImageItems.length) % roofImageItems.length
                          )
                        }
                        aria-label="Photo précédente"
                        className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/90 border border-border text-foreground hover:bg-card shadow-sm cursor-pointer"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((safeImageIndex + 1) % roofImageItems.length)
                        }
                        aria-label="Photo suivante"
                        className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/90 border border-border text-foreground hover:bg-card shadow-sm cursor-pointer"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {activePhoto.isAiProjection && (
                  <div className="mx-3 mb-2 rounded-lg border border-border border-l-2 border-l-accent-solar bg-secondary/60 px-3 py-2 text-xs text-foreground flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-accent-solar shrink-0" />
                        <span>{AI_PROJECTION_BADGE_SHORT}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAiDisclaimer((v) => !v)}
                        aria-expanded={showAiDisclaimer}
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer shrink-0"
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span>{showAiDisclaimer ? "Masquer" : "En savoir plus"}</span>
                      </button>
                    </div>
                    {showAiDisclaimer && (
                      <div className="flex flex-col gap-1 pt-1 border-t border-border/70">
                        <strong className="font-semibold text-foreground">
                          {AI_PROJECTION_EXPLANATION_TITLE}
                        </strong>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {AI_PROJECTION_EXPLANATION_BODY}
                        </p>
                        {firstRealPhotoIndex >= 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex(firstRealPhotoIndex)}
                            className="self-start font-mono tabular-nums text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                          >
                            Voir la photo réelle (n°{firstRealPhotoIndex + 1}) &rarr;
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {roofImageItems.length > 1 && (
                  <div className="px-3 py-2 border-t border-border bg-secondary/30 flex items-center gap-2 overflow-x-auto">
                    {roofImageItems.map((item, idx) => {
                      const isSelected = idx === safeImageIndex
                      return (
                        <button
                          key={item.url}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          aria-label={`Afficher la photo ${idx + 1}`}
                          className={`relative shrink-0 w-16 aspect-[3/2] rounded-md overflow-hidden border cursor-pointer transition-opacity ${isSelected
                            ? "border-primary ring-1 ring-primary opacity-100"
                            : "border-border opacity-70 hover:opacity-100"
                            }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt={`Miniature ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {item.isAiProjection && (
                            <span className="pointer-events-none absolute bottom-0.5 left-0.5 rounded px-1 py-0.5 bg-foreground/85 text-background font-mono text-[9px] font-bold">
                              3D
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="p-3 border-t border-border bg-card flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">
                    Réf #{lead.id ? lead.id.slice(0, 8).toUpperCase() : ""} · Visuel chantier
                  </span>
                  <a
                    href={activeRoofImageUrl}
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
            <div className="rounded-xl border border-border bg-secondary/30 p-3 min-w-0">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide block font-semibold">
                Puissance estimée
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-xl sm:text-2xl font-black text-foreground tabular-nums whitespace-nowrap">
                  {powerKwc > 0 ? powerKwc : "—"}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground tracking-tight">
                  kWc
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums block leading-snug mt-0.5">
                {financials.estimatedPanelCount > 0 ? `${financials.estimatedPanelCount} panneaux · ` : ""}
                {displaySurfaceArea > 0 ? `~${financials.usableSurfaceM2} m² utiles (${displaySurfaceArea} m² bruts)` : "Surface à dimensionner"}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-secondary/30 p-3 min-w-0">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide block font-semibold">
                Facture / Conso
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-lg sm:text-xl font-bold text-foreground tabular-nums whitespace-nowrap">
                  {displayAnnualBill > 0 ? `${displayAnnualBill.toLocaleString("fr-BE")} €/an` : (isB2B ? "Facture pro" : "À préciser")}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono tabular-nums block leading-snug mt-0.5">
                ≈ {financials.estimatedAnnualConsumptionKwh.toLocaleString("fr-BE")} kWh/an ({isB2B ? "HT" : "TTC"})
              </span>
            </div>
          </div>

          {/* C. Estimation Financière, Rentabilité Client & Marge Installateur */}
          <div className="rounded-xl border border-border bg-secondary/50 p-3.5 flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
              <span className="text-xs font-bold text-foreground">Dimensionnement &amp; Rentabilité</span>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">Wallonie 2026</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1.5 border-t border-border text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Devis HT estimé</span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {formatRoundedCurrency(financials.estimatedContractValueRange.min).replace("~", "").replace(/\s*€\s*HT$/i, "").trim()} à {formatRoundedCurrency(financials.estimatedContractValueRange.max).replace("~", "")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Marge nette ({financials.installerMarginPercent} %)</span>
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

          {/* C2. Carte Tactique avec Cercle de Floutage 3 km */}
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

          {/* D2. Niveau factuel de vérification (Vérifié vs Plausible — transparence totale) */}
          {(() => {
            const rows = [
              { title: "Téléphone", badge: verificationSummary.phone },
              { title: "Adresse e-mail", badge: verificationSummary.email },
              { title: "Localisation / Toiture", badge: verificationSummary.address },
              ...(verificationSummary.company
                ? [{ title: "Entreprise B2B", badge: verificationSummary.company }]
                : []),
            ].filter((r) => r.badge.tier !== "none" && r.badge.shortLabel)

            if (rows.length === 0) return null

            return (
              <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Contrôle qualité &amp; vérifications</span>
                  </span>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                    {verificationSummary.verifiedCount > 0 && verificationSummary.plausibleCount > 0
                      ? `${verificationSummary.verifiedCount} vérifié(s) · ${verificationSummary.plausibleCount} à confirmer`
                      : verificationSummary.verifiedCount > 0
                        ? `${verificationSummary.verifiedCount} vérifié(s)`
                        : `${verificationSummary.plausibleCount} à confirmer`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rows.map((item) => (
                    <div
                      key={item.title}
                      className={`rounded-lg border px-2.5 py-2 flex flex-col gap-1 ${item.badge.tier === "verified"
                        ? "border-emerald-500/25 bg-emerald-500/5"
                        : "border-border bg-secondary/35"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {item.title}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${item.badge.tier === "verified"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-secondary text-muted-foreground border border-border"
                            }`}
                        >
                          {item.badge.tier === "verified" ? "Vérifié" : "À confirmer"}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-foreground leading-snug">
                        {item.badge.shortLabel}
                      </span>
                      {item.badge.detailLabel && (
                        <span className="text-[11px] text-muted-foreground leading-snug">
                          {item.badge.detailLabel}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}

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
                <span>
                  {verificationSummary.phone.tier === "verified"
                    ? verificationSummary.phone.compactLabel === "Tél. vérifié appel"
                      ? "Numéro de téléphone direct (vérifié par appel)"
                      : "Numéro de téléphone direct (vérifié par SMS)"
                    : verificationSummary.phone.shortLabel
                      ? `Numéro de téléphone direct (${verificationSummary.phone.shortLabel.toLowerCase()})`
                      : "Numéro de téléphone direct"}
                </span>
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

                <div className="flex flex-wrap items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                  <a href={`tel:${lead.phone}`} className="font-mono tabular-nums font-bold text-accent hover:underline">
                    {lead.phone}
                  </a>
                  {verificationSummary.phone.compactLabel && (
                    <span
                      title={verificationSummary.phone.detailLabel || undefined}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${verificationSummary.phone.tier === "verified"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-secondary text-muted-foreground border border-border"
                        }`}
                    >
                      {verificationSummary.phone.compactLabel}
                    </span>
                  )}
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
                className="w-full h-auto min-h-[40px] py-2 px-3 whitespace-normal text-center leading-snug text-xs font-bold border-accent/40 bg-card hover:bg-accent/10 text-foreground cursor-pointer gap-1.5 shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>Solliciter un expert (% projet à négocier)</span>
              </Button>
            )}

            {!isPurchased && !isDemo && showMicroFeedback && (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-foreground">
                    {microFeedbackSent
                      ? "Merci ! Vos préférences seront mieux calibrées."
                      : "Qu'est-ce qui vous retient sur ce dossier ? (1 clic)"}
                  </span>
                  <button
                    type="button"
                    onClick={dismissMicroFeedback}
                    className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                    aria-label="Fermer la question rapide"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {!microFeedbackSent && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "out_of_zone" as const, label: "Zone hors secteur" },
                      { id: "too_small" as const, label: "Projet trop petit" },
                      { id: "competition" as const, label: "Concurrence (3 devis)" },
                      { id: "price" as const, label: "Tarif du dossier" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => submitMicroFeedback(opt.id)}
                        className="rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors cursor-pointer"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 3. Pied Fixe Compact 2 Niveaux (Zone de lecture maximisée sur mobile) ── */}
        <div className="shrink-0 border-t border-border bg-card px-3.5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 flex flex-col gap-2 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          {/* Rangée 1 : Synthèse tarifaire nette sur 1 ligne */}
          {!isPurchased ? (
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1 min-w-0 font-mono tabular-nums">
                <span className="text-sm sm:text-lg font-black text-foreground whitespace-nowrap">
                  {cost} cr.
                </span>
                <span className="font-sans text-[11px] text-muted-foreground">·</span>
                <span className="text-sm sm:text-base font-extrabold text-foreground whitespace-nowrap">
                  {directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                </span>
                <span className="hidden min-[380px]:inline text-[11px] text-muted-foreground whitespace-nowrap">
                  ({directFinancials.priceTtc.toFixed(2).replace(".", ",")} € TTC)
                </span>
              </div>

              <div className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                {isDemo ? (
                  <span className="font-semibold text-accent inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Réservé RESCERT</span>
                  </span>
                ) : (
                  <>
                    Solde :{" "}
                    <strong className="font-mono text-foreground tabular-nums">
                      {partnerCredits} cr.
                    </strong>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-700">
                ✓ Dossier déjà présent dans votre CRM
              </span>
            </div>
          )}

          {/* Rangée 2 + 3 : CTA principal + actions secondaires côte à côte dès mobile */}
          {!isPurchased && (
            <div className="flex flex-col gap-1.5 sm:gap-2 w-full">
              {isDemo ? (
                <>
                  <Button
                    variant="default"
                    onClick={() => onPurchase(lead, { exclusive: false, paymentMode: "credits" })}
                    className="font-bold h-11 w-full px-4 text-xs sm:text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                  >
                    <Unlock className="h-4 w-4 mr-1.5 shrink-0" />
                    <span>
                      Débloquer ce dossier (
                      <span className="font-mono tabular-nums">{cost}</span> crédit
                      {cost > 1 ? "s" : ""})
                    </span>
                  </Button>

                  <div
                    className={`grid gap-2 ${canTakeExclusiveB2C ? "grid-cols-2" : "grid-cols-1"
                      }`}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => onPurchase(lead, { exclusive: false, paymentMode: "direct" })}
                      className="font-bold h-10 px-2.5 sm:px-3 text-xs border-border hover:bg-secondary cursor-pointer w-full shadow-2xs"
                      title="Payer directement en euros par Bancontact/Carte sans débiter vos crédits"
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1 text-accent shrink-0" />
                      <span className="truncate font-mono tabular-nums sm:hidden">
                        {directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                      </span>
                      <span className="hidden sm:inline truncate font-mono tabular-nums">
                        Payer {directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                      </span>
                    </Button>

                    {canTakeExclusiveB2C && (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => onPurchase(lead, { exclusive: true, paymentMode: "exclusive" })}
                        className="font-bold h-10 px-2.5 sm:px-3 text-xs border-[var(--aegis-availability-text)]/35 bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] hover:bg-[var(--aegis-availability-bg)]/80 cursor-pointer w-full shadow-2xs"
                        title="Réserver ce dossier B2C pour vous seul (0 concurrent + e-mail prioritaire au prospect)"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <span className="truncate sm:hidden font-mono tabular-nums">
                          Exclusif ({exclusiveCredits} cr.)
                        </span>
                        <span className="hidden sm:inline truncate">
                          Exclusivité 100 % (<span className="font-mono tabular-nums">{exclusiveCredits}</span> cr. ·{" "}
                          <span className="font-mono tabular-nums">{exclusivePriceHtva.toFixed(0)}</span> € HT)
                        </span>
                      </Button>
                    )}
                  </div>
                </>
              ) : hasEnoughCredits ? (
                <>
                  <Button
                    variant="default"
                    disabled={isBuying}
                    onClick={() => {
                      recordUnlockIntent("credits")
                      onPurchase(lead)
                    }}
                    className="font-bold h-11 w-full px-4 text-xs sm:text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                  >
                    {isBuying ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin shrink-0" />
                        <span>Déblocage en cours...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-1.5 shrink-0" />
                        <span>
                          Débloquer ce dossier (
                          <span className="font-mono tabular-nums">{cost}</span> crédits)
                        </span>
                      </>
                    )}
                  </Button>

                  <div
                    className={`grid gap-2 ${canTakeExclusiveB2C ? "grid-cols-2" : "grid-cols-1"}`}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        recordUnlockIntent("direct_pay")
                        setDirectPayExclusive(false)
                        setIsDirectPayOpen(true)
                      }}
                      className="font-bold h-10 gap-1 sm:gap-1.5 px-2 sm:px-3 text-[11.5px] sm:text-xs border-border hover:bg-secondary cursor-pointer w-full shadow-2xs"
                      title="Payer directement en euros par Bancontact/Carte sans débiter vos crédits"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="font-mono tabular-nums whitespace-nowrap sm:hidden">
                        {directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                      </span>
                      <span className="hidden sm:inline truncate font-mono tabular-nums">
                        Payer {directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                      </span>
                    </Button>

                    {canTakeExclusiveB2C && (
                      <Button
                        variant="outline"
                        type="button"
                        disabled={isBuying}
                        onClick={() => {
                          if (partnerCredits >= exclusiveCredits) {
                            recordUnlockIntent("credits")
                            onPurchase(lead, { exclusive: true })
                          } else {
                            recordUnlockIntent("direct_pay")
                            setDirectPayExclusive(true)
                            setIsDirectPayOpen(true)
                          }
                        }}
                        className="font-bold h-10 gap-1 sm:gap-1.5 px-2 sm:px-3 text-[11.5px] sm:text-xs border-[var(--aegis-availability-text)]/35 bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] hover:bg-[var(--aegis-availability-bg)]/80 cursor-pointer w-full shadow-2xs"
                        title="Réserver ce dossier pour vous seul (0 concurrent)"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="sm:hidden font-mono tabular-nums whitespace-nowrap">
                          Exclusif · {exclusiveCredits} cr.
                        </span>
                        <span className="hidden sm:inline truncate">
                          Exclusivité 100 % (<span className="font-mono tabular-nums">{exclusiveCredits}</span> cr. ·{" "}
                          <span className="font-mono tabular-nums">{exclusivePriceHtva.toFixed(0)}</span> € HT)
                        </span>
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Button
                    variant="default"
                    type="button"
                    onClick={() => {
                      recordUnlockIntent("direct_pay")
                      setDirectPayExclusive(false)
                      setIsDirectPayOpen(true)
                    }}
                    className="font-bold h-11 w-full px-4 text-xs sm:text-[13px] bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm gap-1.5"
                  >
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span>
                      {complementFinancials.isHybrid ? (
                        <>
                          Utiliser{" "}
                          <span className="font-mono tabular-nums">{complementFinancials.creditsToDebit}</span>{" "}
                          cr. + compléter (
                          <span className="font-mono tabular-nums">
                            {complementFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                          </span>
                          )
                        </>
                      ) : (
                        <>
                          Payer{" "}
                          <span className="font-mono tabular-nums">
                            {directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                          </span>{" "}
                          en direct
                        </>
                      )}
                    </span>
                  </Button>

                  <div
                    className={`grid gap-2 ${canTakeExclusiveB2C ? "grid-cols-2" : "grid-cols-1"}`}
                  >
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        recordUnlockIntent("insufficient_credits")
                        onRequestTopUp()
                      }}
                      className="font-bold h-10 gap-1 sm:gap-1.5 px-2 sm:px-3 text-[11.5px] sm:text-xs border-border hover:bg-secondary cursor-pointer w-full shadow-2xs"
                    >
                      <Coins className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="sm:hidden whitespace-nowrap">Recharger</span>
                      <span className="hidden sm:inline truncate">Recharger des crédits</span>
                    </Button>

                    {canTakeExclusiveB2C && (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          recordUnlockIntent("direct_pay")
                          setDirectPayExclusive(true)
                          setIsDirectPayOpen(true)
                        }}
                        className="font-bold h-10 gap-1 sm:gap-1.5 px-2 sm:px-3 text-[11.5px] sm:text-xs border-[var(--aegis-availability-text)]/35 bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] hover:bg-[var(--aegis-availability-bg)]/80 cursor-pointer w-full shadow-2xs"
                        title="Réserver ce dossier B2C pour vous seul (0 concurrent + e-mail prioritaire au prospect)"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        <span className="sm:hidden font-mono tabular-nums whitespace-nowrap">
                          Exclusif · {exclusivePriceHtva.toFixed(0)} €
                        </span>
                        <span className="hidden sm:inline truncate">
                          {exclusiveComplementFinancials.isHybrid ? (
                            <>
                              Exclusivité ({exclusiveComplementFinancials.creditsToDebit} cr. +{" "}
                              <span className="font-mono tabular-nums">
                                {exclusiveComplementFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                              </span>
                              )
                            </>
                          ) : (
                            <>
                              Exclusivité 100 % (<span className="font-mono tabular-nums">{exclusivePriceHtva.toFixed(0)}</span> € HT)
                            </>
                          )}
                        </span>
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal de confirmation de paiement direct en € */}
        <DirectLeadPaymentModal
          lead={lead}
          isOpen={isDirectPayOpen}
          initialExclusive={directPayExclusive}
          hasValidMandate={hasValidMandate}
          onClose={() => {
            setIsDirectPayOpen(false)
            setDirectPayExclusive(false)
          }}
          onSwitchToCredits={(exclusiveChoice) => {
            setIsDirectPayOpen(false)
            const needed = exclusiveChoice ? exclusiveCredits : cost
            if (partnerCredits >= needed) {
              onPurchase(lead, { exclusive: Boolean(exclusiveChoice) })
            } else {
              onRequestTopUp()
            }
          }}
          onOneClickSuccess={onOneClickSuccess}
          partnerCredits={partnerCredits}
        />
      </div>
    </div>
  )
}
