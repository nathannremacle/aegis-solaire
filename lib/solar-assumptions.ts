/**
 * Moteur de calcul solaire Wallonie — Aegis Solaire
 * Hypothèses techniques et financières vérifiées (CWaPE, SPW Énergie, Synergrid C10/11, PVGIS Wallonie)
 *
 * Principes d'ingénierie (Marché belge / wallon 2026) :
 * - Fin de la compensation ("compteur qui tourne à l'envers") en Wallonie depuis le 01/01/2024 :
 *   le surdimensionnement dégrade le ROI car le surplus injecté est valorisé ~0,045 €/kWh contre ~0,33 €/kWh autoconsommé.
 * - Gisement solaire wallon réel : 920 kWh/kWc/an plein Sud 35° (moyenne réelle ~810 à 880 kWh/kWc/an selon orientation/inclinaison).
 * - Densité toiture réaliste tenant compte des zones de rive, cheminées, Velux, coupoles et espacements anti-ombrage :
 *   • Toiture inclinée résidentielle : ~7,5 m² bruts / kWc (~0,133 kWc/m²)
 *   • Toiture plate résidentielle/tertiaire (châssis lestés 10-15°) : ~9,5 m² bruts / kWc (~0,105 kWc/m²)
 *   • Toiture bac acier industrielle : ~8,0 m² bruts / kWc (~0,125 kWc/m²)
 * - Coûts d'installation comprenant les frais fixes incompressibles (échafaudage, contrôle RGIE, relais C10/11, coffrets)
 *   + coût variable dégressif par kWc.
 */

export const SOLAR_CONSTANTS = {
  /** Gisement solaire de référence en Wallonie (kWh/kWc/an, plein Sud, inclinaison 35°) */
  BELGIUM_YIELD_KWH_PER_KWC: 920,

  /** Puissance unitaire d'un panneau monocristallin N-Type Tier-1 standard (Wc) */
  STANDARD_PANEL_POWER_WC: 435,

  /** Dégradation annuelle linéaire des panneaux Tier-1 (garantie 25 ans) */
  ANNUAL_DEGRADATION_RATE: 0.005, // 0.5% / an

  /** Prix moyen de rachat du kWh injecté sur le réseau (contrat de revente résidentiel/PME) */
  INJECTION_PRICE_PER_KWH: 0.045,

  /** B2B - Coût variable moyen de l'électricité professionnelle réseau évitée (€ HT / kWh) */
  B2B_ELECTRICITY_PRICE_HT: 0.21,

  /** B2B - Redevances fixes annuelles compteur / capacité non évitables (€ HT / an) */
  B2B_FIXED_METER_FEES_HT: 650,

  /** B2C - Coût variable moyen de l'électricité résidentielle réseau évitée (€ TTC / kWh) */
  B2C_ELECTRICITY_PRICE_TTC: 0.33,

  /** B2C - Redevances fixes annuelles compteur / réseau non évitables par le solaire (€ TTC / an) */
  B2C_FIXED_METER_FEES_TTC: 160,

  /** Facteur d'évitement carbone moyen du mix électrique belge (kg CO2 / kWh) */
  CO2_AVOIDED_KG_PER_KWH: 0.22,
} as const

/**
 * Calcule le facteur de productible selon l'orientation et le type de toiture
 */
export function getOrientationAndTiltFactor(
  orientation?: string | null,
  roofMaterial?: string | null,
  surfaceType?: string | null
): number {
  const roof = (roofMaterial || "").toLowerCase()
  const surf = (surfaceType || "").toLowerCase()
  const orient = (orientation || "").toLowerCase()

  // Toiture plate (châssis lestés inclinés à 10-12°, souvent Est-Ouest ou Sud-Est/Sud-Ouest)
  const isFlatRoof = roof.includes("plat") || roof.includes("epdm")

  let baseFactor = 0.90 // Moyenne résidentielle wallonne (Sud-Est / Sud-Ouest)
  if (orient === "sud" || orient === "plein_sud") {
    baseFactor = 1.0
  } else if (orient === "sud_est_ouest" || orient === "se_so") {
    baseFactor = 0.93
  } else if (orient === "est_ouest" || orient === "e_o") {
    baseFactor = 0.83
  } else if (isFlatRoof) {
    baseFactor = 0.88
  } else if (surf === "parking") {
    baseFactor = 0.90
  } else if (surf === "terrain") {
    baseFactor = 0.98 // Châssis au sol orientés plein Sud à 30°
  }

  // Légère pénalité d'inclinaison sur toit plat si l'utilisateur a choisi "Plein Sud"
  if (isFlatRoof && baseFactor > 0.92) {
    baseFactor = 0.92
  }

  return baseFactor
}

/**
 * Retourne la densité de puissance réaliste (kWc installables par m² de surface brute déclarée)
 * en tenant compte des zones coupe-feu, rives, obstacles et espacements inter-rangées.
 */
export function getUsableKwcPerM2(
  segment: "B2B" | "B2C" | string,
  roofMaterial?: string | null,
  surfaceType?: string | null,
  propertyType?: string | null
): number {
  const isB2C = segment === "B2C"
  const roof = (roofMaterial || "").toLowerCase()
  const surf = (surfaceType || "").toLowerCase()
  const prop = (propertyType || "").toLowerCase()

  if (isB2C) {
    let kwcPerM2 = 0.133 // ~7,5 m² bruts par kWc sur toiture inclinée (tuiles/ardoises)
    if (roof.includes("plat") || roof.includes("epdm")) {
      kwcPerM2 = 0.105 // ~9,5 m² bruts par kWc sur toiture plate (écartement anti-ombrage)
    }
    // Maison mitoyenne (2-3 façades) : contraintes de mitoyenneté et largeur de pan réduite
    if (prop.includes("mitoyen")) {
      kwcPerM2 *= 0.90
    }
    return kwcPerM2
  }

  // Segment B2B
  if (surf === "parking") return 0.125 // ~8,0 m² par kWc (ombrières)
  if (surf === "terrain") return 0.100 // ~10,0 m² par kWc (espacement rangées au sol)
  if (roof.includes("plat") || roof.includes("epdm")) return 0.108 // ~9,25 m² par kWc (exutoires, acrotères, lestage)
  if (roof.includes("bac_acier") || roof.includes("acier")) return 0.125 // ~8,0 m² par kWc (pose rail sur nervures)
  return 0.115 // Moyenne industrielle prudente (~8,7 m² par kWc)
}

/* ─────────────────────────────────────────────────────────────────────────────
 * B2B SOLAR ENGINE
 * ──────────────────────────────────────────────────────────────────────────── */

export type B2BCalculationInput = {
  surfaceType: string // "toiture" | "parking" | "terrain"
  surfaceRange?: string // "lt_500" | "m500_1500" | "gt_1500"
  surfaceAreaM2?: number
  roofMaterial?: string | null
  annualElectricityBill: number // € HT / an
  grd?: string
}

export type B2BCalculationResult = {
  surfaceAreaM2: number
  usableSurfaceM2: number
  installedPowerKwc: number
  estimatedPanelCount: number
  estimatedConsumptionKwh: number
  annualProductionKwh: number
  autoconsumptionRate: number // % (ex: 71)
  selfConsumedKwh: number
  injectedKwh: number
  estimatedAnnualSavings: number // € HT / an (net d'OPEX)
  estimatedRoiYears: number // Années (ex: 5.8)
  totalCapexEstimate: number // € HT
  capexRangeHT: { min: number; max: number }
  gain20Years: number // Cumul net sur 20 ans
  co2AvoidedTons: number
  inverterType: string
  sizingRationale: string
}

export function calculateB2BSolarROI(input: B2BCalculationInput): B2BCalculationResult {
  // 1. Surface brute réaliste selon la tranche choisie (médiane prudente au lieu du plafond de tranche)
  let surfaceM2 = input.surfaceAreaM2 && input.surfaceAreaM2 > 0 ? input.surfaceAreaM2 : 0
  if (surfaceM2 <= 0) {
    if (input.surfaceRange === "lt_500") surfaceM2 = 280
    else if (input.surfaceRange === "m500_1500") surfaceM2 = 850
    else if (input.surfaceRange === "gt_1500") surfaceM2 = 1800
    else surfaceM2 = 650
  }

  // 2. Capacité maximale physique de la surface (kWc)
  const kwcPerM2 = getUsableKwcPerM2("B2B", input.roofMaterial, input.surfaceType)
  const maxRoofPowerKwc = Math.round(surfaceM2 * kwcPerM2 * 10) / 10

  // 3. Estimation de la consommation électrique réelle du site (kWh/an)
  const annualBill = Math.max(input.annualElectricityBill, 2500)
  const variableBill = Math.max(annualBill * 0.85, annualBill - SOLAR_CONSTANTS.B2B_FIXED_METER_FEES_HT)
  const estimatedConsumptionKwh = Math.round(variableBill / SOLAR_CONSTANTS.B2B_ELECTRICITY_PRICE_HT)

  // 4. Dimensionnement économique rationnel (sans batterie industrielle) :
  // En B2B wallon, le tarif d'injection (~0,045 €/kWh) est presque 5x inférieur au kWh évité (0,21 €/kWh).
  // Pour maintenir ~68-75% d'autoconsommation et ne pas sur-investir en panneaux inutiles l'été et le week-end,
  // la puissance crête optimale se situe à ~0,68 kWc par MWh consommé annuellement.
  const optimalPowerForConsoKwc = (estimatedConsumptionKwh * 0.68) / 1000
  const rawTargetPowerKwc = Math.min(maxRoofPowerKwc, Math.max(10, optimalPowerForConsoKwc))

  // Quantification par multiples de panneaux de 435 Wc (minimum 20 panneaux = 8,7 kWc si petite toiture)
  const panelCount = Math.max(16, Math.round((rawTargetPowerKwc * 1000) / SOLAR_CONSTANTS.STANDARD_PANEL_POWER_WC))
  const installedPowerKwc = Math.round(panelCount * (SOLAR_CONSTANTS.STANDARD_PANEL_POWER_WC / 1000) * 10) / 10
  const usableSurfaceM2 = Math.min(surfaceM2, Math.round(panelCount * 2.1))

  // 5. Production annuelle (kWh) selon type de pose
  const orientFactor = getOrientationAndTiltFactor(null, input.roofMaterial, input.surfaceType)
  const yieldPerKwc = Math.round(SOLAR_CONSTANTS.BELGIUM_YIELD_KWH_PER_KWC * orientFactor)
  const annualProductionKwh = Math.round(installedPowerKwc * yieldPerKwc)

  // 6. Calcul du taux d'autoconsommation borné par la physique d'une PME (activité 5j/7 ou 6j/7)
  const ratioProdConso = annualProductionKwh / Math.max(estimatedConsumptionKwh, 1)
  let rawAutoconsumptionRate: number
  if (ratioProdConso <= 0.45) {
    rawAutoconsumptionRate = 84
  } else if (ratioProdConso <= 0.75) {
    // Entre 0.45 et 0.75 : décroît linéairement de 84% à 70%
    rawAutoconsumptionRate = Math.round(84 - ((ratioProdConso - 0.45) / 0.30) * 14)
  } else if (ratioProdConso <= 1.15) {
    // Entre 0.75 et 1.15 : décroît de 70% à 54%
    rawAutoconsumptionRate = Math.round(70 - ((ratioProdConso - 0.75) / 0.40) * 16)
  } else {
    rawAutoconsumptionRate = Math.max(25, Math.round((0.62 / ratioProdConso) * 100))
  }

  // PLAFOND PHYSIQUE RÉEL : sans stockage industriel, le solaire diurne ne peut jamais couvrir
  // plus de 54% de la consommation annuelle totale (qui inclut l'hiver, les matins/soirées et week-ends).
  const maxPossibleAutoconsumedKwh = estimatedConsumptionKwh * 0.54
  const unCappedAutoconsumedKwh = annualProductionKwh * (rawAutoconsumptionRate / 100)
  const selfConsumedKwh = Math.round(Math.min(unCappedAutoconsumedKwh, maxPossibleAutoconsumedKwh))
  const injectedKwh = Math.max(0, annualProductionKwh - selfConsumedKwh)
  const autoconsumptionRate = Math.round((selfConsumedKwh / Math.max(annualProductionKwh, 1)) * 100)

  // 7. CAPEX réaliste (€ HT) : Coûts fixes (étude réseau GRD, relais C10/11, RGIE, chantier) + coût variable / kWc
  const fixedEngineeringCost = installedPowerKwc > 30 ? 4200 : 2400
  let variableCostPerKwc = 860
  if (installedPowerKwc >= 250) variableCostPerKwc = 690
  else if (installedPowerKwc >= 100) variableCostPerKwc = 740
  else if (installedPowerKwc >= 40) variableCostPerKwc = 800

  let totalCapex = Math.round(fixedEngineeringCost + installedPowerKwc * variableCostPerKwc)

  // Surcoût structurel acier & génie civil pour ombrières de parking
  if (input.surfaceType === "parking") {
    totalCapex = Math.round(totalCapex * 1.32)
  } else if (input.roofMaterial === "plat_epdm") {
    totalCapex = Math.round(totalCapex * 1.04) // Châssis aérodynamiques lestés
  }

  const minCapex = Math.round((totalCapex * 0.93) / 100) * 100
  const maxCapex = Math.round((totalCapex * 1.07) / 100) * 100

  // 8. Économies annuelles nettes (€ HT) après OPEX (maintenance, assurance, monitoring, provision onduleur ~1.5%/an)
  const savingsSelfConsumed = selfConsumedKwh * SOLAR_CONSTANTS.B2B_ELECTRICITY_PRICE_HT
  const revenueInjection = injectedKwh * SOLAR_CONSTANTS.INJECTION_PRICE_PER_KWH
  const grossSavings = savingsSelfConsumed + revenueInjection
  const annualOpex = totalCapex * 0.015
  const netAnnualSavings = Math.max(Math.round(grossSavings - annualOpex), 500)

  // 9. Temps de retour sur investissement (ROI) réaliste
  const rawRoi = totalCapex / netAnnualSavings
  const estimatedRoiYears = Math.round(rawRoi * 10) / 10

  // 10. Gain net cumulé sur 20 ans (intégrant la dégradation linéaire de 0.5%/an : facteur cumulé ~19.1)
  const totalNetCashflow20Y = grossSavings * 19.1 - annualOpex * 20 - totalCapex
  const gain20Years = Math.max(0, Math.round(totalNetCashflow20Y / 100) * 100)

  const co2AvoidedTons =
    Math.round(annualProductionKwh * SOLAR_CONSTANTS.CO2_AVOIDED_KG_PER_KWH * 0.001 * 10) / 10

  const inverterType =
    installedPowerKwc > 30
      ? "Triphasé industriel + Relais C10/11"
      : "Onduleur Triphasé string"

  const sizingRationale =
    maxRoofPowerKwc < optimalPowerForConsoKwc
      ? `Limité par la surface exploitable (${usableSurfaceM2} m² utiles sur ${surfaceM2} m² bruts)`
      : `Dimensionné sur la consommation diurne PME (≈ ${Math.round(estimatedConsumptionKwh / 1000)} MWh/an)`

  return {
    surfaceAreaM2: surfaceM2,
    usableSurfaceM2,
    installedPowerKwc,
    estimatedPanelCount: panelCount,
    estimatedConsumptionKwh,
    annualProductionKwh,
    autoconsumptionRate,
    selfConsumedKwh,
    injectedKwh,
    estimatedAnnualSavings: netAnnualSavings,
    estimatedRoiYears,
    totalCapexEstimate: totalCapex,
    capexRangeHT: { min: minCapex, max: maxCapex },
    gain20Years,
    co2AvoidedTons,
    inverterType,
    sizingRationale,
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * B2C RESIDENTIAL SOLAR ENGINE
 * ──────────────────────────────────────────────────────────────────────────── */

export type B2CCalculationInput = {
  roofKwc?: number
  surfaceAreaM2?: number
  roofMaterial?: string | null
  propertyType?: string | null
  orientation?: string | null
  orientationFactor?: number // 0.82 to 1.0
  annualBill: number // € TTC / an
  consumptionKwh?: number // Si connu directement (ex: tranche kWh du formulaire)
  hasBattery: "oui" | "hesite" | "non" | boolean
  hasEv?: "oui" | "prevu" | "non" | boolean
  householdSize?: string | null
}

export type B2CCalculationResult = {
  installedPowerKwc: number
  estimatedPanelCount: number
  usableSurfaceM2: number
  estimatedConsumptionKwh: number
  annualProductionKwh: number
  autoconsumptionRate: number
  selfConsumedKwh: number
  injectedKwh: number
  annualSavings: number // € TTC / an
  roiYears: number
  co2AvoidedTons: number
  monthlyGain: number
  gain25Years: number
  totalNetCost: number // € TTC (TVA 6% incluse)
  totalNetCostHT: number // € HT
  contractRangeHT: { min: number; max: number }
  inverterType: string
  sizingRationale: string
}

export function calculateB2CSolarROI(input: B2CCalculationInput): B2CCalculationResult {
  const orientFactor =
    input.orientationFactor ??
    getOrientationAndTiltFactor(input.orientation, input.roofMaterial, "toiture")

  const batteryConfirmed = input.hasBattery === "oui" || input.hasBattery === true
  const evConfirmedOrPlanned =
    input.hasEv === "oui" || input.hasEv === "prevu" || input.hasEv === true

  // 1. Estimation rigoureuse de la consommation annuelle du ménage (kWh/an)
  let consumptionKwh = input.consumptionKwh && input.consumptionKwh > 0 ? input.consumptionKwh : 0
  if (consumptionKwh <= 0) {
    // On déduit la redevance fixe annuelle (~160 €/an) avant de diviser par le prix du kWh TTC (0,33 €)
    const bill = Math.max(input.annualBill, 500)
    const variableBill = Math.max(bill * 0.82, bill - SOLAR_CONSTANTS.B2C_FIXED_METER_FEES_TTC)
    consumptionKwh = Math.round(variableBill / SOLAR_CONSTANTS.B2C_ELECTRICITY_PRICE_TTC)
  }

  // Ajustement de cohérence avec la taille du ménage si renseignée
  if (input.householdSize === "1_2" && !input.consumptionKwh && input.annualBill <= 1000) {
    consumptionKwh = Math.min(consumptionKwh, 2800)
  }

  // 2. Capacité physique maximale de la toiture (kWc)
  let maxRoofKwc = 10
  if (input.surfaceAreaM2 && input.surfaceAreaM2 > 0) {
    const kwcPerM2 = getUsableKwcPerM2("B2C", input.roofMaterial, "toiture", input.propertyType)
    maxRoofKwc = Math.round(input.surfaceAreaM2 * kwcPerM2 * 10) / 10
  } else if (input.roofKwc && input.roofKwc > 0) {
    maxRoofKwc = input.roofKwc
  }

  // 3. Dimensionnement économique optimal (Wallonie post-2024 sans compteur qui tourne à l'envers) :
  // - Sans batterie ni VE : ~0,86 kWc par 1 000 kWh consommés évite la surproduction estivale bradée à 0,045 €/kWh
  // - Avec batterie ou VE : ~0,98 kWc par 1 000 kWh consommés
  const sizingRatioPerMwh = batteryConfirmed || evConfirmedOrPlanned ? 0.98 : 0.86
  const targetPowerFromConsoKwc = (consumptionKwh / 1000) * sizingRatioPerMwh

  const rawClampedKwc = Math.min(10, Math.max(2.6, Math.min(maxRoofKwc, targetPowerFromConsoKwc)))
  // Si la toiture elle-même est très petite (< 2.6 kWc), on respecte la limite physique de la toiture (min 5 panneaux = 2.2 kWc)
  const effectiveKwc = maxRoofKwc < 2.6 ? Math.max(2.2, maxRoofKwc) : rawClampedKwc

  const panelCount = Math.min(
    23,
    Math.max(5, Math.round((effectiveKwc * 1000) / SOLAR_CONSTANTS.STANDARD_PANEL_POWER_WC))
  )
  const installedPowerKwc =
    Math.round(panelCount * (SOLAR_CONSTANTS.STANDARD_PANEL_POWER_WC / 1000) * 10) / 10
  const usableSurfaceM2 = Math.round(panelCount * 2.0)

  // 4. Production annuelle réelle en Wallonie (kWh/an)
  const annualProductionKwh = Math.round(
    installedPowerKwc * SOLAR_CONSTANTS.BELGIUM_YIELD_KWH_PER_KWC * orientFactor
  )

  // 5. Modélisation physique du taux d'autoconsommation résidentiel (%)
  const prodToConsoRatio = annualProductionKwh / Math.max(consumptionKwh, 1)

  // Courbe d'autoconsommation naturelle sans stockage : ~34% quand prod/conso ≈ 0.80
  let autoRate = Math.round(42 - prodToConsoRatio * 10)
  autoRate = Math.min(44, Math.max(24, autoRate))

  if (batteryConfirmed) {
    // Une batterie domestique (5 à 10 kWh) ajoute +28 à +32 points d'autoconsommation
    autoRate += 30
  }
  if (evConfirmedOrPlanned) {
    // Charge diurne pilotée du véhicule électrique
    autoRate += 8
  }

  autoRate = Math.min(autoRate, batteryConfirmed ? 74 : 48)

  // Plafond physique de couverture de la consommation annuelle du foyer :
  // Sans batterie, le solaire ne peut couvrir au maximum que ~38% de la conso annuelle (nuit + hiver).
  // Avec batterie domestique, il ne peut couvrir au maximum que ~66% de la conso annuelle (creux hivernal belge).
  const maxHouseholdCoverageRatio = batteryConfirmed ? 0.66 : evConfirmedOrPlanned ? 0.44 : 0.38
  const maxSelfConsumedKwh = consumptionKwh * maxHouseholdCoverageRatio
  const rawSelfConsumedKwh = annualProductionKwh * (autoRate / 100)

  const selfConsumedKwh = Math.round(Math.min(rawSelfConsumedKwh, maxSelfConsumedKwh))
  const injectedKwh = Math.max(0, annualProductionKwh - selfConsumedKwh)
  const finalAutoconsumptionRate = Math.round(
    (selfConsumedKwh / Math.max(annualProductionKwh, 1)) * 100
  )

  // 6. Valorisation des économies annuelles (€ TTC / an)
  const selfConsumedVal = selfConsumedKwh * SOLAR_CONSTANTS.B2C_ELECTRICITY_PRICE_TTC
  const injectedVal = injectedKwh * SOLAR_CONSTANTS.INJECTION_PRICE_PER_KWH
  const annualSavings = Math.round(selfConsumedVal + injectedVal)

  // 7. Coût d'installation clé en main réaliste en Wallonie (€ HT et € TTC à 6% TVA)
  // Frais fixes incompressibles (mise en sécurité/échafaudage, coffret, raccordement, contrôle RGIE agréé) : 1 150 € HT
  // + Coût matériel & pose par kWc dégressif : ~730 à 790 € HT / kWc
  const fixedCostHT = 1150
  const variablePerKwcHT = installedPowerKwc >= 7 ? 730 : installedPowerKwc >= 4.5 ? 760 : 790
  let roofComplexityMultiplier = 1.0
  const roofLower = (input.roofMaterial || "").toLowerCase()
  if (roofLower.includes("ardoise")) roofComplexityMultiplier = 1.06 // Crochets ardoises spécifiques
  else if (roofLower.includes("plat") || roofLower.includes("epdm")) roofComplexityMultiplier = 1.05 // Châssis lestés

  let installCostHT = Math.round(
    (fixedCostHT + installedPowerKwc * variablePerKwcHT) * roofComplexityMultiplier
  )

  // On n'ajoute le coût d'une batterie QUE si le prospect a explicitement sélectionné "oui"
  // (jamais sur "hesite" pour ne pas gonfler artificiellement le devis de base)
  if (batteryConfirmed) {
    const batteryCapacityCostHT = installedPowerKwc >= 6 ? 3400 : 2950
    installCostHT += batteryCapacityCostHT
  }

  const minContractHT = Math.round((installCostHT * 0.92) / 50) * 50
  const maxContractHT = Math.round((installCostHT * 1.08) / 50) * 50
  const totalNetCostHT = Math.round((minContractHT + maxContractHT) / 2)

  // TVA réduite 6% (standard rénovation résidentielle > 10 ans en Belgique)
  const totalNetCost = Math.round(totalNetCostHT * 1.06)

  // 8. Amortissement (ROI) réaliste
  // Intègre une légère hausse tendancielle de l'énergie / optimisation diurne (+8% en moyenne sur la période d'amortissement)
  const effectiveAnnualReturnForPayback = Math.max(annualSavings * 1.06, 1)
  const rawRoi = totalNetCost / effectiveAnnualReturnForPayback
  const roiYears = Math.round(rawRoi * 10) / 10

  const co2AvoidedTons =
    Math.round(annualProductionKwh * SOLAR_CONSTANTS.CO2_AVOIDED_KG_PER_KWH * 0.001 * 10) / 10

  const monthlyGain = Math.round(annualSavings / 12)

  // Gain net sur 25 ans : intègre la dégradation linéaire (0.5%/an -> facteur 23.5)
  // et une provision pour le remplacement de l'onduleur vers l'année 14 (~1 100 €)
  const inverterReplacementReserve = 1100
  const gain25Years = Math.max(
    0,
    Math.round((annualSavings * 23.5 - totalNetCost - inverterReplacementReserve) / 100) * 100
  )

  const inverterType = batteryConfirmed
    ? installedPowerKwc > 5
      ? "Hybride Triphasé (stockage)"
      : "Hybride Monophasé (stockage)"
    : installedPowerKwc > 5
      ? "String Triphasé (≤ 10 kVA)"
      : "String Monophasé (≤ 5 kVA)"

  const sizingRationale =
    maxRoofKwc < targetPowerFromConsoKwc
      ? `Plafonné par la surface utile toiture (${usableSurfaceM2} m² utiles)`
      : `Calibré pour ${consumptionKwh.toLocaleString("fr-BE")} kWh/an (${finalAutoconsumptionRate}% autoconso.)`

  return {
    installedPowerKwc,
    estimatedPanelCount: panelCount,
    usableSurfaceM2,
    estimatedConsumptionKwh: consumptionKwh,
    annualProductionKwh,
    autoconsumptionRate: finalAutoconsumptionRate,
    selfConsumedKwh,
    injectedKwh,
    annualSavings,
    roiYears,
    co2AvoidedTons,
    monthlyGain,
    gain25Years,
    totalNetCost,
    totalNetCostHT,
    contractRangeHT: { min: minContractHT, max: maxContractHT },
    inverterType,
    sizingRationale,
  }
}
