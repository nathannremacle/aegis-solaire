import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { webinaireLeadSchema } from "@/lib/webinaire-schema"
import { checkRateLimit } from "@/lib/rate-limit"

function sanitizeString(input: string, maxLength = 255): string {
  const trimmed = String(input).trim().slice(0, maxLength)
  return trimmed.replace(/[<>]/g, "")
}

/** Source enregistrée pour les leads issus de la page Webinaire Zéro CAPEX. */
export const WEBINAIRE_SOURCE = "Webinaire_Zero_CAPEX"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { error: "Trop de demandes. Veuillez réessayer dans une heure." },
        { status: 429 }
      )
    }

    const parseResult = webinaireLeadSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.flatten().fieldErrors
      const message =
        firstError.firstName?.[0] ??
        firstError.jobTitle?.[0] ??
        firstError.email?.[0] ??
        firstError.companyName?.[0] ??
        "Données invalides. Vérifiez les champs."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parseResult.data
    const first_name = sanitizeString(data.firstName)
    const job_title = sanitizeString(data.jobTitle)
    const email = data.email.toLowerCase().trim()
    const company = data.companyName ? sanitizeString(data.companyName, 255) : null

    const supabase = createServiceRoleClient()
    const consentDate = new Date()
    const dataRetentionUntil = new Date()
    dataRetentionUntil.setFullYear(dataRetentionUntil.getFullYear() + 3)

    const { data: inserted, error } = await supabase
      .from("leads")
      .insert({
        first_name,
        last_name: null,
        email,
        phone: null,
        job_title,
        company,
        message: null,
        objective: null,
        surface_type: null,
        surface_area: null,
        project_timeline: null,
        annual_electricity_bill: null,
        estimated_roi_years: null,
        autoconsumption_rate: null,
        estimated_savings: null,
        marketing_consent: true,
        consent_date: consentDate.toISOString(),
        data_retention_until: dataRetentionUntil.toISOString(),
        source: WEBINAIRE_SOURCE,
        status: "new",
        lead_score: null,
        wants_irve: false,
      })
      .select("id")
      .single()

    if (error) {
      console.error("Webinaire lead insert error:", error)
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement. Veuillez réessayer." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Merci. Accédez au replay ci-dessous.",
      leadId: inserted?.id,
    })
  } catch (err) {
    console.error("Webinaire API error:", err)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
