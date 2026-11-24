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
