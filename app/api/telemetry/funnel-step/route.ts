import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

/**
 * Route télémétrie anonyme d'entonnoir (100 % conforme APD / sans cookie tiers / sans PII)
 * Permet de mesurer le taux d'abandon par étape même si l'utilisateur refuse les cookies publicitaires.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { sessionId, step, stepName, province, utmSource, utmCampaign, utmContent, utmTerm } = body

    if (typeof step !== "number" || step < 1 || step > 6) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    // Logger de performance anonyme avec attribution de l'annonce publicitaire
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[Funnel Telemetry] Session: ${sessionId?.slice(0, 8)} | Step ${step}: ${stepName} | Ad: ${utmContent || "organic"} | Province: ${province || "N/A"}`
      )
    }

    // Enregistrement dans Supabase pour analyse des cohortes et règles KILL / SCALE
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

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
