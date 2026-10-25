import { Resend } from "resend"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

/** Liste d’e-mails installateurs (virgule). Ex. : "a@x.be,b@y.be" */
function getEnvPartnerAlertRecipients(): string[] {
  const raw = process.env.PARTNER_LEAD_ALERT_EMAILS ?? ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.includes("@"))
}

function dashboardUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aegissolaire.com").replace(/\/$/, "")
  return `${base}/partenaires`
}

const SURFACE_TYPE_LABELS: Record<string, string> = {
  toiture: "Toiture",
  parking: "Parking",
  terrain: "Terrain",
  friche: "Friche",
}

const GRD_LABELS: Record<string, string> = {
  ores: "Ores",
  resa: "Resa",
  aieg: "AIEG",
  rew: "REW",
  fluvius: "Fluvius",
  unknown: "Je ne sais pas",
}

export type PartnerLeadTeaserPayload = {
  targetEmails: string[]
  segment?: string
  province: string
  provinceFreeText?: string | null
  surfaceType: string
  surfaceArea: number
  annualElectricityBill: number
  grd: string | null | undefined
  /** Texte déjà sanitizé côté appelant ; ne pas repasser d’identifiants. */
  projectDetails: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildPartnerLeadTeaserContent(payload: PartnerLeadTeaserPayload): {
  subject: string
  text: string
  html: string
} {
  const provinceLabel = getProvinceDisplayLabel(payload.province, payload.provinceFreeText)
  const typeLabel = SURFACE_TYPE_LABELS[payload.surfaceType] ?? payload.surfaceType
  const grdKey = payload.grd ?? "unknown"
  const grdLabel = GRD_LABELS[grdKey] ?? (payload.grd ?? "—")
  const facture = `${payload.annualElectricityBill.toLocaleString("fr-BE")} € HT / an`
  const surface = `${payload.surfaceArea.toLocaleString("fr-BE")} m²`
  const precisions =
    payload.projectDetails && payload.projectDetails.trim() !== ""
      ? payload.projectDetails.trim()
      : "—"
  const ctaUrl = dashboardUrl()

  const subject = `🚨 Nouveau Lead B2B Solaire disponible - ${provinceLabel}`

  const text = `Un nouveau projet est disponible sur Aegis Solaire.

Caractéristiques :
- Type : ${typeLabel}
- Surface : ${surface}
- Province : ${provinceLabel}
- Facture électrique estimée : ${facture}
- GRD : ${grdLabel}
- Précisions : ${precisions}

Débloquer ce lead complet (Se connecter au Dashboard) -> ${ctaUrl}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111815; background-color: #FAF8F5;">
  <div style="background-color: #FFFFFF; border: 1px solid #E2DDD3; border-radius: 6px; padding: 24px;">
    <h2 style="color: #0B2B22; margin-top: 0; font-size: 18px;">Nouveau projet certifié — Aegis Solaire</h2>
    <p style="color: #525E59; font-size: 14px;">Un nouveau projet est disponible pour déblocage sur la marketplace :</p>
    <ul style="line-height: 1.8; font-size: 14px; color: #111815;">
      <li><strong>Type :</strong> ${escapeHtml(typeLabel)}</li>
      <li><strong>Surface :</strong> <span style="font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums;">${escapeHtml(surface)}</span></li>
      <li><strong>Province :</strong> ${escapeHtml(provinceLabel)}</li>
      <li><strong>Facture estimée :</strong> <span style="font-family: ui-monospace, monospace; font-variant-numeric: tabular-nums;">${escapeHtml(facture)}</span></li>
      <li><strong>GRD :</strong> ${escapeHtml(grdLabel)}</li>
      <li><strong>Précisions :</strong> ${escapeHtml(precisions).replace(/\n/g, "<br/>")}</li>
    </ul>
    <div style="margin-top: 24px; text-align: center;">
      <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background-color: #0B2B22; color: #FAF8F5; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">
        Débloquer ce dossier sur le Dashboard &rarr;
      </a>
    </div>
    <p style="margin-top: 20px; color: #525E59; font-size: 11px; text-align: center;">
      Tiers de Confiance Photovoltaïque Wallon · Agrément RESCERT
    </p>
  </div>
</body>
</html>
`.trim()

  return { subject, text, html }
}

/**
 * Envoie le teaser anonymisé aux destinataires ciblés (depuis DB + fallback env).
 */
export async function sendPartnerLeadTeaserEmails(payload: PartnerLeadTeaserPayload): Promise<void> {
  const envRecipients = getEnvPartnerAlertRecipients()
  const recipients = Array.from(new Set([...payload.targetEmails, ...envRecipients]))

  if (recipients.length === 0) {
    console.log(
      "[Partner teaser] Aucun destinataire BDD ni ENV trouvé — e-mail d’alerte non envoyé."
    )
    return
  }

  const { subject, text, html } = buildPartnerLeadTeaserContent(payload)

  if (!resendApiKey) {
    console.log("[Partner teaser] RESEND_API_KEY non définie — e-mail simulé:", {
      to: recipients,
      subject,
    })
    return
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    replyTo: replyToEmail,
    subject,
    text,
    html,
  })

  if (error) {
    console.error("[Partner teaser] Resend error:", error)
    return
  }
}
