import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { evaluateLeadPublishability } from "@/lib/lead-quality"
import { dispatchLeadWave } from "@/lib/lead-relance-engine"
import { verifyLeadValidationToken } from "@/lib/notify-admin-lead"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderResponseHtml({
  status,
  title,
  subtitle,
  leadSummary,
  leadId,
}: {
  status: "success" | "already_validated" | "error"
  title: string
  subtitle: string
  leadSummary?: {
    name: string
    segment: string
    score: number | null
    credits: number | null
    location: string
  }
  leadId?: string
}): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
  const adminUrl = leadId ? `${baseUrl}/admin/leads?leadId=${encodeURIComponent(leadId)}` : `${baseUrl}/admin/leads`
  const triageUrl = `${baseUrl}/admin/leads?view=triage`

  const isSuccess = status === "success"
  const isAlready = status === "already_validated"

  const iconText = isSuccess ? "Dossier validé" : isAlready ? "Information" : "Erreur"
  const badgeBg = isSuccess ? "#ECFDF5" : isAlready ? "#EFF6FF" : "#FEF2F2"
  const badgeColor = isSuccess ? "#065F46" : isAlready ? "#1E40AF" : "#991B1B"
  const badgeBorder = isSuccess ? "#A7F3D0" : isAlready ? "#BFDBFE" : "#FECACA"

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Aegis Solaire</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="max-width: 520px; width: 100%; margin: 0 auto;">
    
    <div style="background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      
      <!-- En-tête -->
      <div style="background-color: #FAFAFA; padding: 18px 24px; border-bottom: 1px solid #E5E7EB;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #4B5563;">
          Aegis Solaire · Modération des leads
        </span>
      </div>

      <!-- Corps -->
      <div style="padding: 28px 24px; text-align: left;">
        
        <div style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; margin-bottom: 14px;">
          ${escapeHtml(iconText)}
        </div>

        <h1 style="color: #111827; font-size: 20px; font-weight: 700; margin: 0 0 6px 0;">
          ${escapeHtml(title)}
        </h1>
        
        <p style="color: #4B5563; font-size: 14px; margin: 0 0 20px 0; line-height: 1.5;">
          ${escapeHtml(subtitle)}
        </p>

        ${
          leadSummary
            ? `<div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 14px 16px; margin-bottom: 20px; font-size: 13px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                  <tr>
                    <td style="padding: 3px 0; color: #6B7280;">Contact</td>
                    <td align="right" style="padding: 3px 0; font-weight: 600; color: #111827;">${escapeHtml(leadSummary.name)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0; color: #6B7280;">Segment</td>
                    <td align="right" style="padding: 3px 0; color: #111827;">${escapeHtml(leadSummary.segment)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0; color: #6B7280;">Score de qualification</td>
                    <td align="right" style="padding: 3px 0; font-family: monospace; font-weight: 600; color: #065F46;">${leadSummary.score != null ? `${leadSummary.score}/100` : "–"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0; color: #6B7280;">Valeur marketplace</td>
                    <td align="right" style="padding: 3px 0; font-family: monospace; font-weight: 600; color: #111827;">${leadSummary.credits != null ? `${leadSummary.credits} crédits` : "–"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 3px 0; color: #6B7280;">Localisation</td>
                    <td align="right" style="padding: 3px 0; color: #111827;">${escapeHtml(leadSummary.location)}</td>
                  </tr>
                </table>
              </div>`
            : ""
        }

        <!-- Actions -->
        <div>
          <a href="${adminUrl}" style="display: block; background-color: #0F172A; color: #FFFFFF; font-weight: 600; font-size: 13px; padding: 11px 20px; border-radius: 6px; text-decoration: none; text-align: center; margin-bottom: 8px;">
            Consulter le dossier dans le dashboard admin →
          </a>
          <a href="${triageUrl}" style="display: block; font-size: 12px; color: #6B7280; text-align: center; text-decoration: underline;">
            Accéder à la file de triage
          </a>
        </div>

      </div>

      <!-- Bas de page -->
      <div style="background-color: #FAFAFA; border-top: 1px solid #E5E7EB; padding: 10px 24px; font-size: 11px; color: #9CA3AF; text-align: center;">
        Signature cryptographique sécurisée HMAC-SHA256
      </div>

    </div>

  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const token = searchParams.get("token")

  if (!id || !token) {
    return new NextResponse(
      renderResponseHtml({
        status: "error",
        title: "Paramètres manquants",
        subtitle: "Le lien de validation est incomplet ou invalide.",
      }),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const isValidToken = verifyLeadValidationToken(id, token)
  if (!isValidToken) {
    return new NextResponse(
      renderResponseHtml({
        status: "error",
        title: "Lien expiré ou non autorisé",
        subtitle: "Ce lien de validation rapide est invalide ou a expiré (validité 14 jours). Connectez-vous à l'administration pour valider ce dossier.",
        leadId: id,
      }),
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const admin = createServiceRoleClient()

  const { data: lead, error: fetchError } = await admin
    .from("leads")
    .select("id, province, surface_area, surface_type, annual_electricity_bill, segment, first_name, last_name, email, phone, company, marketplace_status, lead_score, credit_cost")
    .eq("id", id)
    .single()

  if (fetchError || !lead) {
    return new NextResponse(
      renderResponseHtml({
        status: "error",
        title: "Dossier introuvable",
        subtitle: "Le dossier correspondant à cet identifiant n'existe pas ou a été archivé.",
        leadId: id,
      }),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const fullName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || lead.company || "Dossier prospect"
  const location = lead.province || "Wallonie"

  if (lead.marketplace_status === "available") {
    return new NextResponse(
      renderResponseHtml({
        status: "already_validated",
        title: "Dossier déjà validé",
        subtitle: `Le lead de ${fullName} est déjà actif et visible par les installateurs partenaires sur la marketplace.`,
        leadSummary: {
          name: fullName,
          segment: lead.segment === "B2B" ? "B2B Professionnel" : "B2C Résidentiel",
          score: lead.lead_score,
          credits: lead.credit_cost,
          location,
        },
        leadId: id,
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const qualityCheck = evaluateLeadPublishability(lead)
  if (!qualityCheck.isPublishable) {
    return new NextResponse(
      renderResponseHtml({
        status: "error",
        title: "Critères de qualité insuffisants",
        subtitle: `Ce dossier ne respecte pas les critères minimaux de publication pour la marketplace : ${qualityCheck.missingFields.join(", ")}. Ouvrez-le dans l'admin pour le corriger.`,
        leadId: id,
      }),
      { status: 422, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const { error: updateError } = await admin
    .from("leads")
    .update({ marketplace_status: "available" })
    .eq("id", id)

  if (updateError) {
    console.error("[Quick Validate Email] Erreur mise à jour lead:", updateError)
    return new NextResponse(
      renderResponseHtml({
        status: "error",
        title: "Erreur technique",
        subtitle: "Une erreur est survenue lors de la mise à jour du dossier. Réessayez depuis l'interface admin.",
        leadId: id,
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  try {
    await admin.from("audit_log").insert({
      admin_email: "mrnathanrem@gmail.com",
      action: "publish_lead_from_email_link",
      entity_type: "leads",
      entity_id: id,
      details: {
        new_status: "available",
        lead_name: fullName,
        quality_score: qualityCheck.score,
        validated_at: new Date().toISOString(),
      },
    })
  } catch (auditErr) {
    console.warn("[Quick Validate Email] Audit log insertion failed:", auditErr)
  }

  try {
    void dispatchLeadWave(id, 1).catch((err) =>
      console.error("[Quick Validate Email] Échec dispatchLeadWave Vague 1:", err)
    )
  } catch (waveErr) {
    console.warn("[Quick Validate Email] dispatchLeadWave exception:", waveErr)
  }

  return new NextResponse(
    renderResponseHtml({
      status: "success",
      title: "Dossier validé et publié",
      subtitle: `Le lead de ${fullName} a été publié sur la marketplace. La Vague 1 d'attribution aux installateurs partenaires a été déclenchée.`,
      leadSummary: {
        name: fullName,
        segment: lead.segment === "B2B" ? "B2B Professionnel" : "B2C Résidentiel",
        score: lead.lead_score,
        credits: lead.credit_cost,
        location,
      },
      leadId: id,
    }),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}
