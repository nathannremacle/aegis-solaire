import crypto from "crypto"

function getSigningSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "aegis-solaire-partner-prefs-v1"
  )
}

/**
 * Génère un jeton HMAC-SHA256 déterministe (32 caractères hex) permettant à un installateur
 * de modifier ses préférences d'alerte e-mail en 1 clic depuis un e-mail sans connexion préalable.
 */
export function createPartnerUnsubscribeToken(partnerId: string, _email?: string | null): string {
  const normalizedId = String(partnerId || "").toLowerCase().trim()
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(`partner_notif_prefs:${normalizedId}`)
    .digest("hex")
    .slice(0, 32)
}

/**
 * Vérifie en temps constant la validité du jeton HMAC de désabonnement / préférences.
 */
export function verifyPartnerUnsubscribeToken(
  partnerId: string,
  token: string,
  email?: string | null
): boolean {
  if (!partnerId || !token) return false
  const expected = createPartnerUnsubscribeToken(partnerId, email)
  const actual = token.trim().toLowerCase()
  if (expected.length !== actual.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(actual, "utf8"))
  } catch {
    return false
  }
}

export interface PartnerNotificationUrls {
  manageUrl: string
  noRelancesUrl: string
  muteAllUrl: string
  dashboardAlertsUrl: string
}

export interface PartnerExpressLeadUrls {
  dashboardUrl: string
  inspectLeadUrl: string
  directCheckoutLeadUrl: string
  creditsUrl: string
}

/**
 * Construit les liens directs de gestion de fréquence e-mail pour les pieds de mail installateurs.
 */
export function buildPartnerNotificationUrls(
  baseUrl: string,
  partnerId: string,
  email?: string | null
): PartnerNotificationUrls {
  const cleanBase = baseUrl.replace(/\/$/, "")
  const token = createPartnerUnsubscribeToken(partnerId, email)
  const encodedPartner = encodeURIComponent(partnerId)
  const encodedToken = encodeURIComponent(token)

  return {
    manageUrl: `${cleanBase}/partenaires/notifications?partner=${encodedPartner}&token=${encodedToken}`,
    noRelancesUrl: `${cleanBase}/partenaires/notifications?partner=${encodedPartner}&token=${encodedToken}&mode=new_only`,
    muteAllUrl: `${cleanBase}/partenaires/notifications?partner=${encodedPartner}&token=${encodedToken}&mode=none`,
    dashboardAlertsUrl: `${cleanBase}/partenaires/dashboard?alerts=1&partner=${encodedPartner}&token=${encodedToken}`,
  }
}

/**
 * Construit les liens d'accès express pré-authentifiés (sans mur de connexion)
 * vers la marketplace, l'inspection d'un dossier, le paiement direct Bancontact/Carte ou la recharge de crédits.
 */
export function buildPartnerExpressLeadUrls(
  baseUrl: string,
  partnerId: string,
  leadId?: string | null,
  email?: string | null
): PartnerExpressLeadUrls {
  const cleanBase = baseUrl.replace(/\/$/, "")
  const token = createPartnerUnsubscribeToken(partnerId, email)
  const encodedPartner = encodeURIComponent(partnerId)
  const encodedToken = encodeURIComponent(token)
  const authQuery = `partner=${encodedPartner}&token=${encodedToken}`

  const dashboardUrl = `${cleanBase}/partenaires/dashboard?${authQuery}`
  const cleanLeadId = leadId?.trim()
  const inspectLeadUrl = cleanLeadId
    ? `${cleanBase}/partenaires/dashboard?lead=${encodeURIComponent(cleanLeadId)}&${authQuery}`
    : dashboardUrl
  const directCheckoutLeadUrl = cleanLeadId
    ? `${cleanBase}/partenaires/dashboard?lead=${encodeURIComponent(cleanLeadId)}&checkout=direct&${authQuery}`
    : dashboardUrl
  const creditsUrl = `${cleanBase}/partenaires/dashboard/credits?${authQuery}`

  return {
    dashboardUrl,
    inspectLeadUrl,
    directCheckoutLeadUrl,
    creditsUrl,
  }
}

