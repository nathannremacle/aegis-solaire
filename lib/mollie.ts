import { createMollieClient, PaymentMethod, PaymentStatus } from "@mollie/api-client"

export { PaymentMethod, PaymentStatus }

/**
 * Initialise le client officiel Mollie.
 * Supporte le mode test (clé commençant par test_) et live (clé commençant par live_).
 */
export function getMollieClient() {
  const apiKey = process.env.MOLLIE_API_KEY

  if (!apiKey) {
    throw new Error(
      "MOLLIE_API_KEY non configurée. Veuillez ajouter votre clé API Mollie dans le fichier .env.local (ex: test_... ou live_...)."
    )
  }

  return createMollieClient({ apiKey })
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
}

/**
 * Crée un paiement Mollie pré-configuré pour le marché belge (Bancontact / Payconiq).
 * La commission est un forfait fixe d'environ 0,25 € HT par transaction (0 % variable).
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
  } = params

  const cleanSiteUrl = siteUrl.replace(/\/$/, "")

  // Montant formaté au centime près (obligatoire pour Mollie : '180.29')
  const amountValue = priceTtc.toFixed(2)

  // Webhook Mollie : en local/développement sans tunnel public, Mollie ne peut pas joindre localhost.
  // En production ou si NEXT_PUBLIC_SITE_URL est public, Mollie appellera ce webhook.
  const isLocalhost =
    cleanSiteUrl.includes("localhost") || cleanSiteUrl.includes("127.0.0.1")
  const webhookUrl = isLocalhost
    ? undefined // Mollie rejette les URLs localhost en webhook
    : `${cleanSiteUrl}/api/webhooks/mollie`

  const redirectUrl = `${cleanSiteUrl}/partenaires/dashboard/credits?payment=return&order_id=${orderId}`

  const payment = await mollie.payments.create({
    amount: {
      currency: "EUR",
      value: amountValue,
    },
    description: `Aegis Solaire - ${packName} (${credits} crédits) - ${partnerCompany.slice(0, 20)}`,
    redirectUrl,
    webhookUrl,
    method: [
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
    },
  })

  return {
    paymentId: payment.id,
    checkoutUrl: payment.getCheckoutUrl(),
    status: payment.status,
  }
}
