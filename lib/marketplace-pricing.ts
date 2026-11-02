/**
 * Source unique de vérité pour la valorisation financière, le dimensionnement physique
 * et les calculs de rentabilité des leads sur la marketplace Aegis Solaire.
 * Garantit la cohérence entre l'API, les fiches projets, le back-office admin et l'espace partenaire.
 */

import {
  CREDIT_UNIT_PRICE_EUR,
  CREDIT_UNIT_PRICE_CENTIMES,
  B2C_CREDIT_COST,
  B2B_CREDIT_COST,
} from "./credit-pricing"
import {
  calculateB2BSolarROI,
  calculateB2CSolarROI,
  SOLAR_CONSTANTS,
} from "./solar-assumptions"

// Prix de référence unitaire moyen constaté sur les recharges installateurs (1 crédit = 11,50 € HTVA)
export const REFERENCE_CREDIT_PRICE_EUR = CREDIT_UNIT_PRICE_EUR

export interface FinancialEstimates {
  estimatedPowerKwc: number
  estimatedPanelCount: number
  usableSurfaceM2: number
  normalizedSurfaceAreaM2: number
  normalizedAnnualBill: number
  estimatedAnnualConsumptionKwh: number
  annualProductionKwh: number
  autoconsumptionRate: number // en % (ex: 36 pour 36 %)
  selfConsumedKwh: number
  injectedKwh: number
  estimatedRoiYears: number
  estimatedGainLongTerm: number // Gain net sur 25 ans (B2C) ou 20 ans (B2B)
  co2AvoidedTonsPerYear: number
  inverterType: string
  sizingRationale: string
  installerMarginPercent: number
  estimatedContractValue: number
  estimatedContractValueRange: { min: number; max: number }
  estimatedInstallerMargin: number
  roiMultiplier: number
  roiDescription: string
  leadCostEuros: number
  creditCostEur: number
  revenueEstimatePerYear: number
  dataQuality: "complete" | "partial"
  includesBattery: boolean
  includesEv: boolean
}

/**
 * Calcule dynamiquement le coût en crédits d'un dossier selon le barème fixe V2 :
 * - B2C (partagé max 3 installateurs) : 3 crédits / acheteur (34,50 € HTVA)
 * - B2B professionnel exclusif : 9 crédits en exclusivité (103,50 € HTVA)
 */
export function calculateLeadCreditCost(lead: {
  segment: "B2B" | "B2C" | string
  surfaceArea?: number | null
  surfaceType?: string | null
  annualBill?: number | null
}): number {
  if (lead.segment === "B2C") return B2C_CREDIT_COST
  return B2B_CREDIT_COST
}

const B2C_CONSUMPTION_BRACKET_MAP: Record<string, { kwh: number; bill: number }> = {
  lt_3000: { kwh: 2400, bill: 820 },
  "3000_4000": { kwh: 3500, bill: 1150 },
  "4000_5000": { kwh: 4500, bill: 1480 },
  "5000_6000": { kwh: 5500, bill: 1820 },
  gt_6000: { kwh: 7000, bill: 2300 },
}

const B2C_ROOF_SURFACE_MAP: Record<string, number> = {
  small: 22,
  medium: 42,
  large: 65,
  xlarge: 90,
}

const B2B_SURFACE_RANGE_MAP: Record<string, number> = {
  lt_500: 280,
  m500_1500: 850,
  gt_1500: 1800,
}

interface ParsedLeadSignals {
  consumptionBracket?: string
  consumptionKwh?: number
  roofSurfaceBracket?: string
  b2bSurfaceBracket?: string
  roofMaterial?: string
  orientation?: string
  propertyType?: string
  householdSize?: string
  hasBattery: boolean
  hasEv: boolean
}

function parseProjectSignals(lead: {
  hasBattery?: boolean | string | null
  roofMaterial?: string | null
  surfaceType?: string | null
  projectDetails?: string | string[] | null
  qualificationMetadata?: Record<string, unknown> | null
}): ParsedLeadSignals {
  const meta =
    lead.qualificationMetadata && typeof lead.qualificationMetadata === "object"
      ? lead.qualificationMetadata
      : {}

  const detailsText = Array.isArray(lead.projectDetails)
    ? lead.projectDetails.join(" | ")
    : typeof lead.projectDetails === "string"
      ? lead.projectDetails
      : ""

  // 1. Tranche de consommation B2C
  let consumptionBracket =
    typeof meta.consumptionKwh === "string" ? meta.consumptionKwh.trim() : undefined
  if (!consumptionBracket && detailsText) {
    const match = detailsText.match(/Consommation annuelle:\s*(lt_3000|3000_4000|4000_5000|5000_6000|gt_6000)/i)
    if (match) consumptionBracket = match[1].toLowerCase()
  }

  let consumptionKwh =
    typeof meta.annualConsumptionKwh === "number" && meta.annualConsumptionKwh > 0
      ? meta.annualConsumptionKwh
      : undefined
  if (!consumptionKwh && consumptionBracket && B2C_CONSUMPTION_BRACKET_MAP[consumptionBracket]) {
    consumptionKwh = B2C_CONSUMPTION_BRACKET_MAP[consumptionBracket].kwh
  }

  // 2. Tranche de surface B2C / B2B
  let roofSurfaceBracket =
    typeof meta.roofSurface === "string"
      ? meta.roofSurface.trim().toLowerCase()
      : typeof meta.roofSize === "string"
        ? meta.roofSize.trim().toLowerCase()
        : undefined
  if (!roofSurfaceBracket && detailsText) {
    const match = detailsText.match(/Surface toiture:\s*(small|medium|large|xlarge)/i)
    if (match) roofSurfaceBracket = match[1].toLowerCase()
  }

  let b2bSurfaceBracket =
    typeof meta.b2b_surface_range === "string"
      ? meta.b2b_surface_range.trim()
      : undefined

  // 3. Matériau / type de toiture
  let roofMaterial =
    lead.roofMaterial ||
    (typeof meta.roofType === "string" ? meta.roofType : undefined) ||
    (typeof meta.roofMaterial === "string" ? meta.roofMaterial : undefined)
  if (!roofMaterial && detailsText) {
    const match = detailsText.match(/Couverture:\s*([a-zA-Z0-9_-]+)/i)
    if (match) roofMaterial = match[1].toLowerCase()
  }

  // 4. Orientation
  let orientation = typeof meta.orientation === "string" ? meta.orientation : undefined
  if (!orientation && detailsText) {
    const match = detailsText.match(/Orientation(?:\s+toiture)?\s*:\s*([^|,;\n]+)/i)
    if (match) orientation = match[1].trim()
  }

  // 5. Type de bien & Foyer
  let propertyType = typeof meta.propertyType === "string" ? meta.propertyType : undefined
  if (!propertyType && detailsText) {
    if (/2\s*fa[çc]ades|mitoyen/i.test(detailsText)) propertyType = "house_2f"
    else if (/3\s*fa[çc]ades|semi-mitoyen/i.test(detailsText)) propertyType = "house_3f"
    else if (/4\s*fa[çc]ades/i.test(detailsText)) propertyType = "house_4f"
  }

  let householdSize = typeof meta.householdSize === "string" ? meta.householdSize : undefined
  if (!householdSize && detailsText) {
    const match = detailsText.match(/Foyer:\s*([0-9+]+)/i)
    if (match) householdSize = match[1]
  }

  // 6. Batterie (uniquement "oui" explicite — exclure "hesite" et "non")
  let hasBattery = false
  if (lead.hasBattery === true || lead.hasBattery === "oui") {
    hasBattery = true
  } else if (meta.hasBattery === "oui" || meta.hasBattery === true || meta.batteryInterest === "oui") {
    hasBattery = true
  } else if (
    meta.hasBattery === "non" ||
    meta.hasBattery === "hesite" ||
    meta.batteryInterest === "non" ||
    meta.batteryInterest === "hesite"
  ) {
    hasBattery = false
  } else if (detailsText) {
    hasBattery =
      /Batterie(?:\s+domestique)?\s*:\s*oui/i.test(detailsText) ||
      /Intérêt batterie:\s*oui/i.test(detailsText)
  }

  // 7. Véhicule électrique / Borne
  let hasEv = false
  if (
    meta.hasEv === "oui" ||
    meta.hasEv === "prevu" ||
    meta.hasEv === true ||
    meta.evInterest === "oui" ||
    meta.evInterest === "prevu"
  ) {
    hasEv = true
  } else if (detailsText) {
    hasEv =
      /Borne\s+VE\s*:\s*(?:oui|prevu|prévu)/i.test(detailsText) ||
      /Intérêt borne VE:\s*(?:oui|prevu|prévu)/i.test(detailsText)
  }

  return {
    consumptionBracket,
    consumptionKwh,
    roofSurfaceBracket,
    b2bSurfaceBracket,
    roofMaterial,
    orientation,
    propertyType,
    householdSize,
    hasBattery,
    hasEv,
  }
}

/**
 * Calcule des estimations d'ingénierie et de marché réalistes, non sur-évaluées,
 * pour un installateur photovoltaïque agréé en Wallonie (marché 2026).
 */
export function calculateMarketplaceFinancials(lead: {
  segment: "B2B" | "B2C" | string
  surfaceArea: number | null | undefined
  surfaceType?: string | null | undefined
  roofMaterial?: string | null | undefined
  annualBill?: number | null | undefined
  creditCost?: number | null | undefined
  estimatedPowerKwc?: number | null | undefined
  hasBattery?: boolean | string | null | undefined
  projectDetails?: string | string[] | null | undefined
  qualificationMetadata?: Record<string, unknown> | null | undefined
}): FinancialEstimates {
  const isB2C = lead.segment === "B2C"
  const rawArea = Math.max(0, Number(lead.surfaceArea) || 0)
  const rawAnnualBill = Math.max(0, Number(lead.annualBill) || 0)

  const signals = parseProjectSignals(lead)

  // Normalisation de la surface (corrige aussi les anciennes valeurs de paliers 30/50/80 ou 350/1000/2000)
  let normalizedSurfaceAreaM2 = rawArea
  if (isB2C) {
    if (signals.roofSurfaceBracket && B2C_ROOF_SURFACE_MAP[signals.roofSurfaceBracket]) {
      normalizedSurfaceAreaM2 = B2C_ROOF_SURFACE_MAP[signals.roofSurfaceBracket]
    } else if (rawArea === 30) {
      normalizedSurfaceAreaM2 = 22
    } else if (rawArea === 50) {
      normalizedSurfaceAreaM2 = 42
    } else if (rawArea === 80) {
      normalizedSurfaceAreaM2 = 65
    } else if (rawArea > 150) {
      normalizedSurfaceAreaM2 = 65
    } else if (rawArea <= 0) {
      normalizedSurfaceAreaM2 = 42
    }
  } else {
    if (signals.b2bSurfaceBracket && B2B_SURFACE_RANGE_MAP[signals.b2bSurfaceBracket]) {
      normalizedSurfaceAreaM2 = B2B_SURFACE_RANGE_MAP[signals.b2bSurfaceBracket]
    } else if (rawArea === 350) {
      normalizedSurfaceAreaM2 = 280
    } else if (rawArea === 1000) {
      normalizedSurfaceAreaM2 = 850
    } else if (rawArea === 2000) {
      normalizedSurfaceAreaM2 = 1800
    } else if (rawArea <= 0) {
      normalizedSurfaceAreaM2 = 450
    }
  }

  // Normalisation de la facture annuelle (corrige le bug historique de sur-évaluation dans devis-landing-client)
  let normalizedAnnualBill = rawAnnualBill
  if (isB2C) {
    if (signals.consumptionBracket && B2C_CONSUMPTION_BRACKET_MAP[signals.consumptionBracket]) {
      const mapped = B2C_CONSUMPTION_BRACKET_MAP[signals.consumptionBracket]
      // Si la facture stockée correspond aux anciennes valeurs gonflées (1000, 1800, 2400, 3100, 4500) ou est absente
      if (
        rawAnnualBill <= 0 ||
        [1000, 1800, 2400, 3100, 4500].includes(Math.round(rawAnnualBill))
      ) {
        normalizedAnnualBill = mapped.bill
      }
    } else if (rawAnnualBill <= 0) {
      normalizedAnnualBill = 1350
    }
  } else {
    if (rawAnnualBill <= 0) {
      normalizedAnnualBill = 12000
    }
  }

  // Coût d'acquisition du dossier en crédits et en euros
  const credits =
    lead.creditCost ??
    calculateLeadCreditCost({
      segment: lead.segment,
      surfaceArea: normalizedSurfaceAreaM2,
      surfaceType: lead.surfaceType,
      annualBill: normalizedAnnualBill,
    })
  const leadCostEuros = (credits * CREDIT_UNIT_PRICE_CENTIMES) / 100

  const dataQuality: "complete" | "partial" =
    rawArea > 0 && rawAnnualBill > 0 ? "complete" : "partial"

  if (isB2C) {
    const b2cCalc = calculateB2CSolarROI({
      annualBill: normalizedAnnualBill,
      consumptionKwh: signals.consumptionKwh,
      surfaceAreaM2: normalizedSurfaceAreaM2,
      roofMaterial: signals.roofMaterial,
      orientation: signals.orientation,
      propertyType: signals.propertyType,
      householdSize: signals.householdSize,
      hasBattery: signals.hasBattery,
      hasEv: signals.hasEv,
    })

    // Marge brute réaliste installateur résidentiel en Wallonie (~20 % sur devis HTVA)
    const installerMarginPercent = 20
    const avgContract = b2cCalc.totalNetCostHT
    const estimatedInstallerMargin = Math.round(avgContract * (installerMarginPercent / 100))
    const roiMultiplier = Math.max(1, Math.round(estimatedInstallerMargin / (leadCostEuros || 1)))

    return {
      estimatedPowerKwc: b2cCalc.installedPowerKwc,
      estimatedPanelCount: b2cCalc.estimatedPanelCount,
      usableSurfaceM2: b2cCalc.usableSurfaceM2,
      normalizedSurfaceAreaM2,
      normalizedAnnualBill,
      estimatedAnnualConsumptionKwh: b2cCalc.estimatedConsumptionKwh,
      annualProductionKwh: b2cCalc.annualProductionKwh,
      autoconsumptionRate: b2cCalc.autoconsumptionRate,
      selfConsumedKwh: b2cCalc.selfConsumedKwh,
      injectedKwh: b2cCalc.injectedKwh,
      estimatedRoiYears: b2cCalc.roiYears,
      estimatedGainLongTerm: b2cCalc.gain25Years,
      co2AvoidedTonsPerYear: b2cCalc.co2AvoidedTons,
      inverterType: b2cCalc.inverterType,
      sizingRationale: b2cCalc.sizingRationale,
      installerMarginPercent,
      estimatedContractValue: avgContract,
      estimatedContractValueRange: {
        min: b2cCalc.contractRangeHT.min,
        max: b2cCalc.contractRangeHT.max,
      },
      estimatedInstallerMargin,
      roiMultiplier,
      roiDescription: `Marge brute estimée ≈ ${roiMultiplier}× le coût du lead`,
      leadCostEuros,
      creditCostEur: leadCostEuros,
      revenueEstimatePerYear: b2cCalc.annualSavings,
      dataQuality,
      includesBattery: signals.hasBattery,
      includesEv: signals.hasEv,
    }
  } else {
    const b2bCalc = calculateB2BSolarROI({
      surfaceAreaM2: normalizedSurfaceAreaM2,
      surfaceType: (lead.surfaceType as "toiture" | "parking" | "friche") || "toiture",
      roofMaterial: signals.roofMaterial,
      annualElectricityBill: normalizedAnnualBill,
    })

    // Marge brute installateur B2B dégressive selon la taille du chantier (appels d'offres B2B)
    const installerMarginPercent =
      b2bCalc.installedPowerKwc > 100 ? 14 : b2bCalc.installedPowerKwc > 35 ? 16 : 18
    const avgContract = b2bCalc.totalCapexEstimate
    const estimatedInstallerMargin = Math.round(avgContract * (installerMarginPercent / 100))
    const roiMultiplier = Math.max(1, Math.round(estimatedInstallerMargin / (leadCostEuros || 1)))

    return {
      estimatedPowerKwc: b2bCalc.installedPowerKwc,
      estimatedPanelCount: b2bCalc.estimatedPanelCount,
      usableSurfaceM2: b2bCalc.usableSurfaceM2,
      normalizedSurfaceAreaM2,
      normalizedAnnualBill,
      estimatedAnnualConsumptionKwh: b2bCalc.estimatedConsumptionKwh,
      annualProductionKwh: b2bCalc.annualProductionKwh,
      autoconsumptionRate: b2bCalc.autoconsumptionRate,
      selfConsumedKwh: b2bCalc.selfConsumedKwh,
      injectedKwh: b2bCalc.injectedKwh,
      estimatedRoiYears: b2bCalc.estimatedRoiYears,
      estimatedGainLongTerm: b2bCalc.gain20Years,
      co2AvoidedTonsPerYear: b2bCalc.co2AvoidedTons,
      inverterType: b2bCalc.inverterType,
      sizingRationale: b2bCalc.sizingRationale,
      installerMarginPercent,
      estimatedContractValue: avgContract,
      estimatedContractValueRange: {
        min: b2bCalc.capexRangeHT.min,
        max: b2bCalc.capexRangeHT.max,
      },
      estimatedInstallerMargin,
      roiMultiplier,
      roiDescription: `Marge brute estimée ≈ ${roiMultiplier}× le coût du lead`,
      leadCostEuros,
      creditCostEur: leadCostEuros,
      revenueEstimatePerYear: b2bCalc.estimatedAnnualSavings,
      dataQuality,
      includesBattery: false,
      includesEv: signals.hasEv,
    }
  }
}
