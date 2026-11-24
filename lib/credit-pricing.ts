/**
 * Tarification unifiée Aegis Solaire — Value-Based Pricing, ARPL & Quotas Prioritaires (V4)
 *
 * Règle fondamentale :
 * - B2C Éco / Standard / Premium (max 3 slots) : 2 / 3 / 4 crédits (19,50 € / 29,50 € / 39,00 € HTVA)
 * - B2C Contre-Offre Prêt-à-Signer (max 2 slots) : 5 crédits (49,00 € HTVA)
 * - B2C Exclusivité Native Indexée (0 slot pris) : 6 / 9 / 12 crédits (59,00 € / 89,00 € / 119,00 € HTVA)
 * - B2B Appel d'Offres Restreint (max 2 slots) : 8 / 13 / 20 crédits (79,00 € / 129,00 € / 195,00 € HTVA)
 * - B2B Exclusivité Totale + Conciergerie CFO : 15 / 24 / 40 crédits (149,00 € / 239,00 € / 390,00 € HTVA)
 * - Packs & Quotas Prioritaires : -8,5 % à -24 % vs tarif unitaire à l'acte
 * - TVA belge applicable : 21 %
 */

export const PRICING_VERSION = "v4" as const

/** Prix unitaire de référence à l'acte en centimes HTVA (2 950 centimes / 3 = ~983 centimes) */
export const CREDIT_UNIT_PRICE_CENTIMES = Math.round(2950 / 3) // 983 centimes (~9,83 € HTVA)

/** Prix unitaire à l'acte en euros HTVA */
export const CREDIT_UNIT_PRICE_EUR = 29.5 / 3 // ~9,8333 € HTVA

/** Taux de TVA belge standard */
export const BELGIAN_VAT_RATE = 0.21

/** Durée de validité contractuelle des crédits achetés en pack (Art. 4.3 CGV) */
export const CREDIT_VALIDITY_MONTHS = 12

/** Période maximale d'inactivité continue avant péremption du solde (Art. 4.3 CGV) */
export const CREDIT_INACTIVITY_MONTHS = 6

/** Tarification B2C Résidentiel (référence Standard) */
export const B2C_CREDIT_COST = 3
export const B2C_MAX_SLOTS = 3
export const B2C_LEAD_PRICE_EUR = 29.5 // 29,50 € HTVA
export const B2C_MAX_REVENUE_EUR = B2C_LEAD_PRICE_EUR * B2C_MAX_SLOTS // 88.50 € HTVA

/** Dossier Contre-Offre Prêt-à-Signer (max 2 slots) */
export const B2C_QUOTE_AUDIT_CREDIT_COST = 5
export const B2C_QUOTE_AUDIT_PRICE_EUR = 49.0 // 49,00 € HTVA
export const B2C_QUOTE_AUDIT_MAX_SLOTS = 2

/** Option Exclusivité Totale B2C Standard (indexée 6/9/12 selon palier) */
export const B2C_EXCLUSIVE_CREDIT_COST = 9
export const B2C_EXCLUSIVE_PRICE_EUR = 89.0 // 89,00 € HTVA

/** Tarification B2B Professionnel (Appel d'Offres Restreint à 2 bureaux d'études) */
export const B2B_CREDIT_COST = 13
export const B2B_MAX_SLOTS = 2
export const B2B_LEAD_PRICE_EUR = 129.0 // 129,00 € HTVA par slot
export const B2B_MAX_REVENUE_EUR = B2B_LEAD_PRICE_EUR * B2B_MAX_SLOTS // 258.00 € HTVA

/** Exclusivité Totale B2B + Conciergerie CFO (référence Standard) */
export const B2B_EXCLUSIVE_CREDIT_COST = 24
export const B2B_EXCLUSIVE_PRICE_EUR = 239.0 // 239,00 € HTVA
export const B2B_SUCCESS_FEE_STANDARD_EUR = 1500 // 40–150 kWc
export const B2B_SUCCESS_FEE_ENTERPRISE_EUR = 3000 // > 150 kWc

export interface CreditPackDefinition {
  id: string
  name: string
  credits: number
  priceHtvaCentimes: number
  priceHtva: number
  pricePerCredit: number
  vatAmount: number
  priceTtc: number
  savingsPercent: number
  savingsEur: number
  badge?: string
  popular?: boolean
  description: string
}

const LEAD_TIER_CENTIMES: Record<number, number> = {
  2: 1950, // 19,50 € HTVA (B2C Éco)
  3: 2950, // 29,50 € HTVA (B2C Standard)
  4: 3900, // 39,00 € HTVA (B2C Premium)
  5: 4900, // 49,00 € HTVA (B2C Contre-Offre Prêt-à-Signer)
  6: 5900, // 59,00 € HTVA (B2C Éco Exclusif / Archive B2B PME)
  7: 6500, // 65,00 € HTVA (Archive B2C Exclusif)
  8: 7900, // 79,00 € HTVA (B2B PME · 2 slots)
  9: 8900, // 89,00 € HTVA (B2C Standard Exclusif / Archive B2B Standard)
  12: 11900, // 119,00 € HTVA (B2C Premium & Contre-Offre Exclusif)
  13: 12900, // 129,00 € HTVA (B2B Standard · 2 slots)
  15: 14900, // 149,00 € HTVA (B2B PME Exclusif)
  20: 19500, // 195,00 € HTVA (B2B Grand Compte · 2 slots)
  24: 23900, // 239,00 € HTVA (B2B Standard Exclusif + Conciergerie CFO)
  40: 39000, // 390,00 € HTVA (B2B Grand Compte Exclusif + Conciergerie CFO)
}

/**
 * Calcule le coût en crédits de l'Exclusivité Totale selon le segment et le palier du dossier.
 */
export function getExclusiveCreditCost(lead: {
  segment?: "B2B" | "B2C" | string | null
  credit_cost?: number | null
  creditCost?: number | null
}): number {
  const baseCredits =
    Number(lead.credit_cost ?? lead.creditCost) ||
    (lead.segment === "B2B" ? B2B_CREDIT_COST : B2C_CREDIT_COST)

  if (lead.segment === "B2B") {
    if (baseCredits <= 8) return 15 // B2B PME Exclusif (149,00 € HTVA)
    if (baseCredits <= 13) return 24 // B2B Standard Exclusif (239,00 € HTVA)
    return 40 // B2B Grand Compte Exclusif (390,00 € HTVA)
  }

  if (baseCredits <= 2) return 6 // B2C Éco Exclusif (59,00 € HTVA)
  if (baseCredits === 3) return 9 // B2C Standard Exclusif (89,00 € HTVA)
  return 12 // B2C Premium / Contre-Offre Exclusif (119,00 € HTVA)
}

/**
 * Packs de crédits prépayés (multiples exacts de 2, 3, 4, 6 et 12 pour zéro crédit orphelin)
 */
export const CREDIT_PACKS: Record<string, CreditPackDefinition> = {
  pack_12: {
    id: "pack_12",
    name: "Pack Croissance",
    credits: 12,
    priceHtvaCentimes: 10800, // 108,00 € HTVA
    priceHtva: 108.0,
    pricePerCredit: 9.0,
    vatAmount: 22.68,
    priceTtc: 130.68,
    savingsPercent: 8.5,
    savingsEur: 10.0,
    badge: "-8,5 % vs à l'acte",
    description:
      "Idéal pour démarrer sans crédit bloqué : 4 dossiers B2C Standard, 6 B2C Éco ou 2 B2B PME.",
  },
  pack_24: {
    id: "pack_24",
    name: "Pack Accélération",
    credits: 24,
    priceHtvaCentimes: 19800, // 198,00 € HTVA
    priceHtva: 198.0,
    pricePerCredit: 8.25,
    vatAmount: 41.58,
    priceTtc: 239.58,
    savingsPercent: 16,
    savingsEur: 38.0,
    badge: "-16 % · Recommandé",
    popular: true,
    description:
      "Le meilleur équilibre pour un flux régulier : 8 dossiers B2C Standard ou 3 dossiers B2C en Exclusivité Totale.",
  },
  pack_60: {
    id: "pack_60",
    name: "Pack Régie",
    credits: 60,
    priceHtvaCentimes: 45000, // 450,00 € HTVA
    priceHtva: 450.0,
    pricePerCredit: 7.5,
    vatAmount: 94.5,
    priceTtc: 544.5,
    savingsPercent: 24,
    savingsEur: 140.0,
    badge: "-24 % · Tarif plancher",
    description:
      "Conçu pour les équipes actives et l'Auto-Pilot : 20 dossiers B2C Standard ou 5 Grands Comptes B2B.",
  },
}

/** Compatibilité descendante si d'anciennes commandes / références utilisent pack_10/20/50 */
export const LEGACY_CREDIT_PACKS: Record<string, CreditPackDefinition> = {
  pack_10: {
    id: "pack_10",
    name: "Pack Découverte (Archive)",
    credits: 10,
    priceHtvaCentimes: 9833,
    priceHtva: 98.33,
    pricePerCredit: 9.83,
    vatAmount: 20.65,
    priceTtc: 118.98,
    savingsPercent: 0,
    savingsEur: 0,
    description: "Ancien format Découverte (10 crédits).",
  },
  pack_20: {
    id: "pack_20",
    name: "Pack Croissance (Archive)",
    credits: 20,
    priceHtvaCentimes: 19667,
    priceHtva: 196.67,
    pricePerCredit: 9.83,
    vatAmount: 41.3,
    priceTtc: 237.97,
    savingsPercent: 0,
    savingsEur: 0,
    description: "Ancien format Croissance (20 crédits).",
  },
  pack_50: {
    id: "pack_50",
    name: "Pack Entreprise (Archive)",
    credits: 50,
    priceHtvaCentimes: 49167,
    priceHtva: 491.67,
    pricePerCredit: 9.83,
    vatAmount: 103.25,
    priceTtc: 594.92,
    savingsPercent: 0,
    savingsEur: 0,
    description: "Ancien format Entreprise (50 crédits).",
  },
}

export const CREDIT_PACKS_LIST: CreditPackDefinition[] = [
  CREDIT_PACKS.pack_12,
  CREDIT_PACKS.pack_24,
  CREDIT_PACKS.pack_60,
]

/**
 * Résout un pack par ID (actuel ou archive)
 */
export function resolveCreditPack(packId?: string | null): CreditPackDefinition | null {
  if (!packId) return null
  return CREDIT_PACKS[packId] || LEGACY_CREDIT_PACKS[packId] || null
}

/**
 * Calcule avec exactitude comptable en centimes les montants d'un pack de crédits prépayé.
 */
export function calculateCreditPackFinancials(packOrId: CreditPackDefinition | string) {
  const pack = typeof packOrId === "string" ? resolveCreditPack(packOrId) : packOrId
  if (!pack) {
    return calculateOrderFinancials(12)
  }
  const priceHtvaCentimes = pack.priceHtvaCentimes
  const priceHtva = priceHtvaCentimes / 100
  const vatAmountCentimes = Math.round(priceHtvaCentimes * BELGIAN_VAT_RATE)
  const vatAmount = vatAmountCentimes / 100
  const priceTtcCentimes = priceHtvaCentimes + vatAmountCentimes
  const priceTtc = priceTtcCentimes / 100

  return {
    credits: pack.credits,
    priceHtvaCentimes,
    priceHtva,
    vatAmount,
    priceTtc,
    pricePerCredit: pack.pricePerCredit,
  }
}

/**
 * Calcule avec exactitude comptable en centimes les montants d'un déblocage à l'acte (direct).
 */
export function calculateOrderFinancials(credits: number) {
  const safeCredits = Math.max(1, Math.round(credits))
  const priceHtvaCentimes =
    LEAD_TIER_CENTIMES[safeCredits] ?? Math.round((safeCredits * 2950) / 3)

  const priceHtva = priceHtvaCentimes / 100
  const vatAmountCentimes = Math.round(priceHtvaCentimes * BELGIAN_VAT_RATE)
  const vatAmount = vatAmountCentimes / 100
  const priceTtcCentimes = priceHtvaCentimes + vatAmountCentimes
  const priceTtc = priceTtcCentimes / 100

  return {
    credits: safeCredits,
    priceHtvaCentimes,
    priceHtva,
    vatAmount,
    priceTtc,
    pricePerCredit: Number((priceHtva / safeCredits).toFixed(2)),
  }
}

/**
 * Calcule avec exactitude comptable en centimes les montants d'un achat direct de lead en euros.
 * Prend en compte l'exclusivité indexée B2C (6/9/12 cr.) et B2B (15/24/40 cr.) ou le complément hybride.
 */
export function calculateLeadDirectFinancials(lead: {
  segment?: "B2B" | "B2C" | string | null
  credit_cost?: number | null
  creditCost?: number | null
  exclusive?: boolean
}) {
  if (lead.exclusive) {
    return calculateOrderFinancials(getExclusiveCreditCost(lead))
  }
  const credits =
    lead.credit_cost ??
    lead.creditCost ??
    (lead.segment === "B2B" ? B2B_CREDIT_COST : B2C_CREDIT_COST)

  return calculateOrderFinancials(credits)
}

export interface LeadComplementFinancials {
  isHybrid: boolean
  totalCredits: number
  creditsToDebit: number
  remainingCreditsToPay: number
  fullPriceHtva: number
  creditsDiscountHtva: number
  priceHtvaCentimes: number
  priceHtva: number
  vatAmount: number
  priceTtc: number
}

/**
 * Calcule le complément exact en euros lorsque le partenaire dispose d'un solde
 * partiel de crédits (0 < availableCredits < coût du dossier), afin qu'aucun crédit ne reste bloqué.
 */
export function calculateLeadComplementFinancials(params: {
  segment?: "B2B" | "B2C" | string | null
  credit_cost?: number | null
  creditCost?: number | null
  exclusive?: boolean
  availableCredits?: number | null
}): LeadComplementFinancials {
  const full = calculateLeadDirectFinancials(params)
  const totalCredits = full.credits
  const fullPriceHtvaCentimes = full.priceHtvaCentimes
  const safeAvailable = Math.max(0, Math.floor(Number(params.availableCredits) || 0))

  if (safeAvailable <= 0 || safeAvailable >= totalCredits) {
    return {
      isHybrid: false,
      totalCredits,
      creditsToDebit: 0,
      remainingCreditsToPay: totalCredits,
      fullPriceHtva: full.priceHtva,
      creditsDiscountHtva: 0,
      priceHtvaCentimes: fullPriceHtvaCentimes,
      priceHtva: full.priceHtva,
      vatAmount: full.vatAmount,
      priceTtc: full.priceTtc,
    }
  }

  const creditsToDebit = safeAvailable
  const remainingCreditsToPay = totalCredits - creditsToDebit
  const priceHtvaCentimes = Math.max(
    100,
    Math.round((fullPriceHtvaCentimes * remainingCreditsToPay) / totalCredits)
  )
  const priceHtva = priceHtvaCentimes / 100
  const vatAmountCentimes = Math.round(priceHtvaCentimes * BELGIAN_VAT_RATE)
  const vatAmount = vatAmountCentimes / 100
  const priceTtc = (priceHtvaCentimes + vatAmountCentimes) / 100
  const creditsDiscountHtva = (fullPriceHtvaCentimes - priceHtvaCentimes) / 100

  return {
    isHybrid: true,
    totalCredits,
    creditsToDebit,
    remainingCreditsToPay,
    fullPriceHtva: full.priceHtva,
    creditsDiscountHtva,
    priceHtvaCentimes,
    priceHtva,
    vatAmount,
    priceTtc,
  }
}

/**
 * Formate un montant en euros avec 2 décimales fixes (ex: 29,50 €).
 */
export function formatEurWithDecimals(amount: number): string {
  return amount.toFixed(2).replace(".", ",")
}
