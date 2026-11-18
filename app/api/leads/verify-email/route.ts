import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyProspectEmailVerifyToken } from "@/lib/prospect-confirmation-email"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderHtmlPage(params: {
  ok: boolean
  title: string
  message: string
}): string {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
  const badgeBg = params.ok ? "#E8F2ED" : "#FEF2F2"
  const badgeColor = params.ok ? "#1D5D45" : "#991B1B"
  const badgeText = params.ok ? "Adresse e-mail confirmée" : "Lien invalide ou expiré"

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)} — Aegis Solaire</title>
</head>
<body style="margin:0;padding:32px 16px;background-color:#EEF2F4;font-family:Arial,Helvetica,sans-serif;color:#142D42;">
  <div style="max-width:520px;margin:40px auto;background:#FFFFFF;border:1px solid #DCE5EB;border-radius:10px;padding:28px;">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${badgeBg};color:${badgeColor};font-size:12px;font-weight:bold;">
      ${escapeHtml(badgeText)}
    </span>
    <h1 style="margin:14px 0 8px 0;font-size:22px;line-height:1.25;color:#142D42;">
      ${escapeHtml(params.title)}
    </h1>
    <p style="margin:0 0 22px 0;font-size:15px;line-height:1.5;color:#4D6374;">
      ${escapeHtml(params.message)}
    </p>
    <a href="${escapeHtml(baseUrl)}" style="display:inline-block;background:#142D42;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:bold;padding:11px 18px;border-radius:6px;">
      Retourner sur Aegis Solaire
    </a>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const id = sp.get("id")?.trim() || ""
  const token = sp.get("token")?.trim() || ""

  if (!id || !token) {
    return new NextResponse(
      renderHtmlPage({
        ok: false,
        title: "Lien de confirmation incomplet",
        message: "Utilisez directement le bouton figurant dans l'e-mail récapitulatif Aegis Solaire.",
      }),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  const supabase = createServiceRoleClient()
  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, email, first_name, lead_score, email_verified, qualification_metadata")
    .eq("id", id)
    .maybeSingle()

  if (error || !lead || !lead.email) {
    return new NextResponse(
      renderHtmlPage({
        ok: false,
        title: "Dossier introuvable",
        message: "Ce lien de confirmation ne correspond à aucun dossier actif.",
      }),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  if (!verifyProspectEmailVerifyToken(lead.id, lead.email, token)) {
    return new NextResponse(
      renderHtmlPage({
        ok: false,
        title: "Signature de lien invalide",
        message: "Ce lien de confirmation n'est pas valide. Contactez contact@aegissolaire.com si besoin.",
      }),
      { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }

  if (!lead.email_verified) {
    const nowIso = new Date().toISOString()
    const meta =
      lead.qualification_metadata && typeof lead.qualification_metadata === "object"
        ? (lead.qualification_metadata as Record<string, any>)
        : {}
    const prevVerifs =
      meta.verifications && typeof meta.verifications === "object" ? meta.verifications : {}
    const prevBadges = Array.isArray(prevVerifs.trustBadges)
      ? (prevVerifs.trustBadges as string[])
      : []

    const nextBadges = prevBadges.includes("E-mail confirmé par le prospect")
      ? prevBadges
      : [...prevBadges, "E-mail confirmé par le prospect"]

    await supabase
      .from("leads")
      .update({
        email_verified: true,
        email_verified_at: nowIso,
        email_verification_method: "confirmation_link",
        email_delivery_status: "delivered",
        lead_score: Math.min(100, (Number(lead.lead_score) || 50) + 10),
        qualification_metadata: {
          ...meta,
          verifications: {
            ...prevVerifs,
            emailProof: {
              verified: true,
              method: "confirmation_link",
              verifiedAt: nowIso,
            },
            emailDelivery: {
              status: "delivered",
              at: nowIso,
            },
            trustBadges: nextBadges,
          },
        },
        updated_at: nowIso,
      })
      .eq("id", lead.id)
  }

  const firstName = lead.first_name?.trim() || "Bonjour"
  return new NextResponse(
    renderHtmlPage({
      ok: true,
      title: `Merci ${firstName}, votre e-mail est certifié`,
      message:
        "Votre adresse e-mail est désormais marquée comme vérifiée auprès des installateurs partenaires RESCERT pour la transmission écrite de vos devis.",
    }),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}
