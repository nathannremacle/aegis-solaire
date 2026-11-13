import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit-log"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const customSubject = typeof body?.subject === "string" ? body.subject.trim() : ""
  const customMessage = typeof body?.message === "string" ? body.message.trim() : ""

  const supabase = createServiceRoleClient()
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, first_name, last_name, email, postal_code, city, site_address, admin_notes, qualification_metadata"
    )
    .eq("id", id)
    .single()

  if (fetchError || !lead) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
  }

  if (!lead.email || !lead.email.includes("@")) {
    return NextResponse.json({ error: "Ce lead ne possède pas d'adresse e-mail valide" }, { status: 400 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY non configurée sur le serveur" },
      { status: 500 }
    )
  }

  const firstName = (lead.first_name || "").trim() || "Bonjour"
  const locality = [lead.postal_code, lead.city].filter(Boolean).join(" ") || "Wallonie"
  const currentStreet = (lead.site_address || "").trim()

  const defaultSubject = `Précision requise pour votre étude solaire (${locality}) — Aegis Solaire`
  const defaultBody = `Bonjour ${firstName},

Nous finalisons la vérification technique de votre projet photovoltaïque situé sur ${locality} afin de sélectionner les installateurs certifiés RESCERT les plus adaptés.

Pour réaliser le repérage satellite préalable de votre toiture et établir un dimensionnement fiable, il nous manque le numéro exact de votre habitation${currentStreet ? ` (vous aviez indiqué « ${currentStreet} »)` : ""}.

Pourriez-vous simplement répondre à cet e-mail en nous confirmant votre adresse complète (rue et numéro) ?

Dès réception, nous validons votre dossier dans les plus brefs délais.

Bien cordialement,
La Cellule Technique Aegis Solaire
contact@aegissolaire.com`

  const finalSubject = customSubject || defaultSubject
  const finalTextBody = customMessage || defaultBody

  const textWithFooter = `${finalTextBody}

--
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
Confidentialité & RGPD : dpo@aegissolaire.com`

  const paragraphsHtml = finalTextBody
    .split(/\n{2,}/)
    .map(
      (p: string) =>
        `<p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.6; color: #0F172A;">${escapeHtml(
          p
        ).replace(/\n/g, "<br/>")}</p>`
    )
    .join("")

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(finalSubject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border-radius: 14px; border: 1px solid #E2E8F0; border-top: 4px solid #0F172A; overflow: hidden;">
          <tr>
            <td style="background-color: #0F172A; padding: 22px 28px;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: -0.4px;">Aegis Solaire</h1>
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.9px; font-weight: 600;">Cellule Technique · Vérification de dossier</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              ${paragraphsHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #F1F5F9; padding: 16px 28px; border-top: 1px solid #E2E8F0; font-size: 11px; line-height: 1.5; color: #64748B;">
              Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const fromEmail = process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com"
  const resend = new Resend(resendApiKey)
  const sendRes = await resend.emails.send({
    from: fromEmail,
    to: lead.email,
    replyTo: "contact@aegissolaire.com",
    subject: finalSubject,
    text: textWithFooter,
    html,
  })

  if (sendRes.error) {
    console.error("[request-address] Resend error:", sendRes.error)
    return NextResponse.json(
      { error: sendRes.error.message || "Échec d'envoi Resend" },
      { status: 500 }
    )
  }

  const nowIso = new Date().toISOString()
  const stamp = new Date().toLocaleString("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
  const noteEntry = `[${stamp}] Demande de précision d'adresse envoyée par e-mail à ${lead.email}.`
  const nextNotes = lead.admin_notes ? `${lead.admin_notes}\n${noteEntry}` : noteEntry
  const meta = (lead.qualification_metadata as Record<string, unknown> | null) ?? {}

  await supabase
    .from("leads")
    .update({
      admin_notes: nextNotes,
      qualification_metadata: {
        ...meta,
        addressRequestSentAt: nowIso,
        addressRequestSentBy: user.email,
      },
      updated_at: nowIso,
    })
    .eq("id", id)

  await logAudit({
    adminEmail: user.email!,
    action: "lead_address_request_sent",
    entityType: "lead",
    entityId: id,
    details: { to: lead.email, subject: finalSubject },
  })

  return NextResponse.json({
    success: true,
    sentAt: nowIso,
    updatedNotes: nextNotes,
  })
}

