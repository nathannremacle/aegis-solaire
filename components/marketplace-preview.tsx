"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  MapPin,
  ShieldCheck,
  Lock,
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Phone,
  Mail,
  Coins,
  Calendar,
  ChevronRight,
  Home,
  FileText,
  User,
  Eye,
  Camera,
  Layers,
  CreditCard,
  Unlock,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  calculateMarketplaceFinancials,
  getLeadPricingTierMeta,
} from "@/lib/marketplace-pricing"
import {
  B2C_EXCLUSIVE_CREDIT_COST,
  B2C_EXCLUSIVE_PRICE_EUR,
  calculateLeadDirectFinancials,
  formatEurWithDecimals,
} from "@/lib/credit-pricing"
import {
  getLeadLocationInfo,
  formatRoundedCurrency,
  getLeadFreshness,
  getRoofMaterialLabel,
  getTimeframeLabel,
  getOwnershipLabel,
  getB2CSlotIndicator,
} from "@/lib/lead-display-helpers"
import { getLeadImageItems } from "@/lib/lead-images"
import { getLeadVerificationSummary } from "@/lib/lead-verification-display"
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
  phone?: string | null
  email?: string | null
  phone_verified?: boolean
  phone_verification_method?: string | null
  phone_carrier?: string | null
  phone_line_type?: string | null
  email_verified?: boolean
  email_delivery_status?: string | null
  qualification_metadata?: Record<string, any> | null
  site_address?: string
  coords?: [number, number]
  lead_score?: number
  is_demo_preview?: boolean
  freshness_label?: string
}

const DEMO_LEADS: DemoLead[] = [
  {
    id: "demo-b2c-liege",
    is_demo_preview: true,
    segment: "B2C",
    city: "Lambermont (Verviers)",
    province: "liege",
    postal_code: "4800",
    masked_postal_code: "4800",
    surface_area: 42,
    surface_type: "toiture",
    roof_material: "tuiles",
    annual_electricity_bill: 1820,
    estimated_power_kwc: 4.8,
    credit_cost: 3,
    max_slots: 3,
    taken_slots: 0,
    remaining_slots: 3,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "autoconsommation",
    message: "",
    project_details: "",
    grd: "RESA",
    created_at: "2026-11-22T14:30:00.000Z",
    freshness_label: "Vérifié SMS il y a 18 min",
    first_name: "******",
    last_name: "Lambert",
    phone: "",
    email: "",
    phone_verified: true,
    phone_verification_method: "twilio_sms",
    phone_carrier: "PROXIMUS",
    phone_line_type: "mobile",
    email_verified: true,
    qualification_metadata: {
      address_verified: true,
      roofSurface: "medium",
      consumptionKwh: "5000_6000",
      contactPreference: "Par appel direct ou écrit",
      verifications: {
        phoneOtp: { verified: true, channel: "sms", status: "verified" },
        twilioLookup: { valid: true, lineType: "mobile", carrierName: "PROXIMUS" },
        emailProof: { verified: true },
        walloniaAddress: { validInWallonia: true, streetVerified: true, houseVerified: true },
      },
      roof_images: [
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/867f78cd-1f86-4111-9522-efa52170902c/1795299964674-0-c07938b9.jpeg",
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/867f78cd-1f86-4111-9522-efa52170902c/1795299996236-0-e9b1ce8f.jpeg",
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/867f78cd-1f86-4111-9522-efa52170902c/1795300348215-0-49800903.jpeg",
      ],
      roof_image_meta: {
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/867f78cd-1f86-4111-9522-efa52170902c/1795299996236-0-e9b1ce8f.jpeg":
          { kind: "ai_3d_projection" },
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/867f78cd-1f86-4111-9522-efa52170902c/1795300348215-0-49800903.jpeg":
          { kind: "ai_3d_projection" },
      },
    },
    coords: [50.5892, 5.8394],
    lead_score: 94,
  },
  {
    id: "demo-b2c-ath",
    is_demo_preview: true,
    segment: "B2C",
    city: "Irchonwelz (Ath)",
    province: "hainaut",
    postal_code: "7801",
    masked_postal_code: "7801",
    surface_area: 65,
    surface_type: "toiture",
    roof_material: "plat_epdm",
    annual_electricity_bill: 1820,
    estimated_power_kwc: 4.8,
    credit_cost: 3,
    max_slots: 3,
    taken_slots: 1,
    remaining_slots: 2,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "autoconsommation",
    message: "",
    project_details: "",
    grd: "ORES",
    created_at: "2026-11-22T13:15:00.000Z",
    freshness_label: "Vérifié SMS il y a 1 h",
    first_name: "******",
    last_name: "Martin",
    phone: "",
    email: "",
    phone_verified: true,
    phone_verification_method: "twilio_sms",
    phone_carrier: "ORANGE Belgium (MOBISTAR)",
    phone_line_type: "mobile",
    email_verified: true,
    qualification_metadata: {
      address_verified: true,
      roofSurface: "large",
      consumptionKwh: "5000_6000",
      ev_charger: true,
      contactPreference: "Par e-mail ou SMS d'abord",
      verifications: {
        phoneOtp: { verified: true, channel: "sms", status: "verified" },
        twilioLookup: { valid: true, lineType: "mobile", carrierName: "ORANGE Belgium (MOBISTAR)" },
        emailProof: { verified: true },
        walloniaAddress: { validInWallonia: true, streetVerified: true, houseVerified: true },
      },
      roof_images: [
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/18ff49ff-93f0-4a8a-81a8-71e6bd255afe/1795119725761-0-21ba3b8a.jpeg",
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/18ff49ff-93f0-4a8a-81a8-71e6bd255afe/1795119747295-0-9a191dca.jpeg",
      ],
      roof_image_meta: {
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/18ff49ff-93f0-4a8a-81a8-71e6bd255afe/1795119747295-0-9a191dca.jpeg":
          { kind: "ai_3d_projection" },
      },
    },
    coords: [50.6194, 3.7606],
    lead_score: 91,
  },
  {
    id: "demo-b2c-mons",
    is_demo_preview: true,
    segment: "B2C",
    city: "Mons",
    province: "hainaut",
    postal_code: "7000",
    masked_postal_code: "7000",
    surface_area: 42,
    surface_type: "toiture",
    roof_material: "ardoises",
    annual_electricity_bill: 1480,
    estimated_power_kwc: 3.9,
    credit_cost: 3,
    max_slots: 3,
    taken_slots: 0,
    remaining_slots: 3,
    ownership_status: "owner",
    timeframe: "3_6mois",
    project_timeline: "3_6mois",
    project_driver: "reduire_facture",
    message: "",
    project_details: "",
    grd: "ORES",
    created_at: "2026-11-22T12:10:00.000Z",
    freshness_label: "Vérifié SMS il y a 2 h",
    first_name: "******",
    last_name: "Janssens",
    phone: "",
    email: "",
    phone_verified: true,
    phone_verification_method: "twilio_sms",
    phone_carrier: "BASE / Telenet",
    phone_line_type: "mobile",
    email_verified: true,
    qualification_metadata: {
      address_verified: true,
      roofSurface: "medium",
      consumptionKwh: "4000_5000",
      contactPreference: "Par appel direct (9h–18h)",
      verifications: {
        phoneOtp: { verified: true, channel: "sms", status: "verified" },
        twilioLookup: { valid: true, lineType: "mobile", carrierName: "BASE / Telenet" },
        emailProof: { verified: true },
        walloniaAddress: { validInWallonia: true, streetVerified: true, houseVerified: true },
      },
      roof_images: [
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/0ea4c999-656b-4dfa-b1d2-a211692bf331/1795121651959-0-6018fb64.jpeg",
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/0ea4c999-656b-4dfa-b1d2-a211692bf331/1795118402623.jpeg",
      ],
      roof_image_meta: {
        "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/leads/0ea4c999-656b-4dfa-b1d2-a211692bf331/1795118402623.jpeg":
          { kind: "ai_3d_projection" },
      },
    },
    coords: [50.4542, 3.9567],
    lead_score: 89,
  },
  {
    id: "demo-b2b-herstal",
    is_demo_preview: true,
    segment: "B2B",
    city: "Herstal",
    province: "liege",
    postal_code: "4040",
    masked_postal_code: "40XX",
    surface_area: 1800,
    surface_type: "toiture",
    roof_material: "bac_acier",
    annual_electricity_bill: 46000,
    estimated_power_kwc: 152,
    credit_cost: 9,
    max_slots: 1,
    taken_slots: 0,
    remaining_slots: 1,
    ownership_status: "owner",
    timeframe: "immediat_3mois",
    project_timeline: "immediat_3mois",
    project_driver: "reduire_facture",
    message: "",
    project_details: "",
    grd: "RESA",
    created_at: "2026-11-22T10:40:00.000Z",
    freshness_label: "Vérifié il y a 3 h",
    first_name: "******",
    last_name: "Dechamps",
    company: "Entrepôt Logistique SA",
    company_vat: "BE 0442.***.***",
    phone: "",
    email: "",
    phone_verified: true,
    phone_verification_method: "twilio_sms",
    phone_carrier: "PROXIMUS",
    phone_line_type: "mobile",
    email_verified: true,
    qualification_metadata: {
      address_verified: true,
      b2b_surface_range: "gt_1500",
      verifications: {
        phoneOtp: { verified: true, channel: "sms", status: "verified" },
        twilioLookup: { valid: true, lineType: "mobile", carrierName: "PROXIMUS" },
        emailProof: { verified: true },
        walloniaAddress: { validInWallonia: true, streetVerified: true, houseVerified: true },
        cbeCompany: { verified: true, active: true, officialName: "Entrepôt Logistique SA" },
      },
    },
    coords: [50.6653, 5.63],
    lead_score: 96,
  },
]

function MarketplaceLeadCardPreview({
  lead,
  index,
  onInspect,
  onUnlock,
}: {
  lead: DemoLead
  index: number
  onInspect: () => void
  onUnlock: (mode?: "credits" | "direct" | "exclusive") => void
}) {
  const isB2B = lead.segment === "B2B"
  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const cost = lead.credit_cost ?? (isB2B ? 9 : 3)
  const directFinancials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: cost,
  })
  const slotIndicator = getB2CSlotIndicator(remainingSlots)
  const canTakeExclusive = !isB2B && remainingSlots >= maxSlots && maxSlots > 1
  const exclusivePriceHtva = Math.round(
    calculateLeadDirectFinancials({
      segment: lead.segment,
      credit_cost: cost,
      exclusive: true,
    }).priceHtva
  )

  const imageItems = getLeadImageItems(lead)
  const realPhotoIdx = imageItems.findIndex((img) => !img.isAiProjection)
  const projectionIdx = imageItems.findIndex((img) => img.isAiProjection)
  const hasRealAnd3D = realPhotoIdx >= 0 && projectionIdx >= 0
  const [selectedViewMode, setSelectedViewMode] = useState<"real" | "3d">("real")

  const activePhotoUrl =
    selectedViewMode === "3d" && projectionIdx >= 0
      ? imageItems[projectionIdx].url
      : imageItems[realPhotoIdx >= 0 ? realPhotoIdx : 0]?.url ||
        (isB2B ? B2B_SOLAR_IMAGE : B2C_SOLAR_IMAGE)
  const isShowing3D = selectedViewMode === "3d" && projectionIdx >= 0
  const hasRealPhoto = imageItems.length > 0

  const rawSurfaceArea = Math.max(0, Number(lead.surface_area) || 0)
  const rawAnnualBill = Math.max(0, Number(lead.annual_electricity_bill) || 0)

  const financials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea: rawSurfaceArea,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: rawAnnualBill,
    creditCost: cost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details,
    qualificationMetadata: lead.qualification_metadata,
  })
  const tierMeta = getLeadPricingTierMeta({
    segment: lead.segment,
    credit_cost: cost,
  })
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

  const location = getLeadLocationInfo(lead)
  const freshness = getLeadFreshness(lead.created_at, lead.freshness_label)
  const powerKwc = financials.estimatedPowerKwc
  const surfaceArea = financials.normalizedSurfaceAreaM2
  const annualBill = financials.normalizedAnnualBill

  const minText = formatRoundedCurrency(financials.estimatedContractValueRange?.min || 0).replace("~", "")
  const maxText = formatRoundedCurrency(financials.estimatedContractValueRange?.max || 0).replace("~", "")
  const rangeText = `${minText} à ${maxText}`
  const marginText = formatRoundedCurrency(financials.estimatedInstallerMargin || 0)

  const rawRoof = getRoofMaterialLabel(lead.roof_material)
  const roofDisplay = rawRoof === "Bac acier / Métallique" ? "Bac acier" : rawRoof
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
      className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-border hover:border-accent/50 bg-card shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden text-left"
    >
      <div className="flex flex-col">
        {/* A. Visuel réel / Vue 3D IA avec switcher direct */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-muted">
          <Image
            src={activePhotoUrl}
            alt={
              isShowing3D
                ? `Modélisation 3D indicative toiture à ${location.city}`
                : `Chantier solaire ${location.city}`
            }
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            priority={index < 2}
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/35 pointer-events-none" />

          {/* Badges supérieurs (mono-ligne sans collision) */}
          <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between gap-2 pointer-events-none">
            {isB2B ? (
              <span className="inline-flex items-center rounded-full bg-black/75 backdrop-blur-xs text-white text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-sm whitespace-nowrap">
                <span className="sm:hidden">{maxSlots <= 1 ? "B2B Exclusif" : `B2B · ${remainingSlots}/${maxSlots}`}</span>
                <span className="hidden sm:inline">
                  {maxSlots <= 1 ? (
                    <>
                      {tierMeta.label} · <span className="font-mono tabular-nums ml-1">100 %</span> Exclusif
                    </>
                  ) : (
                    <>
                      {tierMeta.label} · <span className="font-mono tabular-nums ml-1">{remainingSlots}/{maxSlots}</span> places
                    </>
                  )}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[11px] sm:text-xs font-medium px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-sm whitespace-nowrap">
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
                <span className="font-mono tabular-nums">{slotIndicator.text}</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-card/95 text-foreground text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-sm whitespace-nowrap">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground shrink-0" />
              <span suppressHydrationWarning>{freshness.label}</span>
            </span>
          </div>

          <div className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/35 text-white items-center justify-center backdrop-blur-xs transition-all pointer-events-none opacity-85 group-hover:opacity-100">
            <ChevronRight className="h-4 w-4" />
          </div>

          {/* Switcher Photo réelle / Vue 3D IA en bas de l'image */}
          <div
            className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {hasRealAnd3D ? (
              <div className="inline-flex items-center rounded-full bg-black/70 backdrop-blur-xs p-0.5 border border-white/15">
                <button
                  type="button"
                  onClick={() => setSelectedViewMode("real")}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                    !isShowing3D
                      ? "bg-card text-foreground shadow-xs"
                      : "text-white/85 hover:text-white"
                  }`}
                >
                  <Camera className="h-3 w-3" />
                  <span>Photo réelle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedViewMode("3d")}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                    isShowing3D
                      ? "bg-accent text-accent-foreground shadow-xs"
                      : "text-white/85 hover:text-white"
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  <span>Vue 3D</span>
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-white/90 bg-black/50 backdrop-blur-xs px-2.5 py-0.5 rounded-full pointer-events-none">
                {hasRealPhoto ? "Aperçu réel anonymisé" : "Illustration B2B non contractuelle"}
              </span>
            )}

            {hasRealPhoto && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold tabular-nums text-white bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-none whitespace-nowrap">
                {imageItems.length} photos
              </span>
            )}
          </div>
        </div>

        {/* B. Contenu de la Carte */}
        <div className="p-3.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-base sm:text-[17px] text-foreground tracking-tight leading-tight group-hover:text-accent transition-colors truncate min-w-0">
              {location.fullTitle}
            </h3>
            <div className="text-right shrink-0 flex items-baseline justify-end gap-1 pl-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight tabular-nums font-mono">
                {powerKwc > 0 ? powerKwc : "—"}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                kWc
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 -mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            <span className="truncate">{location.subtitle}</span>
          </p>

          {/* Badges de vérification & Exclusivité */}
          <div className="-mt-0.5 flex flex-wrap items-center gap-1.5">
            {isPremium ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] text-xs font-semibold">
                <span>Projet premium</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-semibold">
                <span>Projet qualifié</span>
              </div>
            )}
            {verifSummary.phone.tier === "verified" && verifSummary.phone.compactLabel && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] border border-[var(--aegis-availability-text)]/20 text-xs font-semibold">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span>{verifSummary.phone.compactLabel}</span>
              </div>
            )}
            {verifSummary.email.tier === "verified" && verifSummary.email.compactLabel && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] border border-[var(--aegis-availability-text)]/20 text-xs font-semibold">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>{verifSummary.email.compactLabel}</span>
              </div>
            )}
            {canTakeExclusive && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/25 text-[11px] font-bold font-mono tabular-nums">
                <span>Exclusivité 100 % dispo ({exclusivePriceHtva} € HT)</span>
              </div>
            )}
          </div>

          {/* Grille Technique 2x2 */}
          <div className="rounded-xl sm:rounded-2xl bg-secondary/40 border border-border p-3 sm:p-3.5 grid grid-cols-2 gap-x-2.5 gap-y-2.5 sm:gap-3 text-xs">
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                <Home className="h-3 w-3 text-foreground/75 shrink-0" />
                <span>TOITURE</span>
              </span>
              <span
                className="font-bold text-[11.5px] sm:text-xs text-foreground leading-snug block"
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

            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                <FileText className="h-3 w-3 text-foreground/75 shrink-0" />
                <span>FACTURE ÉLEC.</span>
              </span>
              <div className="text-[11.5px] sm:text-xs font-bold text-foreground leading-snug font-mono tabular-nums">
                {annualBill > 0 ? (
                  <div className="flex flex-col">
                    <span>{annualBill.toLocaleString("fr-BE")} €/an</span>
                    {financials.estimatedAnnualConsumptionKwh > 0 && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ≈ {financials.estimatedAnnualConsumptionKwh.toLocaleString("fr-BE")} kWh/an
                      </span>
                    )}
                  </div>
                ) : (
                  <span>{isB2B ? "Facture pro" : "Tarif résidentiel"}</span>
                )}
              </div>
            </div>

            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                <Calendar className="h-3 w-3 text-foreground/75 shrink-0" />
                <span>ÉCHÉANCE</span>
              </span>
              <span className="font-bold text-[11.5px] sm:text-xs text-foreground leading-snug block">
                {getTimeframeLabel(lead.timeframe || lead.project_timeline)}
              </span>
            </div>

            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                <User className="h-3 w-3 text-foreground/75 shrink-0" />
                <span>DÉCISIONNAIRE</span>
              </span>
              <span className="font-bold text-[11.5px] sm:text-xs text-foreground leading-snug block">
                {getOwnershipLabel(lead.ownership_status)}
              </span>
            </div>
          </div>

          {/* Estimation du chantier & marge indicative */}
          <div className="rounded-xl sm:rounded-2xl bg-accent/10 border border-accent/20 p-3 sm:p-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden min-[360px]:flex h-7 w-7 rounded-lg bg-accent/15 text-accent items-center justify-center shrink-0">
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
                <span className="text-[10.5px] sm:text-xs font-semibold text-accent block leading-tight">
                  Estimation du chantier
                </span>
                <span className="font-bold text-[11px] sm:text-xs text-foreground font-mono tabular-nums block leading-tight mt-0.5">
                  {rangeText}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0 pl-1">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted-foreground block text-right font-mono leading-tight">
                MARGE IND.
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-accent font-mono tabular-nums block text-right whitespace-nowrap leading-tight mt-0.5">
                {marginText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* C. Pied de Carte (Aligné 100 % sur MarketplaceLeadCard) */}
      <div
        className="px-3.5 sm:px-5 pb-3.5 sm:pb-5 pt-2.5 sm:pt-3 border-t border-border flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center gap-1.5 min-w-0">
            <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-bold text-xs sm:text-sm text-foreground font-mono tabular-nums">
                  {cost} crédits
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">ou</span>
                <span className="font-bold text-xs sm:text-sm text-foreground font-mono tabular-nums">
                  {directFinancials.priceHtva.toFixed(2).replace(".", ",")} €{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">HT</span>
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                ({directFinancials.priceTtc.toFixed(2).replace(".", ",")} € TTC)
                {canTakeExclusive ? ` · Excl. ${B2C_EXCLUSIVE_CREDIT_COST} cr.` : ""}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onInspect}
            className="sm:hidden shrink-0 min-h-[38px] rounded-xl border border-border bg-card hover:bg-secondary px-3 text-xs font-semibold text-foreground inline-flex items-center gap-1 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>Inspecter</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => onUnlock("direct")}
            className="min-h-[42px] rounded-xl border border-border bg-secondary hover:bg-secondary/80 px-2.5 text-xs font-semibold text-foreground inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5 text-accent shrink-0" />
            <span>Payer en €</span>
          </button>

          <button
            type="button"
            onClick={() => onUnlock("credits")}
            className="min-h-[42px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3 text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Unlock className="h-3.5 w-3.5 text-primary-foreground shrink-0" />
            <span>Débloquer</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={onInspect}
            className="rounded-full border border-border bg-card hover:bg-secondary px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Inspecter la fiche technique, la photo réelle, la vue 3D et le radar 3 km"
          >
            <Eye className="h-3.5 w-3.5 text-accent" />
            <span>Inspecter</span>
          </button>

          <button
            type="button"
            onClick={() => onUnlock("direct")}
            className="rounded-full border border-border bg-secondary hover:bg-secondary/80 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Payer directement ce lead par Bancontact / Carte sans utiliser vos crédits"
          >
            <CreditCard className="h-3.5 w-3.5 text-accent" />
            <span>Payer en €</span>
          </button>

          <button
            type="button"
            onClick={() => onUnlock("credits")}
            className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 text-xs font-bold shadow-xs hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1 shrink-0"
            title="Débloquer immédiatement avec vos crédits"
          >
            <Unlock className="h-3.5 w-3.5 text-primary-foreground" />
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
  const [signupIntentMode, setSignupIntentMode] = useState<"credits" | "direct" | "exclusive">("credits")
  const [showSignupModal, setShowSignupModal] = useState(false)

  const counts = useMemo(() => {
    let b2b = 0
    let b2c = 0
    DEMO_LEADS.forEach((lead) => {
      if (lead.segment === "B2B") b2b++
      if (lead.segment === "B2C") b2c++
    })
    return {
      all: DEMO_LEADS.length,
      b2b,
      b2c,
    }
  }, [])

  const filteredLeads = useMemo(() => {
    let result = DEMO_LEADS.filter((lead) => {
      if (segmentFilter !== "ALL" && lead.segment !== segmentFilter) return false
      if (selectedProvince !== "ALL" && lead.province?.toLowerCase() !== selectedProvince.toLowerCase()) {
        return false
      }
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

    result = [...result].sort((a, b) => {
      const aFin = calculateMarketplaceFinancials({
        segment: a.segment,
        surfaceArea: a.surface_area || 0,
        surfaceType: a.surface_type,
        roofMaterial: a.roof_material,
        annualBill: a.annual_electricity_bill,
        estimatedPowerKwc: a.estimated_power_kwc,
        projectDetails: a.project_details,
        qualificationMetadata: a.qualification_metadata,
      })
      const bFin = calculateMarketplaceFinancials({
        segment: b.segment,
        surfaceArea: b.surface_area || 0,
        surfaceType: b.surface_type,
        roofMaterial: b.roof_material,
        annualBill: b.annual_electricity_bill,
        estimatedPowerKwc: b.estimated_power_kwc,
        projectDetails: b.project_details,
        qualificationMetadata: b.qualification_metadata,
      })

      if (sortBy === "power_desc") return bFin.estimatedPowerKwc - aFin.estimatedPowerKwc
      if (sortBy === "margin_desc") return bFin.estimatedInstallerMargin - aFin.estimatedInstallerMargin
      if (sortBy === "cost_asc") return a.credit_cost - b.credit_cost
      return 0
    })

    return result
  }, [segmentFilter, selectedProvince, searchQuery, sortBy])

  const kpis = useMemo(() => {
    let totalPower = 0
    let totalMargin = 0

    filteredLeads.forEach((lead) => {
      const financials = calculateMarketplaceFinancials({
        segment: lead.segment,
        surfaceArea: lead.surface_area,
        surfaceType: lead.surface_type,
        roofMaterial: lead.roof_material,
        annualBill: lead.annual_electricity_bill,
        creditCost: lead.credit_cost,
        estimatedPowerKwc: lead.estimated_power_kwc,
        projectDetails: lead.project_details,
        qualificationMetadata: lead.qualification_metadata,
      })
      totalPower += financials.estimatedPowerKwc
      totalMargin += financials.estimatedInstallerMargin
    })

    return {
      totalLeads: filteredLeads.length,
      totalPower: Math.round(totalPower * 10) / 10,
      totalMargin,
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

  const handleUnlockAttempt = (
    lead: DemoLead,
    mode: "credits" | "direct" | "exclusive" = "credits"
  ) => {
    setLeadForSignupModal(lead)
    setSignupIntentMode(mode)
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
    toast.info("Activez votre accès RESCERT gratuit pour débloquer ce chantier et recevoir les coordonnées complètes.", {
      duration: 5000,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barre de Contrôle */}
      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
            <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:inline-flex sm:items-center">
              <button
                type="button"
                onClick={() => setSegmentFilter("ALL")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  segmentFilter === "ALL"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span>Tous</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "ALL"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSegmentFilter("B2B")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  segmentFilter === "B2B"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span className="sm:hidden">B2B</span>
                <span className="hidden sm:inline">B2B Tertiaire</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "B2B"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {counts.b2b}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSegmentFilter("B2C")}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 sm:py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  segmentFilter === "B2C"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border border-border bg-card text-foreground hover:bg-secondary font-semibold"
                }`}
              >
                <span className="sm:hidden">B2C</span>
                <span className="hidden sm:inline">B2C Partagé</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                    segmentFilter === "B2C"
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {counts.b2c}
                </span>
              </button>
            </div>

            <div className="w-full sm:w-auto">
              <CustomSelect
                id="marketplace-filter-province"
                name="province"
                value={selectedProvince}
                onChange={setSelectedProvince}
                options={PROVINCE_OPTIONS}
                icon={MapPin}
                ariaLabel="Filtrer par province"
              />
            </div>
          </div>

          <div className="relative w-full md:w-64 lg:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Commune, CP, mot-clé..."
              className="w-full rounded-xl border border-border bg-card pl-8.5 pr-8 py-2 sm:py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary h-10 sm:h-9 transition-all"
              aria-label="Rechercher dans la marketplace"
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2.5 border-t border-border/60">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <CustomSelect
                id="marketplace-filter-sort"
                name="sort"
                value={sortBy}
                onChange={setSortBy}
                options={SORT_OPTIONS}
                icon={ArrowUpDown}
                ariaLabel="Trier les opportunités"
                className="w-full sm:w-auto"
                triggerClassName="w-full sm:w-auto justify-between"
                contentClassName="min-w-[280px] sm:min-w-[300px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] font-mono text-muted-foreground">
              Exemples réels anonymisés · Cliquez sur « Inspecter » pour voir la vue 3D &amp; la carte radar
            </span>
            <div className="inline-flex items-center rounded-xl border border-border bg-secondary p-0.5 h-9 shrink-0">
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
                title="Vue tableau (Dense)"
                aria-label="Vue tableau"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/60 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong className="font-mono text-foreground font-bold tabular-nums">{kpis.totalLeads}</strong> dossiers affichés
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono tabular-nums">
              <strong className="text-foreground font-bold">
                {kpis.totalPower.toLocaleString("fr-BE")}
              </strong>{" "}
              kWc cumulés
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono tabular-nums">
              marge cumulée{" "}
              <strong className="text-accent font-bold">
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

      {/* Rendu Grille ou Tableau */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredLeads.map((lead, index) => (
            <MarketplaceLeadCardPreview
              key={lead.id}
              lead={lead}
              index={index}
              onInspect={() => setSelectedLeadForDrawer(lead)}
              onUnlock={(mode) => handleUnlockAttempt(lead, mode ?? "credits")}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Mobile dense list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredLeads.map((lead) => {
              const isB2B = lead.segment === "B2B"
              const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
              const remainingSlots = lead.remaining_slots ?? maxSlots
              const cost = lead.credit_cost ?? (isB2B ? 9 : 3)
              const financials = calculateMarketplaceFinancials({
                segment: lead.segment,
                surfaceArea: lead.surface_area,
                surfaceType: lead.surface_type,
                roofMaterial: lead.roof_material,
                annualBill: lead.annual_electricity_bill,
                creditCost: cost,
                estimatedPowerKwc: lead.estimated_power_kwc,
                projectDetails: lead.project_details,
                qualificationMetadata: lead.qualification_metadata,
              })
              const location = getLeadLocationInfo(lead)
              const freshness = getLeadFreshness(lead.created_at, lead.freshness_label)
              const powerKwc = financials.estimatedPowerKwc
              const marginText = formatRoundedCurrency(financials.estimatedInstallerMargin || 0)

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
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            isB2B
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
                        <span className="font-mono tabular-nums">{lead.surface_area} m²</span> · {getRoofMaterialLabel(lead.roof_material)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-mono">MARGE ESTIMÉE</span>
                      <span className="font-bold font-mono text-accent tabular-nums block">
                        {marginText}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-baseline gap-1 font-mono text-xs tabular-nums">
                      <span className="font-bold text-foreground">{cost} crédits</span>
                      <span className="text-[10px] text-muted-foreground">({formatEurWithDecimals(financials.leadCostEuros)} € HT)</span>
                    </div>
                    <div className="grid grid-cols-2 min-[380px]:flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedLeadForDrawer(lead)}
                        className="min-h-[42px] rounded-xl border border-border bg-secondary hover:bg-secondary/80 px-3 text-xs font-semibold text-foreground cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5 text-accent shrink-0" />
                        <span>Voir</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnlockAttempt(lead, "credits")}
                        className="min-h-[42px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3 text-xs font-bold cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span>Débloquer</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop dense table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-border bg-card shadow-xs overscroll-x-contain">
            <table className="w-full min-w-[840px] text-left text-xs">
              <thead className="border-b border-border bg-secondary/60 text-[11px] font-bold uppercase text-muted-foreground sticky top-0">
                <tr>
                  <th className="px-4 py-3">Modèle</th>
                  <th className="px-4 py-3">Localisation &amp; Preuves</th>
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
                  const cost = lead.credit_cost ?? (isB2B ? 9 : 3)
                  const financials = calculateMarketplaceFinancials({
                    segment: lead.segment,
                    surfaceArea: lead.surface_area,
                    surfaceType: lead.surface_type,
                    roofMaterial: lead.roof_material,
                    annualBill: lead.annual_electricity_bill,
                    creditCost: cost,
                    estimatedPowerKwc: lead.estimated_power_kwc,
                    projectDetails: lead.project_details,
                    qualificationMetadata: lead.qualification_metadata,
                  })
                  const location = getLeadLocationInfo(lead)
                  const freshness = getLeadFreshness(lead.created_at, lead.freshness_label)
                  const powerKwc = financials.estimatedPowerKwc
                  const surfaceArea = financials.normalizedSurfaceAreaM2
                  const annualBill = financials.normalizedAnnualBill
                  const photoCount = getLeadImageItems(lead).length

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLeadForDrawer(lead)}
                      className="hover:bg-secondary/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold font-mono tabular-nums ${
                            isB2B
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground border border-border"
                          }`}
                        >
                          {isB2B ? (maxSlots <= 1 ? "B2B Exclusif" : `B2B (${remainingSlots}/${maxSlots})`) : `B2C (${remainingSlots}/${maxSlots})`}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-foreground font-medium">
                        <div className="font-bold group-hover:text-primary transition-colors">
                          {location.fullTitle}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{location.provinceLabel}</span>
                          {lead.phone_verified && (
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] text-[10px] font-semibold">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              SMS
                            </span>
                          )}
                          {photoCount > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 bg-secondary text-foreground text-[10px] font-mono tabular-nums">
                              <Camera className="h-2.5 w-2.5" />
                              {photoCount} + 3D
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono font-bold text-sm tabular-nums">
                            {powerKwc > 0 ? powerKwc : "—"}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase font-mono">kWc</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-foreground">
                        <div className="font-mono tabular-nums font-semibold">
                          {surfaceArea > 0 ? `${surfaceArea} m²` : "À dimensionner"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                          {getRoofMaterialLabel(lead.roof_material)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        <div className="font-mono font-bold text-accent tabular-nums">
                          {formatRoundedCurrency(financials.estimatedInstallerMargin)}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          {annualBill > 0
                            ? `${annualBill.toLocaleString("fr-BE")} €/an`
                            : (isB2B ? "Facture pro" : "Résidentiel")}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${freshness.dotClass}`} />
                          <span suppressHydrationWarning className="tabular-nums font-medium text-foreground/80">{freshness.label}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap font-mono text-foreground font-bold tabular-nums">
                        <div>{cost} crédits</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {formatEurWithDecimals(financials.leadCostEuros)} € HT
                        </div>
                      </td>

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
                            onClick={() => handleUnlockAttempt(lead, "credits")}
                            className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs active:scale-[0.99]"
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

      {/* Tiroir Latéral d'Inspection Réel */}
      {selectedLeadForDrawer && (
        <LeadInspectionDrawer
          lead={selectedLeadForDrawer}
          partnerCredits={0}
          isBuying={false}
          onClose={() => setSelectedLeadForDrawer(null)}
          onPurchase={(lead, opts) =>
            handleUnlockAttempt(
              lead,
              opts?.paymentMode ?? (opts?.exclusive ? "exclusive" : "credits")
            )
          }
          onRequestTopUp={() => handleUnlockAttempt(selectedLeadForDrawer, "credits")}
          onRequestExpert={(lead) => handleUnlockAttempt(lead, "credits")}
        />
      )}

      {/* Modal d'Inscription pour Débloquer */}
      {showSignupModal && leadForSignupModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSignupModal(false)
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-signup-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-3xl border-t sm:border border-border bg-card px-4 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-7 shadow-2xl text-left flex flex-col gap-4 sm:gap-5 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
          >
            <div className="mx-auto h-1 w-9 rounded-full bg-border sm:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1 text-[11px] sm:text-xs font-mono font-semibold text-primary">
                <BadgeCheck className="h-4 w-4 text-accent shrink-0" />
                <span className="sm:hidden">ACCÈS RESCERT WALLONIE</span>
                <span className="hidden sm:inline">ACCÈS RÉSERVÉ · RÉSEAU RESCERT WALLONIE</span>
              </div>

              <button
                type="button"
                onClick={() => setShowSignupModal(false)}
                className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                aria-label="Fermer la boîte de dialogue"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <h3
                id="modal-signup-title"
                className="text-xl sm:text-2xl font-bold font-heading text-foreground tracking-tight"
              >
                {signupIntentMode === "exclusive"
                  ? "Réservez ce dossier rien que pour vous"
                  : signupIntentMode === "direct"
                    ? "Payez ce dossier à l'unité en euros"
                    : "Débloquez ce chantier qualifié"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {signupIntentMode === "exclusive" ? (
                  <>
                    En mode <strong className="text-foreground">Exclusivité Totale B2C</strong> (
                    <span className="font-mono tabular-nums font-semibold">{B2C_EXCLUSIVE_CREDIT_COST}</span> crédits ·{" "}
                    <span className="font-mono tabular-nums font-semibold">{B2C_EXCLUSIVE_PRICE_EUR} € HT</span>), vous verrouillez les{" "}
                    <span className="font-mono tabular-nums">3</span> places d&apos;un coup (<strong className="text-foreground">0 concurrent</strong>) et le particulier reçoit un e-mail officiel confirmant votre sélection prioritaire.
                  </>
                ) : signupIntentMode === "direct" ? (
                  <>
                    Réglez ce chantier en <span className="font-mono tabular-nums">1</span> clic par Bancontact ou carte bancaire (
                    <span className="font-mono tabular-nums font-semibold text-foreground">
                      {calculateLeadDirectFinancials({
                        segment: leadForSignupModal.segment,
                        credit_cost: leadForSignupModal.credit_cost,
                      }).priceHtva.toFixed(2).replace(".", ",")}{" "}
                      € HT
                    </span>
                    ), sans aucun abonnement ni achat de pack obligatoire.
                  </>
                ) : (
                  <>
                    Ce dossier ({getLeadLocationInfo(leadForSignupModal).fullTitle} ·{" "}
                    <span className="font-mono font-semibold text-foreground tabular-nums">
                      {leadForSignupModal.estimated_power_kwc} kWc
                    </span>
                    ) est réservé aux installateurs photovoltaïques certifiés RESCERT.
                  </>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/35 p-3.5 text-xs grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Localisation</span>
                <strong className="text-foreground">
                  {leadForSignupModal.city} (<span className="font-mono tabular-nums">{leadForSignupModal.masked_postal_code}</span>)
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Modèle choisi</span>
                <strong className="text-foreground">
                  {leadForSignupModal.segment === "B2B"
                    ? "B2B (Max 2 ou Exclusivité Totale)"
                    : signupIntentMode === "exclusive"
                      ? "Exclusivité Totale B2C (0 concurrent)"
                      : signupIntentMode === "direct"
                        ? "Paiement direct à l'unité (€ HT)"
                        : "B2C Partagé (Max 3)"}
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Surface &amp; toiture</span>
                <strong className="text-foreground font-mono tabular-nums">
                  {leadForSignupModal.surface_area} m² ({getRoofMaterialLabel(leadForSignupModal.roof_material)})
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block font-mono">Marge nette indicative</span>
                <strong className="text-accent font-mono tabular-nums">
                  {formatRoundedCurrency(
                    calculateMarketplaceFinancials({
                      segment: leadForSignupModal.segment,
                      surfaceArea: leadForSignupModal.surface_area,
                      surfaceType: leadForSignupModal.surface_type,
                      annualBill: leadForSignupModal.annual_electricity_bill,
                      creditCost: leadForSignupModal.credit_cost,
                      estimatedPowerKwc: leadForSignupModal.estimated_power_kwc,
                      projectDetails: leadForSignupModal.project_details,
                      qualificationMetadata: leadForSignupModal.qualification_metadata,
                    }).estimatedInstallerMargin
                  )}
                </strong>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <span className="font-bold text-foreground block">
                Inclus dès votre validation gratuite (3 crédits d&apos;essai offerts) :
              </span>
              <ul className="flex flex-col gap-1.5 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Nom du décideur, téléphone vérifié SMS, e-mail et adresse exacte</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Zéro abonnement mensuel · Paiement à l&apos;unité ou complément en € (zéro crédit bloqué)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                  <span>Garantie remplacement : réclamation sous <span className="font-mono tabular-nums">7 jours ouvrés</span>, recrédit sous <span className="font-mono tabular-nums">24 h</span></span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-border flex flex-col gap-2.5 w-full">
              <Button
                onClick={handleRedirectToRegistration}
                className="w-full py-3 h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-xs"
              >
                Activer mon accès gratuit (3 cr. offerts)
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
