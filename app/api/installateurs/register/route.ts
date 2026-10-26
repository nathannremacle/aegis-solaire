import { NextRequest, NextResponse } from "next/server"
import { installerRegistrationSchema } from "@/lib/installer-registration-schema"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { generateInstallerVerificationToken } from "@/lib/installer-verification"
import {
  buildInstallerWelcomeVerificationEmail,
  sendInstallerEmail,
} from "@/lib/installer-welcome-emails"

function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
}

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

    const adminNotes = [
      data.invitedBy ? `⭐ INVITATION VIP PAR: ${data.invitedBy}` : null,
      data.targetSegment ? `Segments cibles: ${data.targetSegment}` : null,
      data.powerCapacity ? `Capacité: ${data.powerCapacity}` : null,
    ]
      .filter(Boolean)
      .join(" | ") || null

    const { data: insertedApp, error } = await supabase
      .from("installer_applications")
      .insert({
        company_name: data.companyName.trim(),
        siret: data.siret.trim(),
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        job_title: data.jobTitle.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone.trim(),
        rescert_ref: data.rescertPhotovoltaicRef.trim(),
        regions: data.regions,
        admin_notes: adminNotes,
        status: "pending",
      })
      .select("id, email, company_name, first_name, last_name")
      .single()

    if (error || !insertedApp) {
      console.error("[installer register] DB error:", error)
      return NextResponse.json(
        { error: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer." },
        { status: 500 }
      )
    }

    // Génération du lien de validation d'email
    const baseUrl =
      request.nextUrl.origin && !request.nextUrl.origin.includes("localhost:0")
        ? request.nextUrl.origin
        : getSiteBaseUrl()
    const verificationToken = generateInstallerVerificationToken(
      insertedApp.id,
      insertedApp.email
    )
    const verificationUrl = `${baseUrl}/api/installateurs/verify-email?id=${encodeURIComponent(
      insertedApp.id
    )}&token=${encodeURIComponent(verificationToken)}`

    // Construction et expédition de l'email de bienvenue + vérification (HomeDeal style Aegis)
    const emailPayload = buildInstallerWelcomeVerificationEmail({
      applicationId: insertedApp.id,
      firstName: insertedApp.first_name,
      lastName: insertedApp.last_name,
      companyName: insertedApp.company_name,
      email: insertedApp.email,
      verificationUrl,
    })

    // Envoi en tâche d'arrière-plan sans bloquer la réponse rapide
    sendInstallerEmail({
      to: insertedApp.email,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      tag: "installer-welcome-verification",
    }).catch((emailErr) => {
      console.error("[installer register] Échec envoi email de vérification:", emailErr)
    })

    return NextResponse.json({
      success: true,
      applicationId: insertedApp.id,
      message:
        "Votre demande a bien été envoyée. Un e-mail de confirmation vient de vous être envoyé pour valider votre adresse e-mail.",
    })
  } catch (error) {
    console.error("Installateur register API error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
