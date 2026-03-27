import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { leadSubmitSchema } from "@/lib/leads-schema"
import { calculateLeadScore } from "@/lib/lead-score"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendPartnerLeadTeaserEmails } from "@/lib/partner-lead-teaser-email"

function sanitizeString(input: string, maxLength = 255): string {
  const trimmed = String(input).trim().slice(0, maxLength)
  return trimmed.replace(/[<>]/g, "")
}

const MIN_FORM_FILL_TIME_MS = 4000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.fax_number != null && String(body.fax_number).trim() !== "") {
      return NextResponse.json({
        success: true,
        message: "Lead enregistré avec succès",
        leadId: crypto.randomUUID(),
      })
    }

    if (!checkRateLimit(request)) {
      return NextResponse.json(
        { error: "Trop de demandes. Veuillez réessayer dans une heure." },
        { status: 429 }
      )
    }

    const formOpenedAt = body.form_opened_at
    if (formOpenedAt) {
      const opened = new Date(formOpenedAt).getTime()
      const now = Date.now()
      if (Number.isNaN(opened) || now - opened < MIN_FORM_FILL_TIME_MS) {
        return NextResponse.json(
          { error: "Une erreur est survenue. Veuillez reessayer." },
          { status: 400 }
        )
      }
    }

    const parseResult = leadSubmitSchema.safeParse({
      ...body,
      surfaceArea: typeof body.surfaceArea === "number" ? body.surfaceArea : parseInt(body.surfaceArea, 10),
      annualElectricityBill:
        typeof body.annualElectricityBill === "number"
          ? body.annualElectricityBill
          : parseInt(body.annualElectricityBill, 10),
      marketingConsent: body.marketingConsent === true,
    })

    if (!parseResult.success) {
      const firstError = parseResult.error.flatten().fieldErrors
      const message =
        firstError.email?.[0] ??
        firstError.phone?.[0] ??
        firstError.firstName?.[0] ??
        firstError.lastName?.[0] ??
        firstError.company?.[0] ??
        firstError.companyVat?.[0] ??
        firstError.surfaceArea?.[0] ??
        firstError.annualElectricityBill?.[0] ??
        firstError.jobTitle?.[0] ??
        firstError.surfaceType?.[0] ??
        firstError.province?.[0] ??
        firstError.provinceFreeText?.[0] ??
        firstError.marketingConsent?.[0] ??
        "Données invalides. Vérifiez les champs."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parseResult.data

    const first_name = sanitizeString(data.firstName)
    const last_name = sanitizeString(data.lastName)
    const email = data.email.toLowerCase().trim()
    const phone = data.phone.replace(/[\s.-]/g, "")
    const job_title = sanitizeString(data.jobTitle)
    const company = sanitizeString(data.company)
    const company_vat = sanitizeString(data.companyVat, 32)
    const projectDetailsOnly = data.projectDetails ? sanitizeString(data.projectDetails, 2000) : null
    const provinceFreeSanitized = data.provinceFreeText ? sanitizeString(data.provinceFreeText, 400) : null
    const projectDetailsText =
      [provinceFreeSanitized ? `Précision localisation : ${provinceFreeSanitized}` : null, projectDetailsOnly]
        .filter(Boolean)
        .join("\n\n") || null

    const { score, status } = calculateLeadScore({
      firstName: first_name,
      lastName: last_name,
      jobTitle: job_title,
      surfaceArea: data.surfaceArea,
      annualElectricityBill: data.annualElectricityBill,
      grd: data.grd ?? null,
    })

    const supabase = await createClient()

    const consentDate = new Date()
    const dataRetentionUntil = new Date()
    dataRetentionUntil.setFullYear(dataRetentionUntil.getFullYear() + 3)

    const insertPayload: Record<string, unknown> = {
      first_name,
      last_name,
      email,
      phone,
      job_title,
      company,
      message: projectDetailsText,
      project_details: projectDetailsText,
      objective: null,
      surface_type: data.surfaceType,
      surface_area: data.surfaceArea,
      province: data.province,
      grd: data.grd ?? null,
      company_vat,
      project_timeline: null,
      annual_electricity_bill: data.annualElectricityBill,
      estimated_roi_years: data.estimatedROIYears ?? null,
      autoconsumption_rate: data.autoconsumptionRate ?? null,
      estimated_savings: data.estimatedSavings ?? null,
      marketing_consent: data.marketingConsent === true,
      consent_date: data.marketingConsent ? consentDate.toISOString() : null,
      data_retention_until: dataRetentionUntil.toISOString(),
      source: "simulator",
      status,
      lead_score: score,
      wants_irve: false,
    }

    const { data: inserted, error } = await supabase.from("leads").insert(insertPayload).select().single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement. Veuillez réessayer." },
        { status: 500 }
      )
    }

    void sendPartnerLeadTeaserEmails({
      province: data.province,
      provinceFreeText: data.provinceFreeText ?? null,
      surfaceType: data.surfaceType,
      surfaceArea: data.surfaceArea,
      annualElectricityBill: data.annualElectricityBill,
      grd: data.grd ?? null,
      /** Texte « projet » seul (sans doublon avec la ligne Province). */
      projectDetails: projectDetailsOnly,
    }).catch((err) => console.error("[Partner teaser] envoi non bloquant échoué:", err))

    const webhookUrl = process.env.LEAD_WEBHOOK_URL
    if (webhookUrl) {
      const payload = {
        id: inserted.id,
        first_name: inserted.first_name,
        last_name: inserted.last_name,
        email: inserted.email,
        phone: inserted.phone,
        job_title: inserted.job_title,
        company: inserted.company,
        company_vat: (inserted as { company_vat?: string }).company_vat ?? company_vat,
        message: (inserted as { project_details?: string | null; message?: string | null }).project_details
          ?? (inserted as { message?: string | null }).message
          ?? null,
        project_details: (inserted as { project_details?: string | null }).project_details ?? projectDetailsText,
        objective: inserted.objective ?? null,
        surface_type: inserted.surface_type,
        surface_area: inserted.surface_area,
        province: (inserted as { province?: string }).province ?? data.province,
        province_free_text: data.provinceFreeText ?? null,
        grd: (inserted as { grd?: string | null }).grd ?? data.grd ?? null,
        project_timeline: inserted.project_timeline ?? null,
        annual_electricity_bill: inserted.annual_electricity_bill,
        estimated_roi_years: inserted.estimated_roi_years,
        autoconsumption_rate: inserted.autoconsumption_rate,
        estimated_savings: inserted.estimated_savings,
        lead_score: inserted.lead_score ?? null,
        status: inserted.status,
        wants_irve: inserted.wants_irve ?? false,
        created_at: inserted.created_at,
      }
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }).catch((err) => console.error("Webhook delivery failed:", err))
    }

    return NextResponse.json({
      success: true,
      message: "Lead enregistré avec succès",
      leadId: inserted.id,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez reessayer." },
      { status: 500 }
    )
  }
}
