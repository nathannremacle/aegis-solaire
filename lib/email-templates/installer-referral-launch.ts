import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"
import { buildPartnerNotificationUrls } from "@/lib/partner-notification-tokens"
import {
  buildPartnerReferralShareData,
  PARTNER_REFERRAL_REWARD_CREDITS,
} from "@/lib/partner-referrals"

export interface InstallerReferralLaunchEmailParams {
  partnerId?: string | null
  companyName?: string | null
  referralCode: string
  credits?: number | null
  baseUrl?: string
  rewardCredits?: number
}

/**
 * E-mail dédié au lancement et à l'activation du programme de parrainage RESCERT :
 * - Gain immédiat et tangible (+3 crédits = 1 dossier B2C Standard offert chacun)
 * - Zéro friction : bouton WhatsApp 1-clic + lien personnel directement dans l'e-mail
 * - Désamorçage de la crainte concurrentielle (confrère d'une autre province)
 */
export function buildInstallerReferralLaunchEmail(
  params: InstallerReferralLaunchEmailParams
): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = (params.baseUrl || getEmailSiteBaseUrl()).replace(/\/$/, "")
  const company = params.companyName?.trim() || "Partenaire Aegis Solaire"
  const rewardCredits =
    typeof params.rewardCredits === "number" && params.rewardCredits >= 0
      ? params.rewardCredits
      : PARTNER_REFERRAL_REWARD_CREDITS
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`
  const currentCredits = Number.isFinite(Number(params.credits))
    ? Number(params.credits)
    : null

  const share = buildPartnerReferralShareData({
    referralCode: params.referralCode,
    companyName: company,
    baseUrl,
    rewardCredits,
  })

  const notifUrls = params.partnerId
    ? buildPartnerNotificationUrls(baseUrl, params.partnerId)
    : null

  const subject = `1 dossier solaire offert (+${rewardCredits} crédits) en parrainant un confrère RESCERT`

  const bodyHtml = `
    <p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.5; color: #142d42;">
      Bonjour <strong>${escapeEmailHtml(company)}</strong>,
    </p>
    <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.5; color: #142d42;">
      Vous utilisez déjà Aegis Solaire pour recevoir des projets photovoltaïques qualifiés. Votre espace partenaire intègre désormais un <strong>programme de parrainage réservé aux installateurs certifiés RESCERT</strong> pour cumuler des dossiers offerts, sans aucun plafond.
    </p>

    ${renderFiguresBox(
      {
        label: "Votre bonus par confrère",
        value: `+${rewardCredits} crédits`,
        sublabel: "Soit 1 dossier B2C Standard offert",
      },
      {
        label: "Bonus pour votre confrère",
        value: `+${rewardCredits} crédits`,
        sublabel: "Dès son 1er achat payant",
      }
    )}

    ${renderCalloutBox({
      label: "Zéro concurrence sur votre secteur",
      value:
        "Invitez un confrère RESCERT d'une autre province (contact de formation, grossiste ou ancien collègue ailleurs en Wallonie ou à Bruxelles) : vous cumulez des dossiers gratuits sans aucun impact sur vos chantiers locaux.",
      tone: "info",
    })}

    ${renderActionBox({
      kicker: `Partage en 1 clic · Code ${share.referralCode}`,
      title: "Invitez un confrère en 5 secondes",
      subtext: "Message pré-rempli avec votre lien personnel (modifiable avant envoi).",
      ctaLabel: "Partager sur WhatsApp →",
      ctaUrl: share.whatsappUrl,
      secondaryLabel: "Ou inviter par e-mail",
      secondaryUrl: share.mailtoUrl,
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px; width: 100%; background-color: #f6f8fa; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td style="padding: 12px 15px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="left" valign="middle" style="font-size: 13px; color: #4d6374;">
                Votre lien d&rsquo;invitation personnel
              </td>
              <td align="right" valign="middle" style="font-size: 12px; color: #142d42; font-weight: bold; font-variant-numeric: tabular-nums; white-space: nowrap;">
                Code&nbsp;: <span style="display: inline-block; padding: 2px 7px; border-radius: 5px; background-color: #ffffff; border: 1px solid #dce5eb; color: #142d42; font-weight: bold; font-variant-numeric: tabular-nums;">${escapeEmailHtml(share.referralCode)}</span>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding-top: 8px; font-size: 13px; line-height: 1.45; word-break: break-all;">
                <a href="${escapeEmailHtml(share.referralUrl)}" target="_blank" style="color: #194767; font-weight: bold; text-decoration: underline;">${escapeEmailHtml(share.referralUrl)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e6edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Comment ça fonctionne
          </h2>
          ${renderSpecsTable([
            {
              label: "01 · Partagez votre lien",
              value: "Par WhatsApp, SMS ou e-mail à un installateur agréé RESCERT",
            },
            {
              label: "02 · Validation RESCERT",
              value: "Inscription gratuite (0 € d'abonnement), contrôle RESCERT & BCE sous 24 à 48 h",
            },
            {
              label: "03 · Crédits automatiques",
              value: `+${rewardCredits} crédits ajoutés sur vos deux comptes dès son 1er achat payant`,
            },
          ])}
          ${
            currentCredits !== null
              ? `<p style="margin: 12px 0 0 0; font-size: 13px; line-height: 1.45; color: #4d6374; font-variant-numeric: tabular-nums;">Solde actuel sur votre portefeuille : <strong style="color: #142d42;">${currentCredits} crédit${currentCredits > 1 ? "s" : ""}</strong> &middot; Suivez vos parrainages en direct depuis votre <a href="${escapeEmailHtml(dashboardUrl)}" target="_blank" style="color: #194767; text-decoration: underline;">espace partenaire</a>.</p>`
              : ""
          }
        </td>
      </tr>
    </table>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Parrainez un confrère RESCERT d'une autre province : +${rewardCredits} crédits offerts chacun (= 1 dossier B2C) dès son 1er achat, cumulable sans plafond.`,
    reference: `Code ${share.referralCode}`,
    context: "Programme Parrainage RESCERT",
    contextColor: "#1d5d45",
    headline: "Gagnez 1 dossier offert par confrère parrainé",
    subtitle: `${company} · +${rewardCredits} crédits pour vous et +${rewardCredits} crédits pour votre confrère`,
    statusPill: { text: "Cumulable sans plafond · Wallonie & Bruxelles", tone: "success" },
    bodyHtml,
    logoHref: dashboardUrl,
    footerNote:
      "Communication informative destinée aux installateurs partenaires RESCERT d'Aegis Solaire.",
    footerLinks: [
      { label: "Mon espace partenaire", href: dashboardUrl },
      ...(notifUrls ? [{ label: "Gérer mes alertes", href: notifUrls.manageUrl }] : []),
      { label: "Support partenaires", href: "mailto:contact@aegissolaire.com" },
    ],
  })

  const text = [
    `AEGIS SOLAIRE — PROGRAMME PARRAINAGE RESCERT`,
    `Code personnel : ${share.referralCode}`,
    "",
    `Bonjour ${company},`,
    "",
    `Vous utilisez déjà Aegis Solaire pour recevoir des projets photovoltaïques qualifiés.`,
    `Votre espace partenaire intègre désormais un programme de parrainage réservé aux installateurs certifiés RESCERT :`,
    `- Votre bonus par confrère : +${rewardCredits} crédits offerts (soit 1 dossier B2C Standard offert)`,
    `- Bonus pour votre confrère : +${rewardCredits} crédits offerts dès son 1er achat payant`,
    `- Cumulable sans plafond, sans abonnement ni engagement.`,
    "",
    `ZÉRO CONCURRENCE SUR VOTRE SECTEUR :`,
    `Invitez un confrère RESCERT d'une autre province (contact de formation, grossiste ou ancien collègue ailleurs en Wallonie ou à Bruxelles) : vous cumulez des dossiers gratuits sans aucun impact sur vos chantiers locaux.`,
    "",
    `COMMENT ÇA FONCTIONNE :`,
    `01 · Partagez votre lien : par WhatsApp, SMS ou e-mail à un installateur agréé RESCERT`,
    `02 · Validation RESCERT : inscription gratuite (0 € d'abonnement), contrôle RESCERT & BCE sous 24 à 48 h`,
    `03 · Crédits automatiques : +${rewardCredits} crédits ajoutés sur vos deux comptes dès son 1er achat payant`,
    "",
    `Partager en 1 clic sur WhatsApp : ${share.whatsappUrl}`,
    `Votre lien d'invitation personnel : ${share.referralUrl}`,
    `Accéder à mon espace partenaire : ${dashboardUrl}`,
    "",
    `Des questions ? contact@aegissolaire.com`,
    "",
    `Cordialement,`,
    `L'équipe Partenaires Aegis Solaire`,
    `Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`,
  ].join("\n")

  return { subject, text, html }
}

/**
 * Encart discret réutilisable pour les e-mails transactionnels partenaires ("à chaud" :
 * confirmation de déblocage de lead, commande de crédits validée, bienvenue compte actif).
 */
export function renderPartnerReferralFooterBlock(params: {
  referralCode?: string | null
  companyName?: string | null
  baseUrl?: string
  rewardCredits?: number
}): string {
  const rawCode = params.referralCode?.trim()
  if (!rawCode) return ""

  const baseUrl = (params.baseUrl || getEmailSiteBaseUrl()).replace(/\/$/, "")
  const rewardCredits =
    typeof params.rewardCredits === "number" && params.rewardCredits >= 0
      ? params.rewardCredits
      : PARTNER_REFERRAL_REWARD_CREDITS
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`

  const share = buildPartnerReferralShareData({
    referralCode: rawCode,
    companyName: params.companyName,
    baseUrl,
    rewardCredits,
  })

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; background-color: #f0f5f8; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
  <tr>
    <td style="padding: 14px 15px;">
      <span style="display: block; font-size: 12px; font-weight: bold; color: #305a76; line-height: 1.35; font-variant-numeric: tabular-nums;">
        Programme Parrainage RESCERT &middot; Code <span style="font-variant-numeric: tabular-nums;">${escapeEmailHtml(share.referralCode)}</span>
      </span>
      <strong style="display: block; margin-top: 3px; font-size: 15px; line-height: 1.35; color: #142d42; font-variant-numeric: tabular-nums;">
        Gagnez +${rewardCredits} crédits offerts (1 dossier B2C) par confrère invité
      </strong>
      <p style="margin: 4px 0 0 0; font-size: 13px; line-height: 1.45; color: #4d6374;">
        Recommandez Aegis Solaire à un confrère certifié RESCERT d&rsquo;une autre province&nbsp;: vous recevez chacun +${rewardCredits} crédits dès son 1er achat payant, sans concurrence sur votre secteur.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.45;">
        <a href="${escapeEmailHtml(share.whatsappUrl)}" target="_blank" style="color: #194767; font-weight: bold; text-decoration: underline;">Partager sur WhatsApp &rarr;</a>
        &nbsp;&middot;&nbsp;
        <a href="${escapeEmailHtml(dashboardUrl)}" target="_blank" style="color: #194767; text-decoration: underline;">Accéder à mon lien</a>
      </p>
    </td>
  </tr>
</table>`
}

export function buildPartnerReferralTextFootnote(params: {
  referralCode?: string | null
  companyName?: string | null
  baseUrl?: string
  rewardCredits?: number
}): string {
  const rawCode = params.referralCode?.trim()
  if (!rawCode) return ""

  const baseUrl = (params.baseUrl || getEmailSiteBaseUrl()).replace(/\/$/, "")
  const rewardCredits =
    typeof params.rewardCredits === "number" && params.rewardCredits >= 0
      ? params.rewardCredits
      : PARTNER_REFERRAL_REWARD_CREDITS

  const share = buildPartnerReferralShareData({
    referralCode: rawCode,
    companyName: params.companyName,
    baseUrl,
    rewardCredits,
  })

  return [
    `PARRAINAGE RESCERT (Code ${share.referralCode}) :`,
    `Gagnez +${rewardCredits} crédits offerts (1 dossier B2C) en invitant un confrère RESCERT d'une autre province : ${share.referralUrl}`,
    `Partager en 1 clic sur WhatsApp : ${share.whatsappUrl}`,
  ].join("\n")
}
