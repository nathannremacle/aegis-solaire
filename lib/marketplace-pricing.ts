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
 * Calcule dynamiquement le coût en crédits d'un dossier selon sa valeur économique :
 * - B2C (partagé max 3 installateurs) : 2 crédits / acheteur
 * - B2B PME standard (< 500 m² et facture < 20 000 €) : 8 crédits en exclusivité
 * - B2B Tertiaire / Industriel (500 à 1 500 m² ou facture 20k-50k €) : 12 crédits en exclusivité
 * - B2B Grand Compte (> 1 500 m², facture > 50k € ou ombrière parking) : 18 crédits en exclusivité
 */
export function calculateLeadCreditCost(lead: {
  segment: "B2B" | "B2C" | string
  surfaceArea?: number | null
  surfaceType?: string | null
  annualBill?: number | null
}): number {
  if (lead.segment === "B2C") return 2
  const area = Number(lead.surfaceArea) || 0
  const bill = Number(lead.annualBill) || 0
  const isParking = lead.surfaceType === "parking"

  if (area >= 1500 || bill >= 50000 || isParking) {
    return 18
  }
  if (area >= 500 || bill >= 20000) {
    return 12
  }
  return 8
}

/**
 * Calcule des estimations de marché crédibles et défendables pour un installateur photovoltaïque agréé en Wallonie.
 */
export function calculateMarketplaceFinancials(lead: {
  segment: "B2B" | "B2C" | string
  surfaceArea: number | null | undefined
  surfaceType?: string | null | undefined
  annualBill?: number | null | undefined
  creditCost?: number | null | undefined
  estimatedPowerKwc?: number | null | undefined
}): FinancialEstimates {
  const isB2C = lead.segment === "B2C"
  const rawArea = Math.max(0, Number(lead.surfaceArea) || 0)
  const annualBill = Math.max(0, Number(lead.annualBill) || 0)
  
  // Plafonnement de cohérence B2C :
  // En Wallonie, le résidentiel standard est capé à 10 kVA pour les démarches simplifiées.
  // Une toiture résidentielle typique varie entre 30 et 120 m² (jamais 2 650 m² qui est une toiture industrielle).
  const effectiveArea = isB2C && rawArea > 150 ? Math.min(rawArea, 80) : rawArea

  // Rendement standard : ~170 Wc / m² (soit ~0.17 kWc par m²)
  let powerKwc = Number(lead.estimatedPowerKwc) || Math.round(effectiveArea * 0.17)

  // Si pas de surface mais facture présente, inférer la puissance équivalente
  if (powerKwc <= 0 && annualBill > 0) {
    powerKwc = Math.max(isB2C ? 6 : 20, Math.round(annualBill / 1000 * (isB2C ? 1.2 : 1.5)))
  }

  // Baseline par défaut pour éviter les dossiers à 0 kWc / 0 €
  if (powerKwc <= 0) {
    powerKwc = isB2C ? 8 : 35
  }

  // Plafonnement de cohérence B2C (en Wallonie résidentiel capé à 10 kVA / 10 kWc)
  if (isB2C && powerKwc > 10) {
    powerKwc = 10
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

  // Coût d'acquisition du dossier en crédits et en euros
  const credits = lead.creditCost ?? calculateLeadCreditCost({
    segment: lead.segment,
    surfaceArea: effectiveArea,
    surfaceType: lead.surfaceType,
    annualBill: lead.annualBill,
  })
  const leadCostEuros = Math.round(credits * REFERENCE_CREDIT_PRICE_EUR)

  // Économie annuelle brute estimée sur la facture d'électricité (~35 % d'autoconsommation/effacement)
  // Wallonie : 930 kWh/kWc/an. L'économie réelle correspond à l'autoconsommation + revente surplus,
  // et ne peut en aucun cas dépasser la facture ou excéder la production physique.
  const maxPossibleSolarSavings = Math.round(powerKwc * 930 * 0.32)
  const revenueEstimatePerYear = annualBill > 0 
    ? Math.min(Math.round(annualBill * 0.35), maxPossibleSolarSavings) 
    : Math.min(Math.round(powerKwc * 95), maxPossibleSolarSavings)

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
