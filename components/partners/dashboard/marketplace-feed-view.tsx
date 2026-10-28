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
  Home,
  FileText,
  User,
  Store,
  Phone,
  Mail,
  FileCheck,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
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
} from "@/lib/lead-display-helpers"
import { LeadInspectionDrawer } from "./lead-inspection-drawer"
import { MarketplaceInteractiveTour } from "./marketplace-interactive-tour"
import { LeadGeoRadarMap } from "./lead-geo-radar-map"

interface MarketplaceFeedViewProps {
  leads: any[]
  partnerCredits: number
  targetLeadId?: string
  onClearTargetLead?: () => void
  onPurchaseSuccess: (lead: any, newCredits: number, purchaseRecord: any) => void
  onRequestTopUp: () => void
  onOpenExpertModal?: (lead?: any) => void
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

import { CustomSelect } from "@/components/ui/custom-select"

export function MarketplaceFeedView({
  leads,
  partnerCredits,
  targetLeadId,
  onClearTargetLead,
  onPurchaseSuccess,
  onRequestTopUp,
  onOpenExpertModal,
}: MarketplaceFeedViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<MarketplaceSortOption>("recent")
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)

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

  // Variables calculées pour le lead ciblé en mode isolé
  const targetSurface = Math.max(0, Number(targetedLead?.surface_area || targetedLead?.surface_area_m2) || 0)
  const targetAnnualBill = Math.max(0, Number(targetedLead?.annual_electricity_bill || targetedLead?.annual_bill_eur) || 0)
  const targetCost = targetedLead?.credit_cost ?? (targetedLead?.segment === "B2B" ? 9 : 3)
  const targetFinancials = useMemo(() => {
    if (!targetedLead) return null
    return calculateMarketplaceFinancials({
      segment: targetedLead.segment,
      surfaceArea: targetSurface,
      surfaceType: targetedLead.surface_type,
      annualBill: targetAnnualBill,
      creditCost: targetCost,
    })
  }, [targetedLead, targetSurface, targetAnnualBill, targetCost])

  const targetPower = targetedLead?.estimated_power_kwc ?? (targetFinancials ? targetFinancials.estimatedPowerKwc : 0)
  const targetIsB2B = targetedLead?.segment === "B2B"
  const targetMaxSlots = targetedLead?.max_slots ?? (targetIsB2B ? 1 : 3)
  const targetRemainingSlots = targetedLead?.remaining_slots ?? targetMaxSlots
  const targetTakenSlots = targetedLead?.taken_slots ?? Math.max(0, targetMaxSlots - targetRemainingSlots)
  const targetHasEnoughCredits = partnerCredits >= targetCost
  const targetLocation = useMemo(() => (targetedLead ? getLeadLocationInfo(targetedLead) : null), [targetedLead])
  const targetSanitized = useMemo(
    () => (targetedLead ? sanitizeLeadNotes(targetedLead.project_details || targetedLead.message) : null),
    [targetedLead]
  )

  const targetLastName = (targetedLead?.last_name?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()
  const targetFirstName = (targetedLead?.first_name?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()
  let targetMaskedName = "xxxx"
  if (targetLastName) {
    targetMaskedName = `xxxx ${targetLastName}`
  } else if (targetFirstName) {
    const parts = targetFirstName.split(/\s+/)
    targetMaskedName = parts.length > 1 ? `xxxx ${parts[parts.length - 1]}` : `xxxx ${targetFirstName}`
  }

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

      // Province
      if (selectedProvince !== "ALL" && lead.province?.toLowerCase() !== selectedProvince.toLowerCase()) {
        return false
      }

      // Recherche textuelle
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const cityMatch = lead.city?.toLowerCase().includes(query)
        const postalMatch = lead.postal_code?.includes(query) || lead.masked_postal_code?.toLowerCase().includes(query)
        const provinceMatch = lead.province?.toLowerCase().includes(query)
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
        annualBill,
        creditCost: cost,
        estimatedPowerKwc: lead.estimated_power_kwc,
      })

      const powerKwc = Number(lead.estimated_power_kwc) || financials.estimatedPowerKwc
      const contractValue = financials.estimatedContractValue || 0
      const margin = financials.estimatedInstallerMargin || 0

      return {
        lead,
        surfaceArea,
        annualBill,
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
        annualBill,
        creditCost: cost,
      })

      const power = lead.estimated_power_kwc ?? financials.estimatedPowerKwc
      totalPower += power
    })

    return {
      totalLeads: filteredLeads.length,
      totalPower,
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

  const handlePurchase = async (lead: any) => {
    const isB2B = lead.segment === "B2B"
    const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
    if (partnerCredits < cost) {
      toast.error(`Solde insuffisant (${cost} crédits requis, ${partnerCredits} disponibles).`)
      onRequestTopUp()
      return
    }

    if (
      !confirm(
        `Débloquer ce dossier ${lead.segment} pour ${cost} crédits ?\nVous obtiendrez immédiatement le nom, téléphone direct vérifié, email et adresse exacte du prospect.`
      )
    ) {
      return
    }

    setBuyingId(lead.id)
    try {
      const res = await fetch("/api/partners/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'achat")

      toast.success("Dossier débloqué avec succès ! Coordonnées ajoutées à votre CRM.")
      const newCredits = partnerCredits - cost
      const newRecord = {
        id: data.lead?.id || lead.id,
        lead_id: data.lead?.id || lead.id,
        purchase_id: data.purchaseId || data.purchase_id || data.purchase?.id || `purch_${Date.now()}`,
        purchased_at: new Date().toISOString(),
        credits_spent: cost,
        pipeline_status: "to_contact",
        first_name: data.lead?.first_name || lead.first_name || "Prospect",
        last_name: data.lead?.last_name || lead.last_name || "",
        company: data.lead?.company || null,
        email: data.lead?.email || "—",
        phone: data.lead?.phone || "—",
        site_address: data.lead?.site_address || lead.site_address,
        segment: lead.segment,
        province: lead.province,
        city: lead.city,
        postal_code: lead.postal_code || lead.masked_postal_code,
        surface_area: lead.surface_area,
        annual_electricity_bill: lead.annual_electricity_bill,
      }

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
    <div className="space-y-4">
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

      {/* ── ALERTE SI LE DOSSIER CIBLÉ N'EST PLUS DISPONIBLE ── */}
      {focusedLeadId && !targetedLead && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 font-bold">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Dossier non disponible ou déjà attribué
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ce chantier n'est plus actif ou a atteint son quota d'installateurs. Voici l'ensemble des opportunités actuellement ouvertes :
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFocus}
              className="shrink-0 text-xs font-semibold cursor-pointer border-border hover:bg-secondary"
            >
              Afficher toute la marketplace &rarr;
            </Button>
          </div>
        </div>
      )}

      {/* ── MODE FOCUS EXCLUSIF (Deep-link e-mail de relance) : Affichage UNIQUEMENT de ce lead ── */}
      {focusedLeadId && targetedLead ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Bannière de focus / isolation */}
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground font-bold shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-accent font-bold">
                      ● DOSSIER RECOMMANDÉ · E-MAIL DE RAPPEL
                    </span>
                    <span className="rounded-full bg-accent/15 border border-accent/30 text-foreground px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums">
                      Réf. #{targetedLead.id.slice(0, 8)}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-heading font-extrabold text-foreground mt-0.5">
                    Chantier Solaire {targetIsB2B ? "Tertiaire & Professionnel (100% Exclusif)" : "Résidentiel"} · {targetLocation?.city || "Wallonie"} ({targetLocation?.postalCode || "BE"})
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Accès exclusif et direct à la fiche technique de ce chantier qualifié. Aucune dispersion avec le flux général.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFocus}
                className="shrink-0 text-xs font-semibold cursor-pointer border-border hover:bg-secondary gap-1.5"
              >
                <Store className="h-3.5 w-3.5 text-accent" />
                <span>Voir toute la marketplace ({leads.length} opportunités) &rarr;</span>
              </Button>
            </div>
          </div>

          {/* Bento métriques financières du lead ciblé */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block font-medium">Puissance estimée</span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-foreground tabular-nums flex items-center gap-1.5 mt-0.5">
                <Zap className="h-4 w-4 text-accent shrink-0" />
                {targetPower} kWc
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block font-medium">Surface disponible</span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-foreground tabular-nums flex items-center gap-1.5 mt-0.5">
                <Home className="h-4 w-4 text-primary shrink-0" />
                {targetSurface} m²
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block font-medium">Facture annuelle</span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-foreground tabular-nums mt-0.5 block">
                {targetAnnualBill > 0 ? `${formatRoundedCurrency(targetAnnualBill)} / an` : "Sur devis"}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block font-medium">Marge brute indicative</span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5 block">
                {targetFinancials ? `~${formatRoundedCurrency(targetFinancials.estimatedInstallerMargin)}` : "—"}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-accent/40 bg-accent/10 p-3.5 shadow-2xs">
              <span className="text-[11px] text-muted-foreground block font-medium">Coût d'acquisition</span>
              <span className="text-base sm:text-lg font-mono font-extrabold text-foreground tabular-nums mt-0.5 block">
                {targetCost} crédits <span className="text-xs font-normal text-muted-foreground">(~{targetFinancials ? formatRoundedCurrency(targetFinancials.leadCostEuros) : "—"})</span>
              </span>
            </div>
          </div>

          {/* Grille Principale 2 Colonnes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Colonne Gauche (7 cols) : Fiche Technique & Radar Géographique */}
            <div className="lg:col-span-7 space-y-6">
              {/* Spécifications Techniques */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    <span>Audit Technique &amp; Spécifications du Chantier</span>
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Audit certifié Aegis Solaire
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                    <span className="text-muted-foreground text-[11px] block">Toiture &amp; Revêtement</span>
                    <strong className="text-sm font-semibold text-foreground mt-0.5 block">
                      {getRoofMaterialLabel(targetedLead.roof_material)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      Type : {getSurfaceTypeLabel(targetedLead.surface_type)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                    <span className="text-muted-foreground text-[11px] block">Statut du Décisionnaire</span>
                    <strong className="text-sm font-semibold text-foreground mt-0.5 block">
                      {getOwnershipLabel(targetedLead.ownership_status)}
                    </strong>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Décisionnaire direct
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                    <span className="text-muted-foreground text-[11px] block">Échéance souhaitée</span>
                    <strong className="text-sm font-semibold text-foreground mt-0.5 block">
                      {getTimeframeLabel(targetedLead.timeframe || targetedLead.project_timeline)}
                    </strong>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      Planification chantier
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                    <span className="text-muted-foreground text-[11px] block">Gestionnaire de Réseau (GRD)</span>
                    <strong className="text-sm font-mono font-semibold text-foreground mt-0.5 block">
                      {targetedLead.grd ? `GRD ${targetedLead.grd.toUpperCase()}` : "ORES / RESA"}
                    </strong>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      Réseau Wallon certifié
                    </span>
                  </div>
                </div>

                {/* Objectif prioritaire */}
                <div className="p-3 rounded-xl bg-secondary/20 border border-border/50 text-xs">
                  <span className="text-muted-foreground text-[11px] block font-medium">Objectif prioritaire du client</span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {getProjectDriverLabel(targetedLead.project_driver)}
                  </span>
                </div>

                {/* Précisions & Remarques client */}
                {targetSanitized?.cleanRemarks && (
                  <div className="rounded-xl bg-card border border-border p-3.5 text-xs italic text-foreground/90 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground not-italic block">
                      Précisions transmises par le client :
                    </span>
                    <p className="leading-relaxed">« {targetSanitized.cleanRemarks} »</p>
                  </div>
                )}
              </div>

              {/* Carte Radar Géographique */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    <span>Zone d'Intervention &amp; Localisation</span>
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {targetLocation?.postalCode} {targetLocation?.city}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border border-border/80">
                  <LeadGeoRadarMap
                    city={targetLocation?.city || "Wallonie"}
                    postalCode={targetLocation?.postalCode || "4000"}
                    provinceLabel={targetLocation?.provinceLabel}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground text-center">
                  Localisation approximative par commune. L'adresse exacte (rue et numéro) est immédiatement fournie lors du déblocage.
                </p>
              </div>
            </div>

            {/* Colonne Droite (5 cols) : Coordonnées Masquées + Déblocage + Garantie */}
            <div className="lg:col-span-5 space-y-6">
              {/* Box Coordonnées Pré-déblocage */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-border/70 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Coordonnées du Décideur</span>
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    ✓ Vérifié
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <span className="text-muted-foreground">Nom du contact :</span>
                    <strong className="font-mono text-foreground">{targetMaskedName}</strong>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <span className="text-muted-foreground">Téléphone direct :</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-muted-foreground">04** ** **</span>
                      <span className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-bold">
                        [✓ Vérifié]
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <span className="text-muted-foreground">Adresse e-mail :</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-muted-foreground">****@***.be</span>
                      <span className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-bold">
                        [✓ Vérifié]
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <span className="text-muted-foreground">Adresse du chantier :</span>
                    <span className="font-mono text-muted-foreground">
                      ********* ({targetLocation?.postalCode} {targetLocation?.city})
                    </span>
                  </div>
                </div>

                {/* Règle de concurrence & Scarcity */}
                <div className="rounded-xl border border-border/80 bg-secondary/20 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground block">
                      Règle de concurrence Aegis Solaire
                    </span>
                    {!targetIsB2B && (
                      <span className="font-mono text-[10px] font-semibold text-primary">
                        {targetTakenSlots} / {targetMaxSlots} réservé{targetTakenSlots > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {targetIsB2B
                      ? "Exclusivité absolue garantie : 1 seul installateur unique sur ce dossier. Aucune concurrence de plateforme."
                      : `Attribution restreinte à 3 installateurs certifiés maximum. ${targetRemainingSlots} place(s) disponible(s) restante(s).`}
                  </p>
                  {!targetIsB2B && targetTakenSlots > 0 && (
                    <div className="pt-2 flex flex-col gap-1.5 border-t border-border/60">
                      {Array.from({ length: targetMaxSlots }).map((_, idx) => {
                        const isTaken = idx < targetTakenSlots
                        const buyer = targetedLead?.buyers?.[idx]
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
                                  : "Disponible immédiatement"}
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
                  )}
                </div>

                {/* Bloc d'action primaire : Déblocage immédiat */}
                <div className="pt-2 space-y-3">
                  <Button
                    size="lg"
                    onClick={() => handlePurchase(targetedLead)}
                    disabled={buyingId === targetedLead.id}
                    className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold h-12 shadow-sm cursor-pointer text-sm"
                  >
                    {buyingId === targetedLead.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Déblocage en cours...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2 text-accent" />
                        Débloquer ce dossier ({targetCost} crédits) &rarr;
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-muted-foreground">
                      Votre solde : <strong className="font-mono text-foreground">{partnerCredits} crédits</strong>
                    </span>
                    {!targetHasEnoughCredits && (
                      <button
                        type="button"
                        onClick={onRequestTopUp}
                        className="text-xs font-bold text-accent hover:underline cursor-pointer"
                      >
                        + Recharger des crédits
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cellule d'Assistance Ingénierie (Strict Anonymity) */}
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-2 shadow-2xs">
                <h4 className="text-xs font-bold text-foreground">
                  Assistance Technique &amp; Étude de Dimensionnement (% Projet)
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  En tant que partenaire certifié, vous pouvez solliciter notre cellule technique pour valider la puissance onduleur, le calepinage ou les contraintes GRD sur ce dossier, en échange d&apos;un pourcentage du projet à négocier selon son envergure.
                </p>
                <div className="pt-1">
                  <a
                    href="mailto:contact@aegissolaire.com"
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>contact@aegissolaire.com</span>
                  </a>
                </div>
              </div>

              {/* Garantie Sérénité */}
              <div className="rounded-xl border border-border/80 bg-card p-3.5 text-center shadow-2xs">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  🛡️ <strong>Garantie Sérénité Aegis Solaire :</strong> Tout numéro erroné ou dossier injoignable après 3 tentatives est recrédité sous 24h ouvrées.
                </p>
              </div>
            </div>
          </div>

          {/* Escape Footer vers la marketplace globale */}
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3 shadow-2xs">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-foreground">
              <Store className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Envie de découvrir d'autres opportunités en Wallonie ?
              </h3>
              <p className="text-xs text-muted-foreground max-w-lg mx-auto mt-1">
                Explorez l'ensemble des {leads.length} chantiers photovoltaïques qualifiés actuellement ouverts sur la marketplace.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFocus}
              className="text-xs font-bold text-foreground border-border hover:bg-secondary cursor-pointer"
            >
              Accéder à toute la marketplace ({leads.length} chantiers) &rarr;
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* ── 1. Barre de Contrôle Unifiée : Filtres avec Badges de Comptage, Recherche, Tri & Visite ── */}
          <div className="rounded-2xl border border-border bg-card p-3 sm:p-3.5 shadow-xs space-y-3">
        {/* Ligne 1 : Segments avec compteurs, Province, Recherche, Tri, Visite guidée et Toggle Grille/Tableau */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Segments + Province */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segment switch avec bulles de comptage comme sur la capture */}
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSegmentFilter("ALL")}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  segmentFilter === "ALL"
                    ? "bg-[#0F172A] text-white shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span>Tous</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "ALL"
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
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  segmentFilter === "B2B"
                    ? "bg-[#0F172A] text-white shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span>B2B Exclusif</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "B2B"
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
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  segmentFilter === "B2C"
                    ? "bg-[#0F172A] text-white shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span>B2C Partagé (max 3)</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "B2C"
                      ? "bg-white/20 text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {counts.b2c}
                </span>
              </button>
            </div>

            {/* Province CustomSelect stylisé comme le bouton */}
            <CustomSelect
              value={selectedProvince}
              onChange={(val) => setSelectedProvince(val)}
              options={PROVINCE_OPTIONS}
              icon={MapPin}
              ariaLabel="Filtrer par province"
            />
          </div>

          {/* Recherche, Tri, Visite guidée & Switcher Grille / Tableau */}
          <div className="flex flex-wrap items-center gap-2 flex-1 lg:max-w-2xl justify-end">
            {/* Recherche textuelle compacte */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Commune, code postal..."
                className="w-full rounded-xl border border-border bg-card pl-8.5 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary h-9 transition-all"
                aria-label="Rechercher un chantier"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Effacer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tri CustomSelect au style identique au bouton */}
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={SORT_OPTIONS}
              icon={ArrowUpDown}
              ariaLabel="Trier les chantiers"
              contentClassName="min-w-[280px] sm:min-w-[300px]"
            />

            {/* Bouton Visite guidée */}
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary px-3 h-9 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs hover:border-accent/40"
              title="Lancer la visite guidée interactive de la marketplace"
            >
              <Compass className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="hidden sm:inline">Visite guidée</span>
            </button>

            {/* Bouton Aide Expert & Étude */}
            <button
              type="button"
              onClick={() => onOpenExpertModal?.(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 hover:bg-accent/20 px-3 h-9 text-xs font-bold text-foreground transition-all cursor-pointer shadow-2xs"
              title="Demander l'aide d'un expert Aegis Solaire (% projet à négocier selon l'envergure)"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>Aide Expert &amp; Étude</span>
            </button>

            {/* Switcher Grille / Tableau */}
            <div className="inline-flex items-center rounded-xl border border-border bg-secondary p-0.5 h-9">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-[#0F172A] text-white shadow-2xs"
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
                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#0F172A] text-white shadow-2xs"
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

        {/* Ligne 2 : Statut opérationnel épuré avec séparateurs verticaux comme sur l'image */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/70 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="font-mono text-foreground font-bold tabular-nums">{kpis.totalLeads}</strong> chantiers
              disponibles
            </span>

            <span className="text-border">|</span>

            <span className="flex items-center gap-1 font-mono text-foreground">
              <Zap className="h-3.5 w-3.5 text-foreground shrink-0" />
              <strong className="text-foreground font-bold tabular-nums">
                {Math.round(kpis.totalPower).toLocaleString("fr-BE")}
              </strong>{" "}
              kWc cumulés
            </span>

            <span className="text-border">|</span>

            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              Garantie anti-fake 100% remboursé
            </span>

            <span className="text-border hidden md:inline">|</span>

            <button
              type="button"
              onClick={() => onOpenExpertModal?.(null)}
              className="inline-flex items-center gap-1 text-accent hover:underline font-semibold cursor-pointer text-xs"
              title="Demander une étude de marché ou de dimensionnement (% projet à négocier)"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>Étude expert &amp; Dimensionnement (% projet à négocier)</span>
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-accent hover:underline cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      </div>

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
            />
          ))}
        </div>
      ) : (
        /* ── Vue Liste Dense Haute-Productivité ── */
        <div className="space-y-1.5">
          <div className="block sm:hidden text-center text-[11px] font-mono text-muted-foreground py-0.5">
            ↔ Glisser horizontalement pour voir toutes les colonnes
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs overscroll-x-contain">
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
                        className={`h-3 w-3 ${
                          sortBy === "power_desc" || sortBy === "power_asc"
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
                        className={`h-3 w-3 ${
                          sortBy === "surface_desc"
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
                        className={`h-3 w-3 ${
                          sortBy === "margin_desc" || sortBy === "contract_desc"
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
                        className={`h-3 w-3 ${
                          sortBy === "recent" || sortBy === "oldest"
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
                        className={`h-3 w-3 ${
                          sortBy === "cost_asc" || sortBy === "cost_desc"
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
                  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
                  const remainingSlots = lead.remaining_slots ?? maxSlots
                  const cost = lead.credit_cost ?? (isB2B ? 8 : 2)
                  const isBuying = buyingId === lead.id
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
                  const freshness = getLeadFreshness(lead.created_at)
                  const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadForDrawer(lead)}
                      className="hover:bg-secondary/50 transition-colors cursor-pointer group"
                    >
                      {/* Modèle Commercial */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isB2B
                              ? "bg-[#0F172A] text-white"
                              : "bg-secondary text-foreground border border-border"
                          }`}
                        >
                          {isB2B ? "B2B Exclusif" : `B2C (${remainingSlots}/${maxSlots})`}
                        </span>
                      </td>

                      {/* Localisation */}
                      <td className="px-4 py-3 text-foreground font-medium">
                        <div className="font-bold group-hover:text-primary transition-colors">
                          {location.fullTitle}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{location.provinceLabel}</div>
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
                          {formatRoundedCurrency(financials.estimatedInstallerMargin)} HT
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
                        <div className="text-[10px] text-muted-foreground font-normal">
                          ~{financials.leadCostEuros} € HT
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
                          <Button
                            size="sm"
                            variant="default"
                            disabled={isBuying}
                            onClick={() => handlePurchase(lead)}
                            className="h-8 px-3 rounded-lg text-xs font-bold bg-[#0F172A] text-white hover:bg-[#0F172A]/90 cursor-pointer shadow-2xs active:scale-[0.99]"
                          >
                            {isBuying ? "..." : `Débloquer`}
                          </Button>
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
        </>
      )}

      {/* ── 3. Tiroir Latéral d'Inspection Rapide (Slide-over 540px) ── */}
      {selectedLeadForDrawer && (
        <LeadInspectionDrawer
          lead={selectedLeadForDrawer}
          partnerCredits={partnerCredits}
          isBuying={buyingId === selectedLeadForDrawer.id}
          onClose={() => setSelectedLeadForDrawer(null)}
          onPurchase={(lead) => handlePurchase(lead)}
          onRequestTopUp={onRequestTopUp}
          onRequestExpert={(lead) => onOpenExpertModal?.(lead)}
        />
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
}: {
  lead: any
  index: number
  partnerCredits: number
  isBuying: boolean
  isTargeted: boolean
  onInspect: () => void
  onPurchase: () => void
}) {
  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const cost = lead.credit_cost ?? (isB2B ? 9 : 3)

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
  const freshness = getLeadFreshness(lead.created_at)
  const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc

  // 1 image dédiée non contractuelle : teinte froide/acier pour B2B, teinte chaude/terracotta pour B2C
  const leadImage = isB2B ? B2B_SOLAR_IMAGE : B2C_SOLAR_IMAGE

  // Formatage financier propre et sans duplication de 'HT'
  const contractMin = Math.round((financials.estimatedContractValueRange?.min || 0) / 1000) * 1000
  const contractMax = Math.round((financials.estimatedContractValueRange?.max || 0) / 1000) * 1000
  const marginEst = Math.round((financials.estimatedInstallerMargin || 0) / 1000) * 1000

  const rangeText = `${contractMin.toLocaleString("fr-BE")} € HT à ${contractMax.toLocaleString("fr-BE")} € HT`
  const marginText = `~${marginEst.toLocaleString("fr-BE")} € HT`

  const rawRoof = getRoofMaterialLabel(lead.roof_material)
  const roofDisplay = rawRoof === "Bac acier / Métallique" ? "Bac acier / Mét..." : rawRoof

  // Projet premium si puissance élevée ou score élevé
  const isPremium = isB2B || powerKwc >= 20 || (lead.lead_score && lead.lead_score >= 70)

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
      className={`group relative flex flex-col justify-between rounded-3xl border bg-white shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden text-left ${
        isTargeted
          ? "border-blue-500 ring-2 ring-blue-500/30 shadow-md"
          : "border-slate-200/90 hover:border-slate-300"
      }`}
    >
      <div className="flex flex-col">
        {/* ── A. Photo de toiture avec badges superposés et mention non contractuelle ── */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
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

          {/* Badges superposés en haut */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            {/* Badge Modèle */}
            <span className="inline-flex items-center rounded-full bg-[#0B1528] text-white text-xs font-bold px-3.5 py-1.5 shadow-sm">
              {isB2B ? "B2B • 100% Exclusif" : `B2C • ${remainingSlots}/${maxSlots} places dispo`}
            </span>

            {/* Badge Fraîcheur / Date */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span suppressHydrationWarning>{freshness.label}</span>
            </span>
          </div>

          {/* Flèche droite de prévisualisation (affordance visuelle) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-xs transition-all pointer-events-none opacity-85 group-hover:opacity-100">
            <ChevronRight className="h-4 w-4" />
          </div>

          {/* Mention discrète illustration non contractuelle */}
          <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-white/85 bg-black/45 backdrop-blur-xs px-2.5 py-0.5 rounded-full pointer-events-none">
            Illustration non contractuelle
          </span>
        </div>

        {/* ── B. Contenu de la Carte : Titre, Puissance, Spécifications 2x2, Économie ── */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Ligne 1 : Titre à gauche & Puissance kWc à droite */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-base sm:text-[17px] text-slate-900 tracking-tight leading-tight group-hover:text-blue-900 transition-colors truncate min-w-0">
              {location.fullTitle}
            </h3>
            <div className="text-right shrink-0 flex items-baseline justify-end gap-1 pl-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] tracking-tight tabular-nums">
                {powerKwc > 0 ? powerKwc : "—"}
              </span>
              <span className="text-xs font-bold text-slate-500 lowercase">
                kWc
              </span>
            </div>
          </div>

          {/* Ligne 2 : Localisation & Bâtiment sur toute la largeur (Garanti sans coupure) */}
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 -mt-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{location.subtitle}</span>
          </p>

          {/* Ligne 3 : Badge Projet premium */}
          <div className="-mt-1">
            {isPremium ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EBFBF3] text-[#059669] text-xs font-semibold">
                <span className="text-emerald-500 font-bold">—</span>
                <span>Projet premium</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                <span className="text-slate-400 font-bold">—</span>
                <span>Projet qualifié</span>
              </div>
            )}
          </div>

          {/* Ligne 4 : Grille Technique 2x2 dans un encart clair dédié */}
          <div className="rounded-2xl bg-[#F8FAFD] border border-[#E9EFF7] p-3 sm:p-3.5 grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
            {/* 1. Toiture & Surface */}
            <div className="flex items-start gap-2 min-w-0">
              <Home className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  TOITURE &amp; SURFACE
                </span>
                <span
                  className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight block truncate"
                  title={surfaceArea > 0 ? `${surfaceArea} m² · ${rawRoof}` : "Toiture standard"}
                >
                  {surfaceArea > 0 ? (
                    <>
                      <span className="tabular-nums">{surfaceArea} m²</span> ·{" "}
                      <span>{roofDisplay}</span>
                    </>
                  ) : (
                    <span>Toiture standard</span>
                  )}
                </span>
              </div>
            </div>

            {/* 2. Facture Élec */}
            <div className="flex items-start gap-2 min-w-0">
              <FileText className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  FACTURE ÉLEC.
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight block truncate">
                  {annualBill > 0 ? (
                    <span className="tabular-nums">
                      {annualBill.toLocaleString("fr-BE")} €/an
                    </span>
                  ) : (
                    <span>
                      {isB2B ? "Facture pro" : "Tarif résidentiel"}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* 3. Échéance */}
            <div className="flex items-start gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  ÉCHÉANCE
                </span>
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight block truncate">
                  {getTimeframeLabel(lead.timeframe || lead.project_timeline)}
                </span>
              </div>
            </div>

            {/* 4. Décisionnaire */}
            <div className="flex items-start gap-2 min-w-0">
              <User className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  DÉCISIONNAIRE
                </span>
                <span
                  className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight block truncate"
                  title={getOwnershipLabel(lead.ownership_status)}
                >
                  {getOwnershipLabel(lead.ownership_status)}
                </span>
              </div>
            </div>
          </div>

          {/* Ligne 3 : Encadré d'Économie & Marge Indicative (Teinte bleue douce) */}
          <div className="rounded-2xl bg-[#F3F7FF] border border-[#DCE7FD] p-3 sm:p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-blue-100/90 text-[#2563EB] flex items-center justify-center shrink-0">
                <svg
                  className="h-4 w-4 text-[#2563EB]"
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
                <span className="text-[11px] sm:text-xs font-semibold text-[#2563EB] block">
                  Estimation du chantier
                </span>
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 tabular-nums block whitespace-nowrap">
                  {rangeText}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 pl-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-right">
                MARGE INDICATIVE
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#2563EB] tabular-nums block text-right whitespace-nowrap">
                {marginText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── C. Pied de Carte : Coût en Crédits & Boutons Pilules (Inspecter & Débloquer) ── */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Crédits avec icône pile de pièces - Garanti sans retour à la ligne */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <svg
            className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <ellipse cx="12" cy="6" rx="8" ry="3" />
            <path d="M4 6v5c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
            <path d="M4 11v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" />
          </svg>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-xs sm:text-sm text-slate-900 tabular-nums">
              {cost} crédits
            </span>
            <span className="text-[11px] text-slate-400 tabular-nums">
              ({financials.leadCostEuros.toFixed(2)} € HT)
            </span>
          </div>
        </div>

        {/* Boutons d'action pilules compacts */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onInspect}
            className="rounded-full border border-slate-200 bg-white hover:bg-slate-50 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Inspecter la fiche technique complète"
          >
            <Eye className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Inspecter</span>
          </button>

          <button
            type="button"
            disabled={isBuying}
            onClick={onPurchase}
            className="rounded-full bg-[#0B1528] hover:bg-[#1E293B] text-white px-3.5 sm:px-4 py-1.5 text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isBuying ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>...</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-white" />
                <span>Débloquer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
