import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { buildInstallerPlatformUpdateEmail } from "@/lib/email-templates/installer-platform-update"
import { getPartnerNotificationMode } from "@/lib/partner-notification-prefs"
import { buildPartnerNotificationUrls } from "@/lib/partner-notification-tokens"
import { isDevTestPartner, isUnreachableMockEmail } from "@/lib/lead-relance-engine"

export const dynamic = "force-dynamic"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

async function getEligibleBroadcastPartners() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("partners")
    .select(
      "id, company_name, email, credits, target_surfaces, is_test, email_notifications_enabled"
    )
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return data.filter((p: any) => {
    if (!p.email || isUnreachableMockEmail(p.email)) return false
    if (isDevTestPartner(p)) return false
    if (getPartnerNotificationMode(p) === "none") return false
    return true
  })
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 })
  }

  const eligible = await getEligibleBroadcastPartners()
  const preview = buildInstallerPlatformUpdateEmail({
    companyName: "Votre Entreprise Solaire",
    credits: 3,
  })

  return NextResponse.json({
    subject: preview.subject,
    html: preview.html,
    text: preview.text,
    activeRecipientCount: eligible.length,
    recipientsPreview: eligible.slice(0, 12).map((p: any) => ({
      id: p.id,
      companyName: p.company_name,
      email: p.email,
      credits: p.credits,
    })),
  })
}

export async function POST(request: Request) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 })
  }

  let body: { mode?: "test" | "broadcast"; testEmail?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requête JSON invalide" }, { status: 400 })
  }

  const mode = body.mode === "broadcast" ? "broadcast" : "test"

  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY manquante dans l'environnement serveur." },
      { status: 500 }
    )
  }

  const resend = new Resend(resendApiKey)
  const siteBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")

  if (mode === "test") {
    const targetEmail = (body.testEmail || admin.email || "").trim()
    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json({ error: "Adresse e-mail de test invalide" }, { status: 400 })
    }

    const rendered = buildInstallerPlatformUpdateEmail({
      companyName: "Installateur Test Aegis Solaire",
      credits: 12,
      baseUrl: siteBaseUrl,
    })

    const sendRes = await resend.emails.send({
      from: `Aegis Solaire — Équipe Partenaires <${fromEmail}>`,
      to: targetEmail,
      replyTo: replyToEmail,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
    })

    if (sendRes.error) {
      return NextResponse.json({ error: sendRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mode: "test",
      sentTo: targetEmail,
      sentCount: 1,
    })
  }

  // Diffusion réelle aux installateurs actifs opt-in
  const recipients = await getEligibleBroadcastPartners()
  if (recipients.length === 0) {
    return NextResponse.json({
      success: true,
      mode: "broadcast",
      sentCount: 0,
      failedCount: 0,
      message: "Aucun partenaire éligible trouvé.",
    })
  }

  let sentCount = 0
  let failedCount = 0

  for (const partner of recipients) {
    const rendered = buildInstallerPlatformUpdateEmail({
      partnerId: partner.id,
      companyName: partner.company_name,
      credits: partner.credits,
      baseUrl: siteBaseUrl,
    })
    const notifUrls = buildPartnerNotificationUrls(siteBaseUrl, partner.id, partner.email)

    try {
      const res = await resend.emails.send({
        from: `Aegis Solaire — Équipe Partenaires <${fromEmail}>`,
        to: partner.email,
        replyTo: replyToEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        headers: {
          "List-Unsubscribe": `<${notifUrls.muteAllUrl}>, <mailto:contact@aegissolaire.com?subject=Desabonnement>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      })

      if (res.error) {
        failedCount++
        console.error(`[Announcement Broadcast] Erreur pour ${partner.email}:`, res.error)
      } else {
        sentCount++
      }
    } catch (err) {
      failedCount++
      console.error(`[Announcement Broadcast] Exception pour ${partner.email}:`, err)
    }
  }

  try {
    const supabase = createServiceRoleClient()
    await supabase.from("audit_log").insert({
      admin_email: admin.email || "admin@aegissolaire.com",
      action: "PARTNER_PLATFORM_ANNOUNCEMENT_SENT",
      entity_type: "partners",
      details: {
        sentCount,
        failedCount,
        totalEligible: recipients.length,
      },
      created_at: new Date().toISOString(),
    })
  } catch {
    // Non bloquant
  }

  return NextResponse.json({
    success: true,
    mode: "broadcast",
    sentCount,
    failedCount,
    totalEligible: recipients.length,
    message: `E-mail explicatif envoyé avec succès à ${sentCount} partenaire(s)${failedCount > 0 ? ` (${failedCount} échec(s))` : ""}.`,
  })
}
