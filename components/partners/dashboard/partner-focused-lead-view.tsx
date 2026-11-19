"use client"

import * as React from "react"
import { useState } from "react"
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  X,
} from "lucide-react"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import {
  calculateLeadDirectFinancials,
  B2C_EXCLUSIVE_CREDIT_COST,
  B2C_EXCLUSIVE_PRICE_EUR,
} from "@/lib/credit-pricing"
import {
  getConsumptionLabel,
  getGrdLabel,
  getLeadLocationInfo,
  getOwnershipLabel,
  getProjectDriverLabel,
  getPropertyTypeLabel,
  getRoofMaterialLabel,
  getRoofSurfaceLabel,
  getSurfaceTypeLabel,
  getTimeframeLabel,
  sanitizeLeadNotes,
} from "@/lib/lead-display-helpers"
import { LeadGeoRadarMap } from "./lead-geo-radar-map"
import { buildWhatsAppLink, downloadLeadVCard } from "./lib/vcard-export"
import { useLeadInspectionTimer } from "@/lib/client/partner-tracker"
import { getLeadVerificationSummary } from "@/lib/lead-verification-display"

export interface PartnerFocusedLeadViewProps {
  lead: any
  partnerCredits: number
  isPurchased?: boolean
  isClosedOrUnavailable?: boolean
  isBuying: boolean
  availableLeadsCount: number
  onBackToMarketplace: () => void
  onOpenCrm?: () => void
  onPurchaseWithCredits: (lead: any, exclusive?: boolean) => void
  onOpenDirectPay: (lead: any, exclusive?: boolean) => void
  onRequestTopUp: () => void
  onOpenAlertPreferences?: () => void
  onOpenExpert?: (lead: any) => void
  onRecordUnlockIntent?: (method: string) => void
}

function formatEurCompact(amount: number): string {
  return `${amount.toLocaleString("fr-BE", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} € HT`
}

function formatPowerKwc(kwc: number): string {
  return `${kwc.toLocaleString("fr-BE", {
    minimumFractionDigits: kwc % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })} kWc`
}

function formatContactPreference(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null
  const clean = raw.toLowerCase().trim()
  if (
    clean === "written_first" ||
    clean.includes("écrit") ||
    clean.includes("ecrit") ||
    clean.includes("e-mail") ||
    clean.includes("email") ||
    clean.includes("sms")
  ) {
    return "Par e-mail ou SMS"
  }
  if (clean === "direct_call" || clean.includes("appel")) {
    return "Par appel direct (9h–18h)"
  }
  return raw.trim()
}

function formatCompactSurface(
  specSurface: string | undefined,
  leadSurfaceArea: number,
  normalizedSurfaceM2: number,
  surfaceTypeLabel: string,
  isB2B: boolean
): string {
  const area = leadSurfaceArea > 0 ? leadSurfaceArea : normalizedSurfaceM2
  const areaLabel = area > 0 ? `env. ${area.toLocaleString("fr-BE")} m²` : null

  if (specSurface) {
    const cleanSpec = specSurface.trim()
    const parenMatch = cleanSpec.match(/\(([^)]+)\)/)
    if (parenMatch) {
      const inside = parenMatch[1].trim().replace(/^~\s*/, "env. ")
      const prefix = cleanSpec.replace(/\s*\([^)]+\)/, "").trim()
      if (prefix && prefix.toLowerCase() !== inside.toLowerCase()) {
        return `${inside} · ${prefix}`
      }
      return inside
    }
    if (/m²|m2/i.test(cleanSpec)) {
      return cleanSpec
    }
    if (areaLabel) {
      return `${areaLabel} · ${cleanSpec}`
    }
    return cleanSpec
  }

  if (area > 0) {
    return isB2B
      ? `${area.toLocaleString("fr-BE")} m²`
      : `env. ${area.toLocaleString("fr-BE")} m²`
  }
  return surfaceTypeLabel
}

function formatQualifiedDate(rawDate?: string | null): string | null {
  if (!rawDate) return null
  const date = new Date(rawDate)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("fr-BE", {
    timeZone: "Europe/Brussels",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function PartnerFocusedLeadView({
  lead,
  partnerCredits,
  isPurchased = false,
  isClosedOrUnavailable = false,
  isBuying,
  availableLeadsCount,
  onBackToMarketplace,
  onOpenCrm,
  onPurchaseWithCredits,
  onOpenDirectPay,
  onRequestTopUp,
  onOpenAlertPreferences,
  onOpenExpert,
  onRecordUnlockIntent,
}: PartnerFocusedLeadViewProps) {
  const [confirmingCredits, setConfirmingCredits] = useState(false)
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false)

  const { recordRoofZoom, recordUnlockIntent } = useLeadInspectionTimer({
    lead,
    source: isPurchased ? "crm_focus" : "email_focus",
    partnerCredits,
    enabled: Boolean(lead),
  })

  if (!lead) return null

  const isB2B = lead.segment === "B2B"
  const isWithdrawn = Boolean(lead.is_withdrawn_from_marketplace)
  const maxSlots = lead.max_slots ?? (isB2B ? 1 : 3)
  const remainingSlots = lead.remaining_slots ?? maxSlots
  const takenSlots = lead.taken_slots ?? Math.max(0, maxSlots - remainingSlots)
  const cost = lead.credit_cost ?? (isB2B ? 9 : 3)
  const hasEnoughCredits = partnerCredits >= cost

  const directFinancials = calculateLeadDirectFinancials({
    segment: lead.segment,
    credit_cost: cost,
  })

  const rawSurface = Math.max(0, Number(lead.surface_area || lead.surface_area_m2) || 0)
  const rawAnnualBill = Math.max(0, Number(lead.annual_electricity_bill || lead.annual_bill_eur) || 0)

  const financials = calculateMarketplaceFinancials({
    segment: lead.segment,
    surfaceArea: rawSurface,
    surfaceType: lead.surface_type,
    roofMaterial: lead.roof_material,
    annualBill: rawAnnualBill,
    creditCost: cost,
    estimatedPowerKwc: lead.estimated_power_kwc,
    projectDetails: lead.project_details ?? lead.message,
    qualificationMetadata: lead.qualification_metadata,
  })

  const location = getLeadLocationInfo(lead)
  const sanitized = sanitizeLeadNotes(lead.project_details, lead.message)
  const specs = sanitized.specs

  const postalCodeClean =
    (lead.postal_code && String(lead.postal_code).trim()) ||
    (location.postalCode && location.postalCode !== "Wallonie" ? location.postalCode : "")
  const cityClean = (lead.city && String(lead.city).trim().replace(/^\d{4}\s+/, "").trim()) || location.city
  const headlineLocation = postalCodeClean ? `${postalCodeClean} ${cityClean}` : cityClean
  const leadRefCode = lead.id ? String(lead.id).slice(0, 8).toUpperCase() : "SOLAIRE"

  const surfaceTypeLabel = getSurfaceTypeLabel(lead.surface_type)
  const propertyTypeDisplay =
    specs.propertyType ||
    (lead.qualification_metadata?.propertyType
      ? getPropertyTypeLabel(String(lead.qualification_metadata.propertyType))
      : null) ||
    (isB2B
      ? surfaceTypeLabel
      : lead.surface_type && lead.surface_type !== "toiture"
        ? getPropertyTypeLabel(lead.surface_type)
        : "Maison résidentielle")

  const ownershipLabel =
    (lead.ownership_status ? getOwnershipLabel(lead.ownership_status) : null) ||
    specs.ownership ||
    "Propriétaire occupant"

  const roofMaterialLabel =
    (lead.roof_material ? getRoofMaterialLabel(lead.roof_material) : null) ||
    specs.roofMaterial ||
    "Tuiles"

  const compactSurface = formatCompactSurface(
    specs.roofSurface ||
    (lead.qualification_metadata?.roofSurface
      ? getRoofSurfaceLabel(String(lead.qualification_metadata.roofSurface))
      : undefined),
    rawSurface,
    financials.normalizedSurfaceAreaM2,
    surfaceTypeLabel,
    isB2B
  )

  const consumptionDisplay =
    specs.consumption ||
    (lead.qualification_metadata?.consumptionKwh
      ? getConsumptionLabel(String(lead.qualification_metadata.consumptionKwh))
      : null) ||
    (financials.estimatedAnnualConsumptionKwh > 0
      ? `${financials.estimatedAnnualConsumptionKwh.toLocaleString("fr-BE")} kWh/an`
      : null)

  const displayBill = financials.normalizedAnnualBill || rawAnnualBill
  const annualBillDisplay =
    displayBill > 0 ? `${displayBill.toLocaleString("fr-BE")} € ${isB2B ? "HT" : "TTC"}` : "À préciser"

  const explicitTimeframe =
    lead.timeframe || lead.project_timeline
      ? getTimeframeLabel(lead.timeframe || lead.project_timeline)
      : null

  const contactPreferenceDisplay = formatContactPreference(
    specs.contactPreference || lead.contact_preference || lead.qualification_metadata?.contactPreference
  )

  const hasBattery = Boolean(
    specs.hasBattery ||
    lead.wants_battery === true ||
    lead.qualification_metadata?.battery === true ||
    financials.includesBattery
  )
  const hasIrve = Boolean(
    specs.hasIrve ||
    lead.wants_irve === true ||
    lead.qualification_metadata?.ev_charger === true ||
    financials.includesEv
  )

  const roofImageUrl = (lead.qualification_metadata?.roof_image_url ||
    lead.qualification_metadata?.site_image_url ||
    lead.qualificationMetadata?.roof_image_url ||
    lead.qualificationMetadata?.site_image_url ||
    lead.roof_image_url ||
    lead.site_image_url) as string | undefined

  // Identité du prospect selon statut d'achat et présence du nom (Guide §8 + règle d'anonymat ******)
  const cleanLastName = (lead.last_name?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()
  const cleanFirstName = (lead.first_name?.trim() || "")
    .replace(/^(madame\s*,\s*monsieur|m\.|monsieur|mme|madame)\s+/i, "")
    .trim()

  const prospectTitle = isPurchased
    ? `Prospect · ${[cleanFirstName, cleanLastName].filter(Boolean).join(" ") || "Contact débloqué"}`
    : cleanLastName
      ? `Prospect · ****** ${cleanLastName}`
      : `Prospect ${ownershipLabel.toLowerCase()}`

  // Vérification factuelle des coordonnées (distinction stricte Vérifié vs Plausible vs aucune étiquette)
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
  const emailLabel = verifSummary.email.shortLabel ?? "E-mail renseigné"
  const phoneLabel = verifSummary.phone.shortLabel ?? "Téléphone renseigné"
  const maskedPhone =
    lead.phone && String(lead.phone).replace(/\D/g, "").match(/^(?:324|04)/)
      ? "04•• •• •• ••"
      : "04•• •• •• ••"

  // Contexte & statut de disponibilité (Guide §3, §4, §8)
  let contextLabel = isB2B ? "Nouveau projet photovoltaïque B2B" : "Nouveau dossier photovoltaïque"
  let availabilityText = isB2B
    ? "Exclusivité B2B · 1 seul installateur"
    : `${remainingSlots} ${remainingSlots > 1 ? "places disponibles" : "place disponible"} sur ${maxSlots}`
  let availabilityTone: "success" | "warning" | "danger" = "success"

  if (isPurchased) {
    contextLabel = isB2B ? "Dossier B2B débloqué" : "Dossier débloqué"
    availabilityText = "Coordonnées complètes actives"
    availabilityTone = "success"
  } else if (isClosedOrUnavailable) {
    contextLabel = isWithdrawn ? "Dossier retiré de la marketplace" : "Dossier clôturé"
    availabilityText = isWithdrawn
      ? "Indisponible au déblocage"
      : `Complet · ${maxSlots} sur ${maxSlots} attribuées`
    availabilityTone = "danger"
  } else if (!isB2B && remainingSlots === 1) {
    availabilityTone = "warning"
  } else if (!isB2B && remainingSlots === 2) {
    availabilityTone = "warning"
  }

  const availabilityBadgeStyle =
    availabilityTone === "danger"
      ? "bg-[var(--aegis-danger-bg)] text-[var(--aegis-danger-text)]"
      : availabilityTone === "warning"
        ? "bg-[var(--aegis-preference-bg)] text-[var(--aegis-preference-label)]"
        : "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]"

  const qualifiedDateStr = formatQualifiedDate(lead.created_at)
  const estimatedSavingsEur = Number(lead.estimated_savings) || 0
  const estimatedRoiYears = Number(lead.estimated_roi_years) || 0
  const autoconsumptionRate = Number(lead.autoconsumption_rate) || 0
  const hasDistinctSurfaceType =
    Boolean(surfaceTypeLabel) &&
    surfaceTypeLabel.toLowerCase() !== "toiture" &&
    surfaceTypeLabel.toLowerCase() !== propertyTypeDisplay.toLowerCase()
  const roofTypeAndMaterial = hasDistinctSurfaceType
    ? `${surfaceTypeLabel} · ${roofMaterialLabel}`
    : roofMaterialLabel

  // Lignes techniques du chantier (sans doublon avec le bandeau chiffré ou l’en-tête)
  const specRows: Array<{ label: string; value: string; italic?: boolean }> = [
    { label: "Toiture", value: roofTypeAndMaterial },
    { label: "Surface estimée", value: compactSurface },
    ...(consumptionDisplay ? [{ label: "Consommation annuelle", value: consumptionDisplay }] : []),
    { label: "Facture annuelle", value: annualBillDisplay },
    ...(estimatedSavingsEur > 0
      ? [
        {
          label: "Économies client estimées",
          value: [
            `Env. ${Math.round(estimatedSavingsEur).toLocaleString("fr-BE")} €/an`,
            estimatedRoiYears > 0
              ? `retour env. ${estimatedRoiYears.toLocaleString("fr-BE", { maximumFractionDigits: 1 })} ans`
              : null,
            autoconsumptionRate > 0 ? `${Math.round(autoconsumptionRate)} % d’autoconsommation` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        },
      ]
      : estimatedRoiYears > 0
        ? [
          {
            label: "Retour sur investissement client",
            value: `Env. ${estimatedRoiYears.toLocaleString("fr-BE", { maximumFractionDigits: 1 })} ans`,
          },
        ]
        : []),
    ...(hasBattery || hasIrve
      ? [
        {
          label: "Équipements souhaités",
          value: [
            hasBattery ? "Batterie domestique" : null,
            hasIrve ? "Borne de recharge VE" : null,
          ]
            .filter(Boolean)
            .join(" · "),
        },
      ]
      : []),
    ...(explicitTimeframe ? [{ label: "Échéance souhaitée", value: explicitTimeframe }] : []),
    ...(lead.grd ? [{ label: "Gestionnaire réseau", value: getGrdLabel(lead.grd) }] : []),
    ...(lead.project_driver
      ? [{ label: "Objectif du projet", value: getProjectDriverLabel(lead.project_driver) }]
      : []),
    ...(isB2B && isPurchased && lead.company
      ? [
        {
          label: "Entreprise",
          value: lead.company_vat ? `${lead.company} · TVA ${lead.company_vat}` : String(lead.company),
        },
      ]
      : []),
    ...(qualifiedDateStr ? [{ label: "Demande qualifiée le", value: qualifiedDateStr }] : []),
    ...(sanitized.cleanRemarks
      ? [{ label: "Précisions du prospect", value: `« ${sanitized.cleanRemarks} »`, italic: true }]
      : []),
  ]

  const minContractStr = financials.estimatedContractValueRange.min.toLocaleString("fr-BE")
  const maxContractStr = financials.estimatedContractValueRange.max.toLocaleString("fr-BE")
  const unlockPriceEur = formatEurCompact(directFinancials.priceHtva)
  const unlockPriceTtc = `${directFinancials.priceTtc.toFixed(2).replace(".", ",")} € TTC`

  const handleTrackUnlock = (method: "credits" | "direct_pay" | "insufficient_credits") => {
    recordUnlockIntent(method)
    onRecordUnlockIntent?.(method)
  }

  return (
    <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Barre supérieure : retour catalogue & référence dossier */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToMarketplace}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] cursor-pointer rounded-[5px] focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>
            {availableLeadsCount > 0
              ? `Voir les ${availableLeadsCount} autres dossiers disponibles`
              : "Retour à la marketplace"}
          </span>
        </button>

        <span className="font-mono text-[13px] tabular-nums text-[var(--aegis-muted)]">
          Dossier #{leadRefCode}
        </span>
      </div>

      {/* Grille 2 colonnes : Colonne principale (1fr) + Colonne d'action (340px), empilée sous 900px */}
      <div className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        {/* ── Colonne Principale : Résumé + Chiffres + Détails + Localisation ── */}
        <div className="min-w-0 flex flex-col gap-6">
          <section className="rounded-[14px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-5 sm:p-7">
            {/* En-tête du dossier */}
            <div className="pb-5 border-b border-[var(--aegis-divider)]">
              <p className="text-[13px] font-semibold text-[var(--aegis-context)]">
                {contextLabel}
              </p>
              <h1 className="mt-1 text-[32px] sm:text-[38px] font-bold leading-[1.14] tracking-[-0.03em] text-[var(--aegis-ink)] font-mono tabular-nums">
                {headlineLocation}
              </h1>
              <p className="mt-1.5 text-[15px] leading-[1.5] text-[var(--aegis-muted)]">
                {propertyTypeDisplay} · {ownershipLabel}
              </p>
              <span
                className={`mt-3 inline-flex items-center rounded-[5px] px-2.5 py-1 text-[12px] font-bold tabular-nums ${availabilityBadgeStyle}`}
              >
                {availabilityText}
              </span>
            </div>

            {/* Synthèse chiffrée */}
            <div className="mt-5 rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-summary)] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--aegis-divider)]">
              <div className="p-4">
                <span className="block text-[13px] text-[var(--aegis-muted)]">
                  Puissance estimée
                </span>
                <strong className="mt-1 block text-[24px] sm:text-[26px] font-bold leading-[1.18] tracking-[-0.025em] text-[var(--aegis-ink)] font-mono tabular-nums">
                  {formatPowerKwc(financials.estimatedPowerKwc)}
                </strong>
                {financials.estimatedPanelCount > 0 && (
                  <span className="mt-0.5 block text-[13px] text-[var(--aegis-muted)] font-mono tabular-nums">
                    {financials.estimatedPanelCount} panneaux estimés
                  </span>
                )}
              </div>

              <div className="p-4">
                <span className="block text-[13px] text-[var(--aegis-muted)]">
                  Devis estimé
                </span>
                <strong className="mt-1 block text-[22px] sm:text-[24px] font-bold leading-[1.18] tracking-[-0.025em] text-[var(--aegis-ink)] font-mono tabular-nums">
                  {minContractStr} à {maxContractStr} € HT
                </strong>
                <span className="mt-0.5 block text-[13px] text-[var(--aegis-muted)]">
                  Estimation indicative
                </span>
              </div>

              <div className="p-4">
                <span className="block text-[13px] text-[var(--aegis-muted)]">
                  Marge brute indicative
                </span>
                <strong className="mt-1 block text-[24px] sm:text-[26px] font-bold leading-[1.18] tracking-[-0.025em] text-[var(--aegis-ink)] font-mono tabular-nums">
                  Env. {financials.estimatedInstallerMargin.toLocaleString("fr-BE")} € HT
                </strong>
                <span className="mt-0.5 block text-[13px] text-[var(--aegis-muted)] font-mono tabular-nums">
                  {financials.roiMultiplier}× le coût du dossier
                </span>
              </div>
            </div>

            {/* Détails du chantier : avec photo (42 % / 58 %) ou sans photo (pleine largeur) */}
            <div className="mt-6 pt-6 border-t border-[var(--aegis-divider)]">
              <h2 className="mb-4 text-[20px] font-bold leading-[1.3] text-[var(--aegis-ink)]">
                Détails du chantier
              </h2>

              <div
                className={
                  roofImageUrl
                    ? "grid grid-cols-1 sm:grid-cols-[42%_minmax(0,1fr)] gap-5 items-start"
                    : "block"
                }
              >
                {roofImageUrl && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        recordRoofZoom()
                        setIsPhotoLightboxOpen(true)
                      }}
                      className="group block w-full text-left rounded-[8px] overflow-hidden border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={roofImageUrl}
                        alt={`Photo du bâtiment concerné par le projet à ${headlineLocation}`}
                        className="w-full aspect-[3/2] object-cover transition-opacity group-hover:opacity-95"
                      />
                    </button>
                    <div className="mt-1.5 flex items-center justify-between text-[12px] text-[var(--aegis-muted)]">
                      <span>Photo du bâtiment</span>
                      <button
                        type="button"
                        onClick={() => {
                          recordRoofZoom()
                          setIsPhotoLightboxOpen(true)
                        }}
                        className="font-medium text-[var(--aegis-link)] underline underline-offset-2 hover:text-[var(--aegis-ink)] cursor-pointer"
                      >
                        Agrandir
                      </button>
                    </div>
                  </div>
                )}

                <table className="w-full border-collapse text-left">
                  <tbody>
                    {specRows.map((row, idx) => {
                      const isLast = idx === specRows.length - 1
                      return (
                        <tr key={row.label}>
                          <th
                            scope="row"
                            className={`w-[46%] py-2 pr-3 text-[14px] font-normal text-[var(--aegis-muted)] align-top ${isLast ? "" : "border-b border-[var(--aegis-divider)]"
                              }`}
                          >
                            {row.label}
                          </th>
                          <td
                            className={`py-2 text-[14px] text-[var(--aegis-ink)] align-top font-mono tabular-nums ${row.italic ? "italic font-normal" : "font-semibold"
                              } ${isLast ? "" : "border-b border-[var(--aegis-divider)]"}`}
                          >
                            {row.value}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Localisation du projet */}
          <section className="rounded-[14px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-[var(--aegis-divider)]">
              <h2 className="text-[20px] font-bold leading-[1.3] text-[var(--aegis-ink)]">
                Localisation du projet
              </h2>
              <span className="font-mono text-[13px] tabular-nums text-[var(--aegis-muted)]">
                {headlineLocation} · {location.provinceLabel}
              </span>
            </div>

            <div className="mt-4">
              <LeadGeoRadarMap
                city={cityClean}
                postalCode={postalCodeClean || "4000"}
                provinceLabel={location.provinceLabel}
                isPurchased={isPurchased}
                siteAddress={lead.site_address}
              />
            </div>

            <p className="mt-3 text-[13px] text-[var(--aegis-muted)]">
              {isPurchased && lead.site_address
                ? `Adresse du chantier : ${lead.site_address}, ${headlineLocation}.`
                : "Localisation par commune avant déblocage. La rue et le numéro exact sont fournis immédiatement après validation."}
            </p>
          </section>
        </div>

        {/* ── Colonne Latérale Action & Prospect (340 px) ── */}
        <aside className="w-full flex flex-col gap-4 min-[900px]:sticky min-[900px]:top-20">
          {/* Bloc Prospect */}
          <section className="rounded-[14px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-5">
            <h2 className="text-[18px] font-bold leading-[1.25] text-[var(--aegis-ink)]">
              {prospectTitle}
            </h2>

            {contactPreferenceDisplay && (
              <div className="mt-3 rounded-r-[5px] border-l-[3px] border-[var(--aegis-preference-accent)] bg-[var(--aegis-preference-bg)] px-3 py-2">
                <span className="block text-[13px] text-[var(--aegis-preference-label)]">
                  Premier contact souhaité par le prospect
                </span>
                <strong className="mt-0.5 block text-[15px] font-bold text-[var(--aegis-ink)]">
                  {contactPreferenceDisplay}
                </strong>
              </div>
            )}

            {isPurchased ? (
              <div className="mt-4 flex flex-col gap-3">
                <div className="pt-3 border-t border-[var(--aegis-divider)] flex flex-col gap-2 text-[14px]">
                  <div className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 mt-0.5 text-[var(--aegis-muted)] shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <span className="block text-[12px] text-[var(--aegis-muted)]">Téléphone direct</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <a
                          href={`tel:${lead.phone}`}
                          className="font-mono font-bold tabular-nums text-[var(--aegis-link)] underline underline-offset-2"
                        >
                          {lead.phone || "—"}
                        </a>
                        {verifSummary.phone.compactLabel && (
                          <span
                            title={verifSummary.phone.detailLabel || undefined}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${verifSummary.phone.tier === "verified"
                                ? "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)]"
                                : "bg-[var(--aegis-surface-subtle)] border border-[var(--aegis-border)] text-[var(--aegis-muted)]"
                              }`}
                          >
                            {verifSummary.phone.compactLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 mt-0.5 text-[var(--aegis-muted)] shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <span className="block text-[12px] text-[var(--aegis-muted)]">E-mail</span>
                      <a
                        href={`mailto:${lead.email}`}
                        className="block truncate font-medium text-[var(--aegis-link)] underline underline-offset-2"
                      >
                        {lead.email || "—"}
                      </a>
                    </div>
                  </div>
                </div>

                {lead.site_address && (
                  <div className="pt-2.5 border-t border-[var(--aegis-divider)] text-[13px]">
                    <span className="block text-[var(--aegis-muted)]">Adresse exacte</span>
                    <strong className="mt-0.5 block font-semibold text-[var(--aegis-ink)]">
                      {lead.site_address}, {headlineLocation}
                    </strong>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadLeadVCard(lead)}
                    className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] hover:bg-[var(--aegis-surface-subtle)] px-3 py-1.5 text-[13px] font-semibold text-[var(--aegis-ink)] cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>vCard</span>
                  </button>
                  {lead.phone && (
                    <a
                      href={buildWhatsAppLink(lead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--aegis-border)] bg-[var(--aegis-availability-bg)] px-3 py-1.5 text-[13px] font-semibold text-[var(--aegis-availability-text)] hover:opacity-90"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 pt-3 border-t border-[var(--aegis-divider)]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="flex items-center gap-1.5 text-[13px] text-[var(--aegis-muted)]">
                      <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span>Téléphone</span>
                    </span>
                    <strong className="mt-1 block text-[15px] font-bold text-[var(--aegis-ink)] font-mono tabular-nums">
                      {maskedPhone}
                    </strong>
                    <span
                      title={verifSummary.phone.detailLabel || undefined}
                      className={`mt-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${verifSummary.phone.tier === "verified"
                          ? "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] font-semibold"
                          : "bg-[var(--aegis-surface-subtle)] border border-[var(--aegis-border)] text-[var(--aegis-muted)]"
                        }`}
                    >
                      {verifSummary.phone.compactLabel ?? phoneLabel}
                    </span>
                  </div>

                  <div className="pl-3 border-l border-[var(--aegis-divider)]">
                    <span className="flex items-center gap-1.5 text-[13px] text-[var(--aegis-muted)]">
                      <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                      <span>E-mail</span>
                    </span>
                    <strong className="mt-1 block text-[15px] font-bold text-[var(--aegis-ink)] font-mono tabular-nums">
                      ••••@••••.••
                    </strong>
                    <span
                      title={verifSummary.email.detailLabel || undefined}
                      className={`mt-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${verifSummary.email.tier === "verified"
                          ? "bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] font-semibold"
                          : "bg-[var(--aegis-surface-subtle)] border border-[var(--aegis-border)] text-[var(--aegis-muted)]"
                        }`}
                    >
                      {verifSummary.email.compactLabel ?? emailLabel}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[var(--aegis-divider)] text-[13px]">
                  <span className="block text-[var(--aegis-muted)]">Adresse du chantier</span>
                  <span className="mt-0.5 block font-mono tabular-nums font-medium text-[var(--aegis-ink)]">
                    Rue masquée · {headlineLocation}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* Bloc d'accès et d'action */}
          <section className="rounded-[14px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] p-5">
            {isPurchased ? (
              <div>
                <span className="block text-[13px] text-[var(--aegis-muted)]">
                  Statut de votre dossier
                </span>
                <strong className="mt-0.5 block text-[18px] font-bold text-[var(--aegis-ink)]">
                  Enregistré dans votre CRM
                </strong>
                {onOpenCrm && (
                  <button
                    type="button"
                    onClick={onOpenCrm}
                    className="mt-4 w-full min-h-[46px] rounded-[6px] bg-[var(--aegis-ink)] hover:bg-[var(--aegis-primary-hover)] px-4 py-2.5 text-[15px] font-bold text-white cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                  >
                    Ouvrir dans Mon CRM
                  </button>
                )}
              </div>
            ) : isClosedOrUnavailable ? (
              <div>
                <span className="block text-[13px] text-[var(--aegis-muted)]">
                  Accès au dossier
                </span>
                <strong className="mt-0.5 block text-[18px] font-bold text-[var(--aegis-ink)]">
                  {isWithdrawn ? "Dossier retiré" : "Attribution terminée"}
                </strong>
                <p className="mt-2 text-[14px] leading-[1.5] text-[var(--aegis-muted)]">
                  {isWithdrawn
                    ? "Ce projet n’est plus ouvert au déblocage. Aucun crédit n’a été débité."
                    : "Ce projet a atteint son quota d’installateurs. Aucun crédit n’a été débité."}
                </p>
                <button
                  type="button"
                  onClick={onBackToMarketplace}
                  className="mt-4 w-full min-h-[46px] rounded-[6px] bg-[var(--aegis-ink)] hover:bg-[var(--aegis-primary-hover)] px-4 py-2.5 text-[15px] font-bold text-white cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                >
                  {availableLeadsCount > 0
                    ? `Voir les ${availableLeadsCount} autres dossiers`
                    : "Voir les autres dossiers"}
                </button>
                {onOpenAlertPreferences && (
                  <button
                    type="button"
                    onClick={onOpenAlertPreferences}
                    className="mt-2.5 block w-full text-center text-[13px] font-semibold text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] cursor-pointer"
                  >
                    Vérifier mes préférences d’alerte
                  </button>
                )}
              </div>
            ) : (
              <div>
                <span className="block text-[13px] text-[var(--aegis-muted)]">
                  Déblocage des coordonnées
                </span>
                <strong className="mt-0.5 block text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--aegis-ink)] font-mono tabular-nums">
                  {unlockPriceEur} ou {cost} crédits
                </strong>
                <span className="mt-1 block text-[13px] text-[var(--aegis-muted)] font-mono tabular-nums">
                  {unlockPriceTtc} · Solde disponible : {partnerCredits} crédit{partnerCredits > 1 ? "s" : ""}
                </span>

                <div className="mt-4 flex flex-col gap-2.5">
                  {hasEnoughCredits ? (
                    <>
                      {confirmingCredits ? (
                        <div className="rounded-[8px] border border-[var(--aegis-border)] bg-[var(--aegis-summary)] p-3 flex flex-col gap-2">
                          <p className="text-[13px] font-medium text-[var(--aegis-ink)]">
                            Confirmer le déblocage immédiat pour{" "}
                            <strong className="font-mono tabular-nums">{cost} crédits</strong> ?
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBuying}
                              onClick={() => {
                                handleTrackUnlock("credits")
                                setConfirmingCredits(false)
                                onPurchaseWithCredits(lead)
                              }}
                              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-[6px] bg-[var(--aegis-ink)] hover:bg-[var(--aegis-primary-hover)] disabled:opacity-60 px-3 py-2 text-[14px] font-bold text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                            >
                              {isBuying ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span>Déblocage…</span>
                                </>
                              ) : (
                                <span>Confirmer ({cost} crédits)</span>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isBuying}
                              onClick={() => setConfirmingCredits(false)}
                              className="min-h-[44px] rounded-[6px] border border-[var(--aegis-border)] bg-[var(--aegis-surface)] hover:bg-[var(--aegis-surface-subtle)] px-3 py-2 text-[13px] font-semibold text-[var(--aegis-ink)] cursor-pointer"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBuying}
                          onClick={() => {
                            handleTrackUnlock("credits")
                            setConfirmingCredits(true)
                          }}
                          className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-[6px] bg-[var(--aegis-ink)] hover:bg-[var(--aegis-primary-hover)] disabled:opacity-60 px-4 py-2.5 text-[15px] font-bold text-white cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                        >
                          {isBuying ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Déblocage…</span>
                            </>
                          ) : (
                            <span>Débloquer avec {cost} crédits</span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleTrackUnlock("direct_pay")
                          onOpenDirectPay(lead, false)
                        }}
                        className="block w-full text-center text-[13px] font-semibold text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] cursor-pointer py-1 rounded-[5px] focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                      >
                        Débloquer à l’unité ({unlockPriceEur} · Bancontact / Carte)
                      </button>

                      {!isB2B && takenSlots === 0 && maxSlots > 1 && (
                        <button
                          type="button"
                          disabled={isBuying}
                          onClick={() => {
                            if (partnerCredits >= B2C_EXCLUSIVE_CREDIT_COST) {
                              handleTrackUnlock("credits")
                              onPurchaseWithCredits(lead, true)
                            } else {
                              handleTrackUnlock("direct_pay")
                              onOpenDirectPay(lead, true)
                            }
                          }}
                          className="w-full min-h-[40px] rounded-[6px] border border-emerald-700/35 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 text-[13px] font-bold text-emerald-900 cursor-pointer transition-colors"
                        >
                          Réserver l&apos;Exclusivité 100 % ({B2C_EXCLUSIVE_CREDIT_COST} cr. · {B2C_EXCLUSIVE_PRICE_EUR} € HT)
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          handleTrackUnlock("direct_pay")
                          onOpenDirectPay(lead, false)
                        }}
                        className="w-full min-h-[46px] rounded-[6px] bg-[var(--aegis-ink)] hover:bg-[var(--aegis-primary-hover)] px-4 py-2.5 text-[15px] font-bold text-white cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                      >
                        Débloquer à l’unité ({unlockPriceEur})
                      </button>

                      {!isB2B && takenSlots === 0 && maxSlots > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleTrackUnlock("direct_pay")
                            onOpenDirectPay(lead, true)
                          }}
                          className="w-full min-h-[40px] rounded-[6px] border border-emerald-700/35 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 text-[13px] font-bold text-emerald-900 cursor-pointer transition-colors"
                        >
                          Option Exclusivité 100 % ({B2C_EXCLUSIVE_PRICE_EUR} € HT)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          handleTrackUnlock("insufficient_credits")
                          onRequestTopUp()
                        }}
                        className="block w-full text-center text-[13px] font-semibold text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] cursor-pointer py-1 rounded-[5px] focus-visible:outline-2 focus-visible:outline-[var(--aegis-focus)] focus-visible:outline-offset-[3px]"
                      >
                        Recharger des crédits
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-4 pt-3.5 border-t border-[var(--aegis-divider)] flex flex-col gap-2 text-[13px] text-[var(--aegis-muted)]">
                  <p>
                    Coordonnées complètes affichées à l’écran et envoyées par e-mail dès validation.
                  </p>
                  <p>
                    {isB2B
                      ? "Exclusivité absolue : ce dossier est réservé à 1 seul installateur."
                      : `Attribution limitée à ${maxSlots} installateurs maximum (${remainingSlots} ${remainingSlots > 1 ? "places disponibles" : "place disponible"}).`}
                  </p>

                  {!isB2B && takenSlots > 0 && (
                    <div className="flex flex-col gap-1 pt-1 text-[12px] font-mono tabular-nums">
                      {Array.from({ length: maxSlots }).map((_, idx) => {
                        const isTaken = idx < takenSlots
                        const buyer = lead?.buyers?.[idx]
                        return (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <span className="text-[var(--aegis-ink)]">
                              Place {idx + 1} :{" "}
                              {isTaken
                                ? buyer?.companyName || "Réservée"
                                : "Disponible"}
                            </span>
                            {isTaken && buyer?.purchasedAt && (
                              <span>
                                {new Date(buyer.purchasedAt).toLocaleDateString("fr-BE", {
                                  timeZone: "Europe/Brussels",
                                })}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <p className="text-[12px]">
                    Garantie conformité : tout numéro erroné ou projet injoignable signalé sous 7 jours ouvrés est recrédité sous 24 h ouvrées.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Assistance technique */}
          <section className="rounded-[14px] border border-[var(--aegis-border)] bg-[var(--aegis-surface-subtle)] p-4">
            <h3 className="text-[14px] font-bold text-[var(--aegis-ink)]">
              Assistance technique
            </h3>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--aegis-muted)]">
              Besoin d’un avis sur l’onduleur, le calepinage ou les contraintes GRD de ce chantier ?
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
              {onOpenExpert && (
                <button
                  type="button"
                  onClick={() => onOpenExpert(lead)}
                  className="font-semibold text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)] cursor-pointer"
                >
                  Solliciter la cellule technique
                </button>
              )}
              <a
                href="mailto:contact@aegissolaire.com"
                className="font-medium text-[var(--aegis-link)] underline underline-offset-4 hover:text-[var(--aegis-ink)]"
              >
                contact@aegissolaire.com
              </a>
            </div>
          </section>
        </aside>
      </div>

      {/* Lightbox photo bâtiment */}
      {isPhotoLightboxOpen && roofImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo du bâtiment à ${headlineLocation}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setIsPhotoLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full rounded-[14px] bg-[var(--aegis-surface)] p-3 border border-[var(--aegis-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--aegis-divider)]">
              <span className="text-[14px] font-semibold text-[var(--aegis-ink)]">
                Photo du bâtiment · {headlineLocation}
              </span>
              <button
                type="button"
                onClick={() => setIsPhotoLightboxOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--aegis-ink)] hover:bg-[var(--aegis-surface-subtle)] cursor-pointer"
                aria-label="Fermer l’aperçu photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={roofImageUrl}
              alt={`Photo du bâtiment à ${headlineLocation}`}
              className="w-full max-h-[78vh] object-contain rounded-[8px] bg-[var(--aegis-surface-subtle)]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
