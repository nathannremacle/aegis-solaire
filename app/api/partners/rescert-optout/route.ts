import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  normalizeOptoutEmail,
  verifyRescertOptoutToken,
} from "@/lib/rescert-optout-tokens"
import { escapeEmailHtml, getEmailSiteBaseUrl } from "@/lib/email-templates/installer-email-layout"

export const dynamic = "force-dynamic"

function renderOptoutHtmlPage({
  title,
  message,
  email,
  isError = false,
}: {
  title: string
  message: string
  email?: string
  isError?: boolean
}): string {
  const baseUrl = getEmailSiteBaseUrl()
  const badgeBg = isError ? "#FFF1F0" : "#E8F2ED"
  const badgeColor = isError ? "#9A2F2B" : "#1D5D45"
  const badgeLabel = isError ? "Lien invalide" : "Préférence enregistrée"

  return `<!DOCTYPE html>
<html lang="fr-BE">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeEmailHtml(title)} — Aegis Solaire</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #EEF2F4; color: #142D42; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #DCE5EB; border-radius: 14px; padding: 28px;">
    <img src="${escapeEmailHtml(baseUrl)}/logo.png" alt="Aegis Solaire" width="132" height="72" style="display: block; width: 132px; height: 72px; margin-bottom: 16px;" />
    <span style="display: inline-block; padding: 4px 10px; border-radius: 5px; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 12px; font-weight: bold;">${escapeEmailHtml(badgeLabel)}</span>
    <h1 style="margin: 12px 0 8px 0; font-size: 24px; line-height: 1.2; color: #142D42;">${escapeEmailHtml(title)}</h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #142D42;">${escapeEmailHtml(message)}</p>
    ${email ? `<p style="margin: 0 0 18px 0; font-size: 13px; color: #4D6374;">Adresse concernée : <strong style="color: #142D42;">${escapeEmailHtml(email)}</strong></p>` : ""}
    <div style="padding-top: 16px; border-top: 1px solid #E6EDF1; font-size: 13px; color: #4D6374;">
      Support partenaires : <a href="mailto:contact@aegissolaire.com" style="color: #194767; text-decoration: underline;">contact@aegissolaire.com</a> ·
      <a href="${escapeEmailHtml(baseUrl)}/partenaires" style="color: #194767; text-decoration: underline;">Portail Aegis Solaire</a>
    </div>
  </div>
</body>
</html>`
}

async function recordOptout(email: string) {
  const supabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from("audit_log")
    .select("id")
    .eq("action", "RESCERT_OUTREACH_OPTOUT")
    .eq("entity_id", email)
    .limit(1)

  if (!existing || existing.length === 0) {
    await supabase.from("audit_log").insert({
      admin_email: "system@aegissolaire.com",
      action: "RESCERT_OUTREACH_OPTOUT",
      entity_type: "rescert_outreach",
      entity_id: email,
      details: { optedOutAt: new Date().toISOString(), source: "1_click_link" },
    })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = normalizeOptoutEmail(searchParams.get("email") || "")
  const token = (searchParams.get("token") || "").trim()

  if (!email || !verifyRescertOptoutToken(email, token)) {
    return new NextResponse(
      renderOptoutHtmlPage({
        title: "Lien de désinscription invalide",
        message:
          "Ce lien de désinscription est incomplet ou invalide. Vous pouvez nous écrire directement à contact@aegissolaire.com pour retirer immédiatement votre adresse.",
        isError: true,
      }),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  try {
    await recordOptout(email)
  } catch (err) {
    console.error("[rescert-optout] DB record error:", err)
  }

  return new NextResponse(
    renderOptoutHtmlPage({
      title: "Vous ne recevrez plus nos invitations réseau",
      message:
        "Votre demande a bien été prise en compte immédiatement. Aucun autre courrier d'invitation RESCERT ne sera envoyé à cette adresse.",
      email,
    }),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = normalizeOptoutEmail(searchParams.get("email") || "")
  const token = (searchParams.get("token") || "").trim()

  if (!email || !verifyRescertOptoutToken(email, token)) {
    return NextResponse.json({ error: "Jeton invalide" }, { status: 400 })
  }

  try {
    await recordOptout(email)
  } catch (err) {
    console.error("[rescert-optout] POST error:", err)
  }

  return NextResponse.json({ ok: true, email })
}
