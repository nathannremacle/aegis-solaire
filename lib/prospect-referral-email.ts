import { Resend } from "resend"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

export interface ProspectReferralEmailPayload {
  email: string
  firstName?: string | null
  lastName?: string | null
  leadId?: string | null
  city?: string | null
  province?: string | null
  segment?: "B2B" | "B2C" | string | null
  estimatedPowerKwc?: number | null
  partnerCompany?: string | null
}

function buildCityLabel(city?: string | null, province?: string | null): string {
  const cleanCity = (city || "").trim()
  if (cleanCity) return cleanCity
  const cleanProv = (province || "").trim()
  if (cleanProv) {
    const label = getProvinceDisplayLabel(cleanProv)
    if (label) return label
  }
  return "Wallonie"
}

export function buildProspectReferralEmail(payload: ProspectReferralEmailPayload): {
  subject: string
  html: string
  text: string
  shareUrl: string
  whatsappUrl: string
  mailtoFriendUrl: string
} {
  const rawName = (payload.firstName || "").trim() || "Madame, Monsieur"
  const cityLabel = buildCityLabel(payload.city, payload.province)
  const isB2B = (payload.segment || "").toUpperCase() === "B2B"
  const baseUrl = getEmailSiteBaseUrl()
  const shareUrl = `${baseUrl}/astuce`

  const cleanPartner = (payload.partnerCompany || "").trim()
  const kwcLabel =
    payload.estimatedPowerKwc && payload.estimatedPowerKwc > 0
      ? `${payload.estimatedPowerKwc.toString().replace(".", ",")} kWc`
      : null

  const partnerClauseHtml = cleanPartner
    ? `avec notre partenaire certifié <strong>RESCERT</strong> (<strong>${escapeEmailHtml(cleanPartner)}</strong>)`
    : `avec votre installateur certifié <strong>RESCERT</strong>`
  const partnerClauseText = cleanPartner
    ? `avec notre partenaire certifié RESCERT (${cleanPartner})`
    : `avec votre installateur certifié RESCERT`

  const kwcClauseHtml = kwcLabel
    ? ` (<span class="tabular" style="font-variant-numeric: tabular-nums;">${escapeEmailHtml(kwcLabel)}</span>)`
    : ""
  const kwcClauseText = kwcLabel ? ` (${kwcLabel})` : ""

  const shareMessageText = [
    `Petite astuce si tu envisages des panneaux solaires : ne demande pas des devis au hasard en direct.`,
    `Je suis passé par Aegis Solaire : ils mettent jusqu'à 3 installateurs certifiés RESCERT de notre région en concurrence sur le même cahier des charges Tier-1 (sans aucun compromis sur la qualité). Comme ils savent qu'ils sont comparés, ils réduisent leur marge dès le 1er devis (-18 % en moyenne).`,
    `Service 100 % gratuit, zéro centre d'appels et contact par écrit d'abord : ${shareUrl}`,
  ].join("\n\n")

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessageText)}`
  const friendMailtoSubject =
    "L'astuce panneaux solaires en Wallonie (-18 % en mettant 3 RESCERT en concurrence)"
  const mailtoFriendUrl = `mailto:?subject=${encodeURIComponent(friendMailtoSubject)}&body=${encodeURIComponent(shareMessageText)}`

  const subject = `Félicitations pour votre projet solaire à ${cityLabel} — L'astuce à partager à vos proches`
  const preheader = `Votre devis à ${cityLabel} est validé. Partagez l'astuce Aegis Solaire (${shareUrl}) pour faire économiser vos proches sans compromis qualité.`

  const escapedCity = escapeEmailHtml(cityLabel)
  const escapedShareUrl = escapeEmailHtml(shareUrl)

  const bodyHtml = `
    <p style="margin: 16px 0 12px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Bonjour <strong>${escapeEmailHtml(rawName)}</strong>,
    </p>

    <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Toutes nos félicitations pour la validation de votre projet photovoltaïque${isB2B ? " professionnel" : ""} à <strong>${escapedCity}</strong>${kwcClauseHtml} ${partnerClauseHtml}.
    </p>

    <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Chez Aegis Solaire, notre mission est d'agir <strong>de votre côté</strong> : vous avez pu comparer ou bénéficier d'une sélection rigoureuse au meilleur prix, <strong>sans aucune contrepartie sur la qualité</strong> (agrément RESCERT vérifié, matériel Tier-1, conformité RGIE et zéro surcoût sur votre devis).
    </p>

    <p style="margin: 0 0 4px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Un voisin, un collègue ou un membre de votre famille envisage aussi le solaire ? <strong>Ne les laissez pas payer le tarif plein pot en direct</strong> : partagez-leur simplement l'astuce en <span class="tabular" style="font-variant-numeric: tabular-nums;">1</span> clic.
    </p>

    ${renderFiguresBox(
      {
        label: "Économie moyenne constatée",
        value: "-18 % dès le 1er devis",
        sublabel: "Jusqu'à 1 850 € d'écart à matériel égal",
        width: "50%",
      },
      {
        label: "Le lien court à partager",
        value: "aegissolaire.com/astuce",
        sublabel: "100 % gratuit · Zéro centre d'appels",
        width: "50%",
      }
    )}

    ${renderActionBox({
      kicker: "Partage rapide en 1 clic · Sans inscription",
      title: "Faites économiser un voisin, un ami ou un collègue",
      subtext:
        "Le message est déjà pré-rédigé avec le lien de l'astuce : il vous suffit de choisir votre contact.",
      ctaLabel: "Partager l'astuce sur WhatsApp →",
      ctaUrl: whatsappUrl,
      secondaryLabel: "Envoyer l'astuce par e-mail à un proche",
      secondaryUrl: mailtoFriendUrl,
    })}

    <!-- Encadré message prêt à copier-coller (SMS, WhatsApp ou Messenger) -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin-top: 16px; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 14px; background-color: #FFF5DF; border-left: 3px solid #D69729; border-radius: 0 6px 6px 0;">
          <span style="display: block; font-size: 13px; font-weight: bold; color: #684916; line-height: 1.35;">
            Le message prêt à copier-coller (SMS, WhatsApp ou Messenger)
          </span>
          <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.5; color: #142D42;">
            «&nbsp;Petite astuce si tu envisages des panneaux solaires : ne demande pas des devis au hasard en direct. Je suis passé par Aegis Solaire : ils mettent jusqu'à <span class="tabular" style="font-variant-numeric: tabular-nums;">3</span> installateurs certifiés <strong>RESCERT</strong> de notre région en concurrence sur le même cahier des charges Tier-1 (sans aucun compromis sur la qualité). Comme ils savent qu'ils sont comparés, ils réduisent leur marge dès le <span class="tabular" style="font-variant-numeric: tabular-nums;">1</span>er devis (<span class="tabular" style="font-variant-numeric: tabular-nums;">-18&nbsp;%</span> en moyenne). Service <span class="tabular" style="font-variant-numeric: tabular-nums;">100&nbsp;%</span> gratuit, zéro centre d'appels et contact par écrit d'abord :
            <a href="${escapedShareUrl}" target="_blank" style="color: #194767; font-weight: bold; text-decoration: underline;">${escapedShareUrl}</a>&nbsp;»
          </p>
        </td>
      </tr>
    </table>

    <!-- Section garanties pour leurs proches -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #E6EDF1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
            Ce que vos proches obtiennent grâce à votre astuce
          </h2>
          ${renderSpecsTable([
            {
              label: "Mécanisme de prix",
              value:
                "Jusqu'à 3 installateurs RESCERT mis en concurrence (ils réduisent leur marge d'office)",
            },
            {
              label: "Qualité verrouillée",
              value:
                "Zéro compromis : agrément RESCERT, matériel Tier-1 et conformité RGIE vérifiés",
            },
            {
              label: "Tranquillité garantie",
              value:
                "Zéro centre d'appels, contact par écrit d'abord respecté et 0 € de frais",
            },
          ])}
        </td>
      </tr>
    </table>

    ${renderCalloutBox({
      label: "Aegis Solaire reste de votre côté pendant la réalisation",
      value:
        "Une question sur votre chantier ou un proche à orienter ? Écrivez simplement à contact@aegissolaire.com : notre Cellule Technique reste à votre écoute.",
      tone: "info",
    })}
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader,
    reference: `Dossier validé · ${cityLabel}`,
    context: "Projet solaire finalisé · Tiers de confiance de votre côté",
    contextColor: "#1D5D45",
    headline: "Votre devis est validé — partagez l'astuce autour de vous",
    subtitle: "Faites profiter vos proches de la mise en concurrence RESCERT en Wallonie",
    statusPill: {
      text: "Devis signé · Meilleur prix & qualité Tier-1 sécurisés",
      tone: "success",
    },
    bodyHtml,
    logoHref: baseUrl,
    footerNote:
      "Vous recevez cet e-mail suite à la confirmation de votre projet photovoltaïque suivi via Aegis Solaire. Service 100 % gratuit, sans engagement et sans revente de vos coordonnées.",
    footerLinks: [
      { label: "Partager l'astuce", href: shareUrl },
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Confidentialité & RGPD", href: `${baseUrl}/politique-confidentialite` },
    ],
  })

  const text = [
    `Bonjour ${rawName},`,
    "",
    `Toutes nos félicitations pour la validation de votre projet photovoltaïque${isB2B ? " professionnel" : ""} à ${cityLabel}${kwcClauseText} ${partnerClauseText}.`,
    "",
    "Chez Aegis Solaire, notre mission est d'agir de votre côté : vous avez pu bénéficier d'une mise en concurrence ou d'une sélection rigoureuse au meilleur prix, sans aucune contrepartie sur la qualité (agrément RESCERT vérifié, matériel Tier-1, conformité RGIE et zéro surcoût sur votre devis).",
    "",
    "Un voisin, un collègue ou un membre de votre famille envisage aussi le solaire ? Ne les laissez pas payer le tarif plein pot en direct : partagez-leur simplement l'astuce.",
    "",
    `LE LIEN COURT À PARTAGER : ${shareUrl}`,
    "- Économie moyenne constatée : -18 % dès le 1er devis (jusqu'à 1 850 € d'écart à matériel égal)",
    "- 100 % gratuit · Zéro centre d'appels · Contact par écrit d'abord respecté",
    "",
    "MESSAGE PRÊT À COPIER-COLLER (SMS, WHATSAPP OU MESSENGER) :",
    `« ${shareMessageText} »`,
    "",
    "CE QUE VOS PROCHES OBTIENNENT GRÂCE À VOTRE ASTUCE :",
    "- Mécanisme de prix : Jusqu'à 3 installateurs RESCERT mis en concurrence (ils réduisent leur marge d'office).",
    "- Qualité verrouillée : Zéro compromis — agrément RESCERT, matériel Tier-1 et conformité RGIE vérifiés.",
    "- Tranquillité garantie : Zéro centre d'appels, contact par écrit d'abord respecté et 0 € de frais.",
    "",
    "Aegis Solaire reste de votre côté : pour toute question, écrivez-nous à contact@aegissolaire.com.",
    "",
    "L'équipe Aegis Solaire · La Cellule Technique",
    "contact@aegissolaire.com",
    "Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique",
  ].join("\n")

  return {
    subject,
    html,
    text,
    shareUrl,
    whatsappUrl,
    mailtoFriendUrl,
  }
}

export async function sendProspectReferralEmail(
  payload: ProspectReferralEmailPayload
): Promise<{ sent: boolean; emailId?: string | null; error?: string }> {
  if (!payload.email) {
    return { sent: false, error: "MISSING_PROSPECT_EMAIL" }
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.log(
      "[Prospect Referral Email] RESEND_API_KEY non configurée — envoi ignoré en dev pour:",
      payload.email
    )
    return { sent: false, error: "MISSING_RESEND_KEY" }
  }

  const rawFromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
  const fromHeader = rawFromEmail.includes("<")
    ? rawFromEmail
    : `Aegis Solaire — Cellule Technique <${rawFromEmail}>`
  const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

  try {
    const resend = new Resend(resendApiKey)
    const { subject, html, text } = buildProspectReferralEmail(payload)
    const res = await resend.emails.send({
      from: fromHeader,
      to: payload.email,
      replyTo: replyToEmail,
      subject,
      html,
      text,
    })

    if (res.error) {
      console.error("[Prospect Referral Email] Erreur Resend:", res.error)
      return { sent: false, error: res.error.message }
    }

    return { sent: true, emailId: res.data?.id ?? null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "UNKNOWN_ERROR"
    console.error("[Prospect Referral Email] Exception Resend:", msg)
    return { sent: false, error: msg }
  }
}
