/**
 * Source unique de vérité pour la valorisation financière et les calculs de rentabilité
 * des leads sur la marketplace Aegis Solaire.
 * Garantit la cohérence entre l'API, les fiches projets et la page crédits.
 */

// Prix de référence unitaire moyen constaté sur les packs installateurs (Pack 50 crédits à 599 € HTVA)
export const REFERENCE_CREDIT_PRICE_EUR = 11.98

export interface FinancialEstimates {
  estimatedPowerKwc: number
  estimatedContractValue: number
  estimatedContractValueRange: { min: number; max: number }
  estimatedInstallerMargin: number
  roiMultiplier: number
  roiDescription: string
  leadCostEuros: number
  creditCostEur: number
  revenueEstimatePerYear: number
  dataQuality: "complete" | "partial"
}

/**
 * Calcule des estimations de marché crédibles et défendables pour un installateur photovoltaïque agréé en Wallonie.
 */
export function calculateMarketplaceFinancials(lead: {
  segment: "B2B" | "B2C" | string
  surfaceArea: number | null | undefined
  annualBill?: number | null | undefined
  creditCost?: number | null | undefined
}): FinancialEstimates {
  const isB2C = lead.segment === "B2C"
  const rawArea = Math.max(0, Number(lead.surfaceArea) || 0)
  
  // Rendement standard : ~170 Wc / m² (soit ~0.17 kWc par m²)
  let powerKwc = Math.round(rawArea * 0.17)

  // Plafonnement de cohérence B2C (une maison unifamiliale dépasse rarement 25 kWc sans statut pro/agricole)
  if (isB2C && powerKwc > 25) {
    powerKwc = Math.min(powerKwc, 25)
  }

  // Fourchette de prix moyen du marché wallon par kWc installé (clé en main) :
  // B2C : ~1 300 à 1 550 €/kWc
  // B2B : ~950 à 1 200 €/kWc avec dégressivité sur grandes toitures (> 150 kWc)
  let minPricePerKwc = isB2C ? 1300 : 950
  let maxPricePerKwc = isB2C ? 1550 : 1200

  if (!isB2C && powerKwc > 150) {
    minPricePerKwc = 850
    maxPricePerKwc = 1050
  }

  const minContract = Math.max(isB2C ? 6500 : 20000, Math.round(powerKwc * minPricePerKwc))
  const maxContract = Math.max(isB2C ? 8500 : 25000, Math.round(powerKwc * maxPricePerKwc))
  const avgContract = Math.round((minContract + maxContract) / 2)

  // Marge brute indicative installateur (~22 % selon structure de coûts)
  const estimatedInstallerMargin = Math.round(avgContract * 0.22)

  // Coût d'acquisition du dossier en euros
  const credits = lead.creditCost ?? (isB2C ? 2 : 5)
  const leadCostEuros = Math.round(credits * REFERENCE_CREDIT_PRICE_EUR)

  // Économie annuelle brute estimée sur la facture d'électricité (~30 % d'autoconsommation/effacement)
  const annualBill = Math.max(0, Number(lead.annualBill) || 0)
  const revenueEstimatePerYear = annualBill > 0 ? Math.round(annualBill * 0.30) : Math.round(powerKwc * 90)

  // Multiplicateur ROI crédible
  const roiMultiplier = Math.max(1, Math.round(estimatedInstallerMargin / (leadCostEuros || 1)))
  const roiDescription = `Marge brute estimée ≈ ${roiMultiplier}× le coût du lead`

  const dataQuality: "complete" | "partial" =
    rawArea > 0 && annualBill > 0 ? "complete" : "partial"

  return {
    estimatedPowerKwc: powerKwc,
    estimatedContractValue: avgContract,
    estimatedContractValueRange: { min: minContract, max: maxContract },
    estimatedInstallerMargin,
    roiMultiplier,
    roiDescription,
    leadCostEuros,
    creditCostEur: leadCostEuros,
    revenueEstimatePerYear,
    dataQuality,
  }
}
