import crypto from "crypto"

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex")
}

export interface MetaCapiLeadParams {
  eventId: string
  email: string
  phone: string
  segment: "B2B" | "B2C" | string
  clientIp?: string
  userAgent?: string
  fbp?: string
  fbc?: string
}

/**
 * Envoie un événement de conversion 'Lead' directement à l'API Graph Meta (Conversions API).
 * Permet de récupérer les 40% de signaux bloqués par Adblock ou ITP (iOS).
 * Se déduplique automatiquement avec le pixel client-side grâce au même eventId.
 */
export async function sendMetaConversionApiLead(params: MetaCapiLeadParams): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    // Si la variable n'est pas encore configurée, on quitte silencieusement
    return
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Lead",
            event_time: Math.floor(Date.now() / 1000),
            event_id: params.eventId,
            action_source: "website",
            user_data: {
              em: [sha256(params.email)],
              ph: [sha256(params.phone.replace(/\D/g, ""))],
              client_ip_address: params.clientIp,
              client_user_agent: params.userAgent,
              fbp: params.fbp,
              fbc: params.fbc,
            },
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
