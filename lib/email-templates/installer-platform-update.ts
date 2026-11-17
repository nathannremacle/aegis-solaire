import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"
import { buildPartnerNotificationUrls } from "@/lib/partner-notification-tokens"
import { CREDIT_PACKS_LIST } from "@/lib/credit-pricing"

export interface InstallerPlatformUpdateEmailParams {
  partnerId?: string | null
  companyName?: string | null
  credits?: number | null
  baseUrl?: string
}

/**
 * E-mail explicatif destiné aux installateurs partenaires présentant l'ensemble
 * des nouveautés de la plateforme : packs dégressifs (-8,5 % à -24 %),
 * tarification calibrée sur la taille des projets, exclusivité totale B2C (7 cr.),
 * Auto-Pilot plafonné, paiement 1-clic et cascade intra-journée.
 */
export function buildInstallerPlatformUpdateEmail(
  params: InstallerPlatformUpdateEmailParams = {}
): {
  subject: string
  text: string
  html: string
} {
  const baseUrl = (params.baseUrl || getEmailSiteBaseUrl()).replace(/\/$/, "")
  const company = params.companyName?.trim() || "Partenaire Aegis Solaire"
  const dashboardUrl = `${baseUrl}/partenaires/dashboard`
  const creditsUrl = `${baseUrl}/partenaires/dashboard/credits`
  const currentCredits = Number(params.credits) || 0

  const notifUrls = params.partnerId
    ? buildPartnerNotificationUrls(baseUrl, params.partnerId)
    : null

  const subject =
    "Nouveautés Aegis Solaire : Packs jusqu'à -24 %, Exclusivité B2C & Auto-Pilot"

  const packRows = CREDIT_PACKS_LIST.map((p) => ({
    label: `${p.name} (${p.credits} crédits)`,
    value: `${p.priceHtva.toFixed(0)} € HT · ${p.pricePerCredit.toFixed(2).replace(".", ",")} €/cr. (-${p.savingsPercent.toString().replace(".", ",")} %)`,
  }))

  const bodyHtml = `
    <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; font-weight: bold; color: #142D42;">
      Bonjour ${escapeEmailHtml(company)},
    </p>

    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Nous venons de déployer une mise à jour majeure de votre espace partenaire Aegis Solaire afin de
      <strong>réduire votre coût par chantier signé</strong>, éviter tout crédit inutilisé et vous donner un avantage décisif sur votre secteur en Wallonie.
    </p>

    <h2 style="margin: 24px 0 8px 0; padding-top: 16px; border-top: 1px solid #E6EDF1; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
      1. Nouveaux Packs Prépayés Dégressifs (jusqu&rsquo;&agrave; -24&nbsp;%)
    </h2>
    <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.4; color: #4D6374;">
      Tous nos nouveaux packs sont calibrés en multiples exacts de <strong style="color: #142D42; font-variant-numeric: tabular-nums;">3</strong> et <strong style="color: #142D42; font-variant-numeric: tabular-nums;">12</strong> : plus aucun crédit orphelin bloqué sur votre portefeuille.
    </p>
    ${renderSpecsTable(packRows)}

    <h2 style="margin: 24px 0 12px 0; padding-top: 16px; border-top: 1px solid #E6EDF1; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
      2. Tarifs Calibrés sur la Valeur Réelle des Projets
    </h2>
    ${renderSpecsTable([
      { label: "B2C Éco (petits toits / horizon > 6 mois)", value: "2 crédits (19,50 € HT à l'acte)" },
      { label: "B2C Standard (résidentiel classique)", value: "3 crédits (29,50 € HT à l'acte)" },
      { label: "B2C Premium (grande surface / batterie / IRVE)", value: "4 crédits (39,00 € HT à l'acte)" },
      { label: "B2B Exclusif (PME / Standard / Grand Compte)", value: "6, 9 ou 12 crédits (59 € à 118 € HT)" },
    ])}

    <h2 style="margin: 24px 0 12px 0; padding-top: 16px; border-top: 1px solid #E6EDF1; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
      3. Exclusivité Totale B2C en 1 clic (0 concurrent)
    </h2>
    <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Lorsqu&rsquo;un nouveau dossier résidentiel n&rsquo;a encore aucun acheteur (<span style="display: inline-block; padding: 1px 6px; border-radius: 5px; background-color: #E8F2ED; color: #1D5D45; font-weight: bold; font-variant-numeric: tabular-nums;">0/3</span>), vous pouvez désormais
      <strong>réserver l&rsquo;exclusivité totale à 100&nbsp;% pour <span style="font-variant-numeric: tabular-nums;">7</span> crédits (ou <span style="font-variant-numeric: tabular-nums;">65&nbsp;€&nbsp;HT</span> direct)</strong> au lieu de <span style="font-variant-numeric: tabular-nums;">3×</span> le prix.
    </p>
    ${renderCalloutBox({
      label: "Protection automatique de votre taux de closing",
      value:
        "Dès qu'un dossier B2C est acquis en exclusivité, notre Cellule Technique envoie automatiquement un e-mail rassurant au prospect expliquant qu'il bénéficie d'une prise en charge prioritaire par un partenaire RESCERT sélectionné.",
      tone: "success",
    })}

    <h2 style="margin: 24px 0 12px 0; padding-top: 16px; border-top: 1px solid #E6EDF1; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
      4. Mode Auto-Pilot, Paiement 1-Clic &amp; Qualité H+48h
    </h2>
    <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      &bull; <strong>Auto-Pilot avec plafond hebdomadaire :</strong> recevez automatiquement les dossiers correspondant à vos provinces et surfaces, sans jamais dépasser votre quota semaine.<br />
      &bull; <strong>Paiement 1-Clic (Bancontact / Carte) :</strong> mémorisez votre moyen de paiement lors de votre prochain achat pour débloquer instantanément les dossiers chauds.<br />
      &bull; <strong>Protocole H+48h Zéro Déchet :</strong> les dossiers B2C partiellement pourvus sont automatiquement clôturés à <span style="font-variant-numeric: tabular-nums;">48&nbsp;h</span> pour protéger les premiers acheteurs, et les dossiers sans repreneur sont reconfirmés auprès du prospect.
    </p>

    ${renderActionBox({
      kicker: `Votre solde actuel : ${currentCredits} crédit${currentCredits > 1 ? "s" : ""}`,
      title: "Accéder aux nouveaux packs et à vos préférences Auto-Pilot",
      subtext:
        "Sans abonnement ni engagement. Facturation belge conforme (21 % TVA) générée instantanément.",
      ctaLabel: "Voir les nouveaux packs (-24 %)",
      ctaUrl: creditsUrl,
      secondaryLabel: "Configurer Auto-Pilot & mes alertes",
      secondaryUrl: dashboardUrl,
    })}
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader:
      "Packs dégressifs dès 7,50 €/crédit (-24 %), exclusivité totale B2C à 7 crédits, tarifs dès 19,50 € HT et mode Auto-Pilot.",
    reference: "Mise à jour réseau",
    context: "Nouveautés Partenaires",
    contextColor: "#1D5D45",
    headline: "Nouveaux packs jusqu'à -24 %, Exclusivité B2C & Auto-Pilot",
    subtitle: "Toutes les améliorations disponibles dès aujourd'hui sur votre espace installateur",
    statusPill: { text: "Déployé sur votre compte", tone: "success" },
    bodyHtml,
    logoHref: dashboardUrl,
    footerNote:
      "Communication informative destinée aux installateurs partenaires RESCERT d'Aegis Solaire.",
    footerLinks: [
      { label: "Packs de crédits", href: creditsUrl },
      { label: "Tableau de bord", href: dashboardUrl },
      ...(notifUrls ? [{ label: "Gérer mes alertes", href: notifUrls.manageUrl }] : []),
      { label: "Support partenaires", href: "mailto:contact@aegissolaire.com" },
    ],
  })

  const text = [
    `Bonjour ${company},`,
    "",
    "Nous venons de déployer plusieurs nouveautés majeures sur Aegis Solaire :",
    "",
    "1. NOUVEAUX PACKS PRÉPAYÉS DÉGRESSIFS (multiples de 3/12, zéro crédit orphelin) :",
    ...CREDIT_PACKS_LIST.map(
      (p) =>
        `- ${p.name} (${p.credits} crédits) : ${p.priceHtva.toFixed(0)} € HT (${p.pricePerCredit.toFixed(2).replace(".", ",")} €/cr., -${p.savingsPercent.toString().replace(".", ",")} %)`
    ),
    "",
    "2. TARIFS CALIBRÉS SUR LA VALEUR RÉELLE DU PROJET :",
    "- B2C Éco : 2 cr. (19,50 € HT) | B2C Standard : 3 cr. (29,50 € HT) | B2C Premium : 4 cr. (39,00 € HT)",
    "- B2B Exclusif : 6 cr. PME (59 € HT) | 9 cr. Standard (88,50 € HT) | 12 cr. Grand Compte (118 € HT)",
    "",
    "3. EXCLUSIVITÉ TOTALE B2C (7 crédits / 65 € HT) :",
    "Si vous êtes le premier sur un dossier résidentiel (0/3), réservez l'exclusivité à 100 %.",
    "Notre Cellule Technique envoie automatiquement un e-mail de réassurance au prospect lui présentant votre prise en charge prioritaire RESCERT.",
    "",
    "4. AUTO-PILOT PLAFONNÉ, PAIEMENT 1-CLIC & CLÔTURE H+48H :",
    "Activez l'Auto-Pilot dans vos préférences avec votre plafond hebdomadaire pour sécuriser automatiquement vos chantiers locaux.",
    "",
    `Voir les nouveaux packs : ${creditsUrl}`,
    `Configurer mes préférences : ${dashboardUrl}`,
    "",
    "L'équipe Partenaires Aegis Solaire",
    "contact@aegissolaire.com",
    "Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique",
  ].join("\n")

  return { subject, text, html }
}
