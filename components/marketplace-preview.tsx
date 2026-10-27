"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Image from "next/image"
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
  Calendar,
  ChevronRight,
  Home,
  FileText,
  User,
  Eye,
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
import { CustomSelect } from "@/components/ui/custom-select"

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
  { value: "cost_asc", label: "Crédits min (↗)" },
]

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
  freshness_label?: string
}

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
    created_at: "2026-03-01T10:00:00.000Z",
    freshness_label: "Vérifié il y a 14 min",
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
    city: "Namur",
    province: "namur",
    postal_code: "5000",
    masked_postal_code: "50XX",
    surface_area: 58,
    surface_type: "toiture",
    roof_material: "tuiles",
    annual_electricity_bill: 2100,
    estimated_power_kwc: 9.6,
    credit_cost: 2,
    max_slots: 3,
    taken_slots: 1,
    remaining_slots: 2,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "autoconsommation",
    message: "Maison unifamiliale bien orientée Sud-Sud-Est. Compteur bidirectionnel déjà installé. Souhaite ajouter une batterie domestique 10 kWh.",
    project_details: "Numéro de téléphone vérifié par appel manuel Aegis Solaire. Maison unifamiliale à Namur (5000), projet mature, budget alloué, attend 2 devis comparatifs maximum.",
    grd: "ORES",
    created_at: "2026-03-01T09:40:00.000Z",
    freshness_label: "Vérifié il y a 32 min",
    first_name: "Sophie",
    last_name: "L.",
    phone: "—",
    email: "—",
    coords: [50.4674, 4.8720],
    lead_score: 91,
  },
]

/**
 * Carte de Chantier Réaliste (Identique à 100% à MarketplaceLeadCard dans le portail partenaire)
 */
function MarketplaceLeadCardPreview({
  lead,
  index,
  onInspect,
  onUnlock,
}: {
  lead: DemoLead
  index: number
  onInspect: () => void
  onUnlock: () => void
}) {
  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const cost = lead.credit_cost ?? (isB2B ? 8 : 2)

  const surfaceArea = Math.max(0, Number(lead.surface_area) || 0)
  const annualBill = Math.max(0, Number(lead.annual_electricity_bill) || 0)

  const financials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea,
    surfaceType: lead.surface_type,
    annualBill,
    creditCost: cost,
  })

  const location = getLeadLocationInfo(lead)
  const freshness = getLeadFreshness(lead.created_at, lead.freshness_label)
  const powerKwc = lead.estimated_power_kwc ?? financials.estimatedPowerKwc

  const leadImage = isB2B ? B2B_SOLAR_IMAGE : B2C_SOLAR_IMAGE

  const contractMin = Math.round((financials.estimatedContractValueRange?.min || 0) / 1000) * 1000
  const contractMax = Math.round((financials.estimatedContractValueRange?.max || 0) / 1000) * 1000
  const marginEst = Math.round((financials.estimatedInstallerMargin || 0) / 1000) * 1000

  const rangeText = `${contractMin.toLocaleString("fr-BE")} € HT à ${contractMax.toLocaleString("fr-BE")} € HT`
  const marginText = `~${marginEst.toLocaleString("fr-BE")} € HT`

  const rawRoof = getRoofMaterialLabel(lead.roof_material)
  const roofDisplay = rawRoof === "Bac acier / Métallique" ? "Bac acier / Mét..." : rawRoof

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
      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 hover:border-slate-300 bg-white shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden text-left"
    >
      <div className="flex flex-col">
        {/* A. Photo de toiture avec badges superposés et mention non contractuelle */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-100">
          <Image
            src={leadImage}
            alt={`Chantier solaire ${location.city}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={index < 2}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-800 text-xs font-semibold px-3.5 py-1.5 shadow-sm">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span suppressHydrationWarning>{freshness.label}</span>
            </span>
          </div>

          {/* Flèche droite de prévisualisation */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-xs transition-all pointer-events-none opacity-85 group-hover:opacity-100">
            <ChevronRight className="h-4 w-4" />
          </div>

          {/* Mention discrète illustration non contractuelle */}
          <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-white/85 bg-black/45 backdrop-blur-xs px-2.5 py-0.5 rounded-full pointer-events-none">
            Illustration non contractuelle
          </span>
        </div>

        {/* B. Contenu de la Carte : Titre, Puissance, Spécifications 2x2, Économie */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Ligne 1 : Titre à gauche & Puissance kWc à droite */}
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-base sm:text-[17px] text-slate-900 tracking-tight leading-tight group-hover:text-blue-900 transition-colors truncate min-w-0">
              {location.fullTitle}
            </h3>
            <div className="text-right shrink-0 flex items-baseline justify-end gap-1 pl-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#0B1528] tracking-tight tabular-nums font-mono">
                {powerKwc > 0 ? powerKwc : "—"}
              </span>
              <span className="text-xs font-bold text-slate-500 lowercase">
                kWc
              </span>
            </div>
          </div>

          {/* Ligne 2 : Localisation & Bâtiment */}
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 -mt-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{location.subtitle}</span>
          </p>

          {/* Ligne 3 : Badge Projet */}
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  TOITURE &amp; SURFACE
                </span>
                <span
                  className="font-bold text-[11px] sm:text-xs text-slate-900 leading-tight block truncate"
                  title={surfaceArea > 0 ? `${surfaceArea} m² · ${rawRoof}` : "Toiture standard"}
                >
                  {surfaceArea > 0 ? (
                    <>
                      <span className="font-mono tabular-nums">{surfaceArea} m²</span> · <span>{roofDisplay}</span>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  FACTURE ÉLEC.
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 leading-tight block truncate font-mono">
                  {annualBill > 0 ? (
                    <span className="tabular-nums font-mono">
                      {annualBill.toLocaleString("fr-BE")} €/an
                    </span>
                  ) : (
                    <span>{isB2B ? "Facture pro" : "Tarif résidentiel"}</span>
                  )}
                </span>
              </div>
            </div>

            {/* 3. Échéance */}
            <div className="flex items-start gap-2 min-w-0">
              <Calendar className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
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

          {/* Ligne 5 : Encadré d'Économie & Marge Indicative (Teinte bleue douce) */}
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
                <span className="font-bold text-[11px] sm:text-xs text-slate-900 font-mono tabular-nums block whitespace-nowrap">
                  {rangeText}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 pl-1.5">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-right font-mono">
                MARGE INDICATIVE
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#2563EB] font-mono tabular-nums block text-right whitespace-nowrap">
                {marginText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* C. Pied de Carte : Coût en Crédits & Boutons Pilules (Inspecter & Débloquer) */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Crédits avec icône pile de pièces */}
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
            <span className="font-bold text-xs sm:text-sm text-slate-900 font-mono tabular-nums">
              {cost} crédits
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
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
            onClick={onUnlock}
            className="rounded-full bg-[#0B1528] hover:bg-[#1E293B] text-white px-3.5 sm:px-4 py-1.5 text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Lock className="h-3.5 w-3.5 text-white" />
            <span>Débloquer</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function MarketplaceLivePreview() {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "B2B" | "B2C">("ALL")
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL")
  const [sortBy, setSortBy] = useState<string>("recent")
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
      {/* ── 1. Barre de Contrôle Unifiée (Identique à la Marketplace Réelle) ── */}
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

            {/* Province select via CustomSelect */}
            <CustomSelect
              value={selectedProvince}
              onChange={setSelectedProvince}
              options={PROVINCE_OPTIONS}
              ariaLabel="Filtrer par province"
            />
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

            {/* Tri select via CustomSelect */}
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={SORT_OPTIONS}
              icon={ArrowUpDown}
              ariaLabel="Trier les opportunités"
            />

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
              <strong className="font-mono text-foreground font-bold tabular-nums">{kpis.totalLeads}</strong> chantiers
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

      {/* ── 2. Rendu des Opportunités : Grille Réaliste de 2 Colonnes ou Tableau ── */}
      {filteredLeads.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
          <SlidersHorizontal className="mx-auto h-9 w-9 text-muted-foreground/60" />
          <h3 className="mt-3 text-base font-bold text-foreground">Aucun dossier disponible avec ces critères</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Élargissez votre sélection de provinces ou réinitialisez les filtres.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={resetFilters}
            className="mt-4 text-xs font-semibold cursor-pointer border-border"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Afficher toutes les opportunités
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Vue Grille : Cartes Photographiques en Lignes de 2 (2 Colonnes) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredLeads.map((lead, index) => (
            <MarketplaceLeadCardPreview
              key={lead.id}
              lead={lead}
              index={index}
              onInspect={() => setSelectedLeadForDrawer(lead)}
              onUnlock={() => handleUnlockAttempt(lead)}
            />
          ))}
        </div>
      ) : (
        /* ── Vue Tableau Haute-Productivité (Exactement comme dans le Dashboard) ── */
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
                  const surfaceArea = Math.max(0, Number(lead.surface_area) || 0)
                  const annualBill = Math.max(0, Number(lead.annual_electricity_bill) || 0)

                  const financials = calculateMarketplaceFinancials({
                    segment: lead.segment,
                    surfaceArea,
                    surfaceType: lead.surface_type,
                    annualBill,
                    creditCost: cost,
                  })

                  const location = getLeadLocationInfo(lead)
                  const freshness = getLeadFreshness(lead.created_at, lead.freshness_label)
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
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">kWc</span>
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
                            onClick={() => handleUnlockAttempt(lead)}
                            className="h-8 px-3 rounded-lg text-xs font-bold bg-[#0F172A] text-white hover:bg-[#0F172A]/90 cursor-pointer shadow-2xs active:scale-[0.99]"
                          >
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

      {/* ── 3. Tiroir Latéral d'Inspection Rapide (Slide-over) ── */}
      {selectedLeadForDrawer && (
        <LeadInspectionDrawer
          lead={selectedLeadForDrawer}
          partnerCredits={0}
          isBuying={false}
          onClose={() => setSelectedLeadForDrawer(null)}
          onPurchase={(lead) => handleUnlockAttempt(lead)}
          onRequestTopUp={() => handleUnlockAttempt(selectedLeadForDrawer)}
          onRequestExpert={(lead) => handleUnlockAttempt(lead)}
        />
      )}

      {/* ── 4. Modal de Rassurance & Inscription pour Débloquer ── */}
      {showSignupModal && leadForSignupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSignupModal(false)
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-signup-title"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-2xl text-left flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            {/* Bouton Fermer */}
            <button
              type="button"
              onClick={() => setShowSignupModal(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
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
            <div className="rounded-2xl border border-border bg-secondary/35 p-3.5 text-xs grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Localisation</span>
                <strong className="text-foreground">
                  {leadForSignupModal.city} ({leadForSignupModal.masked_postal_code})
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Modèle commercial</span>
                <strong className="text-foreground">
                  {leadForSignupModal.segment === "B2B" ? "B2B 100% Exclusif" : "B2C Partagé (Max 3)"}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Surface utile</span>
                <strong className="text-foreground font-mono tabular-nums">
                  {leadForSignupModal.surface_area} m² ({getRoofMaterialLabel(leadForSignupModal.roof_material)})
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Marge brute estimée</span>
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
            <div className="pt-2 border-t border-border flex flex-col gap-2.5 w-full">
              <Button
                onClick={handleRedirectToRegistration}
                className="w-full py-3 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-xs"
              >
                Postuler au réseau RESCERT (Gratuit)
                <ArrowRight className="h-4 w-4 ml-1.5 text-accent" />
              </Button>

              <Link href="/partenaires/login" className="w-full">
                <Button
                  variant="outline"
                  onClick={() => setShowSignupModal(false)}
                  className="w-full py-3 h-11 border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold rounded-xl cursor-pointer"
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
