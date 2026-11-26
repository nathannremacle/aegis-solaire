/**
 * Générateur de Note de Synthèse Financière CFO B2B (Wallonie 2026).
 * Modélise indicativement la DPI majorée à 40 %, l'effet d'aubaine ISoc (25 %),
 * le prêt subordonné Easy'Green (Wallonie Entreprendre) et l'éligibilité aux Certificats Verts (> 10 kVA).
 *
 * Avertissement légal intégré : simulation technico-économique indicative, Aegis Solaire
 * n'agit ni comme intermédiaire de crédit FSMA ni comme conseiller fiscal.
 */

export interface B2BCfoBrief {
  estimatedPowerKwc: number
  estimatedCapexHtva: number
  dpi40DeductionBaseEur: number
  isocTaxShieldEur: number
  netEffectiveCapexEur: number
  estimatedAnnualSavingsEur: number
  paybackYearsWithDpi: number
  cvEligible: boolean
  easyGreenEligible: boolean
  recommendedSuccessFeeEur: number
  summaryLines: string[]
  disclaimer: string
}

export function buildB2BCfoBrief(params: {
  estimatedPowerKwc?: number | null
  surfaceAreaM2?: number | null
  annualBillEur?: number | null
}): B2BCfoBrief {
  const area = Math.max(0, Number(params.surfaceAreaM2) || 0)
  const bill = Math.max(0, Number(params.annualBillEur) || 0)
  const kwc =
    params.estimatedPowerKwc && params.estimatedPowerKwc > 0
      ? Number(params.estimatedPowerKwc)
      : Math.max(15, Math.round((area * 0.175) * 10) / 10)

  // CAPEX moyen B2B Wallonie 2026 (€/Wc dégressif selon taille)
  const eurPerWc = kwc >= 200 ? 0.85 : kwc >= 80 ? 0.95 : 1.08
  const estimatedCapexHtva = Math.round(kwc * 1000 * eurPerWc)

  // DPI majorée à 40 % (en vigueur depuis le 01/01/2025 pour investissements écologiques)
  const dpi40DeductionBaseEur = Math.round(estimatedCapexHtva * 0.4)
  // Bouclier fiscal immédiat à l'ISoc standard (25 %)
  const isocTaxShieldEur = Math.round(dpi40DeductionBaseEur * 0.25)
  const netEffectiveCapexEur = Math.max(0, estimatedCapexHtva - isocTaxShieldEur)

  const estimatedAnnualSavingsEur =
    bill > 0
      ? Math.round(Math.min(bill * 0.58, kwc * 930 * 0.65 * 0.22))
      : Math.round(kwc * 930 * 0.65 * 0.22)

  const paybackYearsWithDpi =
    estimatedAnnualSavingsEur > 0
      ? Math.round((netEffectiveCapexEur / estimatedAnnualSavingsEur) * 10) / 10
      : 4.5

  const cvEligible = kwc > 10
  const easyGreenEligible = estimatedCapexHtva >= 25000 && estimatedCapexHtva <= 1000000
  const recommendedSuccessFeeEur = kwc > 150 ? 3000 : 1500

  const summaryLines = [
    `Puissance cible modélisée : ${kwc.toFixed(1).replace(".", ",")} kWc (CAPEX indicatif ~${estimatedCapexHtva.toLocaleString("fr-BE")} € HTVA).`,
    `DPI majorée 40 % (CIR 92) : déduction extracomptable de ${dpi40DeductionBaseEur.toLocaleString("fr-BE")} € soit ~${isocTaxShieldEur.toLocaleString("fr-BE")} € d'économie directe d'ISoc (25 %), ramenant le coût net à ${netEffectiveCapexEur.toLocaleString("fr-BE")} € HTVA.`,
    `Amortissement net estimé après DPI : ~${paybackYearsWithDpi.toFixed(1).replace(".", ",")} ans (autoconsommation directe hors injection).`,
    cvEligible
      ? `Certificats Verts CWaPE (> 10 kVA) : éligible sous réserve d'introduction préalable de la Démarche 2945 SPW Énergie.`
      : `Micro-installation <= 10 kVA : non soumise aux Certificats Verts, rentabilité portée par l'autoconsommation directe.`,
    easyGreenEligible
      ? `Financement Easy'Green (Wallonie Entreprendre) : projet éligible (dette subordonnée sans garantie réelle, jusqu'à 100 % du CAPEX, franchise 1 an).`
      : `Option Tiers-Investissement (0 € CAPEX) ou autofinancement direct selon stratégie de bilan.`,
  ]

  return {
    estimatedPowerKwc: kwc,
    estimatedCapexHtva,
    dpi40DeductionBaseEur,
    isocTaxShieldEur,
    netEffectiveCapexEur,
    estimatedAnnualSavingsEur,
    paybackYearsWithDpi,
    cvEligible,
    easyGreenEligible,
    recommendedSuccessFeeEur,
    summaryLines,
    disclaimer:
      "Simulation technico-économique indicative basée sur les paramètres publics SPW Énergie, Wallonie Entreprendre (Easy'Green) et CIR 92 (DPI 40 %), à faire valider par votre expert-comptable ITAA. Aegis Solaire n'agit ni comme intermédiaire de crédit ni comme conseiller fiscal.",
  }
}

export interface DetailedDpiSimulationInput {
  powerKwc: number
  capexPerWc?: number
  annualBillEur?: number
  electricityPriceEurKwh?: number
  selfConsumptionRate?: number
  isocRate?: 0.2 | 0.25
  clientCompanyName?: string
  clientProvince?: string
  installerCompanyName?: string
}

export interface DetailedDpiSimulationResult {
  powerKwc: number
  capexPerWc: number
  annualProductionKwh: number
  selfConsumedKwh: number
  injectedKwh: number
  estimatedCapexHtva: number
  dpi40DeductionBaseEur: number
  isocTaxShieldEur: number
  netEffectiveCapexEur: number
  annualSavingsYear1Eur: number
  paybackYearsWithoutDpi: number
  paybackYearsWithDpi: number
  cumulativeNetGain15YearsEur: number
  cumulativeNetGain25YearsEur: number
  cvEligible: boolean
  easyGreenEligible: boolean
  isocRatePercent: number
  clientCompanyName: string
  clientProvince: string
  installerCompanyName: string
  disclaimer: string
}

/**
 * Simulation financière B2B détaillée (DPI majorée 40 %, bouclier ISoc 20 %/25 %,
 * ROI avec/sans DPI, gain net cumulé 15/25 ans) pour l'outil gratuit installateurs.
 */
export function buildDetailedDpiSimulation(
  input: DetailedDpiSimulationInput
): DetailedDpiSimulationResult {
  const powerKwc = Math.min(2000, Math.max(5, Math.round((Number(input.powerKwc) || 40) * 10) / 10))
  const defaultCapexPerWc = powerKwc >= 200 ? 0.85 : powerKwc >= 80 ? 0.95 : 1.08
  const capexPerWc = Math.min(2.5, Math.max(0.55, Number(input.capexPerWc) || defaultCapexPerWc))
  const electricityPriceEurKwh = Math.min(
    0.6,
    Math.max(0.1, Number(input.electricityPriceEurKwh) || 0.24)
  )
  const selfConsumptionRate = Math.min(
    0.95,
    Math.max(0.25, Number(input.selfConsumptionRate) || 0.68)
  )
  const isocRate = input.isocRate === 0.2 ? 0.2 : 0.25

  const annualProductionKwh = Math.round(powerKwc * 930)
  const selfConsumedKwh = Math.round(annualProductionKwh * selfConsumptionRate)
  const injectedKwh = Math.max(0, annualProductionKwh - selfConsumedKwh)

  const estimatedCapexHtva = Math.round(powerKwc * 1000 * capexPerWc)
  const dpi40DeductionBaseEur = Math.round(estimatedCapexHtva * 0.4)
  const isocTaxShieldEur = Math.round(dpi40DeductionBaseEur * isocRate)
  const netEffectiveCapexEur = Math.max(0, estimatedCapexHtva - isocTaxShieldEur)

  // Injection valorisée prudemment à 0,045 €/kWh + autoconsommation au prix réseau évité
  const rawAnnualSavings = Math.round(
    selfConsumedKwh * electricityPriceEurKwh + injectedKwh * 0.045
  )
  const billCap = Number(input.annualBillEur) > 0 ? Math.round(Number(input.annualBillEur) * 0.82) : rawAnnualSavings
  const annualSavingsYear1Eur = Math.max(500, Math.min(rawAnnualSavings, billCap || rawAnnualSavings))

  const paybackYearsWithoutDpi =
    Math.round((estimatedCapexHtva / annualSavingsYear1Eur) * 10) / 10
  const paybackYearsWithDpi =
    Math.round((netEffectiveCapexEur / annualSavingsYear1Eur) * 10) / 10

  // Projection sur 15 ans et 25 ans (dégradation linéaire -0,4%/an, inflation énergie +2%/an, O&M 1,2%/an du CAPEX)
  const annualOmEur = Math.round(estimatedCapexHtva * 0.012)
  let cumulativeCash = -netEffectiveCapexEur
  let cumulative15 = 0
  for (let year = 1; year <= 25; year++) {
    const degradation = Math.pow(0.996, year - 1)
    const energyEscalation = Math.pow(1.02, year - 1)
    const netYearCash = Math.round(
      annualSavingsYear1Eur * degradation * energyEscalation - annualOmEur
    )
    cumulativeCash += netYearCash
    if (year === 15) cumulative15 = cumulativeCash
  }

  return {
    powerKwc,
    capexPerWc,
    annualProductionKwh,
    selfConsumedKwh,
    injectedKwh,
    estimatedCapexHtva,
    dpi40DeductionBaseEur,
    isocTaxShieldEur,
    netEffectiveCapexEur,
    annualSavingsYear1Eur,
    paybackYearsWithoutDpi,
    paybackYearsWithDpi,
    cumulativeNetGain15YearsEur: cumulative15,
    cumulativeNetGain25YearsEur: cumulativeCash,
    cvEligible: powerKwc > 10,
    easyGreenEligible: estimatedCapexHtva >= 25000 && estimatedCapexHtva <= 1000000,
    isocRatePercent: Math.round(isocRate * 100),
    clientCompanyName: input.clientCompanyName?.trim() || "Entreprise PME / Tertiaire",
    clientProvince: input.clientProvince?.trim() || "Wallonie",
    installerCompanyName: input.installerCompanyName?.trim() || "Installateur Partenaire RESCERT",
    disclaimer:
      "Simulation technico-économique indicative basée sur les paramètres publics SPW Énergie, Wallonie Entreprendre (Easy'Green) et CIR 92 (DPI majorée 40 %), à faire valider par l'expert-comptable ITAA du client. Document produit à titre informatif.",
  }
}
