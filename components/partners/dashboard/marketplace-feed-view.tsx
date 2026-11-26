"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import {
  MapPin,
  Zap,
  Lock,
  Unlock,
  Coins,
  Wallet,
  ShieldCheck,
  LayoutGrid,
  List,
  Loader2,
  Calendar,
  Clock,
  Building2,
  Info,
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  Sparkles,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Compass,
  Eye,
  Camera,
  Home,
  FileText,
  User,
  Store,
  Phone,
  Mail,
  FileCheck,
  Download,
  CreditCard,
  Bell,
  Users2,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  calculateMarketplaceFinancials,
  getLeadPricingTierMeta,
} from "@/lib/marketplace-pricing"
import {
  formatEurWithDecimals,
  calculateLeadComplementFinancials,
  calculateLeadDirectFinancials,
  getExclusiveCreditCost,
} from "@/lib/credit-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"
import { getLeadImages } from "@/lib/lead-images"
import {
  getLeadLocationInfo,
  formatRoundedCurrency,
  getLeadFreshness,
  getRoofMaterialLabel,
  getSurfaceTypeLabel,
  getTimeframeLabel,
  getOwnershipLabel,
  getProjectDriverLabel,
  sanitizeLeadNotes,
  getB2CSlotIndicator,
} from "@/lib/lead-display-helpers"
import { getLeadVerificationSummary } from "@/lib/lead-verification-display"
import { LeadInspectionDrawer } from "./lead-inspection-drawer"
import { MarketplaceInteractiveTour } from "./marketplace-interactive-tour"
import { LeadGeoRadarMap } from "./lead-geo-radar-map"
import { DirectLeadPaymentModal } from "./modals/direct-lead-payment-modal"
import { PartnerFocusedLeadView } from "./partner-focused-lead-view"
import { trackPartnerActivity } from "@/lib/client/partner-tracker"

interface MarketplaceFeedViewProps {
  leads: any[]
  recentlyClosedLeads?: any[]
  partnerCredits: number
  hasValidMandate?: boolean
  targetLeadId?: string
  targetedClosedLead?: any
  targetedPurchasedLead?: any
  initialCheckoutDirect?: boolean
  partnerProvinces?: string[] | null
  partnerSegment?: string | null
  onClearTargetLead?: () => void
  onOpenCrm?: () => void
  onPurchaseSuccess: (lead: any, newCredits: number, purchaseRecord: any) => void
  onRequestTopUp: () => void
  onOpenAlertPreferences?: () => void
  onOpenExpertModal?: (lead?: any) => void
  onOpenReferral?: () => void
}

const STORAGE_KEY_TUTORIAL_DISMISSED = "aegis_marketplace_tour_dismissed_v1"

// Images solaires dédiées haute définition non-contractuelles (couleur froide/acier B2B, couleur chaude/terracotta B2C)
const B2B_SOLAR_IMAGE = "/solar/b2b-lead-preview.jpg"
const B2C_SOLAR_IMAGE = "/solar/b2c-lead-preview.jpg"

const PROVINCE_OPTIONS = [
  { value: "ALL", label: "Toute la Wallonie" },
  { value: "liege", label: "Liège" },
  { value: "namur", label: "Namur" },
  { value: "hainaut", label: "Hainaut" },
  { value: "brabant_wallon", label: "Brabant Wallon" },
  { value: "luxembourg", label: "Luxembourg" },
]

export type MarketplaceSortOption =
  | "recent"
  | "oldest"
  | "cost_asc"
  | "cost_desc"
  | "contract_desc"
  | "contract_asc"
  | "margin_desc"
  | "power_desc"
  | "power_asc"
  | "surface_desc"
  | "bill_desc"
  | "score_desc"

const SORT_OPTIONS: { value: MarketplaceSortOption; label: string; badge?: string }[] = [
  { value: "recent", label: "Plus récents (nouveautés)" },
  { value: "oldest", label: "Plus anciens (prioritaires)" },
  { value: "cost_asc", label: "Prix du lead : Moins cher (crédits ↗)", badge: "Éco" },
  { value: "cost_desc", label: "Prix du lead : Plus élevé (crédits ↘)", badge: "Premium" },
  { value: "contract_desc", label: "Valeur chantier : Maximale (€ HT)", badge: "Gros projet" },
  { value: "contract_asc", label: "Valeur chantier : Modérée (€ HT)" },
  { value: "margin_desc", label: "Marge brute estimée : Max (€)", badge: "Rentable" },
  { value: "power_desc", label: "Puissance estimée : Max (kWc)", badge: "Puissance" },
  { value: "power_asc", label: "Puissance estimée : Min (kWc)" },
  { value: "surface_desc", label: "Surface toiture : Plus grande (m²)" },
  { value: "bill_desc", label: "Facture annuelle : Plus élevée (€/an)" },
  { value: "score_desc", label: "Score de qualification IA : Top dossiers", badge: "Qualifié" },
]

const SORT_SHORT_LABELS: Record<MarketplaceSortOption, string> = {
  recent: "Récents",
  oldest: "Anciens",
  cost_asc: "Prix ↗",
  cost_desc: "Prix ↘",
  contract_desc: "Chantier ↘",
  contract_asc: "Chantier ↗",
  margin_desc: "Marge max",
  power_desc: "kWc max",
  power_asc: "kWc min",
  surface_desc: "Surface max",
  bill_desc: "Facture max",
  score_desc: "Score IA",
}

function getCompactFreshnessLabel(label: string): string {
  const trimmed = (label || "").trim()
  const lower = trimmed.toLowerCase()
  if (lower.includes("aujourd'hui")) return "Aujourd'hui"
  if (lower.includes("hier")) return "Hier"
  if (lower === "audit technique vérifié") return "Audit vérifié"
  return trimmed.replace(/^Vérifié\s+/i, "")
}

import { CustomSelect } from "@/components/ui/custom-select"

function buildPurchasedCrmRecord(
  sourceLead: any,
  data: any,
  creditsSpent: number,
  isExclusive: boolean
) {
  return {
    id: data.lead?.id || sourceLead.id,
    lead_id: data.lead?.id || sourceLead.id,
    purchase_id: data.purchaseId || data.purchase_id || data.purchase?.id || `purch_${Date.now()}`,
    purchased_at: new Date().toISOString(),
    credits_spent: creditsSpent,
    is_exclusive: isExclusive,
    pipeline_status: "to_contact",
    first_name: data.lead?.first_name || sourceLead.first_name || "Prospect",
    last_name: data.lead?.last_name || sourceLead.last_name || "",
    company: data.lead?.company || null,
    email: data.lead?.email || "—",
    phone: data.lead?.phone || "—",
    site_address: data.lead?.site_address || sourceLead.site_address,
    segment: sourceLead.segment,
    province: sourceLead.province,
    city: sourceLead.city,
    postal_code: sourceLead.postal_code || sourceLead.masked_postal_code,
    surface_area: sourceLead.surface_area,
    annual_electricity_bill: sourceLead.annual_electricity_bill,
    phone_verified: data.lead?.phone_verified ?? sourceLead.phone_verified ?? false,
    phone_verification_method:
      data.lead?.phone_verification_method ?? sourceLead.phone_verification_method ?? null,
    phone_carrier: data.lead?.phone_carrier ?? sourceLead.phone_carrier ?? null,
    phone_line_type: data.lead?.phone_line_type ?? sourceLead.phone_line_type ?? null,
    email_verified: data.lead?.email_verified ?? sourceLead.email_verified ?? false,
    email_delivery_status:
      data.lead?.email_delivery_status ?? sourceLead.email_delivery_status ?? null,
    qualification_metadata:
      data.lead?.qualification_metadata ?? sourceLead.qualification_metadata ?? null,
  }
}

export function MarketplaceFeedView({
  leads,
  recentlyClosedLeads = [],
  partnerCredits,
  hasValidMandate = false,
  targetLeadId,
  targetedClosedLead,
  targetedPurchasedLead,
  initialCheckoutDirect,
  partnerProvinces,
  partnerSegment,
  onClearTargetLead,
  onOpenCrm,
  onPurchaseSuccess,
  onRequestTopUp,
  onOpenAlertPreferences,
  onOpenExpertModal,
  onOpenReferral,
}: MarketplaceFeedViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">(() => {
    const seg = (partnerSegment || "").trim().toUpperCase()
    if (seg === "B2B") return "B2B"
    if (seg === "B2C") return "B2C"
    return "ALL"
  })
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>("recent")
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const [directPayLead, setDirectPayLead] = useState<any | null>(null)
  const [directPayExclusive, setDirectPayExclusive] = useState(false)

  useEffect(() => {
    if (!isMobileFilterOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileFilterOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isMobileFilterOpen])

  // État de focus exclusif sur un lead ciblé (Deep-linking direct depuis e-mail de relance)
  const [focusedLeadId, setFocusedLeadId] = useState<string | null>(targetLeadId || null)

  useEffect(() => {
    if (targetLeadId) {
      setFocusedLeadId(targetLeadId)
    }
  }, [targetLeadId])

  // Nettoyage propre du focus lead ciblé
  const handleClearFocus = () => {
    setFocusedLeadId(null)
    onClearTargetLead?.()
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete("lead")
      window.history.replaceState({}, "", url.toString())
    } catch {
      // fallback
    }
  }

  // Détection 1ère visite : affiche le tutoriel si non encore masqué ET pas en mode lead ciblé
  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY_TUTORIAL_DISMISSED)
      if (!isDismissed && !targetLeadId) {
        setShowTutorial(true)
      }
    } catch {
      // localStorage non disponible
    }
  }, [targetLeadId])

  const handleDismissTutorial = () => {
    setShowTutorial(false)
    try {
      localStorage.setItem(STORAGE_KEY_TUTORIAL_DISMISSED, "true")
    } catch {
      // ignore
    }
  }

  const targetedLead = useMemo(() => {
    if (!focusedLeadId) return null
    return leads.find((l) => l.id === focusedLeadId) || null
  }, [focusedLeadId, leads])

  const checkoutDirectHandledRef = React.useRef<string | null>(null)
  useEffect(() => {
    if (typeof window === "undefined" || !targetedLead) return
    if (checkoutDirectHandledRef.current === targetedLead.id) return
    const url = new URL(window.location.href)
    const wantsDirect = initialCheckoutDirect || url.searchParams.get("checkout") === "direct"
    if (wantsDirect) {
      checkoutDirectHandledRef.current = targetedLead.id
      setDirectPayLead(targetedLead)
      url.searchParams.delete("checkout")
      window.history.replaceState({}, "", url.toString())
    }
  }, [initialCheckoutDirect, targetedLead])

  const activeClosedShowcaseLead = useMemo(() => {
    if (!focusedLeadId || targetedLead || targetedPurchasedLead) return null
    if (targetedClosedLead && targetedClosedLead.id === focusedLeadId) {
      return targetedClosedLead
    }
    return null
  }, [focusedLeadId, targetedLead, targetedPurchasedLead, targetedClosedLead])

  // Comptages pour les filtres
  const counts = useMemo(() => {
    let b2b = 0
    let b2c = 0
    leads.forEach((l) => {
      if (l.segment === "B2B") b2b++
      else if (l.segment === "B2C") b2c++
    })
    return {
      all: leads.length,
      b2b,
      b2c,
    }
  }, [leads])

  // Filtrage et Tri des opportunités
  const filteredLeads = useMemo(() => {
    let result = leads.filter((lead) => {
      // Segment
      if (segmentFilter !== "ALL" && lead.segment !== segmentFilter) return false

      const location = getLeadLocationInfo(lead)

      // Province
      if (
        selectedProvince !== "ALL" &&
        location.provinceKey.toLowerCase() !== selectedProvince.toLowerCase()
      ) {
        return false
      }

      // Recherche textuelle
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const cityMatch = lead.city?.toLowerCase().includes(query) || location.city.toLowerCase().includes(query)
        const postalMatch = lead.postal_code?.includes(query) || lead.masked_postal_code?.toLowerCase().includes(query)
        const provinceMatch =
          location.provinceLabel.toLowerCase().includes(query) ||
          location.provinceKey.toLowerCase().includes(query)
        const companyMatch = lead.company?.toLowerCase().includes(query)
        const driverMatch = lead.project_driver?.toLowerCase().includes(query)
        const detailsMatch = lead.project_details?.toLowerCase().includes(query)
        if (!cityMatch && !postalMatch && !provinceMatch && !companyMatch && !driverMatch && !detailsMatch) {
          return false
        }
      }

      return true
    })

    // Tri enrichi multi-critères
    const enriched = result.map((lead) => {
      const surfaceArea = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
      const annualBill = Math.max(0, Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0)
      const isB2C = lead.segment === "B2C"
      const cost = Number(lead.credit_cost) || (isB2C ? 2 : 8)
      const score = Number(lead.lead_score) || 0
      const parsedTime = lead.created_at ? new Date(lead.created_at).getTime() : 0
      const createdAtTime = Number.isNaN(parsedTime) ? 0 : parsedTime

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

      const powerKwc = financials.estimatedPowerKwc
      const contractValue = financials.estimatedContractValue || 0
      const margin = financials.estimatedInstallerMargin || 0

      return {
        lead,
        surfaceArea: financials.normalizedSurfaceAreaM2,
        annualBill: financials.normalizedAnnualBill,
        cost,
        score,
        createdAtTime,
        powerKwc,
        contractValue,
        margin,
      }
    })

    enriched.sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return b.createdAtTime - a.createdAtTime
        case "oldest":
          return a.createdAtTime - b.createdAtTime
        case "cost_asc":
          return a.cost - b.cost || b.powerKwc - a.powerKwc
        case "cost_desc":
          return b.cost - a.cost || b.powerKwc - a.powerKwc
        case "contract_desc":
          return b.contractValue - a.contractValue || b.powerKwc - a.powerKwc
        case "contract_asc":
          return a.contractValue - b.contractValue || a.powerKwc - b.powerKwc
        case "margin_desc":
          return b.margin - a.margin || b.powerKwc - a.powerKwc
        case "power_desc":
          return b.powerKwc - a.powerKwc || b.createdAtTime - a.createdAtTime
        case "power_asc":
          return a.powerKwc - b.powerKwc || b.createdAtTime - a.createdAtTime
        case "surface_desc":
          return b.surfaceArea - a.surfaceArea || b.powerKwc - a.powerKwc
        case "bill_desc":
          return b.annualBill - a.annualBill || b.powerKwc - a.powerKwc
        case "score_desc":
          return b.score - a.score || b.createdAtTime - a.createdAtTime
        default:
          return b.createdAtTime - a.createdAtTime
      }
    })

    return enriched.map((item) => item.lead)
  }, [leads, segmentFilter, selectedProvince, searchQuery, sortBy])

  // KPIs discrets et utiles
  const kpis = useMemo(() => {
    let totalPower = 0

    filteredLeads.forEach((lead) => {
      const surfaceArea = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
      const annualBill = Math.max(0, Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0)
      const cost = lead.credit_cost ?? (lead.segment === "B2B" ? 8 : 2)

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

      totalPower += financials.estimatedPowerKwc
    })

    return {
      totalLeads: filteredLeads.length,
      totalPower: Math.round(totalPower * 10) / 10,
    }
  }, [filteredLeads])

  const resetFilters = () => {
    setSearchQuery("")
    setSegmentFilter("ALL")
    setSelectedProvince("ALL")
    setSortBy("recent")
  }

  const hasActiveFilters =
    searchQuery !== "" || segmentFilter !== "ALL" || selectedProvince !== "ALL" || sortBy !== "recent"

  const sheetActiveCount =
    (segmentFilter !== "ALL" ? 1 : 0) +
    (selectedProvince !== "ALL" ? 1 : 0) +
    (sortBy !== "recent" ? 1 : 0)

  const selectedProvinceLabel =
    PROVINCE_OPTIONS.find((p) => p.value === selectedProvince)?.label || "Wallonie"

  const handlePurchase = async (
    lead: any,
    opts?: { skipConfirm?: boolean; exclusive?: boolean }
  ) => {
    if (
      lead?.is_showcase_closed ||
      isShowcaseOnlyLeadId(lead?.id) ||
      (typeof lead?.remaining_slots === "number" && lead.remaining_slots <= 0)
    ) {
      toast.error("Ce dossier a déjà atteint son quota maximum d'installateurs et n'est plus disponible à l'achat.")
      return
    }
    const isB2B = lead.segment === "B2B"
    const isExclusiveBuyout = Boolean(opts?.exclusive)
    const cost = isExclusiveBuyout
      ? getExclusiveCreditCost({ segment: lead.segment, credit_cost: lead.credit_cost })
      : (lead.credit_cost ?? (isB2B ? 13 : 3))

    trackPartnerActivity({
      eventType: "unlock_intent",
      leadId: lead.id,
      leadRef: lead.id?.slice(0, 8) ?? null,
      source: selectedLeadForDrawer?.id === lead.id ? "marketplace_drawer" : "marketplace_card",
      metadata: {
        method: partnerCredits >= cost
          ? isExclusiveBuyout
            ? "credits_exclusive"
            : "credits"
          : "insufficient_credits",
        segment: lead.segment ?? null,
        province: lead.province ?? null,
        creditCost: cost,
        partnerCredits,
      },
    })
    if (partnerCredits < cost) {
      toast.info(`Solde insuffisant (${cost} crédits requis, ${partnerCredits} disponibles). Vous pouvez régler ce dossier directement par Bancontact / Carte.`)
      setDirectPayExclusive(isExclusiveBuyout)
      setDirectPayLead(lead)
      return
    }

    const purchaseVerif = getLeadVerificationSummary({
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
    const phoneConfirmText =
      purchaseVerif.phone.tier === "verified"
        ? "téléphone direct vérifié par SMS/appel"
        : "téléphone direct"

    const confirmMsg = isExclusiveBuyout
      ? `Réserver l'EXCLUSIVITÉ TOTALE de ce dossier B2C pour ${cost} crédits ?\nVous serez le seul installateur à recevoir ses coordonnées et Aegis Solaire enverra un e-mail de sélection prioritaire au prospect.`
      : `Débloquer ce dossier ${lead.segment} pour ${cost} crédits ?\nVous obtiendrez immédiatement le nom, ${phoneConfirmText}, email et adresse exacte du prospect.`

    if (!opts?.skipConfirm && !confirm(confirmMsg)) {
      return
    }

    setBuyingId(lead.id)
    try {
      const res = await fetch("/api/partners/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, exclusive: isExclusiveBuyout }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'achat")

      toast.success(
        isExclusiveBuyout
          ? "Exclusivité B2C réservée ! E-mail prioritaire envoyé au prospect."
          : "Dossier débloqué avec succès ! Coordonnées ajoutées à votre CRM."
      )
      const effectiveSpent = Number(data.creditsSpent ?? cost)
      const newCredits =
        typeof data.creditsRemaining === "number"
          ? data.creditsRemaining
          : partnerCredits - effectiveSpent
      const newRecord = buildPurchasedCrmRecord(
        lead,
        data,
        effectiveSpent,
        Boolean(data.exclusive || isExclusiveBuyout || isB2B)
      )

      if (selectedLeadForDrawer?.id === lead.id) {
        setSelectedLeadForDrawer(null)
      }

      onPurchaseSuccess(lead, newCredits, newRecord)
    } catch (err: any) {
      toast.error(err.message || "Impossible de finaliser l'achat.")
    } finally {
      setBuyingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── 0. Visite Guidée Interactive (Modal pas à pas) ── */}
      {!focusedLeadId && (
        <MarketplaceInteractiveTour
          isOpen={showTutorial}
          onClose={handleDismissTutorial}
          onInspectSample={
            filteredLeads.length > 0
              ? () => setSelectedLeadForDrawer(filteredLeads[0])
              : undefined
          }
          hasLeads={filteredLeads.length > 0}
        />
      )}

      {/* ── MODE FOCUS DOSSIER (clic depuis e-mail installateur) ── */}
      {focusedLeadId && (targetedPurchasedLead || targetedLead || activeClosedShowcaseLead) ? (
        <PartnerFocusedLeadView
          lead={targetedPurchasedLead || targetedLead || activeClosedShowcaseLead}
          partnerCredits={partnerCredits}
          isPurchased={Boolean(targetedPurchasedLead)}
          isClosedOrUnavailable={Boolean(!targetedPurchasedLead && !targetedLead && activeClosedShowcaseLead)}
          isBuying={buyingId === (targetedLead?.id || "")}
          availableLeadsCount={leads.length}
          onBackToMarketplace={handleClearFocus}
          onOpenCrm={onOpenCrm}
          onPurchaseWithCredits={(leadToBuy, exclusive) =>
            handlePurchase(leadToBuy, { skipConfirm: true, exclusive: Boolean(exclusive) })
          }
          onOpenDirectPay={(leadToPay, exclusive) => {
            setDirectPayExclusive(Boolean(exclusive))
            setDirectPayLead(leadToPay)
          }}
          onRequestTopUp={onRequestTopUp}
          onOpenAlertPreferences={onOpenAlertPreferences}
          onOpenExpert={onOpenExpertModal}
        />
      ) : (
        <>
          {focusedLeadId && !targetedLead && !activeClosedShowcaseLead && !targetedPurchasedLead && (
            <div className="rounded-[14px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-[16px] font-bold text-[var(--aegis-ink)]">
                    Ce dossier n&apos;est plus disponible sur la marketplace
                  </h2>
                  <p className="text-[13px] text-[var(--aegis-muted)] leading-relaxed">
                    Le chantier que vous cherchez à consulter a été retiré ou son attribution est terminée. Aucun crédit ne vous a été débité.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearFocus}
                  className="shrink-0 rounded-[6px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] hover:bg-[var(--aegis-surface-subtle)] px-3.5 py-2 text-[13px] font-semibold text-[var(--aegis-ink)] cursor-pointer"
                >
                  Afficher toute la marketplace
                </button>
              </div>
            </div>
          )}
          {/* ── 1a. Barre de Contrôle Mobile Native (< md) ── */}
          <div className="md:hidden flex flex-col gap-2">
            {/* Rangée 1 : Recherche + Filtres + Switcher Vue */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Commune, CP..."
                  className="w-full h-11 rounded-xl border border-border bg-card pl-9 pr-9 text-[15px] text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  aria-label="Rechercher un chantier sur mobile"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Effacer la recherche"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className={`inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  sheetActiveCount > 0
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
                aria-label="Ouvrir les filtres et le tri"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span>Filtres</span>
                {sheetActiveCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-primary-foreground tabular-nums">
                    {sheetActiveCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setViewMode((prev) => (prev === "grid" ? "table" : "grid"))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
                aria-label={viewMode === "grid" ? "Passer en vue liste dense" : "Passer en vue grille"}
                title={viewMode === "grid" ? "Vue liste dense" : "Vue grille"}
              >
                {viewMode === "grid" ? <List className="h-4.5 w-4.5" /> : <LayoutGrid className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Rangée 2 : Chips rapides horizontaux */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 py-0.5 overscroll-x-contain">
              <button
                type="button"
                onClick={() => setSegmentFilter("ALL")}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  segmentFilter === "ALL"
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <span>Tous</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    segmentFilter === "ALL" ? "text-primary-foreground/85" : "text-muted-foreground"
                  }`}
                >
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSegmentFilter("B2B")}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  segmentFilter === "B2B"
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <span>B2B</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    segmentFilter === "B2B" ? "text-primary-foreground/85" : "text-muted-foreground"
                  }`}
                >
                  {counts.b2b}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSegmentFilter("B2C")}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  segmentFilter === "B2C"
                    ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <span>B2C</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    segmentFilter === "B2C" ? "text-primary-foreground/85" : "text-muted-foreground"
                  }`}
                >
                  {counts.b2c}
                </span>
              </button>

              <span className="h-4 w-px bg-border shrink-0 mx-0.5" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  selectedProvince !== "ALL"
                    ? "border-accent bg-accent/10 text-accent font-bold"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{selectedProvince === "ALL" ? "Wallonie" : selectedProvinceLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  sortBy !== "recent"
                    ? "border-accent bg-accent/10 text-accent font-bold"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
                <span>{SORT_SHORT_LABELS[sortBy]}</span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 shrink-0" />
                  <span>Effacer</span>
                </button>
              )}
            </div>

            {/* Rangée 3 : Télémétrie 1 ligne nette (zéro puce orpheline) */}
            <div className="flex items-center justify-between gap-2 px-0.5 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold text-foreground whitespace-nowrap">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>
                  {kpis.totalLeads} chantier{kpis.totalLeads > 1 ? "s" : ""} ·{" "}
                  {Math.round(kpis.totalPower).toLocaleString("fr-BE")} kWc
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold whitespace-nowrap shrink-0">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Garantie 100 %</span>
              </span>
            </div>
          </div>

          {/* ── 1b. Barre de Contrôle Unifiée Desktop (md+) ── */}
          <div className="hidden md:flex rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs flex-col gap-3">
            {/* Rangée 1 : Segments, Province & Recherche Directe */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
              {/* Segments + Province */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                {/* Segment switch */}
                <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:inline-flex sm:items-center">
                  <button
                    type="button"
                    onClick={() => setSegmentFilter("ALL")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${segmentFilter === "ALL"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                      }`}
                  >
                    <span>Tous</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${segmentFilter === "ALL"
                          ? "bg-white/20 text-white"
                          : "bg-secondary text-muted-foreground"
                        }`}
                    >
                      {counts.all}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSegmentFilter("B2B")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${segmentFilter === "B2B"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                      }`}
                  >
                    <span className="sm:hidden">B2B</span>
                    <span className="hidden sm:inline">B2B Tertiaire</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${segmentFilter === "B2B"
                          ? "bg-white/20 text-white"
                          : "bg-secondary text-muted-foreground"
                        }`}
                    >
                      {counts.b2b}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSegmentFilter("B2C")}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${segmentFilter === "B2C"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                      }`}
                  >
                    <span className="sm:hidden">B2C</span>
                    <span className="hidden sm:inline">B2C Partagé</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${segmentFilter === "B2C"
                          ? "bg-white/20 text-white"
                          : "bg-secondary text-muted-foreground"
                        }`}
                    >
                      {counts.b2c}
                    </span>
                  </button>
                </div>

                {/* Province CustomSelect */}
                <div className="w-full sm:w-auto">
                  <CustomSelect
                    value={selectedProvince}
                    onChange={(val) => setSelectedProvince(val)}
                    options={PROVINCE_OPTIONS}
                    icon={MapPin}
                    ariaLabel="Filtrer par province"
                    className="w-full sm:w-auto"
                    triggerClassName="w-full sm:w-auto"
                  />
                </div>
              </div>

              {/* Recherche textuelle fluide */}
              <div className="relative w-full md:w-64 lg:w-80 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Commune, code postal..."
                  className="w-full rounded-xl border border-border bg-card pl-8.5 pr-8 py-2 sm:py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary h-10 sm:h-9 transition-all"
                  aria-label="Rechercher un chantier"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Effacer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Rangée 2 : Tri, Visite guidée, Aide Expert & Switcher Grille/Tableau */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2.5 border-t border-border/60">
              {/* Gauche : Tri des chantiers & Visite guidée */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none">
                  <CustomSelect
                    value={sortBy}
                    onChange={(val) => setSortBy(val as any)}
                    options={SORT_OPTIONS}
                    icon={ArrowUpDown}
                    ariaLabel="Trier les chantiers"
                    className="w-full sm:w-auto"
                    triggerClassName="w-full sm:w-auto justify-between"
                    contentClassName="min-w-[280px] sm:min-w-[300px]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowTutorial(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary h-9 px-2.5 sm:px-3 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs hover:border-accent/40 shrink-0"
                  title="Lancer la visite guidée interactive de la marketplace"
                  aria-label="Visite guidée"
                >
                  <Compass className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span className="hidden sm:inline">Visite guidée</span>
                </button>
              </div>

              {/* Droite : Aide Expert & Toggle Grille / Tableau */}
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onOpenExpertModal?.(null)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 px-3 h-9 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                  title="Demander l'aide d'un expert Aegis Solaire (% projet à négocier selon l'envergure)"
                >
                  <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Aide Expert &amp; Étude</span>
                </button>

                {/* Switcher Grille / Tableau */}
                <div className="inline-flex items-center rounded-xl border border-border bg-secondary p-0.5 h-9 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-lg p-1.5 transition-colors cursor-pointer ${viewMode === "grid"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                    title="Vue grille (Cartes)"
                    aria-label="Vue grille"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`rounded-lg p-1.5 transition-colors cursor-pointer ${viewMode === "table"
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                    title="Vue liste dense"
                    aria-label="Vue liste dense"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Rangée 3 : Statut opérationnel épuré (Indicateurs clés et Reset filtres) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/70 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5 text-foreground whitespace-nowrap">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <strong className="font-mono text-foreground font-bold tabular-nums">{kpis.totalLeads}</strong> chantiers
                  disponibles
                </span>

                <span className="text-border">•</span>

                <span className="flex items-center gap-1 font-mono text-foreground whitespace-nowrap">
                  <Zap className="h-3.5 w-3.5 text-foreground shrink-0" />
                  <strong className="text-foreground font-bold tabular-nums">
                    {Math.round(kpis.totalPower).toLocaleString("fr-BE")}
                  </strong>{" "}
                  kWc cumulés
                </span>

                <span className="text-border">•</span>

                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  Garantie anti-fake 100% remboursé
                </span>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-accent hover:underline cursor-pointer self-start sm:self-auto whitespace-nowrap"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>
          </div>

          {/* Bandeau incitatif contextuel si solde insuffisant pour un lead standard (< 3 cr.) */}
          {partnerCredits < 3 && filteredLeads.length > 0 && (
            <div className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-summary)] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Coins className="h-4 w-4 text-[var(--aegis-context)] shrink-0 mt-0.5" />
                <div className="text-xs text-[var(--aegis-ink)] leading-relaxed">
                  {partnerCredits > 0 ? (
                    <>
                      <strong className="font-bold">
                        Solde partiel : <span className="font-mono tabular-nums">{partnerCredits}</span> crédit
                        {partnerCredits > 1 ? "s" : ""} disponible{partnerCredits > 1 ? "s" : ""} (zéro crédit bloqué)
                      </strong>{" "}
                      — Vos crédits restants sont automatiquement déduits si vous le souhaitez : ne réglez que le complément en euros par Bancontact / Carte (dès{" "}
                      <span className="font-mono font-bold tabular-nums">9,83 € HT</span> sur un dossier B2C à <span className="font-mono tabular-nums">3</span> cr.), ou passez sur un Pack (<span className="font-mono font-bold tabular-nums">jusqu&apos;à -24 %</span>).
                    </>
                  ) : (
                    <>
                      <strong className="font-bold">Mode paiement à la carte actif</strong> — Débloquez chaque chantier par Bancontact / Carte dès{" "}
                      <span className="font-mono font-bold tabular-nums">19,50 € HT</span> (ou{" "}
                      <span className="font-mono font-bold tabular-nums">59 à 119 € HT</span> en Exclusivité Totale B2C) sans pack préalable, ou réduisez vos coûts avec un Pack Crédits (<span className="font-mono font-bold tabular-nums">-24 %</span>).
                    </>
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRequestTopUp}
                className="shrink-0 h-8 text-xs font-bold border-[var(--aegis-border)] bg-[var(--aegis-surface)] hover:bg-secondary text-[var(--aegis-ink)] cursor-pointer whitespace-nowrap"
              >
                Voir les packs (-24 %)
              </Button>
            </div>
          )}

          {/* ── 2. Rendu des Opportunités : Grille de Cartes Réalistes ou Tableau ── */}
          {filteredLeads.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
              <SlidersHorizontal className="mx-auto h-9 w-9 text-muted-foreground/60" />
              <h3 className="mt-3 text-base font-bold text-foreground">Aucun chantier avec ces critères</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                Élargissez votre sélection de provinces ou réinitialisez la recherche.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={resetFilters}
                className="mt-4 text-xs font-semibold cursor-pointer border-border"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Afficher tous les chantiers
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            /* ── Vue Grille : Cartes Photographiques en Lignes de 2 (2 Colonnes) ── */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {filteredLeads.map((lead, index) => (
                <MarketplaceLeadCard
                  key={lead.id}
                  lead={lead}
                  index={index}
                  partnerCredits={partnerCredits}
                  isBuying={buyingId === lead.id}
                  isTargeted={targetLeadId === lead.id}
                  onInspect={() => setSelectedLeadForDrawer(lead)}
                  onPurchase={() => handlePurchase(lead)}
                  onDirectPay={() => {
                    trackPartnerActivity({
                      eventType: "unlock_intent",
                      leadId: lead.id,
                      leadRef: lead.id?.slice(0, 8) ?? null,
                      source: "marketplace_card",
                      metadata: {
                        method: "direct_pay",
                        segment: lead.segment ?? null,
                        province: lead.province ?? null,
                        creditCost: lead.credit_cost ?? (lead.segment === "B2B" ? 13 : 3),
                        partnerCredits,
                      },
                    })
                    setDirectPayLead(lead)
                  }}
                />
              ))}
            </div>
          ) : (
            /* ── Vue Liste Dense Haute-Productivité (Mobile Card-List + Desktop 8-Col Table) ── */
            <div className="flex flex-col gap-3">
              {/* Version Mobile (< md) : Fiches denses ultra-lisibles */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredLeads.map((lead) => {
                  const isB2B = lead.segment === "B2B"
                  const maxSlots = lead.max_slots ?? (isB2B ? 2 : 3)
                  const remainingSlots = lead.remaining_slots ?? maxSlots
                  const cost = lead.credit_cost ?? (isB2B ? 13 : 3)
                  const hasEnoughCredits = partnerCredits >= cost
                  const directFinancials = calculateLeadDirectFinancials({ segment: lead.segment, credit_cost: cost })
                  const complementFinancials = calculateLeadComplementFinancials({
                    segment: lead.segment,
                    credit_cost: cost,
                    availableCredits: partnerCredits,
                  })
                  const isBuying = buyingId === lead.id
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
                    undefined,
                    lead.reconfirmed_at || lead.qualification_metadata?.reconfirmed_at
                  )
                  const powerKwc = financials.estimatedPowerKwc
                  const marginText = formatRoundedCurrency(financials.estimatedInstallerMargin || 0)
                  const mobileVerif = getLeadVerificationSummary({
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
                  const photoCount = getLeadImages(lead).length

                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLeadForDrawer(lead)}
                      className="rounded-2xl border border-border bg-card p-3.5 shadow-xs flex flex-col gap-2.5 cursor-pointer hover:border-accent/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${isB2B
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-foreground border border-border"
                                }`}
                            >
                              {isB2B ? (maxSlots <= 1 ? "B2B Exclusif" : `B2B (${remainingSlots}/${maxSlots})`) : `B2C (${remainingSlots}/${maxSlots})`}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                              <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotClass}`} />
                              {freshness.label}
                            </span>
                            {mobileVerif.phone.compactLabel && (
                              <span
                                title={mobileVerif.phone.detailLabel || undefined}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  mobileVerif.phone.tier === "verified"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-secondary text-muted-foreground border border-border"
                                }`}
                              >
                                {mobileVerif.phone.tier === "verified" ? (
                                  <ShieldCheck className="h-2.5 w-2.5 shrink-0" />
                                ) : (
                                  <Phone className="h-2.5 w-2.5 shrink-0" />
                                )}
                                <span>{mobileVerif.phone.compactLabel}</span>
                              </span>
                            )}
                            {photoCount > 0 && (
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[10px] text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-semibold">
                                <Camera className="h-2.5 w-2.5" />
                                {photoCount > 1 ? `${photoCount} photos` : "Photo"}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-foreground truncate mt-1">
                            {location.fullTitle}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">{location.provinceLabel}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xl font-extrabold font-mono text-foreground tabular-nums">
                            {powerKwc > 0 ? powerKwc : "—"}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground ml-1">kWc</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-border/60">
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-mono">TOITURE</span>
                          <span className="font-medium text-foreground truncate block">
                            {surfaceArea > 0 ? `${surfaceArea} m² · ` : ""}{getRoofMaterialLabel(lead.roof_material)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block font-mono">MARGE ESTIMÉE</span>
                          <span className="font-bold font-mono text-accent tabular-nums block">
                            {marginText}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2.5 pt-1">
                        <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
                          <span className="font-bold text-foreground whitespace-nowrap">
                            {cost} crédits · {directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT
                          </span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            ({directFinancials.priceTtc.toFixed(2).replace(".", ",")} € TTC)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedLeadForDrawer(lead)}
                            className="min-h-[42px] rounded-xl border border-border bg-secondary hover:bg-secondary/80 px-3 py-2 text-xs font-semibold text-foreground cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Eye className="h-4 w-4 text-accent shrink-0" />
                            <span>Voir</span>
                          </button>
                          {hasEnoughCredits ? (
                            <button
                              type="button"
                              disabled={isBuying}
                              onClick={() => handlePurchase(lead)}
                              className="min-h-[42px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                            >
                              {isBuying ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Lock className="h-4 w-4 shrink-0" />}
                              <span>Débloquer</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDirectPayLead(lead)}
                              className="min-h-[42px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                              title={
                                complementFinancials.isHybrid
                                  ? `Utiliser vos ${complementFinancials.creditsToDebit} crédit(s) et compléter en euros`
                                  : "Payer directement ce lead par Bancontact / Carte"
                              }
                            >
                              <CreditCard className="h-4 w-4 shrink-0" />
                              <span className="font-mono tabular-nums">
                                {complementFinancials.isHybrid
                                  ? `+${formatEurWithDecimals(complementFinancials.priceHtva)} € HT`
                                  : `${directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT`}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Version Desktop (md+) : Tableau 8 colonnes dense haute productivité */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-xs overscroll-x-contain">
                <table className="w-full min-w-[840px] text-left text-xs">
                  <thead className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Modèle</th>
                      <th className="px-4 py-3">Localisation</th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSortBy((prev) => (prev === "power_desc" ? "power_asc" : "power_desc"))}
                          className="inline-flex items-center gap-1 font-bold uppercase hover:text-foreground cursor-pointer transition-colors group select-none"
                          title="Trier par puissance estimée"
                        >
                          <span>Puissance</span>
                          <ArrowUpDown
                            className={`h-3 w-3 ${sortBy === "power_desc" || sortBy === "power_asc"
                                ? "text-accent font-bold"
                                : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              }`}
                          />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSortBy("surface_desc")}
                          className="inline-flex items-center gap-1 font-bold uppercase hover:text-foreground cursor-pointer transition-colors group select-none"
                          title="Trier par surface de toiture disponible"
                        >
                          <span>Toiture &amp; Surface</span>
                          <ArrowUpDown
                            className={`h-3 w-3 ${sortBy === "surface_desc"
                                ? "text-accent font-bold"
                                : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              }`}
                          />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() =>
                            setSortBy((prev) => (prev === "margin_desc" ? "contract_desc" : "margin_desc"))
                          }
                          className="inline-flex items-center gap-1 font-bold uppercase hover:text-foreground cursor-pointer transition-colors group select-none"
                          title="Trier par marge estimée ou valeur de chantier"
                        >
                          <span>Marge Estimée</span>
                          <ArrowUpDown
                            className={`h-3 w-3 ${sortBy === "margin_desc" || sortBy === "contract_desc"
                                ? "text-accent font-bold"
                                : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              }`}
                          />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSortBy((prev) => (prev === "recent" ? "oldest" : "recent"))}
                          className="inline-flex items-center gap-1 font-bold uppercase hover:text-foreground cursor-pointer transition-colors group select-none"
                          title="Trier par fraîcheur / date d'audit"
                        >
                          <span>Fraîcheur</span>
                          <ArrowUpDown
                            className={`h-3 w-3 ${sortBy === "recent" || sortBy === "oldest"
                                ? "text-accent font-bold"
                                : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              }`}
                          />
                        </button>
                      </th>
                      <th className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSortBy((prev) => (prev === "cost_asc" ? "cost_desc" : "cost_asc"))}
                          className="inline-flex items-center gap-1 font-bold uppercase hover:text-foreground cursor-pointer transition-colors group select-none"
                          title="Trier par prix du lead en crédits"
                        >
                          <span>Tarif</span>
                          <ArrowUpDown
                            className={`h-3 w-3 ${sortBy === "cost_asc" || sortBy === "cost_desc"
                                ? "text-accent font-bold"
                                : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              }`}
                          />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLeads.map((lead) => {
                      const isB2B = lead.segment === "B2B"
                      const maxSlots = lead.max_slots ?? (isB2B ? 2 : 3)
                      const remainingSlots = lead.remaining_slots ?? maxSlots
                      const cost = lead.credit_cost ?? (isB2B ? 13 : 3)
                      const tableComplement = calculateLeadComplementFinancials({
                        segment: lead.segment,
                        credit_cost: cost,
                        availableCredits: partnerCredits,
                      })
                      const isBuying = buyingId === lead.id
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
                    undefined,
                    lead.reconfirmed_at || lead.qualification_metadata?.reconfirmed_at
                  )
                      const powerKwc = financials.estimatedPowerKwc
                      const tableVerif = getLeadVerificationSummary({
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
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLeadForDrawer(lead)}
                          className="hover:bg-secondary/50 transition-colors cursor-pointer group"
                        >
                          {/* Modèle Commercial */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${isB2B
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-foreground border border-border"
                                }`}
                            >
                              {isB2B ? (maxSlots <= 1 ? "B2B Exclusif" : `B2B (${remainingSlots}/${maxSlots})`) : `B2C (${remainingSlots}/${maxSlots})`}
                            </span>
                          </td>

                          {/* Localisation */}
                          <td className="px-4 py-3 text-foreground font-medium">
                            <div className="font-bold group-hover:text-primary transition-colors">
                              {location.fullTitle}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground">{location.provinceLabel}</span>
                              {tableVerif.phone.compactLabel && (
                                <span
                                  title={tableVerif.phone.detailLabel || undefined}
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                    tableVerif.phone.tier === "verified"
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                      : "bg-secondary text-muted-foreground border border-border"
                                  }`}
                                >
                                  {tableVerif.phone.tier === "verified" ? (
                                    <ShieldCheck className="h-2.5 w-2.5 shrink-0" />
                                  ) : (
                                    <Phone className="h-2.5 w-2.5 shrink-0" />
                                  )}
                                  <span>{tableVerif.phone.compactLabel}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Puissance */}
                          <td className="px-4 py-3 text-foreground whitespace-nowrap">
                            <div className="flex items-baseline gap-1">
                              <span className="font-mono font-bold text-sm tabular-nums">
                                {powerKwc > 0 ? powerKwc : "—"}
                              </span>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase">kWc</span>
                            </div>
                          </td>

                          {/* Toiture & Surface */}
                          <td className="px-4 py-3 text-foreground">
                            <div className="font-mono tabular-nums font-semibold">
                              {surfaceArea > 0 ? `${surfaceArea} m²` : "À dimensionner"}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                              {getRoofMaterialLabel(lead.roof_material)}
                            </div>
                          </td>

                          {/* Marge Estimée */}
                          <td className="px-4 py-3 text-foreground whitespace-nowrap">
                            <div className="font-mono font-bold text-accent tabular-nums">
                              {formatRoundedCurrency(financials.estimatedInstallerMargin)}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                              {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} €/an` : (isB2B ? "Facture pro" : "Résidentiel")}
                            </div>
                          </td>

                          {/* Fraîcheur */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotClass}`} />
                              <span suppressHydrationWarning className="tabular-nums font-medium text-foreground/80">{freshness.label}</span>
                            </span>
                          </td>

                          {/* Tarif */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-foreground font-bold tabular-nums">
                            <div>{cost} crédits</div>
                            <div className="text-[10px] text-muted-foreground font-medium">
                              ou {formatEurWithDecimals(financials.leadCostEuros)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedLeadForDrawer(lead)}
                                className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer border-border hover:bg-secondary text-foreground"
                              >
                                Inspecter
                              </Button>
                              {partnerCredits >= cost ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDirectPayLead(lead)}
                                    className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer border-border hover:bg-secondary text-foreground"
                                    title="Payer directement ce lead par Bancontact / Carte sans débiter vos crédits"
                                  >
                                    <CreditCard className="h-3.5 w-3.5 text-accent mr-1" />
                                    <span>Payer en €</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    disabled={isBuying}
                                    onClick={() => handlePurchase(lead)}
                                    className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs active:scale-[0.99]"
                                  >
                                    {isBuying ? "..." : `Débloquer (${cost} cr)`}
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => setDirectPayLead(lead)}
                                  className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs active:scale-[0.99] gap-1"
                                  title={
                                    tableComplement.isHybrid
                                      ? `Utiliser ${tableComplement.creditsToDebit} crédit(s) et compléter par Bancontact / Carte`
                                      : "Payer directement ce lead par Bancontact / Carte"
                                  }
                                >
                                  <CreditCard className="h-3.5 w-3.5" />
                                  <span>
                                    {tableComplement.isHybrid
                                      ? `Compléter (${formatEurWithDecimals(tableComplement.priceHtva)} € HT)`
                                      : `Payer ${financials.leadCostEuros.toFixed(2).replace(".", ",")} € HT`}
                                  </span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* ── 2a. Carte Parrainage Mobile (< lg) placée après le flux de chantiers (zéro troncature) ── */}
          {onOpenReferral && (
            <button
              type="button"
              onClick={onOpenReferral}
              className="lg:hidden mt-1 rounded-2xl border border-border bg-card hover:border-accent/50 p-3.5 shadow-xs flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]">
                  <Users2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-sm font-bold text-foreground">
                      Parrainez un confrère RESCERT
                    </h3>
                    <span className="rounded bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5 whitespace-nowrap">
                      +3 cr. chacun
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Offert dès son 1er achat payant · Toute la Wallonie &amp; Bruxelles.
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-accent shrink-0" />
            </button>
          )}

          {/* ── 2b. Vitrine « Derniers chantiers récemment attribués » (Preuve sociale & anti-page vide) ── */}
          {recentlyClosedLeads.length > 0 && (
            <section
              aria-label="Derniers chantiers récemment attribués"
              className="mt-4 pt-6 border-t border-border flex flex-col gap-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--aegis-availability-text)] shrink-0" />
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      Derniers chantiers récemment attribués
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dossiers dont tous les créneaux ont été réservés ces derniers jours par le réseau Aegis Solaire.
                  </p>
                </div>

                {onOpenAlertPreferences && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenAlertPreferences}
                    className="shrink-0 h-8.5 text-xs font-bold border-border bg-card hover:bg-secondary text-foreground cursor-pointer whitespace-nowrap self-start sm:self-auto gap-1.5"
                  >
                    <Bell className="h-3.5 w-3.5 text-accent" />
                    <span>Activer Auto-Pilot / alertes</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentlyClosedLeads.map((closedLead) => {
                  const isClosedB2B = closedLead.segment === "B2B"
                  const loc = getLeadLocationInfo(closedLead)
                  const closedSurface = Math.max(0, Number(closedLead.surface_area || closedLead.surface_area_m2) || 0)
                  const closedBill = Math.max(0, Number(closedLead.annual_electricity_bill || closedLead.annual_bill_eur) || 0)
                  const closedFin = calculateMarketplaceFinancials({
                    segment: closedLead.segment,
                    surfaceArea: closedSurface,
                    surfaceType: closedLead.surface_type,
                    roofMaterial: closedLead.roof_material,
                    annualBill: closedBill,
                    creditCost: closedLead.credit_cost ?? (isClosedB2B ? 9 : 3),
                    estimatedPowerKwc: closedLead.estimated_power_kwc,
                    qualificationMetadata: closedLead.qualification_metadata,
                  })
                  const maxSlotsLabel =
                    isClosedB2B && (closedLead.max_slots ?? 2) <= 1
                      ? "1/1 exclusif"
                      : `${closedLead.max_slots || (isClosedB2B ? 2 : 3)}/${closedLead.max_slots || (isClosedB2B ? 2 : 3)} réservé`

                  return (
                    <div
                      key={closedLead.id}
                      className="rounded-xl border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1 rounded-[5px] bg-[var(--aegis-summary)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--aegis-context)] font-mono tabular-nums">
                            Clôturé · {maxSlotsLabel}
                          </span>
                          <h3 className="mt-1.5 text-xs sm:text-sm font-bold text-[var(--aegis-ink)] truncate">
                            {loc.fullTitle}
                          </h3>
                          <p className="text-[11px] text-[var(--aegis-muted)] truncate">
                            {loc.provinceLabel} · {isClosedB2B ? "Tertiaire / B2B" : "Résidentiel B2C"}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono text-base font-extrabold text-[var(--aegis-ink)] tabular-nums">
                            {closedFin.estimatedPowerKwc > 0 ? `${closedFin.estimatedPowerKwc.toString().replace(".", ",")}` : "—"}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--aegis-muted)] ml-1">kWc</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[var(--aegis-divider)] flex items-center justify-between gap-2 text-[11px] text-[var(--aegis-muted)] font-mono tabular-nums">
                        <span>
                          {closedSurface > 0 ? `${closedSurface} m²` : "Toiture"}{closedBill > 0 ? ` · ${closedBill.toLocaleString("fr-BE")} €/an` : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[var(--aegis-ink)] font-semibold">
                          <Lock className="h-3 w-3 shrink-0 opacity-70" />
                          <span>Attribué</span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── 3. Tiroir Latéral d'Inspection Rapide (Slide-over 540px) ── */}
      {selectedLeadForDrawer && (
        <LeadInspectionDrawer
          lead={selectedLeadForDrawer}
          partnerCredits={partnerCredits}
          hasValidMandate={hasValidMandate}
          isBuying={buyingId === selectedLeadForDrawer.id}
          onClose={() => setSelectedLeadForDrawer(null)}
          onPurchase={(lead, opts) => handlePurchase(lead, opts)}
          onOneClickSuccess={(purchasedLead, data) => {
            const newRecord = buildPurchasedCrmRecord(
              purchasedLead,
              data,
              data.exclusive
                ? getExclusiveCreditCost({ segment: purchasedLead.segment, credit_cost: purchasedLead.credit_cost })
                : (purchasedLead.credit_cost ?? (purchasedLead.segment === "B2B" ? 13 : 3)),
              Boolean(data.exclusive || (purchasedLead.max_slots ?? 2) === 1)
            )
            const nextCredits =
              typeof data.newCredits === "number" ? data.newCredits : partnerCredits
            setSelectedLeadForDrawer(null)
            onPurchaseSuccess(purchasedLead, nextCredits, newRecord)
          }}
          onRequestTopUp={onRequestTopUp}
          onRequestExpert={(lead) => onOpenExpertModal?.(lead)}
        />
      )}

      {/* ── 4. Modal de Paiement Direct par Dossier (€) ── */}
      <DirectLeadPaymentModal
        lead={directPayLead}
        isOpen={Boolean(directPayLead)}
        initialExclusive={directPayExclusive}
        hasValidMandate={hasValidMandate}
        onClose={() => {
          setDirectPayLead(null)
          setDirectPayExclusive(false)
        }}
        onSwitchToCredits={(exclusiveChoice) => {
          const target = directPayLead
          const wantsExcl = Boolean(exclusiveChoice)
          setDirectPayLead(null)
          setDirectPayExclusive(false)
          if (target) {
            const needed = wantsExcl
              ? getExclusiveCreditCost({ segment: target.segment, credit_cost: target.credit_cost })
              : (target.credit_cost ?? (target.segment === "B2B" ? 13 : 3))
            if (partnerCredits >= needed) {
              handlePurchase(target, { exclusive: wantsExcl })
              return
            }
          }
          onRequestTopUp()
        }}
        onOneClickSuccess={(purchasedLead, data) => {
          const newRecord = buildPurchasedCrmRecord(
            purchasedLead,
            data,
            data.exclusive
              ? getExclusiveCreditCost({ segment: purchasedLead.segment, credit_cost: purchasedLead.credit_cost })
              : (purchasedLead.credit_cost ?? (purchasedLead.segment === "B2B" ? 13 : 3)),
            Boolean(data.exclusive || (purchasedLead.max_slots ?? 2) === 1)
          )
          const nextCredits =
            typeof data.newCredits === "number" ? data.newCredits : partnerCredits
          setDirectPayLead(null)
          setDirectPayExclusive(false)
          onPurchaseSuccess(purchasedLead, nextCredits, newRecord)
        }}
        partnerCredits={partnerCredits}
      />
      {/* ── 5. Bottom Sheet Filtres & Tri Mobile (< md) ── */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex items-end bg-foreground/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMobileFilterOpen(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-filter-sheet-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[85dvh] flex flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          >
            <div className="shrink-0 px-4 pt-2 pb-3 border-b border-border bg-card">
              <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-border" aria-hidden="true" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="mobile-filter-sheet-title" className="text-base font-bold text-foreground">
                    Filtrer &amp; trier les chantiers
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono tabular-nums">
                    {filteredLeads.length} résultat{filteredLeads.length > 1 ? "s" : ""} disponible{filteredLeads.length > 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
                  aria-label="Fermer les filtres"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col gap-5">
              {/* Segment */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Segment de dossier
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "ALL" as const, label: "Tous", count: counts.all },
                    { id: "B2B" as const, label: "B2B Tertiaire", count: counts.b2b },
                    { id: "B2C" as const, label: "B2C Partagé", count: counts.b2c },
                  ].map((seg) => {
                    const isActive = segmentFilter === seg.id
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setSegmentFilter(seg.id)}
                        className={`min-h-[44px] rounded-xl border px-2 py-2 text-xs font-bold flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                            : "border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="leading-tight">{seg.label}</span>
                        <span
                          className={`font-mono text-[11px] tabular-nums ${
                            isActive ? "text-primary-foreground/85" : "text-muted-foreground"
                          }`}
                        >
                          {seg.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Province */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Province wallonne
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PROVINCE_OPTIONS.map((prov) => {
                    const isActive = selectedProvince === prov.value
                    return (
                      <button
                        key={prov.value}
                        type="button"
                        onClick={() => setSelectedProvince(prov.value)}
                        className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                          isActive
                            ? "border-primary bg-primary/5 text-primary font-bold ring-1 ring-primary/20"
                            : "border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="truncate">{prov.label}</span>
                        {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tri */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ordre d&apos;affichage
                </span>
                <div className="flex flex-col gap-1.5">
                  {SORT_OPTIONS.map((opt) => {
                    const isActive = sortBy === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSortBy(opt.value)}
                        className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-semibold flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                          isActive
                            ? "border-primary bg-primary/5 text-primary font-bold"
                            : "border-border bg-card text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="min-w-0">{opt.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badge && (
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                              {opt.badge}
                            </span>
                          )}
                          {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileFilterOpen(false)
                  setShowTutorial(true)
                }}
                className="min-h-[44px] rounded-xl border border-border bg-secondary/40 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground flex items-center justify-center gap-2 cursor-pointer"
              >
                <Compass className="h-4 w-4 text-accent shrink-0" />
                <span>Revoir la visite guidée de la marketplace</span>
              </button>
            </div>

            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] grid grid-cols-[auto_1fr] gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="min-h-[44px] px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Réinitialiser
              </Button>
              <Button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="min-h-[44px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold cursor-pointer"
              >
                Voir {filteredLeads.length} chantier{filteredLeads.length > 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Composant de Carte de Chantier (Exacte réplique de la maquette fournie par l'utilisateur)
 */
function MarketplaceLeadCard({
  lead,
  index,
  partnerCredits,
  isBuying,
  isTargeted,
  onInspect,
  onPurchase,
  onDirectPay,
}: {
  lead: any
  index: number
  partnerCredits: number
  isBuying: boolean
  isTargeted: boolean
  onInspect: () => void
  onPurchase: () => void
  onDirectPay: () => void
}) {
  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 2 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const cost = lead.credit_cost ?? (isB2B ? 13 : 3)
  const isQuoteAudit =
    lead.allocation_mode === "quote_audit_2" ||
    lead.qualification_metadata?.lead_intent_type === "quote_audit_ready"
  const hasEnoughCredits = partnerCredits >= cost
  const directFinancials = calculateLeadDirectFinancials({ segment: lead.segment, credit_cost: cost })
  const complementFinancials = calculateLeadComplementFinancials({
    segment: lead.segment,
    credit_cost: cost,
    availableCredits: partnerCredits,
  })
  const tierMeta = getLeadPricingTierMeta({
    segment: lead.segment,
    credit_cost: cost,
    pricing_tier: lead.pricing_tier,
  })
  const slotIndicator = getB2CSlotIndicator(remainingSlots)
  const canTakeExclusive = !isB2B && remainingSlots >= maxSlots && maxSlots > 1
  const exclusiveCredits = getExclusiveCreditCost({ segment: lead.segment, credit_cost: cost })

  const rawSurfaceArea = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
  const rawAnnualBill = Math.max(0, Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0)

  const financials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea: rawSurfaceArea,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: rawAnnualBill,
    creditCost: cost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details ?? lead.message,
    qualificationMetadata: lead.qualification_metadata,
  })

  const location = getLeadLocationInfo(lead)
  const freshness = getLeadFreshness(
    lead.created_at,
    undefined,
    lead.reconfirmed_at || lead.qualification_metadata?.reconfirmed_at
  )
  const powerKwc = financials.estimatedPowerKwc
  const surfaceArea = financials.normalizedSurfaceAreaM2
  const annualBill = financials.normalizedAnnualBill

  // 1 image dédiée non contractuelle : teinte froide/acier pour B2B, teinte chaude/terracotta pour B2C
  const leadImage = isB2B ? B2B_SOLAR_IMAGE : B2C_SOLAR_IMAGE

  // Formatage financier précis (sans répétition € HT sur les deux bornes)
  const minText = formatRoundedCurrency(financials.estimatedContractValueRange?.min || 0).replace("~", "")
  const maxText = formatRoundedCurrency(financials.estimatedContractValueRange?.max || 0).replace("~", "")
  const cleanMinText = minText.replace(/\s*€\s*HT$/i, "").trim()
  const rangeText = `${cleanMinText} à ${maxText}`
  const marginText = formatRoundedCurrency(financials.estimatedInstallerMargin || 0)

  const rawRoof = getRoofMaterialLabel(lead.roof_material)
  const roofDisplay = rawRoof === "Bac acier / Métallique" ? "Bac acier" : rawRoof
  const photoCount = getLeadImages(lead).length
  const compactFreshness = getCompactFreshnessLabel(freshness.label)

  // Projet premium si puissance élevée ou score élevé
  const isPremium = isB2B || powerKwc >= 20 || (lead.lead_score && lead.lead_score >= 70)
  const verifSummary = getLeadVerificationSummary({
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
      id={`lead-${lead.id}`}
      onClick={onInspect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onInspect()
        }
      }}
      className={`group relative flex flex-col justify-between rounded-3xl border bg-card shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden text-left ${isTargeted
          ? "border-accent ring-2 ring-accent/30 shadow-md"
          : "border-border hover:border-accent/40"
        }`}
    >
      <div className="flex flex-col">
        {/* ── A. Photo de toiture avec badges superposés et mention non contractuelle ── */}
        <div className="relative h-40 sm:h-52 w-full overflow-hidden bg-muted">
          <Image
            src={leadImage}
            alt={`Chantier solaire ${location.city}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={index < 3}
          />

          {/* Dégradé supérieur pour contraster les badges */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-transparent pointer-events-none" />

          {/* Badges superposés en haut (strictement mono-ligne) */}
          <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between gap-1.5 pointer-events-none">
            {/* Badge Modèle */}
            {isQuoteAudit ? (
              <span className="inline-flex items-center rounded-full bg-emerald-700/90 backdrop-blur-xs text-white text-[11px] sm:text-xs font-semibold leading-none px-2.5 py-1.5 sm:px-3 shadow-sm whitespace-nowrap shrink-0">
                <span className="sm:hidden">Contre-Offre · {remainingSlots}/{maxSlots}</span>
                <span className="hidden sm:inline">Contre-Offre Prêt-à-Signer · {remainingSlots}/{maxSlots}</span>
              </span>
            ) : isB2B ? (
              <span className="inline-flex items-center rounded-full bg-black/75 backdrop-blur-xs text-white text-[11px] sm:text-xs font-semibold leading-none px-2.5 py-1.5 sm:px-3 shadow-sm whitespace-nowrap shrink-0">
                <span className="sm:hidden">{maxSlots <= 1 ? "B2B Exclusif" : `B2B · ${remainingSlots}/${maxSlots}`}</span>
                <span className="hidden sm:inline">
                  {maxSlots <= 1 ? `${tierMeta.label} · 100 % Exclusif` : `${tierMeta.label} · ${remainingSlots}/${maxSlots} places`}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[11px] sm:text-xs font-medium leading-none px-2.5 py-1.5 sm:px-3 shadow-sm whitespace-nowrap shrink-0">
                <span className="font-semibold sm:hidden">B2C</span>
                <span className="font-semibold hidden sm:inline">{tierMeta.label}</span>
                <span className="text-white/60 hidden sm:inline" aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1" aria-hidden="true">
                  {slotIndicator.dots.map((color, i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                <span className="tabular-nums font-mono sm:hidden">
                  {remainingSlots}/{maxSlots}
                </span>
                <span className="hidden sm:inline tabular-nums font-mono">{slotIndicator.text}</span>
              </span>
            )}

            {/* Badge Fraîcheur / Date */}
            <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-card/95 text-foreground text-[11px] sm:text-xs font-semibold leading-none px-2.5 py-1.5 sm:px-3 shadow-sm whitespace-nowrap shrink-0">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
              <span suppressHydrationWarning className="sm:hidden">{compactFreshness}</span>
              <span suppressHydrationWarning className="hidden sm:inline">{freshness.label}</span>
            </span>
          </div>

          {/* Flèche droite de prévisualisation (affordance visuelle) */}
          <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white items-center justify-center backdrop-blur-xs transition-all pointer-events-none opacity-85 group-hover:opacity-100">
            <ChevronRight className="h-4 w-4" />
          </div>

          {/* Compteur photos réelles + Mention discrète illustration non contractuelle */}
          {photoCount > 0 && (
            <span className="absolute bottom-2 left-2.5 sm:bottom-2.5 sm:left-3 inline-flex items-center gap-1 text-[10.5px] font-mono font-semibold tabular-nums text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full pointer-events-none">
              <Camera className="h-3 w-3 shrink-0" />
              <span>{photoCount} photo{photoCount > 1 ? "s" : ""}</span>
            </span>
          )}
          <span className="absolute bottom-2 right-2.5 sm:bottom-2.5 sm:right-3 text-[10.5px] font-medium text-white/90 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full pointer-events-none whitespace-nowrap">
            <span className="sm:hidden">Illustration</span>
            <span className="hidden sm:inline">Illustration non contractuelle</span>
          </span>
        </div>

        {/* ── B. Contenu de la Carte : Titre, Puissance, Spécifications 2x2, Économie ── */}
        <div className="p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3">
          {/* Ligne 1 : Titre à gauche & Puissance kWc à droite */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-base sm:text-[17px] text-foreground tracking-tight leading-tight group-hover:text-accent transition-colors truncate min-w-0">
              {location.fullTitle}
            </h3>
            <div className="text-right shrink-0 flex items-baseline justify-end gap-1 pl-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight tabular-nums">
                {powerKwc > 0 ? powerKwc : "—"}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                kWc
              </span>
            </div>
          </div>

          {/* Ligne 2 : Localisation & Bâtiment sur toute la largeur */}
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 -mt-1">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            <span className="truncate">{location.subtitle}</span>
          </p>

          {/* Ligne 3 : Badge Projet & certification GSM */}
          <div className="-mt-0.5 flex flex-wrap items-center gap-1.5">
            {isPremium ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                <span>Projet premium</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" aria-hidden="true" />
                <span>Projet qualifié</span>
              </div>
            )}
            {verifSummary.phone.tier === "verified" && verifSummary.phone.compactLabel && (
              <div
                title={verifSummary.phone.detailLabel || undefined}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] sm:text-xs font-semibold whitespace-nowrap"
              >
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span>{verifSummary.phone.compactLabel}</span>
              </div>
            )}
            {verifSummary.phone.tier === "plausible" && verifSummary.phone.compactLabel && (
              <div
                title={verifSummary.phone.detailLabel || undefined}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border text-[11px] font-medium whitespace-nowrap"
              >
                <Phone className="h-3 w-3 shrink-0" />
                <span>{verifSummary.phone.compactLabel}</span>
              </div>
            )}
            {verifSummary.email.tier === "verified" && verifSummary.email.compactLabel && (
              <div
                title={verifSummary.email.detailLabel || undefined}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[11px] sm:text-xs font-semibold whitespace-nowrap"
              >
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>{verifSummary.email.compactLabel}</span>
              </div>
            )}
            {verifSummary.email.tier === "plausible" && verifSummary.email.compactLabel && (
              <div
                title={verifSummary.email.detailLabel || undefined}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border text-[11px] font-medium whitespace-nowrap"
              >
                <Mail className="h-3 w-3 shrink-0" />
                <span>{verifSummary.email.compactLabel}</span>
              </div>
            )}
          </div>

          {/* Ligne 4 : Grille Technique 2x2 avec icônes alignées dans les libellés (zéro troncature sur 320px) */}
          <div className="rounded-2xl bg-secondary/40 border border-border p-3 sm:p-3.5 grid grid-cols-2 gap-x-3 gap-y-2.5 text-xs">
            {/* 1. Toiture & Surface */}
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground font-mono whitespace-nowrap">
                <Home className="h-3 w-3 text-foreground/70 shrink-0" />
                <span>Toiture</span>
              </span>
              <span
                className="font-bold text-xs text-foreground leading-snug block"
                title={surfaceArea > 0 ? `${surfaceArea} m² · ${rawRoof}` : "Toiture standard"}
              >
                {surfaceArea > 0 ? (
                  <>
                    <span className="tabular-nums font-mono">{surfaceArea} m²</span> ·{" "}
                    <span>{roofDisplay}</span>
                  </>
                ) : (
                  <span>Toiture standard</span>
                )}
              </span>
            </div>

            {/* 2. Facture Élec */}
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground font-mono whitespace-nowrap">
                <FileText className="h-3 w-3 text-foreground/70 shrink-0" />
                <span>Facture</span>
              </span>
              {annualBill > 0 ? (
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground leading-snug block font-mono tabular-nums">
                    {annualBill.toLocaleString("fr-BE")} €/an
                  </span>
                  {financials.estimatedAnnualConsumptionKwh > 0 && (
                    <span className="text-[11px] text-muted-foreground font-mono tabular-nums block leading-tight">
                      ≈ {financials.estimatedAnnualConsumptionKwh.toLocaleString("fr-BE")} kWh
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs font-bold text-foreground leading-snug block">
                  {isB2B ? "Facture pro" : "Tarif résidentiel"}
                </span>
              )}
            </div>

            {/* 3. Échéance */}
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground font-mono whitespace-nowrap">
                <Calendar className="h-3 w-3 text-foreground/70 shrink-0" />
                <span>Échéance</span>
              </span>
              <span className="font-bold text-xs text-foreground leading-snug block">
                {getTimeframeLabel(lead.timeframe || lead.project_timeline)}
              </span>
            </div>

            {/* 4. Décisionnaire */}
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground font-mono whitespace-nowrap">
                <User className="h-3 w-3 text-foreground/70 shrink-0" />
                <span>Décideur</span>
              </span>
              <span
                className="font-bold text-xs text-foreground leading-snug block"
                title={getOwnershipLabel(lead.ownership_status)}
              >
                {getOwnershipLabel(lead.ownership_status)}
              </span>
            </div>
          </div>

          {/* Ligne 5 : Encart d'Économie & Marge Indicative (Zéro collision à 320px) */}
          <div className="rounded-2xl bg-accent/10 border border-accent/20 p-3 sm:p-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 sm:flex sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="hidden sm:flex h-7 w-7 rounded-lg bg-accent/15 text-accent items-center justify-center shrink-0">
                <svg
                  className="h-4 w-4 text-accent"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 19V11a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v8" />
                  <path d="M12 19V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v13" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-semibold text-accent block leading-tight">
                  Estimation du chantier
                </span>
                <span className="font-bold text-xs text-foreground font-mono tabular-nums block leading-snug mt-0.5">
                  {rangeText}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 pl-2 border-l border-accent/20 sm:border-l-0 sm:pl-1.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground block text-right font-mono whitespace-nowrap">
                Marge est.
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-accent font-mono tabular-nums block text-right whitespace-nowrap mt-0.5">
                {marginText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── C. Pied de Carte : Coût en Crédits & Boutons Tactiles Équilibrés ── */}
      <div className="px-3.5 sm:px-5 pb-3.5 sm:pb-5 pt-3 border-t border-border flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Crédits ou Euros */}
        <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-baseline gap-1 font-mono tabular-nums">
              <span className="font-bold text-xs sm:text-sm text-foreground whitespace-nowrap">
                {cost} crédits
              </span>
              <span className="font-sans text-[11px] text-muted-foreground font-medium">ou</span>
              <span className="font-bold text-xs sm:text-sm text-foreground whitespace-nowrap">
                {directFinancials.priceHtva.toFixed(2).replace(".", ",")} €{" "}
                <span className="text-[10.5px] text-muted-foreground font-normal">HT</span>
              </span>
            </div>
          </div>
          <span className="text-[10.5px] text-muted-foreground font-mono tabular-nums sm:hidden whitespace-nowrap">
            {canTakeExclusive ? `Excl. ${exclusiveCredits} cr.` : `${directFinancials.priceTtc.toFixed(2).replace(".", ",")} € TTC`}
          </span>
        </div>

        {/* Boutons d'action pleine largeur équilibrée sur mobile, pilules compactes sur desktop */}
        <div
          className={`w-full sm:w-auto sm:ml-auto ${
            hasEnoughCredits
              ? "grid grid-cols-[1fr_auto_1.35fr] gap-2 sm:flex sm:items-center sm:gap-1.5"
              : "grid grid-cols-[1fr_1.45fr] gap-2 sm:flex sm:items-center sm:gap-1.5"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onInspect}
            className="min-h-[42px] sm:min-h-0 rounded-xl sm:rounded-full border border-border bg-card hover:bg-secondary px-3 sm:px-3.5 py-2 sm:py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            title="Inspecter la fiche technique complète"
          >
            <Eye className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>Inspecter</span>
          </button>

          {hasEnoughCredits ? (
            <>
              <button
                type="button"
                onClick={onDirectPay}
                className="min-h-[42px] min-w-[42px] sm:min-h-0 sm:min-w-0 rounded-xl sm:rounded-full border border-border bg-secondary hover:bg-secondary/80 px-3 sm:px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0"
                aria-label="Payer ce dossier par Bancontact ou carte"
                title="Payer directement ce lead par Bancontact / Carte sans utiliser vos crédits"
              >
                <CreditCard className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-accent shrink-0" />
                <span className="hidden sm:inline">Payer en €</span>
              </button>

              <button
                type="button"
                disabled={isBuying}
                onClick={onPurchase}
                className="min-h-[42px] sm:min-h-0 rounded-xl sm:rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 sm:px-4 py-2 sm:py-1.5 text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Débloquer immédiatement avec vos crédits"
              >
                {isBuying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span>...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5 text-primary-foreground shrink-0" />
                    <span>Débloquer</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDirectPay}
              className="min-h-[42px] sm:min-h-0 rounded-xl sm:rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              title={
                complementFinancials.isHybrid
                  ? `Utiliser vos ${complementFinancials.creditsToDebit} crédit(s) et compléter par Bancontact / Carte`
                  : "Payer directement ce lead par Bancontact / Carte"
              }
            >
              <CreditCard className="h-3.5 w-3.5 text-primary-foreground shrink-0" />
              <span className="font-mono tabular-nums sm:hidden">
                {complementFinancials.isHybrid
                  ? `+${formatEurWithDecimals(complementFinancials.priceHtva)} € HT`
                  : `${directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT`}
              </span>
              <span className="hidden sm:inline font-mono tabular-nums">
                {complementFinancials.isHybrid
                  ? `Compléter (${formatEurWithDecimals(complementFinancials.priceHtva)} € HT)`
                  : `Payer ${directFinancials.priceHtva.toFixed(2).replace(".", ",")} € HT`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
