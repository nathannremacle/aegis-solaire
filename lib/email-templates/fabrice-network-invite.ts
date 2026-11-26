/**
 * Modèle et générateur d'invitation réseau partenaires Aegis Solaire
 * pour les installateurs photovoltaïques agréés en Wallonie.
 * Posture : Tiers de confiance technique -> proposition de chantiers qualifiés sans guerre des prix.
 */

import {
  escapeEmailHtml,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"
import {
  renderSampleLeadShowcaseBox,
  type RescertSampleLeadPreview,
} from "@/lib/email-templates/rescert-wave-invite"

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
  sampleLead?: RescertSampleLeadPreview | null
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
  const showFirstFree = data.includeCreditsText !== false && (data.freeCredits ?? 3) >= 3

  if (data.tone === "tutoiement") {
    return showFirstFree
      ? `Aegis Solaire : 1er dossier B2C offert${company} (tél. vérifié SMS & vue 3D)`
      : `Direction des Partenariats : chantiers photovoltaïques qualifiés en Wallonie${company}`
  }
  if (data.tone === "court_whatsapp") {
    return `Aegis Solaire — 1er dossier B2C offert (tél. SMS vérifié & vue 3D)`
  }
  return showFirstFree
    ? `Aegis Solaire — 1er dossier B2C offert${company} (tél. vérifié SMS & vue 3D du toit)`
    : `Aegis Solaire — Opportunités de chantiers solaires vérifiés${company}`
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
    ? `\nPour que tu puisses juger sur pièce sans risquer un euro, ton 1er dossier B2C est intégralement offert (${creditsCount} crédits d'accueil crédités dès validation, valeur 29,50 € HT, sans carte bancaire ni abonnement).\n`
    : `\n`

  const creditsBlockVouvoiement = showCredits
    ? `\nAfin de vous permettre de constater la qualité de nos dossiers sans engagement, votre 1er dossier B2C est intégralement offert (${creditsCount} crédits d'accueil crédités dès validation, valeur 29,50 € HT, sans carte bancaire ni abonnement).\n`
    : `\n`

  const noteBlock = data.customNote?.trim() ? `\nNote de l'équipe : ${data.customNote.trim()}\n` : ""

  if (data.tone === "tutoiement") {
    return `Salut ${name},

Je t'écris pour te présenter Aegis Solaire, la plateforme dédiée aux installateurs photovoltaïques certifiés RESCERT en Wallonie (résidentiel B2C & tertiaire B2B).

Notre fonctionnement est conçu pour éliminer les faux numéros et les mauvaises surprises sur chantier :
1. Téléphone vérifié par SMS (code OTP) + contrôle opérateur et e-mail confirmé avant publication (avec garantie recrédit sous 24 h ouvrées si le prospect reste injoignable).
2. Photos réelles du bien + vue 3D indicative du toit visibles avant déblocage, avec surface, toiture, facture réelle et adresse certifiée SPW ICAR.
3. Concurrence plafonnée à 3 artisans max en B2C (ou Exclusivité Totale) et max 2 en B2B (ou Exclusivité Totale) — 0 € d'abonnement, 0 commission.
${noteBlock}${creditsBlockTutoiement}
Tu peux activer ton accès et débloquer ton 1er dossier offert en 2 minutes ici :
${data.inviteUrl}

Consulte les dossiers actuellement disponibles en Wallonie. Si tu as la moindre question, écris à notre équipe à contact@aegissolaire.com.

À très bientôt,

La Direction des Partenariats Aegis Solaire
Email : contact@aegissolaire.com`.trim()
  }

  if (data.tone === "court_whatsapp") {
    const bonus = showCredits
      ? ` Votre 1er dossier B2C est offert (${creditsCount} crédits d'accueil, 0 € à débourser) : ${data.inviteUrl} .`
      : ` Activez votre accès réservé ici : ${data.inviteUrl} .`
    return `Bonjour ${name}, l'équipe Aegis Solaire vous invite à découvrir nos chantiers photovoltaïques vérifiés en Wallonie : téléphone vérifié par SMS (OTP), photos du bâtiment + vue 3D du toit avant déblocage, max 3 artisans en B2C / max 2 en B2B (ou exclusif), 0 € d'abonnement.${bonus} Questions : contact@aegissolaire.com`.trim()
  }

  // Vouvoiement
  return `Bonjour ${name}${company},

La Direction des Partenariats Aegis Solaire vous invite à rejoindre notre réseau sélectif d'installateurs photovoltaïques certifiés RESCERT en Wallonie (résidentiel B2C & tertiaire B2B).

Notre fonctionnement tranche nettement avec les courtiers classiques :
1. Téléphone vérifié par SMS (code OTP) + contrôle opérateur et e-mail confirmé avant publication (avec garantie recrédit sous 24 h ouvrées si le prospect est injoignable).
2. Photos du bâtiment + vue 3D indicative du toit visibles avant déblocage, avec surface, toiture, facture d'électricité et adresse certifiée SPW ICAR.
3. Concurrence plafonnée à 3 installateurs maximum en B2C (ou Exclusivité Totale) et max 2 en B2B (ou Exclusivité Totale) — 0 € d'abonnement et 0 commission.
${noteBlock}${creditsBlockVouvoiement}
Vous pouvez activer votre accès et consulter les dossiers disponibles en 2 minutes ici :
${data.inviteUrl}

Pour toute question ou étude conjointe, notre équipe est à votre écoute à contact@aegissolaire.com.

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
  const bonus = showCredits
    ? ` (votre 1er dossier B2C est offert : ${data.freeCredits} crédits d'accueil, 0 € à débourser)`
    : ""

  return `Bonjour ${name}, la Direction des Partenariats Aegis Solaire vous invite sur notre plateforme wallonne : téléphone vérifié par SMS (OTP), photos du bien + vue 3D du toit avant déblocage, max 3 installateurs B2C / max 2 B2B (ou exclusif), 0 € d'abonnement. Voici votre accès privilégié${bonus} : ${data.inviteUrl} . Contact : contact@aegissolaire.com`
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
            ? `1er dossier B2C offert (${creditsCount} crédits)`
            : "Accès réseau partenaires Wallonie",
          title: data.companyName?.trim() || "Invitation installateur agréé",
          subtext: "0 €/mois d'abonnement · Tél. vérifié SMS & vue 3D inclus",
          ctaLabel: "Débloquer mon 1er dossier offert →",
          ctaUrl: data.inviteUrl,
        })
      }
      return `<p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.55; color: #142d42;">${cleanP.replace(/\n/g, "<br />")}</p>`
    })
    .join("")

  const sampleSectionHtml = data.sampleLead
    ? renderSampleLeadShowcaseBox(
        data.sampleLead,
        "Exemple concret visible avant déblocage",
        creditsCount
      )
    : ""

  const bodyHtml = `
    ${renderFiguresBox(
      {
        label: "1er dossier B2C",
        value: showCredits ? "Offert (0 €)" : "À la carte",
        sublabel: showCredits ? `${creditsCount} crédits crédités · valeur 29,50 € HT` : "Dès 29,50 € HT · 0 €/mois",
      },
      {
        label: "Qualification contact",
        value: "SMS OTP",
        sublabel: "Photos du bien + vue 3D du toit",
      }
    )}

    ${formattedParagraphs}

    ${sampleSectionHtml}

    <h2 style="margin: 22px 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
      Ce que vous voyez avant de débloquer
    </h2>

    ${renderSpecsTable([
      { label: "1er dossier B2C offert", value: `${creditsCount} crédits d'accueil offerts (0 € sans carte bancaire)` },
      { label: "Téléphone vérifié par SMS", value: "Code SMS (OTP) validé par le prospect + contrôle opérateur" },
      { label: "Photos + vue 3D du toit", value: "Visuels réels et reconstitution 3D indicative sur la fiche" },
      { label: "Concurrence plafonnée", value: "Max 3 artisans B2C · Max 2 en B2B (ou exclusif)" },
      { label: "Garantie joignabilité", value: "Injoignable après 3 essais → recrédit sous 24 h ouvrées" },
    ])}

    ${renderCalloutBox({
      label: "Engagement qualité Aegis Solaire",
      value:
        "Réseau réservé aux installateurs certifiés RESCERT en Wallonie : aucun abonnement, aucune commission sur vos devis.",
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
      ? `1er dossier B2C offert (${creditsCount} crédits · 0 €) · Téléphone vérifié par SMS (OTP) · Photos & vue 3D du toit avant déblocage.`
      : "Invitation à rejoindre le réseau d'installateurs photovoltaïques certifiés en Wallonie.",
    reference: data.companyName?.trim() || "Réseau Partenaires",
    context: "Direction des Partenariats · Wallonie",
    headline: showCredits ? "1er dossier B2C offert en Wallonie" : "Chantiers solaires qualifiés en Wallonie",
    subtitle: "Téléphone vérifié par SMS · Photos & vue 3D du toit · 0 €/mois",
    statusPill: showCredits
      ? { text: `1er dossier B2C offert (${creditsCount} crédits) · Tél. vérifié SMS`, tone: "success" }
      : { text: "Invitation réseau partenaires", tone: "info" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Activer mon accès", href: data.inviteUrl },
    ],
  })
}
