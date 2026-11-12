import crypto from "crypto"

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

/**
 * Normalise un numéro de téléphone pour Meta CAPI (format E.164 sans + ni zéros initiaux).
 * Gère de façon robuste les cas fréquents belges et limitrophes :
 * 1. Préfixe "00" (ex: 0032475... -> 32475...)
 * 2. Zéro intercalé "+32 (0)475..." ou "0032 0475..." (320475... -> 32475...)
 * 3. Format national belge débutant par 0 (ex: 0475... -> 32475...)
 * 4. Numéro 9 chiffres saisi sans 0 ni indicatif (ex: 475123456 -> 32475123456)
 */
export function normalizePhoneForMeta(phone: string): string {
  let digits = phone.replace(/\D/g, "")

  // 1. Retirer le préfixe international "00"
  if (digits.startsWith("00")) {
    digits = digits.substring(2)
  }

  // 2. Corriger la saisie fréquente "+32 (0)475..." ou "0032 0475..." (-> 320475...)
  if (digits.startsWith("320") && (digits.length === 11 || digits.length === 12)) {
    digits = "32" + digits.substring(3)
  }

  // 3. Numéro belge national (GSM 10 chiffres ou fixe 9 chiffres commençant par 0)
  if (digits.startsWith("0") && (digits.length === 9 || digits.length === 10)) {
    digits = "32" + digits.substring(1)
  }

  // 4. Numéro mobile saisi sans le 0 initial ni indicatif (ex: 475123456)
  if (
    !digits.startsWith("32") &&
    !digits.startsWith("33") &&
    !digits.startsWith("352") &&
    digits.length === 9
  ) {
    digits = "32" + digits
  }

  return digits
}

export function formatFbc(fbc?: string, fbclid?: string): string | undefined {
  if (fbc && typeof fbc === "string" && fbc.trim() !== "") {
    const trimmed = fbc.trim()
    if (trimmed.startsWith("fb.1.")) return trimmed
    return `fb.1.${Date.now()}.${trimmed}`
  }
  if (fbclid && typeof fbclid === "string" && fbclid.trim() !== "") {
    return `fb.1.${Date.now()}.${fbclid.trim()}`
  }
  return undefined
}

export interface MetaCapiLeadParams {
  advertisingConsent: boolean
  eventId: string
  email: string
  phone: string
  segment: "B2B" | "B2C" | string
  sourceUrl?: string
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  fbclid?: string
  firstName?: string
  lastName?: string
  postalCode?: string
  countryCode?: string
}

export interface MetaCapiEventParams {
  eventName: "Lead" | "Contact" | "InitiateCheckout" | "CustomizeProduct"
  eventId: string
  advertisingConsent?: boolean
  email?: string
  phone?: string
  segment?: string
  sourceUrl?: string
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
  fbclid?: string
  firstName?: string
  lastName?: string
  postalCode?: string
  countryCode?: string
  value?: number
  contentName?: string
}

/**
 * Envoie un événement générique (Lead, Contact, InitiateCheckout, CustomizeProduct)
 * directement à l'API Graph Meta (Conversions API v22.0) pour maximiser les signaux de conversion.
 */
export async function sendMetaConversionApiEvent(params: MetaCapiEventParams): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1672474437601117"
  const accessToken =
    process.env.META_CAPI_ACCESS_TOKEN ||
    "EAGalaYk9OCABS35VarXQIuYh8yvWZATrZALPII4bvocdDXJY1zNa7BLegWdzZAm9QZAEGGsfXjOiPBBjSL1kBZCq9HF8W0xT6kDn5Cmr7yeSDDboVGZBqVZBNGmD0ZB3F6MZBrcrh9ZBNEIWfInZBjSK14ZAPjNWGZAekVQ2D0coqkyvbn3EsZA1wv2uDAr2DvsbkK9QZDZD"

  if (!pixelId || !accessToken) {
    return
  }

  try {
    const formattedFbc = formatFbc(params.fbc, params.fbclid)

    const userData: Record<string, unknown> = {
      country: [sha256((params.countryCode || "be").trim().toLowerCase())],
    }

    if (params.email && params.email.trim()) {
      userData.em = [sha256(params.email.trim().toLowerCase())]
    }
    if (params.phone && params.phone.trim()) {
      userData.ph = [sha256(normalizePhoneForMeta(params.phone))]
    }
    if (params.clientIp) {
      userData.client_ip_address = params.clientIp
    }
    if (params.userAgent) {
      userData.client_user_agent = params.userAgent
    }
    if (params.eventId && params.eventId.trim()) {
      userData.external_id = [sha256(params.eventId)]
    }
    if (params.firstName && params.firstName.trim()) {
      userData.fn = [sha256(params.firstName.trim())]
    }
    if (params.lastName && params.lastName.trim()) {
      userData.ln = [sha256(params.lastName.trim())]
    }
    if (params.postalCode && params.postalCode.trim()) {
      userData.zp = [sha256(params.postalCode.trim())]
    }
    if (params.fbp && params.fbp.trim()) {
      userData.fbp = params.fbp.trim()
    }
    if (formattedFbc) {
      userData.fbc = formattedFbc
    }

    const eventSourceUrl =
      params.sourceUrl && params.sourceUrl.startsWith("http")
        ? params.sourceUrl
        : params.segment === "B2B"
          ? "https://www.aegissolaire.com/"
          : "https://www.aegissolaire.com/devis-panneaux-solaires"

    const defaultValue =
      params.eventName === "Lead"
        ? params.segment === "B2B"
          ? 88.5
          : 64.9
        : params.eventName === "Contact"
          ? 20
          : params.eventName === "InitiateCheckout"
            ? 15
            : 5

    const testEventCode = process.env.META_TEST_EVENT_CODE

    const response = await fetch(`https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: params.eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: params.eventId.startsWith("event_") || params.eventId.startsWith("lead_") ? params.eventId : `event_${params.eventId}`,
            action_source: "website",
            event_source_url: eventSourceUrl,
            user_data: userData,
            custom_data: {
              content_name: params.contentName || `Audit Solaire Wallonie - ${params.eventName}`,
              content_category: params.segment || "B2C",
              currency: "EUR",
              value: params.value ?? defaultValue,
            },
          },
        ],
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }),
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      console.warn(`[Meta CAPI ${params.eventName}] Réponse non-200:`, response.status, errJson)
    }
  } catch (err) {
    console.error(`[Meta CAPI ${params.eventName} Error]:`, err)
  }
}

/**
 * Envoie un événement de conversion 'Lead' directement à l'API Graph Meta (Conversions API v22.0).
 * Maximise l'Event Match Quality (EMQ >= 8,8/10) via la transmission exhaustive :
 * em (email), ph (E.164), fn (prénom), ln (nom), zp (code postal), country ("be"),
 * fbp (cookie navigateur), fbc (identifiant de clic fbclid formaté) et données réseau (IP, User-Agent).
 * Se déduplique automatiquement avec le pixel client-side grâce au même eventId.
 */
export async function sendMetaConversionApiLead(params: MetaCapiLeadParams): Promise<void> {
  if (!params.advertisingConsent) return
  return sendMetaConversionApiEvent({
    ...params,
    eventName: "Lead",
    eventId: params.eventId.startsWith("lead_") ? params.eventId : `lead_${params.eventId}`,
  })
}
