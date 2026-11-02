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
  const adminUrl = leadId ? `${baseUrl}/admin/leads?search=${encodeURIComponent(leadId)}` : `${baseUrl}/admin/leads`
  const triageUrl = `${baseUrl}/admin/leads?view=triage`

  const isSuccess = status === "success"
  const isAlready = status === "already_validated"

  const icon = isSuccess ? "✅" : isAlready ? "ℹ️" : "❌"
  const badgeColor = isSuccess ? "#16A34A" : isAlready ? "#2563EB" : "#DC2626"
  const badgeBg = isSuccess ? "#DCFCE7" : isAlready ? "#DBEAFE" : "#FEE2E2"

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Aegis Solaire</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
  <div style="max-width: 540px; width: 100%; margin: 24px auto; padding: 16px;">
    
    <div style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4); border: 1px solid #334155;">
      
      <!-- Bandeau supérieur -->
      <div style="background-color: #0F172A; padding: 20px 24px; border-bottom: 2px solid #F59E0B; text-align: center;">
        <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #F59E0B;">
          AEGIS SOLAIRE · MODÉRATION EXPRESS
        </span>
      </div>

      <!-- Corps du message -->
      <div style="padding: 32px 28px; text-align: center;">
        
        <div style="width: 56px; height: 56px; line-height: 56px; background-color: ${badgeBg}; color: ${badgeColor}; border-radius: 50%; font-size: 26px; margin: 0 auto 16px auto; text-align: center;">
          ${icon}
        </div>

        <h1 style="color: #0F172A; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">
          ${escapeHtml(title)}
        </h1>
        
        <p style="color: #64748B; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5;">
          ${escapeHtml(subtitle)}
        </p>

        ${
          leadSummary
            ? `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: left; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748B;">Contact</span>
                  <span style="font-weight: 700; color: #0F172A;">${escapeHtml(leadSummary.name)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748B;">Segment</span>
                  <span style="font-weight: 600; color: #0F172A;">${escapeHtml(leadSummary.segment)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748B;">Score de confiance</span>
                  <span style="font-family: monospace; font-weight: 700; color: #16A34A;">${leadSummary.score != null ? `${leadSummary.score}/100` : "–"}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                  <span style="color: #64748B;">Valeur Marketplace</span>
                  <span style="font-family: monospace; font-weight: 700; color: #0F172A;">${leadSummary.credits != null ? `${leadSummary.credits} crédits` : "–"}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748B;">Localisation</span>
                  <span style="color: #0F172A;">${escapeHtml(leadSummary.location)}</span>
                </div>
              </div>`
            : ""
        }

        <!-- Actions -->
        <div>
          <a href="${adminUrl}" style="display: block; background-color: #0F172A; color: #FFFFFF; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 6px; text-decoration: none; margin-bottom: 10px;">
            Accéder à la fiche du dossier dans l'Admin →
          </a>
          <a href="${triageUrl}" style="display: inline-block; font-size: 13px; color: #64748B; text-decoration: underline;">
            Voir toute la file de triage
          </a>
        </div>

      </div>

      <!-- Bas de page -->
      <div style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 12px 24px; text-align: center; font-size: 11px; color: #94A3B8;">
        Action horodatée et sécurisée par signature cryptographique HMAC-SHA256
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

  // 1. Contrôle cryptographique strict du jeton
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

  // 2. Récupération préalable du lead
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

  // 3. Déjà validé et disponible ?
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

  // 4. Contrôle de qualité de publication
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

  // 5. Validation et passage en statut disponible
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

  // 6. Audit Log immuable
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

  // 7. Déclenchement automatique de la Vague 1 d'attribution
  try {
    void dispatchLeadWave(id, 1).catch((err) =>
      console.error("[Quick Validate Email] Échec dispatchLeadWave Vague 1:", err)
    )
  } catch (waveErr) {
    console.warn("[Quick Validate Email] dispatchLeadWave exception:", waveErr)
  }

  // 8. Retour confirmation de succès
  return new NextResponse(
    renderResponseHtml({
      status: "success",
      title: "Dossier validé et publié !",
      subtitle: `Le lead de ${fullName} a été publié avec succès sur la marketplace. La Vague 1 de notification aux installateurs certifiés partenaires a été immédiatement déclenchée.`,
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
