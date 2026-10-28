"use client"

import * as React from "react"
import { useOptimistic, useTransition, useState, useMemo } from "react"
import Image from "next/image"
import {
  MapPin,
  Zap,
  Phone,
  Mail,
  MessageCircle,
  UserPlus,
  ShieldAlert,
  LayoutGrid,
  List,
  Building2,
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  Calendar,
  ChevronRight,
  ChevronDown,
  Eye,
  Home,
  FileText,
  CheckCircle2,
  TrendingUp,
  Compass,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import {
  getLeadLocationInfo,
  formatRoundedCurrency,
  formatLeadUnlockDate,
  getRoofMaterialLabel,
  getTimeframeLabel,
  getOwnershipLabel,
} from "@/lib/lead-display-helpers"
import { LeadInspectionDrawer } from "./lead-inspection-drawer"
import { CrmInteractiveTour } from "./crm-interactive-tour"
import { downloadLeadVCard, buildWhatsAppLink } from "./lib/vcard-export"
import { CustomSelect } from "@/components/ui/custom-select"

const STORAGE_KEY_CRM_TUTORIAL_DISMISSED = "aegis_crm_tour_dismissed_v1"

// Images solaires dédiées haute définition (couleur froide/acier B2B, couleur chaude/terracotta B2C)
const B2B_SOLAR_IMAGE = "/solar/b2b-lead-preview.jpg"
const B2C_SOLAR_IMAGE = "/solar/b2c-lead-preview.jpg"

export const PIPELINE_STAGES = [
  {
    id: "to_contact",
    label: "À contacter",
    color: "amber",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
    pillActiveClass: "bg-amber-600 text-white border-amber-600 shadow-2xs font-bold",
  },
  {
    id: "contacted",
    label: "Contacté",
    color: "slate",
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700",
    pillActiveClass: "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 border-slate-800 font-bold shadow-2xs",
  },
  {
    id: "meeting_scheduled",
    label: "RDV fixé",
    color: "blue",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800",
    pillActiveClass: "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold",
  },
  {
    id: "quote_sent",
    label: "Devis envoyé",
    color: "purple",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800",
    pillActiveClass: "bg-purple-600 text-white border-purple-600 shadow-2xs font-bold",
  },
  {
    id: "won",
    label: "Gagné",
    color: "emerald",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
    pillActiveClass: "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold",
  },
  {
    id: "lost",
    label: "Perdu",
    color: "zinc",
    badgeClass: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
    pillActiveClass: "bg-zinc-600 text-white border-zinc-600 shadow-2xs font-semibold",
  },
] as const

const SORT_OPTIONS = [
  { value: "recent", label: "Plus récents (débloqués)" },
  { value: "status", label: "Statut commercial" },
  { value: "power_desc", label: "Puissance max (kWc)" },
  { value: "margin_desc", label: "Marge max (€)" },
  { value: "alpha", label: "Nom client (A-Z)" },
]

const PROVINCE_OPTIONS = [
  { value: "ALL", label: "Toute la Wallonie" },
  { value: "liege", label: "Liège" },
  { value: "namur", label: "Namur" },
  { value: "hainaut", label: "Hainaut" },
  { value: "brabant_wallon", label: "Brabant Wallon" },
  { value: "luxembourg", label: "Luxembourg" },
]

interface CrmPortfolioViewProps {
  purchases: any[]
  onOpenDispute: (purchase: any) => void
  onExploreMarketplace?: () => void
  onOpenExpertModal?: (lead?: any) => void
  onUpdateStatus?: (purchaseId: string, newStatus: string) => void
}

export function CrmPortfolioView({
  purchases,
  onOpenDispute,
  onExploreMarketplace,
  onOpenExpertModal,
  onUpdateStatus,
}: CrmPortfolioViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [selectedStage, setSelectedStage] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<"recent" | "power_desc" | "margin_desc" | "status" | "alpha">("recent")
  const [, startTransition] = useTransition()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<any | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)

  // État local synchronisé avec les props pour persister les mutations après l'achèvement de la transition
  const [internalPurchases, setInternalPurchases] = useState<any[]>(purchases)

  React.useEffect(() => {
    setInternalPurchases(purchases)
  }, [purchases])

  // Détection 1ère visite : affiche le tutoriel CRM si non encore masqué
  React.useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(STORAGE_KEY_CRM_TUTORIAL_DISMISSED)
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
      localStorage.setItem(STORAGE_KEY_CRM_TUTORIAL_DISMISSED, "true")
    } catch {
      // ignore
    }
  }

  // React 19 Optimistic UI : changement de colonne instantané sans attendre le serveur
  const [optimisticPurchases, setOptimisticStatus] = useOptimistic(
    internalPurchases,
    (state: any[], { targetId, newStatus }: { targetId: string; newStatus: string }) =>
      state.map((item) => {
        const match =
          (item.purchase_id && item.purchase_id === targetId) ||
          (item.id && item.id === targetId) ||
          (item.lead_id && item.lead_id === targetId)
        return match ? { ...item, pipeline_status: newStatus } : item
      })
  )

  const handleStatusChange = (itemOrId: any, newStatus: string) => {
    const targetId =
      typeof itemOrId === "string"
        ? itemOrId
        : itemOrId?.purchase_id || itemOrId?.id || itemOrId?.lead_id

    if (!targetId) {
      toast.error("Identifiant du dossier introuvable.")
      return
    }

    setUpdatingId(targetId)

    startTransition(async () => {
      // 1. Mise à jour optimiste immédiate (<1ms)
      setOptimisticStatus({ targetId, newStatus })

      try {
        const res = await fetch("/api/partners/pipeline-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseId: targetId, pipeline_status: newStatus }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          toast.error(errData.error || "Erreur lors de la mise à jour du statut commercial.")
          return
        }

        // 2. Commit permanent dans l'état local pour ne pas régresser à la fin de la transition
        setInternalPurchases((prev) =>
          prev.map((item) => {
            const match =
              (item.purchase_id && item.purchase_id === targetId) ||
              (item.id && item.id === targetId) ||
              (item.lead_id && item.lead_id === targetId)
            return match ? { ...item, pipeline_status: newStatus } : item
          })
        )

        // 3. Notification au shell parent pour synchronisation globale
        onUpdateStatus?.(targetId, newStatus)

        // 4. Synchronisation du drawer s'il est ouvert sur ce dossier
        setSelectedLeadForDrawer((prev: any) => {
          if (!prev) return null
          const match =
            (prev.purchase_id && prev.purchase_id === targetId) ||
            (prev.id && prev.id === targetId) ||
            (prev.lead_id && prev.lead_id === targetId)
          return match ? { ...prev, pipeline_status: newStatus } : prev
        })

        const stageObj = PIPELINE_STAGES.find((s) => s.id === newStatus)
        toast.success(`Dossier mis à jour : ${stageObj?.label || newStatus}`)
      } catch {
        toast.error("Échec réseau lors de la mise à jour.")
      } finally {
        setUpdatingId(null)
      }
    })
  }

  // Comptages des segments pour les bulles de filtres
  const counts = useMemo(() => {
    let b2b = 0
    let b2c = 0
    const stageCounts: Record<string, number> = {
      to_contact: 0,
      contacted: 0,
      meeting_scheduled: 0,
      quote_sent: 0,
      won: 0,
      lost: 0,
    }

    optimisticPurchases.forEach((p) => {
      const seg = p.segment || (p.leads && p.leads.segment)
      if (seg === "B2B") b2b++
      else if (seg === "B2C") b2c++

      const st = p.pipeline_status || "to_contact"
      if (stageCounts[st] !== undefined) {
        stageCounts[st]++
      }
    })

    return {
      all: optimisticPurchases.length,
      b2b,
      b2c,
      stages: stageCounts,
    }
  }, [optimisticPurchases])

  const stageFilterOptions = useMemo(
    () => [
      { value: "ALL", label: "Tous les statuts", badge: counts.all },
      ...PIPELINE_STAGES.map((s) => ({
        value: s.id,
        label: s.label,
        badge: counts.stages[s.id] || 0,
      })),
    ],
    [counts]
  )

  const tablePipelineOptions = useMemo(
    () =>
      PIPELINE_STAGES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
    []
  )

  // Filtrage et Tri des dossiers en portefeuille
  const filteredPurchases = useMemo(() => {
    let result = optimisticPurchases.filter((item) => {
      const seg = item.segment || (item.leads && item.leads.segment)
      if (segmentFilter !== "ALL" && seg !== segmentFilter) return false

      const prov = item.province || (item.leads && item.leads.province)
      if (selectedProvince !== "ALL" && prov?.toLowerCase() !== selectedProvince.toLowerCase()) {
        return false
      }

      const st = item.pipeline_status || "to_contact"
      if (selectedStage !== "ALL" && st !== selectedStage) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const fullName = `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase()
        const company = (item.company || "").toLowerCase()
        const email = (item.email || "").toLowerCase()
        const phone = (item.phone || "").toLowerCase()
        const city = (item.city || "").toLowerCase()
        const postal = (item.postal_code || item.masked_postal_code || "").toLowerCase()
        const address = (item.site_address || "").toLowerCase()

        if (
          !fullName.includes(q) &&
          !company.includes(q) &&
          !email.includes(q) &&
          !phone.includes(q) &&
          !city.includes(q) &&
          !postal.includes(q) &&
          !address.includes(q)
        ) {
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

      if (sortBy === "status") {
        const stageOrder: Record<string, number> = {
          to_contact: 1,
          contacted: 2,
          meeting_scheduled: 3,
          quote_sent: 4,
          won: 5,
          lost: 6,
        }
        const aOrd = stageOrder[a.pipeline_status || "to_contact"] || 99
        const bOrd = stageOrder[b.pipeline_status || "to_contact"] || 99
        return aOrd - bOrd
      }

      if (sortBy === "alpha") {
        const aName = (a.company || `${a.last_name || ""} ${a.first_name || ""}`).toLowerCase()
        const bName = (b.company || `${b.last_name || ""} ${b.first_name || ""}`).toLowerCase()
        return aName.localeCompare(bName)
      }

      // Par défaut : plus récents achats
      const aTime = a.purchased_at ? new Date(a.purchased_at).getTime() : 0
      const bTime = b.purchased_at ? new Date(b.purchased_at).getTime() : 0
      return bTime - aTime
    })

    return result
  }, [optimisticPurchases, segmentFilter, selectedProvince, selectedStage, searchQuery, sortBy])

  // KPIs de portefeuille CRM
  const kpis = useMemo(() => {
    let totalPower = 0
    let wonCount = 0
    let totalContractValue = 0

    filteredPurchases.forEach((item) => {
      const surfaceArea = Math.max(0, Number(item.surface_area || item.surface_area_m2) || 0)
      const annualBill = Math.max(0, Number(item.annual_electricity_bill || item.annual_bill_eur) || 0)
      const cost = item.credits_spent ?? (item.segment === "B2B" ? 8 : 2)

      const financials = calculateMarketplaceFinancials({
        segment: item.segment,
        surfaceArea,
        surfaceType: item.surface_type,
        annualBill,
        creditCost: cost,
      })

      const power = item.estimated_power_kwc ?? financials.estimatedPowerKwc
      totalPower += power
      totalContractValue += financials.estimatedContractValue || 0

      if (item.pipeline_status === "won") {
        wonCount++
      }
    })

    const winRate =
      filteredPurchases.length > 0 ? Math.round((wonCount / filteredPurchases.length) * 100) : 0

    return {
      totalLeads: filteredPurchases.length,
      totalPower,
      wonCount,
      winRate,
      totalContractValue,
    }
  }, [filteredPurchases])

  const resetFilters = () => {
    setSearchQuery("")
    setSegmentFilter("ALL")
    setSelectedProvince("ALL")
    setSelectedStage("ALL")
    setSortBy("recent")
  }

  const hasActiveFilters =
    searchQuery !== "" ||
    segmentFilter !== "ALL" ||
    selectedProvince !== "ALL" ||
    selectedStage !== "ALL" ||
    sortBy !== "recent"

  // État vide total du portefeuille (0 achat)
  if (optimisticPurchases.length === 0) {
    return (
      <div className="space-y-4">
        {/* Tutoriel interactif complet également accessible depuis l'état vide */}
        <CrmInteractiveTour
          isOpen={showTutorial}
          onClose={handleDismissTutorial}
          onExploreMarketplace={onExploreMarketplace}
          hasPurchases={false}
        />

        <div className="rounded-3xl border border-border bg-card p-12 sm:p-16 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/80 border border-border">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-foreground">Votre CRM est actuellement vide</h3>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Débloquez des dossiers solaires qualifiés sur la Marketplace pour obtenir leurs coordonnées
            directes vérifiées et piloter vos relances commerciales ici.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <Button
              size="default"
              variant="outline"
              onClick={() => setShowTutorial(true)}
              className="rounded-xl border-border text-foreground font-semibold text-xs px-4 shadow-2xs cursor-pointer hover:bg-secondary"
            >
              <Compass className="h-4 w-4 mr-1.5 text-accent" />
              <span>Visite guidée du CRM</span>
            </Button>
            {onExploreMarketplace && (
              <Button
                size="default"
                onClick={onExploreMarketplace}
                className="rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs px-5 shadow-xs cursor-pointer"
              >
                <span>Accéder à la Marketplace des chantiers</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── 0. Visite Guidée Interactive de Mon CRM (Modal pas à pas) ── */}
      <CrmInteractiveTour
        isOpen={showTutorial}
        onClose={handleDismissTutorial}
        onExploreMarketplace={onExploreMarketplace}
        hasPurchases={optimisticPurchases.length > 0}
      />
      {/* ── 1. Barre de Contrôle Unifiée (Identique à la Marketplace) ── */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-3.5 shadow-xs space-y-3">
        {/* Ligne 1 : Segments avec compteurs, Province, Statut Pipeline, Recherche, Tri et Switcher Grille/Tableau */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Segments + Province + Statut Pipeline */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segment switch avec bulles de comptage */}
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
                    segmentFilter === "ALL" ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
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
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span>B2B Exclusif</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "B2B" ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
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
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span>B2C Débloqué</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "B2C" ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
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

            {/* Filtre Statut Pipeline CustomSelect stylisé comme le bouton */}
            <CustomSelect
              value={selectedStage}
              onChange={(val) => setSelectedStage(val)}
              options={stageFilterOptions}
              icon={TrendingUp}
              ariaLabel="Filtrer par statut commercial"
            />
          </div>

          {/* Recherche, Tri & Switcher Grille / Tableau */}
          <div className="flex flex-wrap items-center gap-2 flex-1 lg:max-w-2xl justify-end">
            {/* Recherche textuelle compacte */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Client, commune, tél, email..."
                className="w-full rounded-xl border border-border bg-card pl-8.5 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary h-9 transition-all"
                aria-label="Rechercher un dossier client"
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
              ariaLabel="Trier les dossiers"
            />

            {/* Bouton Visite guidée CRM */}
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-secondary px-3 h-9 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs hover:border-accent/40"
              title="Lancer le tutoriel interactif complet de Mon CRM"
            >
              <Compass className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="hidden sm:inline">Guide CRM</span>
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

        {/* Ligne 2 : Statut opérationnel épuré avec KPIs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/70 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5 text-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="font-mono text-foreground font-bold tabular-nums">
                {kpis.totalLeads}
              </strong>{" "}
              dossier{kpis.totalLeads > 1 ? "s" : ""} en portefeuille
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

            <span className="flex items-center gap-1 font-mono text-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <strong className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                {kpis.wonCount}
              </strong>{" "}
              signé{kpis.wonCount > 1 ? "s" : ""} ({kpis.winRate}%)
            </span>

            <span className="text-border">|</span>

            <span className="text-foreground font-mono">
              <strong className="tabular-nums">
                ~{Math.round(kpis.totalContractValue / 1000).toLocaleString("fr-BE")} k€
              </strong>{" "}
              volume estimé
            </span>
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

      {/* ── 2. Rendu des Dossiers : Grille de Cartes Réalistes ou Tableau Haute Densité ── */}
      {filteredPurchases.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <SlidersHorizontal className="mx-auto h-9 w-9 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-bold text-foreground">Aucun dossier avec ces filtres</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Élargissez votre recherche ou sélectionnez un autre statut commercial.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            className="mt-4 text-xs font-semibold cursor-pointer border-border"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Afficher tous les dossiers
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Vue Grille : Cartes Photographiques en Lignes de 2 (2 Colonnes) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredPurchases.map((item, index) => {
            const itemId = item.purchase_id || item.id || item.lead_id
            return (
              <CrmPortfolioCard
                key={itemId}
                item={item}
                index={index}
                isPending={updatingId === itemId}
                onInspect={() => setSelectedLeadForDrawer({ ...item, already_purchased: true })}
                onStatusChange={(newStatus) => handleStatusChange(item, newStatus)}
                onOpenDispute={() => onOpenDispute(item)}
                onOpenExpertModal={() => onOpenExpertModal?.(item)}
              />
            )
          })}
        </div>
      ) : (
        /* ── Vue Liste Dense Haute-Productivité (Style Marketplace) ── */
        <div className="space-y-1.5">
          <div className="block sm:hidden text-center text-[11px] font-mono text-muted-foreground py-0.5">
            ↔ Glisser horizontalement pour voir toutes les colonnes
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs overscroll-x-contain">
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3">Modèle</th>
                  <th className="px-4 py-3">Client / Contact</th>
                  <th className="px-4 py-3">Localisation</th>
                  <th className="px-4 py-3">Puissance</th>
                  <th className="px-4 py-3">Marge Estimée</th>
                  <th className="px-4 py-3">Statut Pipeline</th>
                  <th className="px-4 py-3 text-right">Actions directes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPurchases.map((item) => {
                  const isB2B = item.segment === "B2B"
                  const surfaceArea = Math.max(0, Number(item.surface_area || item.surface_area_m2) || 0)
                  const annualBill = Math.max(0, Number(item.annual_electricity_bill || item.annual_bill_eur) || 0)
                  const cost = item.credits_spent ?? (isB2B ? 9 : 3)

                  const financials = calculateMarketplaceFinancials({
                    segment: item.segment,
                    surfaceArea,
                    surfaceType: item.surface_type,
                    annualBill,
                    creditCost: cost,
                  })

                  const location = getLeadLocationInfo(item)
                  const powerKwc = item.estimated_power_kwc ?? financials.estimatedPowerKwc

                  return (
                    <tr
                      key={item.purchase_id || item.id}
                      onClick={() => setSelectedLeadForDrawer({ ...item, already_purchased: true })}
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
                          {isB2B ? "B2B Exclusif" : "B2C Débloqué"}
                        </span>
                      </td>

                      {/* Client / Contact */}
                      <td className="px-4 py-3 text-foreground font-medium">
                        <div className="font-bold group-hover:text-primary transition-colors">
                          {item.company ? `${item.company} — ` : ""}
                          {item.first_name} {item.last_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {item.phone} • {item.email}
                        </div>
                      </td>

                      {/* Localisation */}
                      <td className="px-4 py-3 text-foreground">
                        <div className="font-semibold">{location.fullTitle}</div>
                        <div className="text-[11px] text-muted-foreground">{location.provinceLabel}</div>
                      </td>

                      {/* Puissance */}
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono font-bold text-sm tabular-nums">
                            {powerKwc > 0 ? powerKwc : "—"}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            kWc
                          </span>
                        </div>
                      </td>

                      {/* Marge Estimée */}
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        <div className="font-mono font-bold text-accent tabular-nums">
                          {formatRoundedCurrency(financials.estimatedInstallerMargin)} HT
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} €/an` : "Facture"}
                        </div>
                      </td>

                      {/* Statut Pipeline (CustomSelect interactif) */}
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <CustomSelect
                          value={item.pipeline_status || "to_contact"}
                          onChange={(val) => handleStatusChange(item, val)}
                          options={tablePipelineOptions}
                          disabled={updatingId === (item.purchase_id || item.id || item.lead_id)}
                          size="sm"
                          triggerClassName="h-7 px-2.5 text-xs font-semibold"
                          contentClassName="min-w-[160px]"
                          ariaLabel="Modifier le statut commercial"
                        />
                      </td>

                      {/* Actions directes */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLeadForDrawer({ ...item, already_purchased: true })}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer border-border hover:bg-secondary text-foreground"
                          >
                            Inspecter
                          </Button>
                          <a
                            href={`tel:${item.phone}`}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-[#0F172A] px-3 text-xs font-bold text-white hover:bg-[#0F172A]/90 transition-colors shadow-2xs gap-1"
                            title="Appeler directement"
                          >
                            <Phone className="h-3.5 w-3.5 text-accent" />
                            <span>Appel</span>
                          </a>
                          <a
                            href={buildWhatsAppLink(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          </a>
                          <button
                            type="button"
                            onClick={() => downloadLeadVCard(item)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            title="Exporter la vCard (.vcf)"
                          >
                            <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenExpertModal?.(item)}
                            className="inline-flex h-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 hover:bg-accent/20 px-2.5 text-xs font-bold text-foreground transition-colors gap-1 shadow-2xs cursor-pointer"
                            title="Demander l'aide d'un expert pour ce dossier (% projet à négocier)"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-accent" />
                            <span>Expert</span>
                          </button>
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

      {/* ── 3. Tiroir Latéral d'Inspection Rapide (Slide-over) ── */}
      {selectedLeadForDrawer && (
        <LeadInspectionDrawer
          lead={selectedLeadForDrawer}
          partnerCredits={0}
          isBuying={false}
          onClose={() => setSelectedLeadForDrawer(null)}
          onPurchase={() => {}}
          onRequestTopUp={() => {}}
          onRequestExpert={(lead) => onOpenExpertModal?.(lead)}
        />
      )}
    </div>
  )
}

/**
 * Composant Carte CRM (Reprend exactement le design et la grille de la carte Marketplace)
 */
function CrmPortfolioCard({
  item,
  index,
  isPending,
  onInspect,
  onStatusChange,
  onOpenDispute,
  onOpenExpertModal,
}: {
  item: any
  index: number
  isPending: boolean
  onInspect: () => void
  onStatusChange: (newStatus: string) => void
  onOpenDispute: () => void
  onOpenExpertModal?: (lead: any) => void
}) {
  const isB2B = item.segment === "B2B"
  const surfaceArea = Math.max(0, Number(item.surface_area || item.surface_area_m2) || 0)
  const annualBill = Math.max(0, Number(item.annual_electricity_bill || item.annual_bill_eur) || 0)
  const cost = item.credits_spent ?? (isB2B ? 9 : 3)

  const financials = calculateMarketplaceFinancials({
    segment: item.segment,
    surfaceArea,
    surfaceType: item.surface_type,
    annualBill,
    creditCost: cost,
  })

  const location = getLeadLocationInfo(item)
  const unlockedDateLabel = formatLeadUnlockDate(item.purchased_at || item.created_at)
  const powerKwc = item.estimated_power_kwc ?? financials.estimatedPowerKwc

  // Images dédiées cohérentes avec la marketplace
  const leadImage = isB2B ? B2B_SOLAR_IMAGE : B2C_SOLAR_IMAGE

  // Calculs financiers cohérents
  const contractMin = Math.round((financials.estimatedContractValueRange?.min || 0) / 1000) * 1000
  const contractMax = Math.round((financials.estimatedContractValueRange?.max || 0) / 1000) * 1000
  const marginEst = Math.round((financials.estimatedInstallerMargin || 0) / 1000) * 1000

  const rangeText = `${contractMin.toLocaleString("fr-BE")} € HT à ${contractMax.toLocaleString("fr-BE")} € HT`
  const marginText = `~${marginEst.toLocaleString("fr-BE")} € HT`

  const rawRoof = getRoofMaterialLabel(item.roof_material)
  const roofDisplay = rawRoof === "Bac acier / Métallique" ? "Bac acier / Mét..." : rawRoof

  // Trouver l'étape actuelle
  const currentStage =
    PIPELINE_STAGES.find((s) => s.id === (item.pipeline_status || "to_contact")) || PIPELINE_STAGES[0]

  return (
    <div
      onClick={onInspect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onInspect()
        }
      }}
      className="group relative flex flex-col justify-between rounded-3xl border bg-white dark:bg-card shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden text-left border-slate-200/90 dark:border-border hover:border-slate-300 dark:hover:border-border/80"
    >
      <div className="flex flex-col">
        {/* ── A. Photo de toiture avec badges superposés ── */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100 dark:bg-muted">
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
              {isB2B ? "B2B • Client Direct" : "B2C • Débloqué"}
            </span>

            {/* Badge Statut Commercial Actuel */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full text-xs font-bold px-3 py-1.5 shadow-sm ${currentStage.badgeClass}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              <span>{currentStage.label}</span>
            </span>
          </div>

          {/* Flèche droite de prévisualisation (affordance visuelle) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-xs transition-all pointer-events-none opacity-85 group-hover:opacity-100">
            <ChevronRight className="h-4 w-4" />
          </div>

          {/* Date de déblocage en bas à gauche */}
          <span className="absolute bottom-2.5 left-3 text-[10px] font-medium text-white/90 bg-black/55 backdrop-blur-xs px-2.5 py-0.5 rounded-full pointer-events-none flex items-center gap-1">
            <Calendar className="h-3 w-3 text-white/80" />
            <span>{unlockedDateLabel}</span>
          </span>

          {/* Mention discrète illustration */}
          <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-white/85 bg-black/45 backdrop-blur-xs px-2.5 py-0.5 rounded-full pointer-events-none">
            Coordonnées débloquées
          </span>
        </div>

        {/* ── B. Contenu de la Carte : Client, Puissance, Statut 1-Tap, Spécifications 2x2, Économie ── */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Ligne 1 : Nom du client à gauche & Puissance kWc à droite */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-base sm:text-[17px] text-slate-900 dark:text-foreground tracking-tight leading-tight group-hover:text-blue-900 dark:group-hover:text-primary transition-colors truncate min-w-0">
              {item.company ? `${item.company} — ` : ""}
              {item.first_name} {item.last_name}
            </h3>
            <div className="text-right shrink-0 flex items-baseline justify-end gap-1 pl-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] dark:text-foreground tracking-tight tabular-nums">
                {powerKwc > 0 ? powerKwc : "—"}
              </span>
              <span className="text-xs font-bold text-slate-500 lowercase">kWc</span>
            </div>
          </div>

          {/* Ligne 2 : Localisation exacte sur toute la largeur */}
          <p className="text-xs text-slate-500 dark:text-muted-foreground font-medium flex items-center gap-1.5 -mt-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {item.site_address
                ? `${item.site_address}, ${location.city} (${item.postal_code || ""})`
                : `${location.fullTitle} • ${location.provinceLabel}`}
            </span>
          </p>

          {/* Ligne 3 : Sélecteur de statut commercial 1-Tap (Défilement fluide) */}
          <div className="flex flex-col gap-1 -mt-0.5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <span>STATUT PIPELINE</span>
                {isPending && (
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                )}
              </span>
              <span className="text-slate-500 font-semibold lowercase">
                {isPending ? "mise à jour..." : "cliquer pour changer"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 overscroll-x-contain">
              {PIPELINE_STAGES.map((stage) => {
                const isActive = (item.pipeline_status || "to_contact") === stage.id
                return (
                  <button
                    key={stage.id}
                    type="button"
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (!isActive) {
                        onStatusChange(stage.id)
                      }
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? stage.pillActiveClass
                        : "border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/40 text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-secondary hover:text-slate-900 dark:hover:text-foreground font-medium"
                    } ${isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {stage.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Ligne 4 : Grille Technique & Contact Direct 2x2 dans un encart clair dédié */}
          <div className="rounded-2xl bg-[#F8FAFD] dark:bg-secondary/40 border border-[#E9EFF7] dark:border-border p-3 sm:p-3.5 grid grid-cols-2 gap-2.5 sm:gap-3 text-xs">
            {/* 1. Téléphone direct */}
            <div className="flex items-start gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Phone className="h-4 w-4 text-slate-700 dark:text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  TÉLÉPHONE DIRECT
                </span>
                <a
                  href={`tel:${item.phone}`}
                  className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-foreground font-mono tabular-nums leading-tight block truncate hover:underline"
                  title="Appeler directement"
                >
                  {item.phone || "—"}
                </a>
              </div>
            </div>

            {/* 2. Email direct */}
            <div className="flex items-start gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
              <Mail className="h-4 w-4 text-slate-700 dark:text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  EMAIL DIRECT
                </span>
                <a
                  href={`mailto:${item.email}`}
                  className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-foreground font-mono leading-tight block truncate hover:underline"
                  title="Envoyer un e-mail"
                >
                  {item.email || "—"}
                </a>
              </div>
            </div>

            {/* 3. Toiture & Surface */}
            <div className="flex items-start gap-2 min-w-0">
              <Home className="h-4 w-4 text-slate-700 dark:text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  TOITURE &amp; SURFACE
                </span>
                <span
                  className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-foreground leading-tight block truncate"
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
            </div>

            {/* 4. Facture Élec */}
            <div className="flex items-start gap-2 min-w-0">
              <FileText className="h-4 w-4 text-slate-700 dark:text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  FACTURE ÉLEC.
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-foreground leading-tight block truncate font-mono">
                  {annualBill > 0 ? (
                    <span className="tabular-nums">
                      {annualBill.toLocaleString("fr-BE")} €/an
                    </span>
                  ) : (
                    <span>{isB2B ? "Facture pro" : "Tarif résidentiel"}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Ligne 5 : Encadré d'Économie & Marge Indicative (Teinte bleue douce) */}
          <div className="rounded-2xl bg-[#F3F7FF] dark:bg-secondary/60 border border-[#DCE7FD] dark:border-border/80 p-3 sm:p-3.5 flex items-center justify-between gap-2">
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
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-foreground tabular-nums block whitespace-nowrap font-mono">
                  {rangeText}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 pl-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-right">
                MARGE INDICATIVE
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#2563EB] tabular-nums block text-right whitespace-nowrap font-mono">
                {marginText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── C. Pied de Carte : Actions Directes Pilules (Appel, WhatsApp, vCard, Fiche, Litige) ── */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-slate-100 dark:border-border flex flex-wrap items-center justify-between gap-2">
        {/* Statut débloqué vérifié */}
        <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-xs text-slate-900 dark:text-foreground">
              Contact vérifié
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              ({cost} crédits)
            </span>
          </div>
        </div>

        {/* Boutons d'action pilules compacts */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Appel direct */}
          <a
            href={`tel:${item.phone}`}
            className="rounded-full bg-[#0B1528] hover:bg-[#1E293B] text-white px-3 sm:px-3.5 py-1.5 text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Appeler directement le prospect"
          >
            <Phone className="h-3.5 w-3.5 text-accent" />
            <span>Appel</span>
          </a>

          {/* WhatsApp */}
          <a
            href={buildWhatsAppLink(item)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-foreground shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Envoyer un WhatsApp personnalisé"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>WA</span>
          </a>

          {/* Export vCard */}
          <button
            type="button"
            onClick={() => downloadLeadVCard(item)}
            className="rounded-full border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-secondary px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-foreground shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Exporter le contact dans vos contacts smartphone (.vcf)"
          >
            <UserPlus className="h-3.5 w-3.5 text-slate-500" />
            <span>vCard</span>
          </button>

          {/* Fiche complète */}
          <button
            type="button"
            onClick={onInspect}
            className="rounded-full border border-slate-200 dark:border-border bg-white dark:bg-card hover:bg-slate-50 dark:hover:bg-secondary px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-foreground shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Ouvrir le dossier technique complet"
          >
            <Eye className="h-3.5 w-3.5 text-[#2563EB]" />
            <span className="hidden sm:inline">Fiche</span>
          </button>

          {/* Aide Expert / Étude */}
          <button
            type="button"
            onClick={onOpenExpertModal}
            className="rounded-full border border-accent/40 bg-accent/10 hover:bg-accent/20 text-foreground px-2.5 sm:px-3 py-1.5 text-xs font-bold shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Demander l'aide d'un expert pour ce dossier (% projet à négocier selon l'envergure)"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Expert</span>
          </button>

          {/* Litige 24h */}
          <button
            type="button"
            onClick={onOpenDispute}
            disabled={Boolean(item.dispute_id)}
            className="rounded-full border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
            title="Signaler un numéro invalide ou faux lead sous 24h"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{item.dispute_id ? "Litige" : "24h"}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
