import { NextRequest, NextResponse } from "next/server"
import { installerRegistrationSchema } from "@/lib/installer-registration-schema"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parseResult = installerRegistrationSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.flatten().fieldErrors
      const message =
        firstError.companyName?.[0] ??
        firstError.siret?.[0] ??
        firstError.firstName?.[0] ??
        firstError.lastName?.[0] ??
        firstError.jobTitle?.[0] ??
        firstError.email?.[0] ??
        firstError.phone?.[0] ??
        firstError.rescertPhotovoltaicRef?.[0] ??
        firstError.rescertPhotovoltaicConfirmed?.[0] ??
        firstError.regions?.[0] ??
        "Données invalides. Vérifiez les champs."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parseResult.data
    const supabase = createServiceRoleClient()

    const { error } = await supabase.from("installer_applications").insert({
      company_name: data.companyName.trim(),
      siret: data.siret.trim(),
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      job_title: data.jobTitle.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      rescert_ref: data.rescertPhotovoltaicRef.trim(),
      regions: data.regions,
      status: "pending",
    })

    if (error) {
      console.error("[installer register] DB error:", error)
      return NextResponse.json(
        { error: "Une erreur est survenue. Veuillez réessayer." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message:
        "Votre demande a bien été envoyée. Notre équipe va vérifier votre certification RESCERT Photovoltaïque et vous recontactera sous 48h.",
    })
  } catch (error) {
    console.error("Installateur register API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
