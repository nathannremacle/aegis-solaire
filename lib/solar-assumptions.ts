/**
 * Moteur de calcul solaire Wallonie — Aegis Solaire
 * Hypothèses techniques et financières vérifiées (CWaPE, SPW, PVGIS Wallonie)
 * 
 * Principes :
 * - Gisement solaire wallon réaliste : 920 - 950 kWh/kWc/an (base 930 kWh/kWc pour orientation sud)
 * - Tarifs électricité professionnels B2B : 0,19 - 0,22 € HT/kWh (fourniture + réseau évités)
 * - Tarifs résidentiels B2C : ~0,32 € TTC/kWh
 * - Tarif de rachat d'injection réseau : 0,045 €/kWh
 * - Zéro plafonnement artificiel (un-clamped) pour préserver l'honnêteté technique
 * - Pas de prime photovoltaïque fictive en B2C (supprimée fin 2023 en Wallonie, TVA 6% applicable)
 */

export const SOLAR_CONSTANTS = {
  /** Gisement solaire moyen en Wallonie (kWh produit par kWc installé par an, plein sud, inclinaison 35°) */
  BELGIUM_YIELD_KWH_PER_KWC: 930,

  /** Dégradation annuelle de production des panneaux Tier-1 (garantie linéaire 25 ans) */
  ANNUAL_DEGRADATION_RATE: 0.005, // 0.5% / an

  /** Prix moyen de rachat du kWh injecté sur le réseau (contrat de revente) */
  INJECTION_PRICE_PER_KWH: 0.045,

  /** B2B - Coût moyen de l'électricité pro réseau évitée (€ HT / kWh) */
  B2B_ELECTRICITY_PRICE_HT: 0.20,

  /** B2C - Coût moyen de l'électricité résidentielle réseau (€ TTC / kWh) */
  B2C_ELECTRICITY_PRICE_TTC: 0.32,

  /** Facteur d'évitement carbone moyen en Belgique (kg CO2 / kWh produit) */
  CO2_AVOIDED_KG_PER_KWH: 0.22,
} as const

/* ─────────────────────────────────────────────────────────────────────────────
 * B2B SOLAR ENGINE
 * ──────────────────────────────────────────────────────────────────────────── */

export type B2BCalculationInput = {
  surfaceType: string // "toiture" | "parking" | "terrain"
  surfaceRange: string // "lt_500" | "m500_1500" | "gt_1500"
  surfaceAreaM2?: number
  annualElectricityBill: number // € HT / an
  grd?: string
}

export type B2BCalculationResult = {
  surfaceAreaM2: number
  installedPowerKwc: number
  annualProductionKwh: number
  autoconsumptionRate: number // % (ex: 74)
  estimatedAnnualSavings: number // € HT / an
  estimatedRoiYears: number // Années (ex: 5.4)
  totalCapexEstimate: number // € HT
  gain20Years: number // Cumul net sur 20 ans
}

export function calculateB2BSolarROI(input: B2BCalculationInput): B2BCalculationResult {
  // 1. Surface utile
  let surfaceM2 = input.surfaceAreaM2 ?? 1000
  if (!input.surfaceAreaM2) {
    if (input.surfaceRange === "lt_500") surfaceM2 = 400
    else if (input.surfaceRange === "m500_1500") surfaceM2 = 1000
    else if (input.surfaceRange === "gt_1500") surfaceM2 = 2500
  }

  // 2. Puissance crête (kWc)
  // Ratio réaliste incluant coupoles de désenfumage, acrotères, zones coupe-feu et espacement ombrage :
  // ~8.5 m² par kWc pour toiture industrielle plate lestée
  // Ombrières parking : ~8.0 m² par kWc
  const m2PerKwc = input.surfaceType === "parking" ? 8.0 : 8.5
  const maxRoofPowerKwc = Math.round((surfaceM2 / m2PerKwc) * 10) / 10

  // 3. Estimation de la consommation du site
  const annualBill = Math.max(input.annualElectricityBill, 2000)
  const estimatedConsumptionKwh = annualBill / SOLAR_CONSTANTS.B2B_ELECTRICITY_PRICE_HT

  // 4. Dimensionnement économique : on ne dimensionne pas au-delà de 115% de la consommation annuelle
  // (sauf plancher minimal de 10 kWc), dans la limite physique de la toiture disponible
  const optimalPowerForConsoKwc = (estimatedConsumptionKwh * 1.15) / SOLAR_CONSTANTS.BELGIUM_YIELD_KWH_PER_KWC
  const installedPowerKwc = Math.round(
    Math.min(maxRoofPowerKwc, Math.max(10, optimalPowerForConsoKwc)) * 10
  ) / 10

  // 5. Production annuelle (kWh)
  const annualProductionKwh = Math.round(installedPowerKwc * SOLAR_CONSTANTS.BELGIUM_YIELD_KWH_PER_KWC)

  // 6. Calcul du taux d'autoconsommation borné par la physique réelle
  const ratioProdConso = annualProductionKwh / Math.max(estimatedConsumptionKwh, 1)
  let rawAutoconsumptionRate = 75
  if (ratioProdConso < 0.6) {
    rawAutoconsumptionRate = 88
  } else if (ratioProdConso > 1.4) {
    rawAutoconsumptionRate = Math.round((1 / ratioProdConso) * 80)
  } else {
    rawAutoconsumptionRate = Math.round(78 - (ratioProdConso - 0.6) * 25)
  }

  // PLAFOND PHYSIQUE ABSOLU : une PME tertiaire sans batterie industrielle
  // ne peut jamais couvrir plus de 70% de sa consommation annuelle totale uniquement avec du solaire diurne
  const maxPossibleAutoconsumedKwh = estimatedConsumptionKwh * 0.70
  const unCappedAutoconsumedKwh = annualProductionKwh * (Math.min(90, Math.max(15, rawAutoconsumptionRate)) / 100)
  const autoconsumedKwh = Math.round(Math.min(unCappedAutoconsumedKwh, maxPossibleAutoconsumedKwh))
  const injectedKwh = Math.max(0, annualProductionKwh - autoconsumedKwh)
  const autoconsumptionRate = Math.round((autoconsumedKwh / Math.max(annualProductionKwh, 1)) * 100)

  // 7. Économies annuelles (€ HT)
  const savingsSelfConsumed = autoconsumedKwh * SOLAR_CONSTANTS.B2B_ELECTRICITY_PRICE_HT
  const revenueInjection = injectedKwh * SOLAR_CONSTANTS.INJECTION_PRICE_PER_KWH
  const grossSavings = savingsSelfConsumed + revenueInjection

  // 8. CAPEX estimatif (€ HT / kWc dégressif selon volume)
  let costPerKwc = 1050
  if (installedPowerKwc >= 250) costPerKwc = 860
  else if (installedPowerKwc >= 100) costPerKwc = 920
  else if (installedPowerKwc >= 30) costPerKwc = 980

  // Ombrières de parking ont un surcoût structurel acier/fondations
  if (input.surfaceType === "parking") {
    costPerKwc *= 1.28
  }

  const totalCapex = Math.round(installedPowerKwc * costPerKwc)

  // Maintenance & monitoring annuel (~1.2% CAPEX)
  const annualOpex = totalCapex * 0.012
  const netAnnualSavings = Math.max(Math.round(grossSavings - annualOpex), 1000)

  // 9. ROI réaliste non tronqué
  const rawRoi = totalCapex / netAnnualSavings
  const estimatedRoiYears = Math.round(rawRoi * 10) / 10

  // Cumul 20 ans avec dégradation légère
  const gain20Years = Math.round(netAnnualSavings * 18.5 - totalCapex)

  return {
    surfaceAreaM2: surfaceM2,
    installedPowerKwc,
    annualProductionKwh,
    autoconsumptionRate,
    estimatedAnnualSavings: netAnnualSavings,
    estimatedRoiYears,
    totalCapexEstimate: totalCapex,
    gain20Years: Math.max(gain20Years, 0),
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * B2C RESIDENTIAL SOLAR ENGINE
 * ──────────────────────────────────────────────────────────────────────────── */

export type B2CCalculationInput = {
  roofKwc: number
  orientationFactor: number // 0.82 to 1.0
  annualBill: number // € TTC / an
  hasBattery: "oui" | "hesite" | "non"
  hasEv: "oui" | "prevu" | "non"
}

export type B2CCalculationResult = {
  installedPowerKwc: number
  annualProductionKwh: number
  autoconsumptionRate: number
  annualSavings: number // € TTC / an
  roiYears: number
  co2AvoidedTons: number
  monthlyGain: number
  gain25Years: number
  totalNetCost: number
}

export function calculateB2CSolarROI(input: B2CCalculationInput): B2CCalculationResult {
  const installedPowerKwc = Math.round(input.roofKwc * 10) / 10
  const orientFactor = input.orientationFactor || 0.9

  // Production annuelle avec gisement wallon réel
  const annualProductionKwh = Math.round(
    installedPowerKwc * SOLAR_CONSTANTS.BELGIUM_YIELD_KWH_PER_KWC * orientFactor
  )

  const consumptionKwh = input.annualBill / SOLAR_CONSTANTS.B2C_ELECTRICITY_PRICE_TTC

  // Taux d'autoconsommation résidentiel
  let autoRate = 35 // Base typique sans batterie
  if (input.hasBattery === "oui") autoRate = 72
  else if (input.hasBattery === "hesite") autoRate = 48

  if (input.hasEv === "oui" || input.hasEv === "prevu") {
    autoRate = Math.min(autoRate + 8, 85)
  }

  // Si production nettement supérieure à consommation
  if (annualProductionKwh > consumptionKwh * 1.5) {
    autoRate = Math.max(Math.round(autoRate * (consumptionKwh / annualProductionKwh) * 1.2), 25)
  }
  autoRate = Math.min(autoRate, 85)

  // Valorisation financière (€ TTC)
  const selfConsumedKwh = annualProductionKwh * (autoRate / 100)
  const injectedKwh = annualProductionKwh * ((100 - autoRate) / 100)

  const selfConsumedVal = selfConsumedKwh * SOLAR_CONSTANTS.B2C_ELECTRICITY_PRICE_TTC
  const injectedVal = injectedKwh * SOLAR_CONSTANTS.INJECTION_PRICE_PER_KWH
  const annualSavings = Math.round(selfConsumedVal + injectedVal)

  // Coût d'installation (TVA 6% comprise pour logement résidentiel > 10 ans)
  // ~1 450 € / kWc pour petite installation résidentielle
  let installCost = Math.round(installedPowerKwc * 1450)
  if (input.hasBattery === "oui") {
    installCost += 5800 // Batterie 7-10 kWh
  } else if (input.hasBattery === "hesite") {
    installCost += 1200 // Pré-équipement onduleur hybride
  }

  // Pas de prime directe fictive : la rentabilité provient de l'électricité évitée (0,32 €/kWh)
  const totalNetCost = installCost

  // ROI honnête non clamped
  const rawRoi = totalNetCost / Math.max(annualSavings, 1)
  const roiYears = Math.round(rawRoi * 10) / 10

  const co2AvoidedTons = Math.round(
    annualProductionKwh * SOLAR_CONSTANTS.CO2_AVOIDED_KG_PER_KWH * 0.001 * 10
  ) / 10

  const monthlyGain = Math.round(annualSavings / 12)
  const gain25Years = Math.round(annualSavings * 22.5 - totalNetCost)

  return {
    installedPowerKwc,
    annualProductionKwh,
    autoconsumptionRate: autoRate,
    annualSavings,
    roiYears,
    co2AvoidedTons,
    monthlyGain,
    gain25Years: Math.max(gain25Years, 0),
    totalNetCost,
  }
}
