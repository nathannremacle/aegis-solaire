/**
 * Définition centrale unique des tarifs et des crédits pour la marketplace Aegis Solaire.
 * 
 * Barème V2 officiel :
 * - 1 crédit = 11,50 € HTVA (1 150 centimes)
 * - Dossier B2C résidentiel = 3 crédits (34,50 € HTVA), max 3 installateurs (recette max : 103,50 € HTVA)
 * - Dossier B2B professionnel exclusif = 9 crédits (103,50 € HTVA), 1 seul installateur (recette : 103,50 € HTVA)
 * 
 * Recharges fixes (sans dégressivité) :
 * - 10 crédits : 115,00 € HTVA / 139,15 € TTC (TVA 21%)
 * - 20 crédits : 230,00 € HTVA / 278,30 € TTC (TVA 21%)
 * - 50 crédits : 575,00 € HTVA / 695,75 € TTC (TVA 21%)
 */

export const PRICING_VERSION = "v2" as const

/** Prix unitaire en centimes HTVA pour calculs arithmétiques exacts sans arrondi d'euro */
export const CREDIT_UNIT_PRICE_CENTIMES = 1150 // 11,50 € HTVA

/** Prix unitaire en euros HTVA */
export const CREDIT_UNIT_PRICE_EUR = 11.5

/** Taux de TVA légal belge applicable */
export const BELGIAN_VAT_RATE = 0.21

/** Tarification B2C Résidentiel */
export const B2C_CREDIT_COST = 3
export const B2C_MAX_SLOTS = 3
export const B2C_LEAD_PRICE_EUR = (B2C_CREDIT_COST * CREDIT_UNIT_PRICE_CENTIMES) / 100 // 34.50 € HTVA
export const B2C_MAX_REVENUE_EUR = B2C_LEAD_PRICE_EUR * B2C_MAX_SLOTS // 103.50 € HTVA

/** Tarification B2B Professionnel Exclusif */
export const B2B_CREDIT_COST = 9
export const B2B_MAX_SLOTS = 1
export const B2B_LEAD_PRICE_EUR = (B2B_CREDIT_COST * CREDIT_UNIT_PRICE_CENTIMES) / 100 // 103.50 € HTVA
export const B2B_MAX_REVENUE_EUR = B2B_LEAD_PRICE_EUR // 103.50 € HTVA

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
 * Le volume acheté change la fréquence de recharge mais le prix unitaire reste 11,50 € HTVA.
 */
export const CREDIT_PACKS: Record<string, CreditPackDefinition> = {
  pack_10: {
    id: "pack_10",
    name: "Recharge Découverte",
    credits: 10,
    priceHtvaCentimes: 10 * CREDIT_UNIT_PRICE_CENTIMES, // 11 500 centimes = 115 €
    priceHtva: 115,
    pricePerCredit: CREDIT_UNIT_PRICE_EUR,
    vatAmount: 24.15,
    priceTtc: 139.15,
    popular: true, // Présélectionnée pour limiter l'engagement initial
    description: "Idéale pour démarrer : permet 3 déblocages B2C ou 1 B2B exclusif (avec 1 crédit restant).",
    b2cCapacity: 3,
    b2bCapacity: 1,
  },
  pack_20: {
    id: "pack_20",
    name: "Recharge Croissance",
    credits: 20,
    priceHtvaCentimes: 20 * CREDIT_UNIT_PRICE_CENTIMES, // 23 000 centimes = 230 €
    priceHtva: 230,
    pricePerCredit: CREDIT_UNIT_PRICE_EUR,
    vatAmount: 48.3,
    priceTtc: 278.3,
    description: "Pour un flux régulier : permet 6 déblocages B2C ou 2 B2B exclusifs (avec 2 crédits restants).",
    b2cCapacity: 6,
    b2bCapacity: 2,
  },
  pack_50: {
    id: "pack_50",
    name: "Recharge Entreprise",
    credits: 50,
    priceHtvaCentimes: 50 * CREDIT_UNIT_PRICE_CENTIMES, // 57 500 centimes = 575 €
    priceHtva: 575,
    pricePerCredit: CREDIT_UNIT_PRICE_EUR,
    vatAmount: 120.75,
    priceTtc: 695.75,
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
  const priceHtvaCentimes = credits * CREDIT_UNIT_PRICE_CENTIMES
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
    pricePerCredit: CREDIT_UNIT_PRICE_EUR,
  }
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
