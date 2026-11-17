import { Resend } from "resend"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderCalloutBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

export interface ProspectExclusiveMatchPayload {
  email: string
  firstName?: string | null
  city?: string | null
  province?: string | null
  estimatedPowerKwc?: number | null
  partnerCompany: string
  partnerEmail?: string | null
  partnerPhone?: string | null
}

/**
 * Construit l'e-mail de réassurance envoyé au prospect B2C lorsqu'un installateur
 * réserve l'exclusivité totale de son dossier, afin d'éviter toute confusion avec
 * les 3 devis habituels et maximiser le taux de transformation du partenaire.
 */
export function buildProspectExclusiveMatchEmail(
  payload: ProspectExclusiveMatchPayload
): {
  subject: string
  html: string
  text: string
} {
  const rawName = (payload.firstName || "").trim() || "Madame, Monsieur"
  const cityLabel = (payload.city || payload.province || "Wallonie").trim()
  const baseUrl = getEmailSiteBaseUrl()
  const kwcLabel =
    payload.estimatedPowerKwc && payload.estimatedPowerKwc > 0
      ? `${payload.estimatedPowerKwc.toString().replace(".", ",")} kWc`
      : "À confirmer sur site"

  const partnerContact = [payload.partnerPhone, payload.partnerEmail]
    .filter((v) => typeof v === "string" && v.trim() !== "")
    .join(" · ")

  const subject = `Votre projet solaire (${cityLabel}) — Partenaire RESCERT prioritaire sélectionné`

  const bodyHtml = `
    <h2 style="margin: 0 0 12px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
      Partenaire technique prioritaire sélectionné pour votre projet à ${escapeEmailHtml(cityLabel)}
    </h2>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Bonjour <strong>${escapeEmailHtml(rawName)}</strong>,<br /><br />
      Suite à l'analyse de votre demande d'étude photovoltaïque par la Cellule Technique Aegis Solaire,
      nous avons choisi de confier votre dossier en <strong>attribution prioritaire exclusive</strong> à l'un de nos
      installateurs certifiés <strong>RESCERT</strong> les mieux évalués sur votre zone géographique, plutôt que de
      diffuser vos coordonnées à de multiples plateformes commerciales.
    </p>

    ${renderSpecsTable([
      { label: "Installateur sélectionné", value: payload.partnerCompany },
      { label: "Zone d'intervention", value: cityLabel },
      { label: "Pré-dimensionnement estimé", value: kwcLabel },
      ...(partnerContact
        ? [{ label: "Coordonnées directes", value: partnerContact }]
        : []),
    ])}

    <div style="margin-top: 16px;">
      ${renderCalloutBox({
        label: "Zéro démarchage multiple · Accompagnement prioritaire",
        value: `Vos coordonnées restent confidentielles auprès de ${payload.partnerCompany}, qui dispose déjà de votre pré-dimensionnement pour établir une offre chiffrée gratuite. Si vous souhaitez néanmoins recevoir des devis complémentaires après votre premier échange, répondez simplement à cet e-mail pour élargir la demande.`,
        tone: "warning",
      })}
    </div>

    <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 1.4; color: #4D6374;">
      <strong style="color: #142D42;">${escapeEmailHtml(payload.partnerCompany)}</strong> vous contactera très prochainement afin de convenir d'un créneau d'échange.<br />
      Une question ? Répondez directement à cet e-mail ou écrivez à
      <a href="mailto:contact@aegissolaire.com" style="color: #194767; font-weight: bold; text-decoration: underline;">contact@aegissolaire.com</a>.
    </p>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `${payload.partnerCompany} (certifié RESCERT) a été sélectionné pour réaliser votre étude photovoltaïque à ${cityLabel}.`,
    reference: "Attribution prioritaire",
    context: "Sélection RESCERT exclusive",
    contextColor: "#1D5D45",
    headline: "Votre partenaire solaire prioritaire",
    subtitle: `${payload.partnerCompany} · ${cityLabel}`,
    statusPill: { text: "Dossier transmis à 1 partenaire certifié", tone: "success" },
    bodyHtml,
    logoHref: baseUrl,
    footerNote: "Vous recevez cet e-mail suite à votre demande d'étude photovoltaïque sur Aegis Solaire.",
    footerLinks: [
      { label: "Site Aegis Solaire", href: baseUrl },
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
    ],
  })

  const text = [
    `Bonjour ${rawName},`,
    "",
    `Suite à l'analyse de votre demande d'étude photovoltaïque à ${cityLabel}, la Cellule Technique Aegis Solaire a confié votre dossier en attribution prioritaire exclusive à l'installateur certifié RESCERT : ${payload.partnerCompany}.`,
    partnerContact ? `Coordonnées directes du partenaire : ${partnerContact}` : "",
    "",
    "Pourquoi cette attribution prioritaire ?",
    "- Zéro démarchage multiple : vos coordonnées restent confidentielles auprès de ce partenaire sélectionné.",
    `- Étude sur mesure : ${payload.partnerCompany} dispose déjà de votre pré-dimensionnement (${kwcLabel}).`,
    "- Liberté totale : si vous souhaitez malgré tout obtenir d'autres devis après ce premier échange, répondez simplement à cet e-mail.",
    "",
    "La Cellule Technique Aegis Solaire",
    "contact@aegissolaire.com",
  ]
    .filter(Boolean)
    .join("\n")

  return {
    subject,
    html,
    text,
  }
}

export async function sendProspectExclusiveMatchEmail(
  payload: ProspectExclusiveMatchPayload
): Promise<{ sent: boolean; error?: string }> {
  if (!payload.email) {
    return { sent: false, error: "MISSING_PROSPECT_EMAIL" }
  }

  if (!resendApiKey) {
    console.log(
      "[Prospect Exclusive Email] RESEND_API_KEY non configurée — envoi ignoré en dev pour:",
      payload.email
    )
    return { sent: false, error: "MISSING_RESEND_KEY" }
  }

  try {
    const resend = new Resend(resendApiKey)
    const { subject, html, text } = buildProspectExclusiveMatchEmail(payload)
    const res = await resend.emails.send({
      from: `Aegis Solaire — Cellule Technique <${fromEmail}>`,
      to: payload.email,
      replyTo: replyToEmail,
      subject,
      html,
      text,
    })

    if (res.error) {
      console.error("[Prospect Exclusive Email] Erreur Resend:", res.error)
      return { sent: false, error: res.error.message }
    }

    return { sent: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "UNKNOWN_ERROR"
    console.error("[Prospect Exclusive Email] Exception Resend:", msg)
    return { sent: false, error: msg }
  }
}
