import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { mediaPartnerRegistrationSchema } from "@/lib/media-partner-registration-schema"
import { checkRateLimit } from "@/lib/rate-limit"

const MIN_FORM_FILL_TIME_MS = 4000

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.fax_number != null && String(body.fax_number).trim() !== "") {
      return NextResponse.json({
        success: true,
        message: "Candidature reçue. Notre équipe vous recontactera sous 48h.",
      })
    }

    if (!(await checkRateLimit(request))) {
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
          { error: "Une erreur est survenue. Veuillez réessayer." },
          { status: 400 }
        )
      }
    }

    const parseResult = mediaPartnerRegistrationSchema.safeParse({
      name: body.name,
      email: body.email,
      companyName: body.companyName,
      websiteUrl: body.websiteUrl,
      experienceDescription: body.experienceDescription,
      expectedLeadsPerMonth: body.expectedLeadsPerMonth,
    })

    if (!parseResult.success) {
      const fe = parseResult.error.flatten().fieldErrors
      const message =
        fe.name?.[0] ??
        fe.email?.[0] ??
        fe.companyName?.[0] ??
        fe.websiteUrl?.[0] ??
        fe.experienceDescription?.[0] ??
        fe.expectedLeadsPerMonth?.[0] ??
        "Données invalides. Vérifiez les champs."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parseResult.data
    const email = data.email.toLowerCase().trim()
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from("media_partner_applications").insert({
      name: data.name,
      email,
      company_name: data.companyName,
      website_url: data.websiteUrl ?? null,
      experience_description: data.experienceDescription,
      expected_leads_per_month: data.expectedLeadsPerMonth,
      status: "pending",
    })

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Une candidature avec cette adresse e-mail existe déjà." },
          { status: 409 }
        )
      }
      console.error("[media-partners/register] DB error:", error)
      return NextResponse.json(
        { error: "Une erreur est survenue. Veuillez réessayer." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Candidature reçue. Notre équipe vous recontactera sous 48h.",
    })
  } catch (e) {
    console.error("[media-partners/register]", e)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
