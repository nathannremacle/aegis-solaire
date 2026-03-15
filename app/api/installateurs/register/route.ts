import { NextRequest, NextResponse } from "next/server"
import { installerRegistrationSchema } from "@/lib/installer-registration-schema"

/**
 * Candidature installateur (Devenir Partenaire).
 * Valide les données avec Zod, simule l'enregistrement.
 * TODO: Insert into Supabase 'installers' table (ou table dédiée candidatures).
 */
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
        firstError.rgeNumber?.[0] ??
        firstError.qualiPvCertified?.[0] ??
        firstError.region?.[0] ??
        "Données invalides. Vérifiez les champs."
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const data = parseResult.data

    // TODO: Insert into Supabase 'installers' table (candidatures en attente de vérification RGE/QualiPV)
    // Exemple: await supabase.from('installer_applications').insert({ ... })

    return NextResponse.json({
      success: true,
      message:
        "Votre demande a bien été envoyée. Notre équipe va vérifier vos certifications RGE/QualiPV et vous recontactera sous 48h.",
    })
  } catch (error) {
    console.error("Installateur register API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
