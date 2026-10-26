import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { generateInstallerVerificationToken } from "@/lib/installer-verification"
import {
  buildInstallerWelcomeVerificationEmail,
  sendInstallerEmail,
  getSiteBaseUrl,
} from "@/lib/installer-welcome-emails"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body.email?.toLowerCase().trim()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: app, error } = await supabase
      .from("installer_applications")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !app) {
      return NextResponse.json(
        { error: "Aucun dossier trouvé pour cette adresse e-mail." },
        { status: 404 }
      )
    }

    const baseUrl =
      request.nextUrl.origin && !request.nextUrl.origin.includes("localhost:0")
        ? request.nextUrl.origin
        : getSiteBaseUrl()

    const verificationToken = generateInstallerVerificationToken(app.id, app.email)
    const verificationUrl = `${baseUrl}/api/installateurs/verify-email?id=${encodeURIComponent(
      app.id
    )}&token=${encodeURIComponent(verificationToken)}`

    const emailPayload = buildInstallerWelcomeVerificationEmail({
      applicationId: app.id,
      firstName: app.first_name,
      lastName: app.last_name,
      companyName: app.company_name,
      email: app.email,
      verificationUrl,
      baseUrl,
    })

    const sendRes = await sendInstallerEmail({
      to: app.email,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      tag: "installer-verification-resend-self",
    })

    if (!sendRes.success) {
      return NextResponse.json(
        { error: sendRes.error || "Erreur lors de l'envoi de l'e-mail." },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Un nouvel e-mail de confirmation a été envoyé avec succès.",
    })
  } catch (err: any) {
    console.error("[resend-verification error]:", err)
    return NextResponse.json(
      { error: err.message || "Erreur interne lors du renvoi." },
      { status: 500 }
    )
  }
}
