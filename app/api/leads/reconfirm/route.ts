import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyLeadReconfirmToken } from "@/lib/prospect-reconfirm-email"
import { escapeEmailHtml } from "@/lib/email-templates/installer-email-layout"
import { dispatchLeadWave } from "@/lib/lead-relance-engine"

function renderReconfirmHtml(params: {
  ok: boolean
  title: string
  subtitle: string
}) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aegissolaire.com").replace(/\/+$/, "")
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeEmailHtml(params.title)} — Aegis Solaire</title>
</head>
<body style="margin:0; padding:32px 16px; background:#F8FAFC; color:#0F172A; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:540px; margin:40px auto; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(15,23,42,0.06);">
    <div style="background:#0F172A; color:#FFFFFF; padding:24px 28px;">
      <p style="margin:0 0 6px 0; font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#F59E0B; font-weight:700;">
        Aegis Solaire · Cellule Technique
      </p>
      <h1 style="margin:0; font-size:20px; line-height:1.3;">${escapeEmailHtml(params.title)}</h1>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#334155;">
        ${escapeEmailHtml(params.subtitle)}
      </p>
      <a href="${escapeEmailHtml(siteUrl)}" style="display:inline-block; background:#0F172A; color:#FFFFFF; text-decoration:none; padding:12px 20px; border-radius:8px; font-size:14px; font-weight:600;">
        Retour à Aegis Solaire
      </a>
    </div>
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
      dispatchLeadWave(lead.id, 1).catch((err) => {
        console.error("[Reconfirm] Erreur dispatch vague post-reconfirmation:", err)
      })
    }

    const cityLabel = lead.city || lead.province || "Wallonie"
    return new NextResponse(
      renderReconfirmHtml({
        ok: true,
        title: "Projet confirmé en priorité",
        subtitle: `Merci${lead.first_name ? ` ${lead.first_name}` : ""} ! Votre demande d'étude photovoltaïque à ${cityLabel} est désormais marquée comme « Reconfirmée en priorité » auprès de nos installateurs agréés RESCERT.`,
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
