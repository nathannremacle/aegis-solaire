import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyLeadReconfirmToken } from "@/lib/prospect-reconfirm-email"
import { escapeEmailHtml } from "@/lib/email-templates/installer-email-layout"
import { dispatchLeadWave } from "@/lib/lead-relance-engine"

export const maxDuration = 60

function renderReconfirmHtml(params: {
  ok: boolean
  title: string
  subtitle: string
}) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aegissolaire.com").replace(/\/+$/, "")
  const badgeBg = params.ok ? "#E8F2ED" : "#FFF1F0"
  const badgeColor = params.ok ? "#1D5D45" : "#9A2F2B"
  const badgeText = params.ok ? "Mise en concurrence activée" : "Lien invalide ou expiré"

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeEmailHtml(params.title)} — Aegis Solaire</title>
</head>
<body style="margin:0; padding:32px 16px; background-color:#EEF2F4; color:#142D42; font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:540px; margin:40px auto; background:#FFFFFF; border:1px solid #DCE5EB; border-radius:14px; padding:28px;">
    <span style="display:inline-block; padding:4px 10px; border-radius:5px; background:${badgeBg}; color:${badgeColor}; font-size:12px; font-weight:bold;">
      ${escapeEmailHtml(badgeText)}
    </span>
    <p style="margin:12px 0 4px 0; font-size:13px; font-weight:bold; color:#305A76;">
      Aegis Solaire · Tiers de confiance de votre côté
    </p>
    <h1 style="margin:0 0 10px 0; font-size:22px; line-height:1.25; color:#142D42;">
      ${escapeEmailHtml(params.title)}
    </h1>
    <p style="margin:0 0 22px 0; font-size:15px; line-height:1.5; color:#4D6374;">
      ${escapeEmailHtml(params.subtitle)}
    </p>
    <a href="${escapeEmailHtml(siteUrl)}" style="display:inline-block; background:#142D42; color:#FFFFFF; text-decoration:none; padding:11px 18px; border-radius:6px; font-size:14px; font-weight:bold;">
      Retourner sur Aegis Solaire
    </a>
  </div>
</body>
</html>`
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get("leadId") || ""
    const token = searchParams.get("token") || ""

    if (!leadId || !token) {
      return new NextResponse(
        renderReconfirmHtml({
          ok: false,
          title: "Lien de confirmation incomplet",
          subtitle:
            "Le lien utilisé semble incomplet ou expiré. Pour confirmer votre projet, répondez simplement à l'e-mail reçu ou écrivez à contact@aegissolaire.com.",
        }),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }

    const admin = createServiceRoleClient()
    const { data: lead, error } = await admin
      .from("leads")
      .select("id, email, first_name, city, province, marketplace_status, reconfirmed_at, qualification_metadata")
      .eq("id", leadId)
      .single()

    if (error || !lead || !lead.email) {
      return new NextResponse(
        renderReconfirmHtml({
          ok: false,
          title: "Dossier introuvable",
          subtitle:
            "Nous n'avons pas retrouvé ce dossier. N'hésitez pas à contacter notre cellule technique à contact@aegissolaire.com.",
        }),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }

    if (!verifyLeadReconfirmToken(lead.id, lead.email, token)) {
      return new NextResponse(
        renderReconfirmHtml({
          ok: false,
          title: "Lien de sécurité invalide",
          subtitle:
            "Ce lien de confirmation n'est pas valide. Veuillez répondre directement à notre dernier e-mail ou contacter contact@aegissolaire.com.",
        }),
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }

    const nowIso = new Date().toISOString()
    const currentMeta =
      lead.qualification_metadata && typeof lead.qualification_metadata === "object"
        ? (lead.qualification_metadata as Record<string, unknown>)
        : {}

    const { error: updateErr } = await admin
      .from("leads")
      .update({
        reconfirmed_at: nowIso,
        qualification_metadata: {
          ...currentMeta,
          reconfirmed_at: nowIso,
        },
        ...(lead.marketplace_status === "available"
          ? { relance_wave: 0, last_relance_at: null }
          : {}),
      })
      .eq("id", lead.id)

    if (updateErr && (updateErr.code === "42703" || updateErr.message?.includes("reconfirmed_at"))) {
      // Fallback résilient si la migration 202611180001 n'est pas encore appliquée
      await admin
        .from("leads")
        .update({
          qualification_metadata: {
            ...currentMeta,
            reconfirmed_at: nowIso,
          },
          ...(lead.marketplace_status === "available"
            ? { relance_wave: 0, last_relance_at: null }
            : {}),
        })
        .eq("id", lead.id)
    }

    // Si le dossier est encore disponible, déclencher une vague prioritaire fraîchement reconfirmée
    if (lead.marketplace_status === "available" && !lead.reconfirmed_at) {
      try {
        await dispatchLeadWave(lead.id, 1)
      } catch (err) {
        console.error("[Reconfirm] Erreur dispatch vague post-reconfirmation:", err)
      }
    }

    const cityLabel = lead.city || lead.province || "Wallonie"
    return new NextResponse(
      renderReconfirmHtml({
        ok: true,
        title: "Mise en concurrence relancée en priorité",
        subtitle: `Merci${lead.first_name ? ` ${lead.first_name}` : ""} ! Votre dossier solaire à ${cityLabel} est relancé en priorité : nos installateurs certifiés RESCERT sont mis en concurrence pour vous remettre leur meilleur prix, sans aucun compromis sur la qualité de votre installation.`,
      }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  } catch (err) {
    console.error("[API Leads Reconfirm] Erreur:", err)
    return new NextResponse(
      renderReconfirmHtml({
        ok: false,
        title: "Erreur temporaire",
        subtitle:
          "Une erreur technique s'est produite. Veuillez contacter contact@aegissolaire.com.",
      }),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }
}
