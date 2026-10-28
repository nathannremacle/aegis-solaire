import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

export async function POST(request: NextRequest) {
  try {
    const user = await getAdminUser()
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { toEmail, subject, html, text, installerName, companyName } = body

    if (!toEmail || !toEmail.includes("@")) {
      return NextResponse.json(
        { error: "Adresse e-mail du destinataire invalide" },
        { status: 400 }
      )
    }

    if (!subject || !html) {
      return NextResponse.json(
        { error: "L'objet et le contenu de l'e-mail sont requis" },
        { status: 400 }
      )
    }

    if (!resendApiKey) {
      console.warn("[invite-email] RESEND_API_KEY absente - simulation de l'envoi vers", toEmail)
      return NextResponse.json({
        success: true,
        simulated: true,
        message: "E-mail simulé avec succès (clé Resend non configurée en local)",
      })
    }

    const resend = new Resend(resendApiKey)
    const formattedFrom = `Direction des Partenariats — Aegis Solaire <${fromEmail}>`

    const { data: resendData, error: sendErr } = await resend.emails.send({
      from: formattedFrom,
      to: [toEmail.trim()],
      replyTo: replyToEmail,
      subject: subject.trim(),
      html,
      text: text || undefined,
    })

    if (sendErr) {
      console.error("[invite-email] Erreur Resend:", sendErr)
      return NextResponse.json(
        { error: `Erreur Resend : ${sendErr.message}` },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: resendData?.id,
      recipient: toEmail,
      installerName,
      companyName,
    })
  } catch (err: any) {
    console.error("[invite-email] Exception:", err)
    return NextResponse.json(
      { error: err.message || "Erreur serveur lors de l'envoi de l'invitation" },
      { status: 500 }
    )
  }
}
