import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { generateInstallerVerificationToken } from "@/lib/installer-verification"
import {
  buildInstallerWelcomeVerificationEmail,
  buildInstallerMarketplaceWelcomeEmail,
  sendInstallerEmail,
} from "@/lib/installer-welcome-emails"

function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAdminUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const type = body.type || "marketplace" // 'verification' | 'marketplace'

    const supabase = createServiceRoleClient()
    const { data: app, error } = await supabase
      .from("installer_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (error || !app) {
      return NextResponse.json({ error: "Candidature introuvable." }, { status: 404 })
    }

    const baseUrl =
      request.nextUrl.origin && !request.nextUrl.origin.includes("localhost:0")
        ? request.nextUrl.origin
        : getSiteBaseUrl()

    if (type === "verification") {
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
      })

      const sendRes = await sendInstallerEmail({
        to: app.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        tag: "installer-welcome-verification-resend",
      })

      return NextResponse.json({
        success: sendRes.success,
        simulated: sendRes.simulated,
        type: "verification",
        recipient: app.email,
        message: "E-mail de vérification réexpédié avec succès.",
      })
    } else {
      const marketplaceUrl = `${baseUrl}/partenaires/dashboard`
      const emailPayload = buildInstallerMarketplaceWelcomeEmail({
        applicationId: app.id,
        firstName: app.first_name,
        lastName: app.last_name,
        companyName: app.company_name,
        email: app.email,
        rescertRef: app.rescert_ref,
        marketplaceUrl,
      })

      const sendRes = await sendInstallerEmail({
        to: app.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
        tag: "installer-marketplace-welcome-resend",
      })

      return NextResponse.json({
        success: sendRes.success,
        simulated: sendRes.simulated,
        type: "marketplace",
        recipient: app.email,
        message: "E-mail de bienvenue Marketplace réexpédié avec succès.",
      })
    }
  } catch (err: any) {
    console.error("[resend-email API error]:", err)
    return NextResponse.json(
      { error: err.message || "Erreur lors du renvoi de l'e-mail." },
      { status: 500 }
    )
  }
}
