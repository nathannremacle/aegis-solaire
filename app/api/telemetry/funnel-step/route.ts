import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { isWalloonPostalCode } from "@/lib/leads-validation"
import { sendMetaConversionApiEvent } from "@/lib/meta-capi"

/**
 * Route télémétrie anonyme d'entonnoir (100 % conforme APD / sans cookie tiers / sans PII)
 * + Relais serveur CAPI optionnel pour l'intention qualifiée (InitiateCheckout étape 5 Wallonie).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const {
      sessionId,
      step,
      stepName,
      province,
      utmSource,
      utmCampaign,
      utmContent,
      utmTerm,
      metaEventName,
      eventId,
      postalCode,
      fbclid,
      sourceUrl,
      skipDbLog,
    } = body

    if (typeof step !== "number" || step < 1 || step > 6) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Logger de performance anonyme avec attribution de l'annonce publicitaire
    if (process.env.NODE_ENV !== "production" && !skipDbLog) {
      console.log(
        `[Funnel Telemetry] Session: ${sessionId?.slice(0, 8)} | Step ${step}: ${stepName} | Ad: ${utmContent || "organic"} | Province: ${province || "N/A"}`
      )
    }

    // Enregistrement dans Supabase pour analyse des cohortes et règles KILL / SCALE
    if (!skipDbLog) {
      try {
        const supabase = createServiceRoleClient()
        await supabase
          .from("funnel_step_events")
          .insert({
            session_id: typeof sessionId === "string" ? sessionId.slice(0, 64) : "anonymous",
            step_number: step,
            step_name: typeof stepName === "string" ? stepName.slice(0, 100) : `Step ${step}`,
            province: typeof province === "string" ? province.slice(0, 50) : null,
            utm_source: typeof utmSource === "string" ? utmSource.slice(0, 50) : null,
            utm_campaign: typeof utmCampaign === "string" ? utmCampaign.slice(0, 100) : null,
            utm_content: typeof utmContent === "string" ? utmContent.slice(0, 100) : null,
            utm_term: typeof utmTerm === "string" ? utmTerm.slice(0, 100) : null,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle()
      } catch {
        // Si la table n'est pas encore migrée ou en cas de coupure réseau, on n'interrompt pas le visiteur
      }
    }

    // Relais CAPI Meta InitiateCheckout uniquement si le CP wallon est valide (filtre le hors-zone)
    if (
      metaEventName === "InitiateCheckout" &&
      typeof eventId === "string" &&
      eventId.trim() !== "" &&
      typeof postalCode === "string" &&
      isWalloonPostalCode(postalCode.trim())
    ) {
      try {
        const clientIp =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip")?.trim() ||
          undefined
        const userAgent = request.headers.get("user-agent") || undefined
        const fbp = request.cookies.get("_fbp")?.value
        const fbc = request.cookies.get("_fbc")?.value
        const resolvedSourceUrl =
          (typeof sourceUrl === "string" && sourceUrl.startsWith("http") ? sourceUrl : undefined) ||
          request.headers.get("referer") ||
          "https://www.aegissolaire.com/devis-panneaux-solaires"

        await sendMetaConversionApiEvent({
          eventName: "InitiateCheckout",
          eventId: eventId.trim(),
          postalCode: postalCode.trim(),
          countryCode: "be",
          clientIp,
          userAgent,
          fbp,
          fbc,
          fbclid: typeof fbclid === "string" && fbclid.trim() !== "" ? fbclid.trim() : undefined,
          sourceUrl: resolvedSourceUrl,
          segment: "B2C",
          value: 15,
          contentName: "Audit Solaire Wallonie",
        })
      } catch {
        // Relais non bloquant côté visiteur
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
