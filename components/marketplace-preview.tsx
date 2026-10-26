"use client"

import * as React from "react"
import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import {
  MapPin,
  ShieldCheck,
  Lock,
  Unlock,
  Info,
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  Coins,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import {
  getLeadLocationInfo,
  formatRoundedCurrency,
  calculateLeadRoiRatio,
  getLeadFreshness,
  getRoofMaterialLabel,
  getTimeframeLabel,
  getOwnershipLabel,
} from "@/lib/lead-display-helpers"
import { LeadInspectionDrawer } from "@/components/partners/dashboard/lead-inspection-drawer"

export interface DemoLead {
  id: string
  segment: "B2B" | "B2C"
  city: string
  province: string
  postal_code: string
  masked_postal_code: string
  surface_area: number
  surface_type: string
  roof_material: string
  annual_electricity_bill: number
  estimated_power_kwc: number
  credit_cost: number
  max_slots: number
  taken_slots: number
  remaining_slots: number
  ownership_status: string
  timeframe: string
  project_timeline?: string
  project_driver: string
  project_details?: string
  message: string
  grd: string
  created_at: string
  first_name: string
  last_name: string
  company?: string | null
  company_vat?: string | null
  phone: string
  email: string
  site_address?: string
  coords?: [number, number]
  lead_score?: number
  is_demo_preview?: boolean
}

const NOW = Date.now()

const DEMO_LEADS: DemoLead[] = [
  {
    id: "demo-b2b-1",
    is_demo_preview: true,
    segment: "B2B",
    city: "Herstal",
    province: "liege",
    postal_code: "4040",
    masked_postal_code: "40XX",
    surface_area: 2400,
    surface_type: "toiture",
    roof_material: "bac_acier",
    annual_electricity_bill: 46000,
    estimated_power_kwc: 408,
    credit_cost: 8,
    max_slots: 1,
    taken_slots: 0,
    remaining_slots: 1,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "reduire_facture",
    message: "Audit toiture 2025 validé. Souhaite une offre pour toiture industrielle avec injection réseau et autoconsommation maximale.",
    project_details: "Audit structurel toiture validé. Décideur unique joignable directement par téléphone. Compteur moyenne tension déjà équipé.",
    grd: "RESA",
    created_at: new Date(NOW - 14 * 60 * 1000).toISOString(),
    first_name: "Marc",
    last_name: "V.",
    company: "Société Logistique SA",
    company_vat: "BE 0442.***.***",
    phone: "—",
    email: "—",
    coords: [50.6653, 5.63],
    lead_score: 96,
  },
  {
    id: "demo-b2c-1",
    is_demo_preview: true,
    segment: "B2C",
    city: "Wavre",
    province: "brabant_wallon",
    postal_code: "1300",
    masked_postal_code: "13XX",
    surface_area: 140,
    surface_type: "toiture",
    roof_material: "tuiles",
    annual_electricity_bill: 3400,
    estimated_power_kwc: 24,
    credit_cost: 2,
    max_slots: 3,
    taken_slots: 1,
    remaining_slots: 2,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "autoconsommation",
    message: "Maison 4 façades bien orientée Sud-Sud-Est. Compteur bidirectionnel déjà installé. Souhaite ajouter une batterie domestique 10 kWh.",
    project_details: "Numéro de téléphone vérifié par appel manuel Aegis Solaire. Projet mature, budget alloué, attend 2 devis comparatifs maximum.",
    grd: "ORES",
    created_at: new Date(NOW - 32 * 60 * 1000).toISOString(),
    first_name: "Sophie",
    last_name: "L.",
    phone: "—",
    email: "—",
    coords: [50.7172, 4.6133],
    lead_score: 91,
  },
  {
    id: "demo-b2b-2",
    is_demo_preview: true,
    segment: "B2B",
    city: "Gosselies",
    province: "hainaut",
    postal_code: "6041",
    masked_postal_code: "60XX",
    surface_area: 1600,
    surface_type: "parking",
    roof_material: "plat_epdm",
    annual_electricity_bill: 32000,
    estimated_power_kwc: 272,
    credit_cost: 8,
    max_slots: 1,
    taken_slots: 0,
    remaining_slots: 1,
    ownership_status: "owner",
    timeframe: "immediat",
    project_timeline: "immediat",
    project_driver: "flotte_irve",
    message: "Parking 80 places et toiture de bureaux. Projet d'ombrières avec 4 bornes de recharge rapide DC.",
    project_details: "Projet validé au conseil d'administration. Recherche un installateur RESCERT avec références tertiaires en Wallonie.",
    grd: "ORES",
    created_at: new Date(NOW - 65 * 60 * 1000).toISOString(),
    first_name: "Didier",
    last_name: "R.",
    company: "AeroTech SCRL",
    company_vat: "BE 0812.***.***",
    phone: "—",
    email: "—",
    coords: [50.465, 4.435],
    lead_score: 94,
  },
  {
    id: "demo-b2c-2",
    is_demo_preview: true,
    segment: "B2C",
    city: "Namur",
    province: "namur",
    postal_code: "5100",
    masked_postal_code: "51XX",
    surface_area: 95,
    surface_type: "toiture",
    roof_material: "ardoises",
    annual_electricity_bill: 2600,
    estimated_power_kwc: 14,
    credit_cost: 2,
    max_slots: 3,
    taken_slots: 0,
    remaining_slots: 3,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "reduire_facture",
    message: "Pente de toit à 40 degrés, aucune ombre portée. Facture annuelle de 2600 € souhaitant être réduite au maximum.",
    project_details: "Facture d'électricité et photos de toiture téléversées lors de la qualification. Téléphone vérifié.",
    grd: "ORES",
    created_at: new Date(NOW - 120 * 60 * 1000).toISOString(),
    first_name: "Benoît",
    last_name: "D.",
    phone: "—",
    email: "—",
    coords: [50.455, 4.875],
    lead_score: 89,
  },
  {
    id: "demo-b2b-3",
    is_demo_preview: true,
    segment: "B2B",
    city: "Libramont",
    province: "luxembourg",
    postal_code: "6800",
    masked_postal_code: "68XX",
    surface_area: 3200,
    surface_type: "toiture",
    roof_material: "bac_acier",
    annual_electricity_bill: 58000,
    estimated_power_kwc: 544,
    credit_cost: 18,
    max_slots: 1,
    taken_slots: 0,
    remaining_slots: 1,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "tiers_invest",
    message: "2 hangars récents de 1600 m² chacun. Raccordement cabine haute tension déjà validé par ORES. Recherche installateur certifié RESCERT.",
    project_details: "Charpente lamellé-collé récente avec note de calcul de surcharge validée par bureau de contrôle. Décideur unique.",
    grd: "ORES",
    created_at: new Date(NOW - 180 * 60 * 1000).toISOString(),
    first_name: "Jean-François",
    last_name: "C.",
    company: "Agro-Logistique SA",
    company_vat: "BE 0501.***.***",
    phone: "—",
    email: "—",
    coords: [49.9167, 5.3833],
    lead_score: 97,
  },
  {
    id: "demo-b2c-3",
    is_demo_preview: true,
    segment: "B2C",
    city: "Arlon",
    province: "luxembourg",
    postal_code: "6700",
    masked_postal_code: "67XX",
    surface_area: 110,
    surface_type: "toiture",
    roof_material: "tuiles",
    annual_electricity_bill: 3100,
    estimated_power_kwc: 18,
    credit_cost: 2,
    max_slots: 3,
    taken_slots: 2,
    remaining_slots: 1,
    ownership_status: "owner",
    timeframe: "3_6mois",
    project_timeline: "3_6mois",
    project_driver: "reduire_facture",
    message: "Maison construite en 2018. Compteur communicant déjà en place. Souhaite coupler solaire et pompe à chaleur.",
    project_details: "Dossier qualifié avec 2 installateurs déjà positionnés. Reste 1 place disponible avant fermeture définitive du dossier.",
    grd: "ORES",
    created_at: new Date(NOW - 240 * 60 * 1000).toISOString(),
    first_name: "Marc",
    last_name: "G.",
    phone: "—",
    email: "—",
    coords: [49.6833, 5.8167],
    lead_score: 88,
  },
]

export function MarketplaceLivePreview() {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<"recent" | "power_desc" | "margin_desc" | "cost_asc">("recent")
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<DemoLead | null>(null)
  const [leadForSignupModal, setLeadForSignupModal] = useState<DemoLead | null>(null)
  const [showSignupModal, setShowSignupModal] = useState(false)

  // Filtrage et Tri des opportunités
  const filteredLeads = useMemo(() => {
    let result = DEMO_LEADS.filter((lead) => {
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
      const aSurface = a.surface_area || 0
      const bSurface = b.surface_area || 0
      const aPower = a.estimated_power_kwc ?? Math.round(aSurface * 0.17)
      const bPower = b.estimated_power_kwc ?? Math.round(bSurface * 0.17)

      if (sortBy === "power_desc") return bPower - aPower

      if (sortBy === "margin_desc") {
        const aFin = calculateMarketplaceFinancials({
          segment: a.segment,
          surfaceArea: aSurface,
          annualBill: a.annual_electricity_bill,
        })
        const bFin = calculateMarketplaceFinancials({
          segment: b.segment,
          surfaceArea: bSurface,
          annualBill: b.annual_electricity_bill,
        })
        return bFin.estimatedInstallerMargin - aFin.estimatedInstallerMargin
      }

      if (sortBy === "cost_asc") {
        return a.credit_cost - b.credit_cost
      }

      return 0
    })

    return result
  }, [segmentFilter, selectedProvince, searchQuery, sortBy])

  // KPIs discrets agrégés
  const kpis = useMemo(() => {
    let totalPower = 0
    let totalMargin = 0
    let b2bCount = 0
    let b2cCount = 0

    filteredLeads.forEach((lead) => {
      if (lead.segment === "B2B") b2bCount++
      if (lead.segment === "B2C") b2cCount++

      const financials = calculateMarketplaceFinancials({
        segment: lead.segment,
        surfaceArea: lead.surface_area,
        surfaceType: lead.surface_type,
        annualBill: lead.annual_electricity_bill,
        creditCost: lead.credit_cost,
      })

      totalPower += lead.estimated_power_kwc ?? financials.estimatedPowerKwc
      totalMargin += financials.estimatedInstallerMargin
    })

    return {
      totalLeads: filteredLeads.length,
      totalPower,
      totalMargin,
      b2bCount,
      b2cCount,
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

  /**
   * Règle métier stricte demandée par l'utilisateur :
   * Ne jamais débloquer les leads dans l'aperçu public.
   * Afficher systématiquement un message modal institutionnel qui redirige vers le formulaire d'inscription.
   */
  const handleUnlockAttempt = (lead: DemoLead) => {
    setLeadForSignupModal(lead)
    setShowSignupModal(true)
  }

  const handleRedirectToRegistration = () => {
    setShowSignupModal(false)
    setSelectedLeadForDrawer(null)

    const formElement = document.getElementById("candidature")
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" })
      const firstInput = formElement.querySelector<HTMLInputElement>("input")
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 600)
      }
    }
    toast.info("Inscrivez-vous pour débloquer ce chantier et recevoir les coordonnées complètes.", {
      duration: 5000,
    })
  }

  return (
    <div className="space-y-4">
      {/* ── 1. Barre de Contrôle Unifiée (Identique à 100% à la Marketplace Réelle) ── */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-3.5 shadow-xs space-y-3">
        {/* Ligne 1 : Segments, Province, Recherche, Tri et Toggle Grille/Tableau */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Segments + Province */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Segment switch */}
            <div className="inline-flex items-center rounded-xl border border-border bg-secondary p-1">
              {(["ALL", "B2B", "B2C"] as const).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setSegmentFilter(seg)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    segmentFilter === seg
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {seg === "ALL" ? "Tous" : seg === "B2B" ? "B2B Exclusif" : "B2C Partagé"}
                </button>
              ))}
            </div>

            {/* Province select */}
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="rounded-xl border border-border bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground outline-hidden cursor-pointer h-9 transition-colors"
              aria-label="Filtrer par province"
            >
              <option value="ALL">Toute la Wallonie</option>
              <option value="liege">Liège</option>
              <option value="namur">Namur</option>
              <option value="hainaut">Hainaut</option>
              <option value="brabant_wallon">Brabant Wallon</option>
              <option value="luxembourg">Luxembourg</option>
            </select>
          </div>

          {/* Recherche, Tri et Switcher Grille / Tableau */}
          <div className="flex flex-wrap items-center gap-2 flex-1 lg:max-w-xl justify-end">
            {/* Recherche textuelle compacte */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Commune, CP, mot-clé..."
                className="w-full rounded-xl border border-border bg-card pl-8.5 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary h-9 transition-all"
                aria-label="Rechercher dans la marketplace"
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

            {/* Tri select */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-secondary/60 px-2.5 h-9">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-foreground outline-hidden cursor-pointer pr-1"
                aria-label="Trier les opportunités"
              >
                <option value="recent">Plus récents</option>
                <option value="power_desc">Puissance max</option>
                <option value="margin_desc">Marge max</option>
                <option value="cost_asc">Crédits min</option>
              </select>
            </div>

            {/* Switcher Grille / Tableau */}
            <div className="inline-flex items-center rounded-xl border border-border bg-secondary p-0.5 h-9">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                  viewMode === "grid"
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
                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Vue tableau (Dense / Linear)"
                aria-label="Vue tableau"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Ligne 2 : KPIs Discrets Intégrés & Reset de filtres */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="font-mono text-foreground font-bold tabular-nums">{kpis.totalLeads}</strong> dossiers
              actifs
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <strong className="text-foreground font-bold tabular-nums">
                {kpis.totalPower.toLocaleString("fr-BE")}
              </strong>{" "}
              kWc disponibles
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              marge cumulée{" "}
              <strong className="text-accent font-bold tabular-nums">
                {formatRoundedCurrency(kpis.totalMargin)}
              </strong>
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-accent hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Rendu des Opportunités : Grille ou Tableau ── */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <SlidersHorizontal className="mx-auto h-9 w-9 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-bold text-foreground">Aucun dossier disponible avec ces filtres</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Élargissez votre sélection de provinces ou réinitialisez les filtres.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            className="mt-4 text-xs font-medium cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Afficher toutes les opportunités
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Vue Grille : Rendu 100% Identique à MarketplaceFeedView ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredLeads.map((lead) => {
            const isB2B = lead.segment === "B2B"
            const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
            const remainingSlots = lead.remaining_slots ?? maxSlots
            const cost = lead.credit_cost

            const surfaceArea = lead.surface_area
            const annualBill = lead.annual_electricity_bill

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
            const roi = calculateLeadRoiRatio(
              financials.estimatedInstallerMargin,
              cost,
              financials.estimatedContractValue
            )

            // Indicateur visuel compact de disponibilité B2C (ex: ●●○ 2/3 dispos)
            const b2cDotIndicator = !isB2B
              ? Array.from({ length: maxSlots })
                  .map((_, i) => (i < remainingSlots ? "●" : "○"))
                  .join("")
              : ""

            return (
              <div
                key={lead.id}
                id={`lead-${lead.id}`}
                onClick={() => setSelectedLeadForDrawer(lead)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setSelectedLeadForDrawer(lead)
                  }
                }}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-5 transition-all cursor-pointer text-left shadow-xs hover:border-accent/40 hover:shadow-md"
              >
                <div className="flex flex-col gap-3.5">
                  {/* Ligne 1 : En-tête de Rareté & Fraîcheur */}
                  <div className="flex items-center justify-between gap-2 h-6">
                    {/* Badge modèle & disponibilité */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold ${
                        isB2B
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground border border-border"
                      }`}
                    >
                      {isB2B ? (
                        <span>B2B • Exclusif 100%</span>
                      ) : (
                        <span>
                          B2C • {b2cDotIndicator} {remainingSlots}/{maxSlots} dispos
                        </span>
                      )}
                    </span>

                    {/* Fraîcheur du lead */}
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotClass}`} />
                      <span>{freshness.label}</span>
                    </span>
                  </div>

                  {/* Ligne 2 : Titre d'Accroche Métier & Puissance en Grand Format */}
                  <div className="flex items-baseline justify-between gap-3 border-b border-border/80 pb-3">
                    <div className="min-w-0 pr-1">
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {location.fullTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {location.subtitle}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono text-xl sm:text-2xl font-black text-foreground tabular-nums whitespace-nowrap">
                        {powerKwc > 0 ? `${powerKwc} kWc` : "PV"}
                      </span>
                    </div>
                  </div>

                  {/* Ligne 3 : Réassurance Compacte & Grille Technique 2×2 */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Dossier vérifié : Tél, Toiture &amp; Statut</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/35 border border-border p-2.5 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Toiture &amp; Surface
                        </span>
                        <span className="font-semibold text-foreground truncate block font-mono">
                          {surfaceArea > 0 ? `${surfaceArea} m²` : "—"} · {getRoofMaterialLabel(lead.roof_material)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Facture Élec.
                        </span>
                        <span className="font-mono font-bold text-foreground tabular-nums truncate block">
                          {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} €/an` : "Résidentiel"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Échéance
                        </span>
                        <span className="font-semibold text-foreground flex items-center gap-1 truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                          <span className="truncate">{getTimeframeLabel(lead.timeframe || lead.project_timeline)}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Profil
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {getOwnershipLabel(lead.ownership_status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ligne 4 : Encadré d'Équation Financière (Arrondi & Ratio ROI) */}
                  <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Marge brute estimée</span>
                      <span className="font-mono font-bold text-accent tabular-nums">
                        {formatRoundedCurrency(financials.estimatedInstallerMargin)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-accent/10">
                      <span className="text-[11px] font-mono text-muted-foreground">Ratio rentabilité</span>
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-mono font-bold text-accent">
                        {roi.roiBadgeText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ligne 5 : Footer d'Action Sans Friction */}
                <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase font-mono tracking-wider">
                      Tarif
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-lg font-bold text-foreground tabular-nums">{cost}</span>
                      <span className="text-xs text-muted-foreground font-medium">crédits</span>
                      <span className="font-mono text-[11px] text-muted-foreground tabular-nums ml-1">
                        (~{financials.leadCostEuros} € HT)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedLeadForDrawer(lead)}
                      className="h-9 px-2.5 text-xs font-semibold cursor-pointer"
                      title="Inspecter le dossier"
                    >
                      <Info className="h-3.5 w-3.5 sm:mr-1 text-accent shrink-0" />
                      <span className="hidden sm:inline">Inspecter</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleUnlockAttempt(lead)}
                      className="h-9 px-3.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                    >
                      <Unlock className="h-3.5 w-3.5 mr-1" />
                      <span>Débloquer</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Vue Tableau Haute-Productivité (Identique à MarketplaceFeedView) ── */
        <div className="space-y-1.5">
          <div className="block sm:hidden text-center text-[11px] font-mono text-muted-foreground py-0.5">
            ↔ Glisser horizontalement pour voir toutes les colonnes
          </div>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs overscroll-x-contain">
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead className="border-b border-border bg-secondary/50 text-[11px] font-bold uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3">Modèle</th>
                  <th className="px-4 py-3">Localisation &amp; Province</th>
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
                  const cost = lead.credit_cost
                  const surfaceArea = lead.surface_area
                  const annualBill = lead.annual_electricity_bill

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
                      className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                    >
                      {/* Modèle Commercial */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold ${
                            isB2B
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground border border-border"
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
                        <span className="font-mono font-bold text-sm tabular-nums">
                          {powerKwc > 0 ? `${powerKwc} kWc` : "PV"}
                        </span>
                      </td>

                      {/* Toiture & Surface */}
                      <td className="px-4 py-3 text-foreground">
                        <div className="font-mono tabular-nums font-semibold">
                          {surfaceArea > 0 ? `${surfaceArea} m²` : "—"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                          {getRoofMaterialLabel(lead.roof_material)}
                        </div>
                      </td>

                      {/* Marge Estimée & ROI */}
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        <div className="font-mono font-bold text-accent tabular-nums">
                          {formatRoundedCurrency(financials.estimatedInstallerMargin)}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {annualBill > 0 ? `${annualBill.toLocaleString("fr-BE")} €/an` : "Standard"}
                        </div>
                      </td>

                      {/* Fraîcheur */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotClass}`} />
                          <span>{freshness.label}</span>
                        </span>
                      </td>

                      {/* Tarif */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-foreground tabular-nums">{cost} cr.</span>
                        <span className="text-[11px] text-muted-foreground font-mono ml-1">
                          (~{financials.leadCostEuros} €)
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLeadForDrawer(lead)}
                            className="h-8 px-2 text-xs font-semibold cursor-pointer"
                          >
                            <Info className="h-3 w-3 mr-1 text-accent" />
                            Inspecter
                          </Button>

                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUnlockAttempt(lead)}
                            className="h-8 px-2.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Débloquer
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

      {/* ── 3. Tiroir Latéral d'Inspection Technique (Exact LeadInspectionDrawer) ── */}
      {selectedLeadForDrawer && (
        <LeadInspectionDrawer
          lead={selectedLeadForDrawer}
          partnerCredits={0}
          isBuying={false}
          onClose={() => setSelectedLeadForDrawer(null)}
          onPurchase={(lead) => handleUnlockAttempt(lead as DemoLead)}
          onRequestTopUp={() => handleUnlockAttempt(selectedLeadForDrawer)}
        />
      )}

      {/* ── 4. Modal Institutionnel de Redirection vers le Formulaire d'Inscription ── */}
      {showSignupModal && leadForSignupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSignupModal(false)
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-signup-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-2xl text-left flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={() => setShowSignupModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
              aria-label="Fermer la boîte de dialogue"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Badge supérieur */}
            <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-primary/20 bg-primary/[0.08] px-3.5 py-1 text-xs font-mono font-semibold text-primary">
              <BadgeCheck className="h-4 w-4 text-accent" />
              <span>ACCÈS RÉSERVÉ · RÉSEAU RESCERT WALLONIE</span>
            </div>

            {/* Titre & Explication */}
            <div>
              <h3
                id="modal-signup-title"
                className="text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight"
              >
                Débloquez ce chantier qualifié
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Ce dossier ({getLeadLocationInfo(leadForSignupModal).fullTitle} ·{" "}
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {leadForSignupModal.estimated_power_kwc} kWc
                </span>
                ) est réservé aux installateurs photovoltaïques certifiés RESCERT en ordre d&apos;agrément en Wallonie.
              </p>
            </div>

            {/* Récapitulatif du lead */}
            <div className="rounded-xl border border-border bg-secondary/35 p-3.5 text-xs grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[11px] text-muted-foreground block">Localisation</span>
                <strong className="text-foreground">
                  {leadForSignupModal.city} ({leadForSignupModal.masked_postal_code})
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Modèle commercial</span>
                <strong className="text-foreground">
                  {leadForSignupModal.segment === "B2B" ? "B2B 100% Exclusif" : "B2C Partagé (Max 3)"}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Surface utile</span>
                <strong className="text-foreground font-mono tabular-nums">
                  {leadForSignupModal.surface_area} m² ({getRoofMaterialLabel(leadForSignupModal.roof_material)})
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Marge brute estimée</span>
                <strong className="text-accent font-mono tabular-nums">
                  {formatRoundedCurrency(
                    calculateMarketplaceFinancials({
                      segment: leadForSignupModal.segment,
                      surfaceArea: leadForSignupModal.surface_area,
                      surfaceType: leadForSignupModal.surface_type,
                      annualBill: leadForSignupModal.annual_electricity_bill,
                      creditCost: leadForSignupModal.credit_cost,
                    }).estimatedInstallerMargin
                  )}
                </strong>
              </div>
            </div>

            {/* Garanties Aegis Solaire */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-foreground block">
                Pour accéder immédiatement aux coordonnées directes :
              </span>
              <ul className="space-y-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Nom du décideur, numéro de téléphone vérifié, email et adresse exacte</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>100% sans abonnement mensuel : recharge de crédits à la demande</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Recrédit sous 7 jours sans discussion si le contact est injoignable</span>
                </li>
              </ul>
            </div>

            {/* Actions : Redirection vers formulaire d'inscription ou Connexion */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center gap-2.5">
              <Button
                onClick={handleRedirectToRegistration}
                className="w-full sm:flex-1 py-3 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-xs"
              >
                Postuler au réseau (Gratuit)
                <ArrowRight className="h-4 w-4 ml-1.5 text-accent" />
              </Button>

              <Link href="/partenaires/login" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setShowSignupModal(false)}
                  className="w-full sm:w-auto py-3 h-11 border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold rounded-xl cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5 mr-1.5 text-accent" />
                  Déjà partenaire ? Se connecter
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
