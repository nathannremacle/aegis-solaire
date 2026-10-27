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

/**
 * Envoie un événement de conversion 'Lead' directement à l'API Graph Meta (Conversions API v22.0).
 * Maximise l'Event Match Quality (EMQ >= 8,8/10) via la transmission exhaustive :
 * em (email), ph (E.164), fn (prénom), ln (nom), zp (code postal), country ("be"),
 * fbp (cookie navigateur), fbc (identifiant de clic fbclid formaté) et données réseau (IP, User-Agent).
 * Se déduplique automatiquement avec le pixel client-side grâce au même eventId.
 */
export async function sendMetaConversionApiLead(params: MetaCapiLeadParams): Promise<void> {
  if (!params.advertisingConsent) return
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    // Si la variable n'est pas encore configurée, on quitte silencieusement
    return
  }

  try {
    const formattedFbc = formatFbc(params.fbc, params.fbclid)

    const userData: Record<string, unknown> = {
      em: [sha256(params.email)],
      ph: [sha256(normalizePhoneForMeta(params.phone))],
      client_ip_address: params.clientIp,
      client_user_agent: params.userAgent,
      country: [sha256((params.countryCode || "be").trim().toLowerCase())],
    }

    if (params.firstName && params.firstName.trim()) {
      userData.fn = [sha256(params.firstName)]
    }
    if (params.lastName && params.lastName.trim()) {
      userData.ln = [sha256(params.lastName)]
    }
    if (params.postalCode && params.postalCode.trim()) {
      userData.zp = [sha256(params.postalCode)]
    }
    if (params.fbp && params.fbp.trim()) {
      userData.fbp = params.fbp.trim()
    }
    if (formattedFbc) {
      userData.fbc = formattedFbc
    }

    const response = await fetch(`https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Lead",
            event_time: Math.floor(Date.now() / 1000),
            event_id: params.eventId,
            action_source: "website",
            event_source_url: "https://www.aegissolaire.com/devis-panneaux-solaires",
            user_data: userData,
            custom_data: {
              content_category: params.segment,
              currency: "EUR",
              value: params.segment === "B2B" ? 110 : 55,
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}))
      console.warn("[Meta CAPI] Réponse non-200:", response.status, errJson)
    }
  } catch (err) {
    console.error("[Meta CAPI Error]:", err)
  }
}

