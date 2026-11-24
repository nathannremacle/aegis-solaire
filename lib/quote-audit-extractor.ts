/**
 * Benchmark tarifaire Wallonie 2026 & extraction structurée de devis solaires concurrents.
 * Utilisé par le guichet /verifier-mon-devis (Stratégie 4).
 */

export interface QuoteBenchmarkResult {
  benchmarkMinHtva: number
  benchmarkMaxHtva: number
  benchmarkMinTvac: number
  benchmarkMaxTvac: number
  estimatedOverchargeEur: number
  verdict: "fair_or_competitive" | "moderate_overcharge" | "significant_overcharge"
}

export function computeWalloniaQuoteBenchmark(params: {
  kwc: number
  batteryKwh?: number | null
  quotedPriceTvac?: number | null
  vatRate?: number
}): QuoteBenchmarkResult {
  const kwc = Math.max(1, Number(params.kwc) || 5)
  const batteryKwh = Math.max(0, Number(params.batteryKwh) || 0)
  const vatRate = params.vatRate ?? 0.06 // TVA 6 % résidentiel > 10 ans par défaut en Belgique

  // Médiane RESCERT Tier-1 Wallonie 2026 : 1 150 € – 1 350 € HTVA / kWc + 350 € – 550 € HTVA / kWh batterie
  const pvMinHtva = kwc * 1150
  const pvMaxHtva = kwc * 1350
  const batMinHtva = batteryKwh * 350
  const batMaxHtva = batteryKwh * 550

  const benchmarkMinHtva = Math.round(pvMinHtva + batMinHtva)
  const benchmarkMaxHtva = Math.round(pvMaxHtva + batMaxHtva)
  const benchmarkMinTvac = Math.round(benchmarkMinHtva * (1 + vatRate))
  const benchmarkMaxTvac = Math.round(benchmarkMaxHtva * (1 + vatRate))

  const quotedTvac = Number(params.quotedPriceTvac) || 0
  const estimatedOverchargeEur =
    quotedTvac > benchmarkMaxTvac ? Math.round(quotedTvac - benchmarkMaxTvac) : 0

  let verdict: QuoteBenchmarkResult["verdict"] = "fair_or_competitive"
  if (estimatedOverchargeEur >= 900) {
    verdict = "significant_overcharge"
  } else if (estimatedOverchargeEur > 0) {
    verdict = "moderate_overcharge"
  }

  return {
    benchmarkMinHtva,
    benchmarkMaxHtva,
    benchmarkMinTvac,
    benchmarkMaxTvac,
    estimatedOverchargeEur,
    verdict,
  }
}
