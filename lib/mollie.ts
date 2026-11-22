import {
  createMollieClient,
  PaymentMethod,
  PaymentStatus,
  SequenceType,
} from "@mollie/api-client"

export { PaymentMethod, PaymentStatus, SequenceType }

/**
 * Initialise le client officiel Mollie.
 * Supporte le mode test (clé commençant par test_) et live (clé commençant par live_).
 */
export function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY

  if (!apiKey) {
    throw new Error(
      "Variable d'environnement MOLLIE_API_KEY manquante pour les paiements Mollie."
    )
  }

  return createMollieClient({ apiKey })
}

/**
 * Crée ou réutilise un identifiant Customer Mollie pour permettre le paiement 1-clic (mandats).
 */
export async function ensureMollieCustomer(params: {
  partnerId: string
  partnerEmail: string
  partnerCompany: string
  existingCustomerId?: string | null
}): Promise<string> {
  if (params.existingCustomerId) {
    return params.existingCustomerId
  }

  const mollie = getMollieClient()
  const customer = await mollie.customers.create({
    name: (params.partnerCompany || params.partnerEmail || "Installateur Aegis Solaire").slice(0, 80),
    email: params.partnerEmail,
    metadata: {
      partnerId: params.partnerId,
    },
  })

  return customer.id
}

/**
 * Vérifie si un partenaire dispose d'au moins un mandat Mollie valide pour les paiements récurrents / 1-clic.
 */
export async function getValidMollieMandate(
  customerId: string,
  preferredMandateId?: string | null
): Promise<{ valid: boolean; mandateId: string | null; method: string | null }> {
  const mollie = getMollieClient()
  const page = await mollie.customerMandates.page({ customerId })
  const validMandates = page.filter((m) => m.status === "valid" || m.status === "pending")

  if (preferredMandateId) {
    const preferred = validMandates.find((m) => m.id === preferredMandateId)
    if (preferred) {
      return {
        valid: preferred.status === "valid",
        mandateId: preferred.id,
        method: preferred.method,
      }
    }
  }

  const firstValid = validMandates.find((m) => m.status === "valid") || validMandates[0]
  if (!firstValid) {
    return { valid: false, mandateId: null, method: null }
  }

  return {
    valid: firstValid.status === "valid",
    mandateId: firstValid.id,
    method: firstValid.method,
  }
}

export type CreateCreditOrderPaymentParams = {
  orderId: string
  packName: string
  credits: number
  priceTtc: number
  partnerId: string
  partnerEmail: string
  partnerCompany: string
  siteUrl: string
  customerId?: string | null
  enableOneClick?: boolean
}

/**
 * Crée un paiement Mollie pré-configuré pour le marché belge (Bancontact / Carte / KBC / Belfius).
 * Si `enableOneClick` & `customerId` sont fournis, crée un premier paiement `sequenceType: first`
 * générant un mandat récurrent réutilisable.
 */
export async function createCreditOrderPayment(params: CreateCreditOrderPaymentParams) {
  const mollie = getMollieClient()
  const {
    orderId,
    packName,
    credits,
    priceTtc,
    partnerId,
    partnerEmail,
    partnerCompany,
    siteUrl,
    customerId,
    enableOneClick,
  } = params

  const cleanSiteUrl = siteUrl.replace(/\/$/, "")
  const amountValue = priceTtc.toFixed(2)

  const isLocalhost =
    cleanSiteUrl.includes("localhost") || cleanSiteUrl.includes("127.0.0.1")
  const webhookUrl = isLocalhost ? undefined : `${cleanSiteUrl}/api/webhooks/mollie`
  const redirectUrl = `${cleanSiteUrl}/partenaires/dashboard/credits?payment=return&order_id=${orderId}`

  const useFirstMandate = Boolean(enableOneClick && customerId)

  const payment = await mollie.payments.create({
    amount: {
      currency: "EUR",
      value: amountValue,
    },
    description: `Aegis Solaire - ${packName} (${credits} crédits) - ${partnerCompany.slice(0, 20)}`,
    redirectUrl,
    webhookUrl,
    ...(customerId ? { customerId } : {}),
    ...(useFirstMandate ? { sequenceType: SequenceType.first } : {}),
    method: useFirstMandate
      ? [PaymentMethod.bancontact, PaymentMethod.creditcard]
      : [
          PaymentMethod.bancontact,
          PaymentMethod.creditcard,
          PaymentMethod.kbc,
          PaymentMethod.belfius,
        ],
    metadata: {
      orderId,
      partnerId,
      credits,
      packName,
      partnerEmail,
      partnerCompany,
      enableOneClick: useFirstMandate,
    },
  })

  return {
    paymentId: payment.id,
    checkoutUrl: payment.getCheckoutUrl(),
    status: payment.status,
  }
}

export type CreateLeadDirectPaymentParams = {
  leadId: string
  leadSegment: string
  leadLocation?: string | null
  priceTtc: number
  priceHtva: number
  vatAmount: number
  credits: number
  exclusive?: boolean
  creditsToDebit?: number
  totalCredits?: number
  isHybrid?: boolean
  partnerId: string
  partnerEmail: string
  partnerCompany: string
  siteUrl: string
  customerId?: string | null
  enableOneClick?: boolean
}

/**
 * Crée un paiement Mollie pré-configuré pour l'achat direct d'un dossier lead (standard, exclusif B2C ou complément hybride).
 */
export async function createLeadDirectPayment(params: CreateLeadDirectPaymentParams) {
  const mollie = getMollieClient()
  const {
    leadId,
    leadSegment,
    leadLocation,
    priceTtc,
    priceHtva,
    vatAmount,
    credits,
    exclusive,
    creditsToDebit = 0,
    totalCredits,
    isHybrid = false,
    partnerId,
    partnerEmail,
    partnerCompany,
    siteUrl,
    customerId,
    enableOneClick,
  } = params

  const cleanSiteUrl = siteUrl.replace(/\/$/, "")
  const amountValue = priceTtc.toFixed(2)

  const isLocalhost =
    cleanSiteUrl.includes("localhost") || cleanSiteUrl.includes("127.0.0.1")
  const webhookUrl = isLocalhost ? undefined : `${cleanSiteUrl}/api/webhooks/mollie`

  const locationSuffix = leadLocation ? ` (${leadLocation})` : ""
  const redirectUrl = `${cleanSiteUrl}/partenaires/dashboard?lead_payment=return&lead_id=${encodeURIComponent(leadId)}`
  const useFirstMandate = Boolean(enableOneClick && customerId)
  const modeTag = exclusive && leadSegment === "B2C" ? " EXCLUSIF" : ""
  const hybridActive = Boolean(isHybrid && creditsToDebit > 0)
  const description = hybridActive
    ? `Aegis Solaire - Complément (${creditsToDebit} cr. + €)${modeTag} ${leadSegment} #${leadId.slice(0, 8)}${locationSuffix}`
    : `Aegis Solaire - Déblocage${modeTag} ${leadSegment} #${leadId.slice(0, 8)}${locationSuffix}`

  const payment = await mollie.payments.create({
    amount: {
      currency: "EUR",
      value: amountValue,
    },
    description,
    redirectUrl,
    webhookUrl,
    ...(customerId ? { customerId } : {}),
    ...(useFirstMandate ? { sequenceType: SequenceType.first } : {}),
    method: useFirstMandate
      ? [PaymentMethod.bancontact, PaymentMethod.creditcard]
      : [
          PaymentMethod.bancontact,
          PaymentMethod.creditcard,
          PaymentMethod.kbc,
          PaymentMethod.belfius,
        ],
    metadata: {
      type: "lead_direct_purchase",
      leadId,
      partnerId,
      credits,
      totalCredits: totalCredits ?? credits,
      creditsToDebit: hybridActive ? creditsToDebit : 0,
      isHybrid: hybridActive,
      exclusive: Boolean(exclusive && leadSegment === "B2C"),
      priceHtva,
      vatAmount,
      priceTtc,
      leadSegment,
      partnerEmail,
      partnerCompany,
      enableOneClick: useFirstMandate,
    },
  })

  return {
    paymentId: payment.id,
    checkoutUrl: payment.getCheckoutUrl(),
    status: payment.status,
  }
}

export type CreateRecurringLeadPaymentParams = {
  customerId: string
  mandateId?: string | null
  leadId: string
  leadSegment: string
  leadLocation?: string | null
  priceTtc: number
  priceHtva: number
  vatAmount: number
  credits: number
  exclusive?: boolean
  creditsToDebit?: number
  totalCredits?: number
  isHybrid?: boolean
  partnerId: string
  partnerEmail: string
  partnerCompany: string
  siteUrl: string
  channel?: "mollie_mandate_one_click" | "auto_pilot"
}

/**
 * Débite un mandat Mollie récurrent existant (1-clic ou Auto-Pilot) sans passage par le checkout.
 */
export async function createRecurringLeadPayment(params: CreateRecurringLeadPaymentParams) {
  const mollie = getMollieClient()
  const cleanSiteUrl = params.siteUrl.replace(/\/$/, "")
  const isLocalhost =
    cleanSiteUrl.includes("localhost") || cleanSiteUrl.includes("127.0.0.1")
  const webhookUrl = isLocalhost ? undefined : `${cleanSiteUrl}/api/webhooks/mollie`
  const locationSuffix = params.leadLocation ? ` (${params.leadLocation})` : ""
  const modeTag = params.exclusive && params.leadSegment === "B2C" ? " EXCLUSIF" : ""
  const creditsToDebit = params.creditsToDebit ?? 0
  const hybridActive = Boolean(params.isHybrid && creditsToDebit > 0)
  const description = hybridActive
    ? `Aegis Solaire Auto - Complément (${creditsToDebit} cr. + €)${modeTag} ${params.leadSegment} #${params.leadId.slice(0, 8)}${locationSuffix}`
    : `Aegis Solaire Auto - Déblocage${modeTag} ${params.leadSegment} #${params.leadId.slice(0, 8)}${locationSuffix}`

  const payment = await mollie.payments.create({
    customerId: params.customerId,
    ...(params.mandateId ? { mandateId: params.mandateId } : {}),
    sequenceType: SequenceType.recurring,
    amount: {
      currency: "EUR",
      value: params.priceTtc.toFixed(2),
    },
    description,
    webhookUrl,
    metadata: {
      type: "lead_direct_purchase",
      channel: params.channel || "mollie_mandate_one_click",
      leadId: params.leadId,
      partnerId: params.partnerId,
      credits: params.credits,
      totalCredits: params.totalCredits ?? params.credits,
      creditsToDebit: hybridActive ? creditsToDebit : 0,
      isHybrid: hybridActive,
      exclusive: Boolean(params.exclusive && params.leadSegment === "B2C"),
      priceHtva: params.priceHtva,
      vatAmount: params.vatAmount,
      priceTtc: params.priceTtc,
      leadSegment: params.leadSegment,
      partnerEmail: params.partnerEmail,
      partnerCompany: params.partnerCompany,
    },
  })

  return {
    paymentId: payment.id,
    status: payment.status,
  }
}
