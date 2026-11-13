import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { getSiteBaseUrl, sendInstallerEmail } from "@/lib/installer-welcome-emails"
import {
  buildPartnerPasswordResetEmail,
  ensurePartnerAuthAccount,
  generatePartnerPasswordSetupUrl,
} from "@/lib/partner-auth-onboarding"

const requestAccessSchema = z.object({
  email: z.string().trim().email("Adresse e-mail invalide."),
})

const GENERIC_SUCCESS_MESSAGE =
  "Si un compte partenaire validé correspond à cette adresse e-mail, un lien sécurisé pour définir votre mot de passe vient d'être envoyé."

export async function POST(request: NextRequest) {
  try {
    const allowed = await checkRateLimit(request)
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives. Veuillez réessayer dans quelques minutes." },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const parsed = requestAccessSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Adresse e-mail invalide." },
        { status: 400 }
      )
    }

    const email = parsed.data.email.toLowerCase().trim()
    const supabase = createServiceRoleClient()

    const { data: partner } = await supabase
      .from("partners")
      .select("id, company_name, email")
      .eq("email", email)
      .maybeSingle()

    if (!partner) {
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE })
    }

    const baseUrl = getSiteBaseUrl(request.nextUrl.origin)

    const { userId } = await ensurePartnerAuthAccount(supabase, {
      email: partner.email,
      companyName: partner.company_name,
      partnerId: partner.id,
    })

    if (!userId) {
      return NextResponse.json(
        { error: "Impossible de préparer l'accès pour le moment. Contactez contact@aegissolaire.com." },
        { status: 500 }
      )
    }

    const setupUrl = await generatePartnerPasswordSetupUrl(supabase, {
      email: partner.email,
      baseUrl,
    })

    if (!setupUrl) {
      return NextResponse.json(
        { error: "Impossible de générer le lien sécurisé. Contactez contact@aegissolaire.com." },
        { status: 500 }
      )
    }

    const emailPayload = buildPartnerPasswordResetEmail({
      companyName: partner.company_name,
      setupUrl,
    })

    const sendRes = await sendInstallerEmail({
      to: partner.email,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      tag: "partner-password-setup",
    })

    if (!sendRes.success) {
      return NextResponse.json(
        { error: "L'envoi de l'e-mail a échoué. Contactez contact@aegissolaire.com." },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, message: GENERIC_SUCCESS_MESSAGE })
  } catch (error) {
    console.error("[partners/auth/request-access] error:", error)
    return NextResponse.json(
      { error: "Une erreur est survenue. Veuillez réessayer." },
      { status: 500 }
    )
  }
}

