/**
 * Modèle et générateur d'invitation réseau partenaires Aegis Solaire
 * pour les installateurs photovoltaïques agréés en Wallonie.
 * Posture : Tiers de confiance technique -> proposition de chantiers qualifiés sans guerre des prix.
 */

import {
  escapeEmailHtml,
  renderActionBox,
  renderCalloutBox,
  renderInstallerEmailShell,
} from "@/lib/email-templates/installer-email-layout"

export interface PartnerInviteData {
  installerName: string
  companyName?: string
  installerEmail?: string
  installerPhone?: string
  tone: "tutoiement" | "vouvoiement" | "court_whatsapp"
  freeCredits: number
  includeCreditsText?: boolean
  provinces?: string
  customNote?: string
  inviteUrl: string
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
}

export const MOCK_COMPETITORS_LIEGE = [
  "Sogreen SRL",
  "Enersol SA",
  "High Tech Solar Group SRL",
  "Solena SRL",
  "Belga Solar SRL",
]

export const MOCK_COMPETITORS_LIEGE_PHRASE = 
  "Nous avons également envoyé ce courrier d'invitation à ces confrères de la région liégeoise : Sogreen SRL, Enersol SA, High Tech Solar Group SRL, Solena SRL et Belga Solar SRL (en précisant que seulement 5 places sont ouvertes au total sur la province de Liège pour préserver la rentabilité de chacun)."

/**
 * Remplace les variables dynamiques (ex: {{prenom}}, {{lien}}, {{entreprise}}, {{credits}}, {{installateurs_sollicites}})
 * dans un texte de modèle personnalisé.
 */
export function substituteTemplateVariables(
  text: string,
  variables: {
    installerName?: string
    companyName?: string
    inviteUrl: string
    freeCredits?: number
  }
): string {
  const name = variables.installerName?.trim() || "partenaire"
  const company = variables.companyName?.trim() || ""
  const credits = String(variables.freeCredits ?? 3)
  const competitorsList = MOCK_COMPETITORS_LIEGE.join(", ")

  let result = text
    .replace(/\{\{\s*prenom\s*\}\}/gi, name)
    .replace(/\{\{\s*nom\s*\}\}/gi, name)
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\{\s*entreprise\s*\}\}/gi, company)
    .replace(/\{\{\s*societe\s*\}\}/gi, company)
    .replace(/\{\{\s*company\s*\}\}/gi, company)
    .replace(/\{\{\s*cie\s*\}\}/gi, company)
    .replace(/\{\{\s*lien\s*\}\}/gi, variables.inviteUrl)
    .replace(/\{\{\s*url\s*\}\}/gi, variables.inviteUrl)
    .replace(/\{\{\s*link\s*\}\}/gi, variables.inviteUrl)
    .replace(/\{\{\s*credits\s*\}\}/gi, credits)
    .replace(/\{\{\s*(installateurs_sollicites|confreres_liege|concurrents)\s*\}\}/gi, competitorsList)
    .replace(/\{\{\s*(phrase_concurrence_liege|mention_courrier_liege)\s*\}\}/gi, MOCK_COMPETITORS_LIEGE_PHRASE)

  // Si le texte contient l'URL d'invitation brute, s'assurer qu'elle pointe vers le lien dynamique
  if (result.includes("/partenaires/invitation")) {
    result = result.replace(/https?:\/\/[^\s\n]+\/partenaires\/invitation[^\s\n]*/g, variables.inviteUrl)
  }

  return result
}

/**
 * Construit l'objet du mail
 */
export function buildPartnerInviteSubject(data: PartnerInviteData): string {
  const company = data.companyName?.trim() ? ` pour ${data.companyName.trim()}` : ""

  if (data.tone === "tutoiement") {
    return `Direction des Partenariats : chantiers photovoltaïques qualifiés en Wallonie${company}`
  }
  if (data.tone === "court_whatsapp") {
    return `Aegis Solaire — Chantiers solaires qualifiés Wallonie`
  }
  return `Aegis Solaire — Opportunités de chantiers solaires vérifiés${company}`
}

/**
 * Construit le texte brut par défaut selon l'angle et le ton choisi
 * avec tournure de phrase professionnelle et gestion de l'option de crédits.
 */
export function buildPartnerInvitePlainText(data: PartnerInviteData): string {
  const name = data.installerName?.trim() || (data.tone === "tutoiement" ? "{{prenom}}" : "Monsieur")
  const company = data.companyName?.trim() ? ` chez ${data.companyName.trim()}` : ""
  const showCredits = data.includeCreditsText !== false && data.freeCredits > 0
  const creditsCount = data.freeCredits > 0 ? data.freeCredits : 3

  const creditsBlockTutoiement = showCredits
    ? `\nPour vous permettre de tester la qualité de nos dossiers, nous vous avons crédité ${creditsCount} crédits d'accueil sur votre espace (soit votre 1er dossier B2C offert, valeur 29,50 € HTVA) sans aucun engagement financier.\n`
    : `\n`

  const creditsBlockVouvoiement = showCredits
    ? `\nAfin de vous permettre de constater la précision de nos dossiers techniques, la Direction des Partenariats vous alloue ${creditsCount} crédits d'accueil (valeur 29,50 € HTVA, correspondant à votre 1er dossier B2C offert) sans aucun engagement financier.\n`
    : `\n`

  const noteBlock = data.customNote?.trim() ? `\nNote de l'équipe : ${data.customNote.trim()}\n` : ""

  if (data.tone === "tutoiement") {
    return `Salut ${name},

Je t'écris pour te présenter la plateforme Aegis Solaire, dédiée aux professionnels du photovoltaïque en Wallonie. C'est un réseau de confiance qui sélectionne des installateurs sérieux pour des projets photovoltaïques concrets, en résidentiel et en tertiaire (B2C & B2B).

Notre fonctionnement tranche nettement avec les centrales d'appels habituelles :
1. Maximum 3 artisans par projet en résidentiel (et exclusivité totale 100% à un seul installateur en B2B/tertiaire).
2. Dossier technique complet avant diffusion : surface, pente, toiture, facture d'électricité réelle, photo satellite et coordonnées vérifiées par téléphone avant publication.
3. Zéro abonnement, zéro commission sur ton chiffre d'affaires : tu choisis uniquement les dossiers qui t'intéressent dans ta zone via un système simple de crédits.
${noteBlock}${creditsBlockTutoiement}
Tu peux activer ton accès réservé en 1 minute ici :
${data.inviteUrl}

Consulte les dossiers actuellement disponibles en Wallonie. Si tu as la moindre question, n'hésite pas à écrire à notre équipe à contact@aegissolaire.com.

À très bientôt,

La Direction des Partenariats Aegis Solaire
Email : contact@aegissolaire.com`.trim()
  }

  if (data.tone === "court_whatsapp") {
    const bonus = showCredits
      ? ` Nous vous avons réservé ${creditsCount} crédits offerts pour débloquer votre 1er dossier B2C sans frais : ${data.inviteUrl} .`
      : ` Vous pouvez activer votre accès réservé ici : ${data.inviteUrl} .`
    return `Bonjour ${name}, l'équipe Aegis Solaire vous invite à découvrir notre réseau d'installateurs solaires en Wallonie (toiture & facture vérifiées, max 3 artisans en résidentiel, exclusivité B2B, zéro commission).${bonus} Contactez-nous à contact@aegissolaire.com pour toute question !`.trim()
  }

  // Vouvoiement
  return `Bonjour ${name}${company},

La Direction des Partenariats Aegis Solaire se permet de vous contacter pour vous présenter notre marketplace photovoltaïque en Wallonie. Il s'agit d'un réseau sélectif qui met en relation des installateurs de référence avec des porteurs de projets vérifiés, en résidentiel et en tertiaire (B2C & B2B).

Notre fonctionnement se distingue nettement des centrales d'appels habituelles :
1. Maximum 3 installateurs par projet en résidentiel (et exclusivité totale 100% à un seul installateur en B2B/tertiaire).
2. Dossier technique complet avant diffusion : surface, pente, toiture, facture d'électricité réelle, photo satellite et coordonnées vérifiées par téléphone avant publication.
3. Zéro abonnement, zéro commission sur votre chiffre d'affaires : vous choisissez uniquement les dossiers qui vous intéressent dans votre zone via un système simple de crédits.
${noteBlock}${creditsBlockVouvoiement}
Vous pouvez activer votre accès réservé en 1 minute ici :
${data.inviteUrl}

N'hésitez pas à consulter les dossiers actuellement disponibles en Wallonie. Pour toute question ou étude de dossier conjointe, notre équipe est à votre écoute par e-mail à contact@aegissolaire.com.

Bien cordialement,

La Direction des Partenariats Aegis Solaire
Email : contact@aegissolaire.com`.trim()
}

/**
 * Génère un message WhatsApp optimisé et court
 */
export function buildPartnerWhatsAppMessage(data: PartnerInviteData): string {
  const name = data.installerName?.trim() || "Cher partenaire"
  const showCredits = data.includeCreditsText !== false && data.freeCredits > 0
  const bonus = showCredits ? ` (nous vous avons réservé ${data.freeCredits} crédits offerts pour votre 1er dossier B2C)` : ""

  return `Bonjour ${name}, la Direction des Partenariats Aegis Solaire vous invite à découvrir notre plateforme dédiée aux installateurs photovoltaïques qualifiés en Wallonie (max 3 installateurs en résidentiel, exclusivité B2B, audit toiture & facture vérifiés, zéro commission). Voici votre lien d'accès privilégié${bonus} : ${data.inviteUrl} . Contactez-nous à contact@aegissolaire.com pour toute question !`
}

/**
 * Rendu HTML unifié Aegis Solaire (carte 640 px, logo 132×72 sans déformation, compatibilité Gmail/Outlook).
 */
export function renderPartnerInviteHtml(data: PartnerInviteData, customBodyText?: string): string {
  const subject = buildPartnerInviteSubject(data)
  const rawText = customBodyText?.trim() || buildPartnerInvitePlainText(data)
  const showCredits = data.includeCreditsText !== false && data.freeCredits > 0
  const creditsCount = data.freeCredits > 0 ? data.freeCredits : 3

  // Formatage des paragraphes pour le HTML
  const formattedParagraphs = rawText
    .split(/\n\n+/)
    .map((p) => {
      const cleanP = escapeHtml(p.trim())
      if (cleanP.includes("1.") && cleanP.includes("2.")) {
        const items = cleanP
          .split(/\n/)
          .map((item) => `<li style="margin-bottom: 6px; line-height: 1.5;">${item.replace(/^[0-9]+\.\s*/, "")}</li>`)
          .join("")
        return `<ol style="margin: 14px 0 16px 20px; padding: 0; color: #142d42; font-size: 14px;">${items}</ol>`
      }
      if (cleanP === escapeHtml(data.inviteUrl)) {
        return renderActionBox({
          kicker: showCredits
            ? `${creditsCount} crédits d'accueil offerts`
            : "Accès réseau partenaires Wallonie",
          title: data.companyName?.trim() || "Invitation installateur agréé",
          subtext: "Sans abonnement · Zéro commission",
          ctaLabel: "Activer mon accès privilégié →",
          ctaUrl: data.inviteUrl,
        })
      }
      return `<p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.55; color: #142d42;">${cleanP.replace(/\n/g, "<br />")}</p>`
    })
    .join("")

  const bodyHtml = `
    ${formattedParagraphs}

    ${renderCalloutBox({
      label: "Engagement qualité Aegis Solaire",
      value:
        "Réseau dédié aux installateurs certifiés RESCERT en Wallonie : maximum 3 artisans en résidentiel, exclusivité totale en B2B.",
      tone: "info",
    })}

    <p style="margin: 16px 0 0 0; font-size: 13px; color: #4d6374;">
      <strong style="color: #142d42;">La Direction des Partenariats Aegis Solaire</strong> &middot;
      <a href="mailto:contact@aegissolaire.com" style="color: #194767; text-decoration: underline;">contact@aegissolaire.com</a>
    </p>
  `

  return renderInstallerEmailShell({
    subject,
    preheader: showCredits
      ? `${creditsCount} crédits d'accueil offerts pour découvrir les dossiers solaires qualifiés en Wallonie.`
      : "Invitation à rejoindre le réseau d'installateurs photovoltaïques certifiés en Wallonie.",
    reference: data.companyName?.trim() || "Réseau Partenaires",
    context: "Direction des Partenariats · Wallonie",
    headline: "Chantiers solaires qualifiés en Wallonie",
    subtitle: "Sans abonnement · Zéro commission · Accès sélectif",
    statusPill: showCredits
      ? { text: `${creditsCount} crédits d'accueil offerts · 1er dossier B2C`, tone: "success" }
      : { text: "Invitation réseau partenaires", tone: "info" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Activer mon accès", href: data.inviteUrl },
    ],
  })
}
