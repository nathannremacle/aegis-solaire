import crypto from "node:crypto"
import { Resend } from "resend"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderInstallerEmailShell,
} from "@/lib/email-templates/installer-email-layout"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

function getReconfirmSecret(): string {
  return (
    process.env.PARTNER_NOTIFY_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "aegis-solaire-lead-reconfirm-dev-fallback"
  )
}

export function createLeadReconfirmToken(leadId: string, email: string): string {
  const secret = getReconfirmSecret()
  const payload = `${leadId}:${email.toLowerCase().trim()}:reconfirm`
  return crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32)
}

export function verifyLeadReconfirmToken(
  leadId: string,
  email: string,
  token: string
): boolean {
  if (!leadId || !email || !token) return false
  const expected = createLeadReconfirmToken(leadId, email)
  if (expected.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}

export interface ProspectReconfirmPayload {
  leadId: string
  email: string
  firstName?: string | null
  city?: string | null
  province?: string | null
}

export function buildProspectReconfirmEmail(payload: ProspectReconfirmPayload): {
  subject: string
  html: string
  text: string
  confirmUrl: string
} {
  const rawName = (payload.firstName || "").trim() || "Madame, Monsieur"
  const cityLabel = (payload.city || payload.province || "Wallonie").trim()
  const baseUrl = getEmailSiteBaseUrl()
  const token = createLeadReconfirmToken(payload.leadId, payload.email)
  const confirmUrl = `${baseUrl}/api/leads/reconfirm?leadId=${encodeURIComponent(payload.leadId)}&token=${encodeURIComponent(token)}`
  const subject = `Votre étude solaire à ${cityLabel} — Relancez la mise en concurrence RESCERT en 1 clic`

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Bonjour <strong>${escapeEmailHtml(rawName)}</strong>,<br /><br />
      Il y a <span class="tabular" style="font-variant-numeric: tabular-nums;">48</span> heures, vous avez réalisé une simulation photovoltaïque pour votre bâtiment à
      <strong>${escapeEmailHtml(cityLabel)}</strong> via Aegis Solaire.
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Nous veillons sur votre dossier afin de vous obtenir <strong>le meilleur prix sans aucun compromis sur la qualité</strong>.
      Confirmez en <strong>un simple clic</strong> que votre projet est toujours d'actualité : nous relançons immédiatement la mise en concurrence auprès des installateurs certifiés <strong>RESCERT</strong> de votre secteur (matériel Tier-1 et garanties vérifiées) pour qu'ils vous soumettent leur offre la plus compétitive.
    </p>

    ${renderActionBox({
      kicker: "Validation express en 1 clic · De votre côté",
      title: "Relancer ma mise en concurrence RESCERT",
      subtext:
        "Vos coordonnées restent protégées. Dès votre confirmation, nos partenaires RESCERT locaux savent qu'ils sont comparés sur votre dossier et vous remettent leur tarif le plus juste, sans engagement.",
      ctaLabel: "Oui, obtenir mes devis comparatifs →",
      ctaUrl: confirmUrl,
    })}

    <div style="margin-top: 16px;">
      ${renderCalloutBox({
        label: "Nous sommes de votre côté — service 100 % gratuit et sans engagement",
        value:
          "Si votre projet est déjà attribué ou suspendu, vous n'avez rien à faire : ignorez simplement ce message ou écrivez-nous à contact@aegissolaire.com.",
        tone: "info",
      })}
    </div>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Nous veillons sur votre dossier à ${cityLabel} : confirmez en 1 clic pour mettre les installateurs RESCERT en concurrence et obtenir le meilleur prix sans compromis qualité.`,
    reference: "Suivi qualité 48 h",
    context: "Reconfirmation projet · Tiers de confiance",
    headline: `Votre projet solaire à ${cityLabel} est-il toujours actif ?`,
    subtitle: "Confirmation express en 1 clic · Meilleur prix & qualité Tier-1",
    statusPill: { text: "Action requise en 1 clic", tone: "warning" },
    bodyHtml,
    logoHref: baseUrl,
    footerNote: "E-mail automatique de suivi envoyé 48 h après votre demande d'étude sur Aegis Solaire.",
    footerLinks: [
      { label: "Confirmer mon projet", href: confirmUrl },
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
    ],
  })

  const text = [
    `Bonjour ${rawName},`,
    "",
    `Il y a 48 heures, vous avez demandé une étude photovoltaïque à ${cityLabel} via Aegis Solaire.`,
    "Nous veillons sur votre dossier afin de vous obtenir le meilleur prix sans aucun compromis sur la qualité (matériel Tier-1, agrément RESCERT et garanties vérifiées).",
    "Confirmez en 1 clic que votre projet est toujours d'actualité pour relancer la mise en concurrence auprès des installateurs certifiés RESCERT de votre secteur :",
    confirmUrl,
    "",
    "Nous sommes de votre côté : ce service est 100 % gratuit, sans surcoût sur vos devis et sans engagement. Si votre projet n'est plus d'actualité, ignorez simplement cet e-mail.",
    "",
    "La Cellule Technique Aegis Solaire",
    "contact@aegissolaire.com",
  ].join("\n")

  return {
    subject,
    html,
    text,
    confirmUrl,
  }
}

export async function sendProspectReconfirmEmail(
  payload: ProspectReconfirmPayload
): Promise<{ sent: boolean; error?: string }> {
  if (!payload.email) return { sent: false, error: "MISSING_PROSPECT_EMAIL" }
  if (!resendApiKey) {
    console.log(
      "[Prospect Reconfirm Email] RESEND_API_KEY non configurée — envoi ignoré en dev pour:",
      payload.email
    )
    return { sent: false, error: "MISSING_RESEND_KEY" }
  }

  try {
    const resend = new Resend(resendApiKey)
    const { subject, html, text } = buildProspectReconfirmEmail(payload)
    const res = await resend.emails.send({
      from: `Aegis Solaire — Cellule Technique <${fromEmail}>`,
      to: payload.email,
      replyTo: replyToEmail,
      subject,
      html,
      text,
    })

    if (res.error) {
      console.error("[Prospect Reconfirm Email] Erreur Resend:", res.error)
      return { sent: false, error: res.error.message }
    }
    return { sent: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "UNKNOWN_ERROR"
    console.error("[Prospect Reconfirm Email] Exception Resend:", msg)
    return { sent: false, error: msg }
  }
}
