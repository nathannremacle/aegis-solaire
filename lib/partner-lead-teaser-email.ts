import { Resend } from "resend"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"

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
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <p>Un nouveau projet est disponible sur <strong>Aegis Solaire</strong>.</p>
  <p><strong>Caractéristiques :</strong></p>
  <ul style="line-height: 1.6;">
    <li>Type : ${escapeHtml(typeLabel)}</li>
    <li>Surface : ${escapeHtml(surface)}</li>
    <li>Province : ${escapeHtml(provinceLabel)}</li>
    <li>Facture électrique estimée : ${escapeHtml(facture)}</li>
    <li>GRD : ${escapeHtml(grdLabel)}</li>
    <li>Précisions : ${escapeHtml(precisions).replace(/\n/g, "<br/>")}</li>
  </ul>
  <p style="margin-top: 24px;">
    <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background: #112f4b; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">
      Débloquer ce lead complet (Se connecter au Dashboard)
    </a>
  </p>
  <p style="margin-top: 16px; font-size: 13px; color: #666;">
    <a href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaUrl)}</a>
  </p>
  <p style="margin-top: 24px; color: #666; font-size: 12px;">E-mail automatique — aucune donnée nominative du prospect n’est incluse.</p>
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
    subject,
    text,
    html,
  })

  if (error) {
    console.error("[Partner teaser] Resend error:", error)
    return
  }
}
