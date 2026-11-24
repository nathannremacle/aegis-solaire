import { NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { buildInstallerReferralLaunchEmail } from "@/lib/email-templates/installer-referral-launch"
import { getPartnerNotificationMode } from "@/lib/partner-notification-prefs"
import { buildPartnerNotificationUrls } from "@/lib/partner-notification-tokens"
import { ensurePartnerReferralCode } from "@/lib/partner-referrals"
import { isDevTestPartner, isUnreachableMockEmail } from "@/lib/lead-relance-engine"

export const dynamic = "force-dynamic"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface EligibleReferralPartner {
  id: string
  company_name: string | null
  email: string
  credits: number | null
  referral_code: string | null
  hasPurchased: boolean
}

async function getEligibleReferralCampaignPartners(): Promise<EligibleReferralPartner[]> {
  const supabase = createServiceRoleClient()

  const [{ data: partners, error }, { data: purchaseRows }] = await Promise.all([
    supabase
      .from("partners")
      .select(
        "id, company_name, email, credits, referral_code, target_surfaces, is_test, email_notifications_enabled"
      )
      .order("created_at", { ascending: false }),
    supabase.from("lead_purchases").select("partner_id"),
  ])

  if (error || !partners) return []

  const buyerPartnerIds = new Set(
    (purchaseRows || [])
      .map((row: { partner_id?: string | null }) => row.partner_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )

  return partners
    .filter((p: any) => {
      if (!p.email || isUnreachableMockEmail(p.email)) return false
      if (isDevTestPartner(p)) return false
      if (getPartnerNotificationMode(p) === "none") return false
      return true
    })
    .map((p: any) => ({
      id: p.id,
      company_name: p.company_name ?? null,
      email: p.email,
      credits: typeof p.credits === "number" ? p.credits : Number(p.credits ?? 0),
      referral_code: p.referral_code ?? null,
      hasPurchased: buyerPartnerIds.has(p.id),
    }))
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 })
  }

  const eligible = await getEligibleReferralCampaignPartners()
  const activeBuyers = eligible.filter((p) => p.hasPurchased)
  const preview = buildInstallerReferralLaunchEmail({
    companyName: "Votre Entreprise Solaire",
    referralCode: "AEGIS-EXEMPL",
    credits: 3,
  })

  return NextResponse.json({
    subject: preview.subject,
    html: preview.html,
    text: preview.text,
    allEligibleCount: eligible.length,
    activeBuyerCount: activeBuyers.length,
    recipientsPreview: eligible.slice(0, 12).map((p) => ({
      id: p.id,
      companyName: p.company_name || "Partenaire RESCERT",
      email: p.email,
      credits: p.credits ?? 0,
      hasPurchased: p.hasPurchased,
    })),
  })
}

export async function POST(request: Request) {
  const admin = await getAdminUser()
  if (!admin) {
    return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 })
  }

  let body: {
    mode?: "test" | "broadcast"
    segment?: "all" | "buyers_only"
    testEmail?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Requête JSON invalide" }, { status: 400 })
  }

  const mode = body.mode === "broadcast" ? "broadcast" : "test"
  const segment = body.segment === "buyers_only" ? "buyers_only" : "all"

  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY manquante dans l'environnement serveur." },
      { status: 500 }
    )
  }

  const resend = new Resend(resendApiKey)
  const siteBaseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com"
  ).replace(/\/$/, "")

  if (mode === "test") {
    const targetEmail = (body.testEmail || admin.email || "").trim()
    if (!targetEmail || !targetEmail.includes("@")) {
      return NextResponse.json({ error: "Adresse e-mail de test invalide" }, { status: 400 })
    }

    const rendered = buildInstallerReferralLaunchEmail({
      companyName: "Installateur Test Aegis Solaire",
      referralCode: "AEGIS-TEST01",
      credits: 3,
      baseUrl: siteBaseUrl,
    })

    const sendRes = await resend.emails.send({
      from: `Aegis Solaire — Équipe Partenaires <${fromEmail}>`,
      to: targetEmail,
      replyTo: replyToEmail,
      subject: `[TEST] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: "category", value: "partner-referral-launch-test" }],
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

  // Diffusion réelle aux installateurs opt-in selon le segment choisi
  const allEligible = await getEligibleReferralCampaignPartners()
  const recipients =
    segment === "buyers_only" ? allEligible.filter((p) => p.hasPurchased) : allEligible

  if (recipients.length === 0) {
    return NextResponse.json({
      success: true,
      mode: "broadcast",
      segment,
      sentCount: 0,
      failedCount: 0,
      message: "Aucun partenaire éligible trouvé pour ce segment.",
    })
  }

  const supabase = createServiceRoleClient()
  let sentCount = 0
  let failedCount = 0

  for (let i = 0; i < recipients.length; i++) {
    const partner = recipients[i]
    const referralCode = await ensurePartnerReferralCode(
      supabase,
      partner.id,
      partner.company_name
    )

    const rendered = buildInstallerReferralLaunchEmail({
      partnerId: partner.id,
      companyName: partner.company_name,
      referralCode,
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
        tags: [{ name: "category", value: "partner-referral-launch" }],
      })

      if (res.error) {
        failedCount++
        console.error(`[Referral Campaign Broadcast] Erreur pour ${partner.email}:`, res.error)
      } else {
        sentCount++
      }
    } catch (err) {
      failedCount++
      console.error(`[Referral Campaign Broadcast] Exception pour ${partner.email}:`, err)
    }

    if (i < recipients.length - 1) {
      await sleep(250)
    }
  }

  try {
    await supabase.from("audit_log").insert({
      admin_email: admin.email || "admin@aegissolaire.com",
      action: "PARTNER_REFERRAL_CAMPAIGN_SENT",
      entity_type: "partners",
      details: {
        segment,
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
    segment,
    sentCount,
    failedCount,
    totalEligible: recipients.length,
    message: `E-mail parrainage envoyé avec succès à ${sentCount} partenaire(s)${failedCount > 0 ? ` (${failedCount} échec(s))` : ""}.`,
  })
}
