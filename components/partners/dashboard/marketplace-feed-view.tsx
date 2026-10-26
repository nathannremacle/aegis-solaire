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
} from "@/lib/lead-display-helpers"
import { LeadInspectionDrawer } from "./lead-inspection-drawer"
import { MarketplaceInteractiveTour } from "./marketplace-interactive-tour"

interface MarketplaceFeedViewProps {
  leads: any[]
  partnerCredits: number
  targetLeadId?: string
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

const SORT_OPTIONS = [
  { value: "recent", label: "Plus récents" },
  { value: "power_desc", label: "Puissance max (kWc)" },
  { value: "margin_desc", label: "Marge max (€)" },
]

/**
 * Menu déroulant stylisé (Custom UI) remplaçant les balises <select> natives d'OS
 * Design soigné, coins arrondis, bordures fines, ombres douces et indicateur sélectionné.
 */
function MarketplaceCustomSelect({
  value,
  onChange,
  options,
  icon: Icon,
  ariaLabel,
}: {
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
  icon?: React.ComponentType<{ className?: string }>
  ariaLabel?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-2 rounded-xl border bg-card hover:bg-secondary/70 h-9 px-3 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs select-none ${
          isOpen ? "border-primary ring-2 ring-primary/20" : "border-border"
        }`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-foreground" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 min-w-[200px] z-50 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 space-y-0.5"
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-slate-100 font-bold text-slate-900"
                    : "font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MarketplaceFeedView({
  leads,
  partnerCredits,
  targetLeadId,
  onPurchaseSuccess,
  onRequestTopUp,
  onOpenExpertModal,
}: MarketplaceFeedViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<"recent" | "power_desc" | "margin_desc">("recent")
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)

  // Détection 1ère visite : affiche le tutoriel si non encore masqué
  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY_TUTORIAL_DISMISSED)
      if (!isDismissed) {
        setShowTutorial(true)
      }
    } catch {
      // localStorage non disponible
    }
  }, [])

  const handleDismissTutorial = () => {
    setShowTutorial(false)
    try {
      localStorage.setItem(STORAGE_KEY_TUTORIAL_DISMISSED, "true")
    } catch {
      // ignore
    }
  }

  // Gestion du deep-linking direct vers le lead (?lead=[id])
  useEffect(() => {
    if (targetLeadId) {
      const targetLead = leads.find((l) => l.id === targetLeadId)
      if (targetLead) {
        setSelectedLeadForDrawer(targetLead)
        const timer = setTimeout(() => {
          const el = document.getElementById(`lead-${targetLeadId}`)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        }, 180)
        return () => clearTimeout(timer)
      } else {
        toast.info(
          "Ce dossier a déjà été attribué au nombre maximum d'installateurs partenaires ou n'est plus disponible.",
          { duration: 5000 }
        )
      }
    }
  }, [targetLeadId, leads])

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

    // Tri
    result = [...result].sort((a, b) => {
      const aSurface = Math.max(0, Number(a.surface_area || a.surface_area_m2) || 0)
      const bSurface = Math.max(0, Number(b.surface_area || b.surface_area_m2) || 0)
      const aPower = a.estimated_power_kwc ?? Math.round(aSurface * 0.17)
      const bPower = b.estimated_power_kwc ?? Math.round(bSurface * 0.17)

      if (sortBy === "power_desc") return bPower - aPower

      if (sortBy === "margin_desc") {
        const aFin = calculateMarketplaceFinancials({
          segment: a.segment,
          surfaceArea: aSurface,
          annualBill: Number(a.annual_electricity_bill || a.annual_bill_eur) || 0,
        })
        const bFin = calculateMarketplaceFinancials({
          segment: b.segment,
          surfaceArea: bSurface,
          annualBill: Number(b.annual_electricity_bill || b.annual_bill_eur) || 0,
        })
        return bFin.estimatedInstallerMargin - aFin.estimatedInstallerMargin
      }

      return 0
    })

    return result
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
        purchase_id: data.purchaseId || data.purchase?.id || `purch_${Date.now()}`,
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

            {/* Province custom UI select (remplace le select natif OS) */}
            <MarketplaceCustomSelect
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

            {/* Tri custom UI select (remplace le select natif OS) */}
            <MarketplaceCustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={SORT_OPTIONS}
              icon={ArrowUpDown}
              ariaLabel="Trier les chantiers"
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
              title="Demander l'aide d'un expert Aegis Solaire (étude de marché, dimensionnement, rentabilité)"
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
              title="Demander une étude de marché ou de dimensionnement"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>Étude de marché / Dimensionnement : Demander un expert</span>
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
                  <th className="px-4 py-3">Puissance</th>
                  <th className="px-4 py-3">Toiture &amp; Surface</th>
                  <th className="px-4 py-3">Marge Estimée</th>
                  <th className="px-4 py-3">Fraîcheur</th>
                  <th className="px-4 py-3">Tarif</th>
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
                          <span className="tabular-nums font-medium text-foreground/80">{freshness.label}</span>
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
  const cost = lead.credit_cost ?? (isB2B ? 8 : 2)

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
              <span>{freshness.label}</span>
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
              (≈{financials.leadCostEuros} € HT)
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
