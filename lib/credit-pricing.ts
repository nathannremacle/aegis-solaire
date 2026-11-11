/**
 * Définition centrale unique des tarifs et des crédits pour la marketplace Aegis Solaire.
 * 
 * Barème V2 officiel :
 * - 3 crédits = 29,50 € HTVA (dossier B2C résidentiel, max 3 installateurs, recette max : 88,50 € HTVA)
 * - 9 crédits = 88,50 € HTVA (dossier B2B professionnel exclusif, 1 seul installateur, recette : 88,50 € HTVA)
 * - 1 crédit ≈ 9,83 € HTVA
 * 
 * Recharges fixes (sans dégressivité) :
 * - 10 crédits : 98,33 € HTVA / 118,98 € TTC (TVA 21%)
 * - 20 crédits : 196,67 € HTVA / 237,97 € TTC (TVA 21%)
 * - 50 crédits : 491,67 € HTVA / 594,92 € TTC (TVA 21%)
 */

export const PRICING_VERSION = "v2" as const

/** Prix unitaire de référence en centimes HTVA (2 950 centimes / 3 = ~983 centimes) */
export const CREDIT_UNIT_PRICE_CENTIMES = Math.round(2950 / 3) // 983 centimes (~9,83 € HTVA)

/** Prix unitaire en euros HTVA */
export const CREDIT_UNIT_PRICE_EUR = 29.5 / 3 // ~9,8333 € HTVA

/** Taux de TVA légal belge applicable */
export const BELGIAN_VAT_RATE = 0.21

/** Tarification B2C Résidentiel */
export const B2C_CREDIT_COST = 3
export const B2C_MAX_SLOTS = 3
export const B2C_LEAD_PRICE_EUR = 29.5 // 29,50 € HTVA
export const B2C_MAX_REVENUE_EUR = B2C_LEAD_PRICE_EUR * B2C_MAX_SLOTS // 88.50 € HTVA

/** Tarification B2B Professionnel Exclusif */
export const B2B_CREDIT_COST = 9
export const B2B_MAX_SLOTS = 1
export const B2B_LEAD_PRICE_EUR = 88.5 // 88,50 € HTVA (3 × 29,50 €)
export const B2B_MAX_REVENUE_EUR = B2B_LEAD_PRICE_EUR // 88.50 € HTVA

export interface CreditPackDefinition {
  id: string
  name: string
  credits: number
  priceHtvaCentimes: number
  priceHtva: number
  pricePerCredit: number
  vatAmount: number
  priceTtc: number
  popular?: boolean
  description: string
  b2cCapacity: number
  b2bCapacity: number
}

/**
 * Catalogue des recharges de crédits actives (V2).
 * Le volume acheté change la fréquence de recharge basée sur 29,50 € pour 3 crédits.
 */
export const CREDIT_PACKS: Record<string, CreditPackDefinition> = {
  pack_10: {
    id: "pack_10",
    name: "Recharge Découverte",
    credits: 10,
    priceHtvaCentimes: 9833, // 98,33 € HTVA
    priceHtva: 98.33,
    pricePerCredit: 9.83,
    vatAmount: 20.65,
    priceTtc: 118.98,
    popular: true, // Présélectionnée pour limiter l'engagement initial
    description: "Idéale pour démarrer : permet 3 déblocages B2C ou 1 B2B exclusif (avec 1 crédit restant).",
    b2cCapacity: 3,
    b2bCapacity: 1,
  },
  pack_20: {
    id: "pack_20",
    name: "Recharge Croissance",
    credits: 20,
    priceHtvaCentimes: 19667, // 196,67 € HTVA
    priceHtva: 196.67,
    pricePerCredit: 9.83,
    vatAmount: 41.3,
    priceTtc: 237.97,
    description: "Pour un flux régulier : permet 6 déblocages B2C ou 2 B2B exclusifs (avec 2 crédits restants).",
    b2cCapacity: 6,
    b2bCapacity: 2,
  },
  pack_50: {
    id: "pack_50",
    name: "Recharge Entreprise",
    credits: 50,
    priceHtvaCentimes: 49167, // 491,67 € HTVA
    priceHtva: 491.67,
    pricePerCredit: 9.83,
    vatAmount: 103.25,
    priceTtc: 594.92,
    description: "Volume élevé pour équipes actives : permet 16 déblocages B2C ou 5 B2B exclusifs.",
    b2cCapacity: 16,
    b2bCapacity: 5,
  },
}

export const CREDIT_PACKS_LIST: CreditPackDefinition[] = [
  CREDIT_PACKS.pack_10,
  CREDIT_PACKS.pack_20,
  CREDIT_PACKS.pack_50,
]

/**
 * Calcule avec exactitude comptable en centimes les montants d'une commande de crédits.
 */
export function calculateOrderFinancials(credits: number) {
  let priceHtvaCentimes: number
  if (credits === 3) {
    priceHtvaCentimes = 2950 // 29,50 € HTVA pile
  } else if (credits === 9) {
    priceHtvaCentimes = 8850 // 88,50 € HTVA pile
  } else {
    priceHtvaCentimes = Math.round((credits * 2950) / 3)
  }

  const priceHtva = priceHtvaCentimes / 100
  const vatAmountCentimes = Math.round(priceHtvaCentimes * BELGIAN_VAT_RATE)
  const vatAmount = vatAmountCentimes / 100
  const priceTtcCentimes = priceHtvaCentimes + vatAmountCentimes
  const priceTtc = priceTtcCentimes / 100

  return {
    credits,
    priceHtvaCentimes,
    priceHtva,
    vatAmount,
    priceTtc,
    pricePerCredit: 9.83,
  }
}

/**
 * Calcule avec exactitude comptable en centimes les montants d'un achat direct de lead en euros.
 */
export function calculateLeadDirectFinancials(lead: {
  segment?: "B2B" | "B2C" | string | null
  credit_cost?: number | null
  creditCost?: number | null
}) {
  const credits =
    lead.credit_cost ??
    lead.creditCost ??
    (lead.segment === "B2B" ? B2B_CREDIT_COST : B2C_CREDIT_COST)

  return calculateOrderFinancials(credits)
}

/**
 * Formate un montant en euros avec 2 décimales fixes (ex: 34,50 € HTVA).
 */
export function formatEurWithDecimals(amount: number): string {
  return `${amount.toLocaleString("fr-BE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} € HT`
}
