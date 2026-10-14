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

    // Honeypot anti-spam : si rempli, simuler le succès sans insérer
    if (body.fax_number != null && String(body.fax_number).trim() !== "") {
      return NextResponse.json({
        success: true,
        message: "Merci. Accédez au replay ci-dessous.",
      })
    }

    if (!(await checkRateLimit(request))) {
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
    const marketingConsent = body.marketingConsent === true

    let surface_area: number | null = null
    if (data.surfaceRange === "lt_500") surface_area = 400
    else if (data.surfaceRange === "m500_1500") surface_area = 1000
    else if (data.surfaceRange === "gt_1500") surface_area = 2000

    const supabase = createServiceRoleClient()
    const consentDate = new Date()
    const dataRetentionUntil = new Date()
    dataRetentionUntil.setFullYear(dataRetentionUntil.getFullYear() + 3)

    const insertPayload: Record<string, unknown> = {
      first_name,
      last_name: null,
      email,
      phone: null,
      job_title,
      company,
      message: null,
      objective: null,
      surface_type: surface_area ? "toiture" : null,
      surface_area,
      surface_area_m2: surface_area,
      project_timeline: null,
      annual_electricity_bill: null,
      estimated_roi_years: null,
      autoconsumption_rate: null,
      estimated_savings: null,
      source_form: "webinaire_replay",
      qualification_metadata: {
        webinaire_surface_range: data.surfaceRange ?? null,
      },
      marketing_consent: marketingConsent,
      consent_date: marketingConsent ? consentDate.toISOString() : null,
      data_retention_until: dataRetentionUntil.toISOString(),
      source: WEBINAIRE_SOURCE,
      status: "new",
      marketplace_status: "rejected",
      lead_score: null,
      wants_irve: false,
    }

    let insertRes = await supabase
      .from("leads")
      .insert(insertPayload)
      .select("id")
      .single()

    // Fallback de résilience si la migration 024 n'est pas encore appliquée
    if (insertRes.error && insertRes.error.message && (insertRes.error.message.includes("column") || insertRes.error.code === "42703")) {
      const legacyPayload = { ...insertPayload }
      delete legacyPayload.source_form
      delete legacyPayload.surface_area_m2
      delete legacyPayload.qualification_metadata
      insertRes = await supabase
        .from("leads")
        .insert(legacyPayload)
        .select("id")
        .single()
    }

    if (insertRes.error) {
      console.error("Webinaire lead insert error:", insertRes.error)
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement. Veuillez réessayer." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Merci. Accédez au replay ci-dessous.",
      leadId: insertRes.data?.id,
    })
  } catch (err) {
    console.error("Webinaire API error:", err)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
