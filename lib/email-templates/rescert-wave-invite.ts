import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"
import { formatProvinceLocative } from "@/lib/belgium-regions"
import { buildRescertOptoutUrl } from "@/lib/rescert-optout-tokens"

export interface RescertSampleLeadPreview {
  id: string
  city?: string | null
  postalCode?: string | null
  provinceLabel?: string | null
  surfaceAreaM2?: number | null
  estimatedPowerKwc?: number | null
  annualBillEur?: number | null
  creditCost?: number | null
}

export interface RescertWaveInviteParams {
  companyName: string
  certifiedPerson?: string | null
  email: string
  phone?: string | null
  postalCode?: string | null
  city?: string | null
  provinceKey: string
  provinceLabel: string
  totalOpenWalloniaCount: number
  provinceOpenCount: number
  sampleLead?: RescertSampleLeadPreview | null
  baseUrl?: string
}

/**
 * E-mail d'invitation réseau RESCERT par vagues géographiques (Liège, Hainaut, Namur...).
 * Conforme à 100 % à docs/DESIGN-PORTAIL-EMAILS.md et .agent/rules/anonymity-and-identity.md.
 */
function decodeBasicEntities(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

export function buildRescertWaveInviteEmail(params: RescertWaveInviteParams): {
  subject: string
  text: string
  html: string
  inviteUrl: string
  optoutUrl: string
} {
  const baseUrl = (params.baseUrl || getEmailSiteBaseUrl()).replace(/\/$/, "")
  const company = decodeBasicEntities(params.companyName) || "Votre entreprise"
  const certifiedPersonClean = decodeBasicEntities(params.certifiedPerson)
  const provinceLabel = params.provinceLabel.trim() || "Wallonie"
  const provinceLocative = formatProvinceLocative(params.provinceKey || provinceLabel)
  const optoutUrl = buildRescertOptoutUrl(baseUrl, params.email)

  const inviteQuery = new URLSearchParams()
  inviteQuery.set("cie", company)
  if (certifiedPersonClean) inviteQuery.set("nom", certifiedPersonClean)
  if (params.postalCode?.trim()) inviteQuery.set("cp", params.postalCode.trim())
  if (params.email?.trim()) inviteQuery.set("email", params.email.trim())
  if (params.phone?.trim()) inviteQuery.set("phone", params.phone.trim())
  if (params.sampleLead?.id) inviteQuery.set("leadId", params.sampleLead.id)

  const inviteUrl = `${baseUrl}/partenaires/invitation?${inviteQuery.toString()}`
  const directoryUrl = `${baseUrl}/partenaires/annuaire`

  const hasLocalSample = Boolean(params.sampleLead?.id)
  const localLabel =
    params.provinceOpenCount > 0
      ? `dont ${params.provinceOpenCount} ouvert${params.provinceOpenCount > 1 ? "s" : ""} ${provinceLocative}`
      : `Wallonie · demandes en cours de qualification`

  const subject =
    params.provinceOpenCount > 0
      ? `${company} — ${params.provinceOpenCount} chantier${params.provinceOpenCount > 1 ? "s" : ""} solaire${params.provinceOpenCount > 1 ? "s" : ""} ${provinceLocative} (accès RESCERT gratuit)`
      : `Sélection réseau RESCERT · ${provinceLabel} — Accès chantiers sans abonnement pour ${company}`

  const preheader = `Zéro abonnement fixe · Max 3 installateurs B2C (ou exclusivité 65 € HT) · 3 crédits d'accueil offerts après validation RESCERT.`

  const sampleParts: string[] = []
  if (params.sampleLead) {
    const loc = [params.sampleLead.postalCode, params.sampleLead.city].filter(Boolean).join(" ")
    if (loc) sampleParts.push(loc)
    if (params.sampleLead.surfaceAreaM2 && params.sampleLead.surfaceAreaM2 > 0) {
      sampleParts.push(`Toiture ${Math.round(params.sampleLead.surfaceAreaM2)} m²`)
    }
    if (params.sampleLead.estimatedPowerKwc && params.sampleLead.estimatedPowerKwc > 0) {
      sampleParts.push(`~${String(params.sampleLead.estimatedPowerKwc).replace(".", ",")} kWc`)
    }
    if (params.sampleLead.annualBillEur && params.sampleLead.annualBillEur > 0) {
      sampleParts.push(
        `Facture ${Math.round(params.sampleLead.annualBillEur).toLocaleString("fr-BE")} €/an`
      )
    }
  }

  const greetingName = certifiedPersonClean
    ? `${certifiedPersonClean} (${company})`
    : company

  const bodyHtml = `
    <p style="margin: 18px 0 0 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Bonjour <strong>${escapeEmailHtml(greetingName)}</strong>,
    </p>
    <p style="margin: 10px 0 0 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Votre entreprise figurant au registre officiel <strong>RESCERT photovoltaïque</strong> ${escapeEmailHtml(provinceLocative)}, nous vous ouvrons un accès prioritaire au réseau <strong>Aegis Solaire</strong> pour recevoir nos demandes résidentielles et tertiaires vérifiées par notre Cellule Technique.
    </p>

    ${renderFiguresBox(
      {
        label: "Concurrence maximale",
        value: "3 max.",
        sublabel: "Exclusivité possible (B2C & B2B)",
      },
      {
        label: "Chantiers ouverts",
        value: `${Math.max(1, params.totalOpenWalloniaCount)} dossier${params.totalOpenWalloniaCount > 1 ? "s" : ""}`,
        sublabel: localLabel,
      }
    )}

    ${
      hasLocalSample && sampleParts.length > 0
        ? renderCalloutBox({
            label: `Exemple de chantier actuellement ouvert ${provinceLocative}`,
            value: sampleParts.join(" · "),
            tone: "info",
          })
        : ""
    }

    <h2 style="margin: 22px 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
      Ce qui distingue Aegis Solaire des plateformes classiques
    </h2>

    ${renderSpecsTable([
      { label: "Abonnement mensuel", value: "0 €/mois — aucun engagement ni forfait" },
      {
        label: "Achat à la carte sans pack",
        value: "Dès 29,50 € HT via Bancontact ou Carte bancaire",
      },
      {
        label: "Packs crédits dégressifs",
        value: "12, 24 ou 60 crédits jusqu'à -24 % · facture TVA 21 %",
      },
      {
        label: "Option sans concurrent",
        value: "Exclusivité Totale B2C (7 cr. · 65 € HT) & B2B 100 % exclusif",
      },
      {
        label: "Garantie prospect joignable",
        value: "Injoignable après 3 essais → recrédit sous 24 h ouvrées",
      },
      {
        label: "Offre d'accueil RESCERT",
        value: "3 crédits offerts dès validation de votre accès",
      },
    ])}

    ${renderActionBox({
      kicker: `Accès pré-rempli · ${provinceLabel}`,
      title: "Activer mon espace gratuit",
      subtext: "Validation RESCERT en 2 min · 3 crédits offerts après approbation",
      ctaLabel: hasLocalSample ? "Voir le dossier & m'inscrire" : "Activer mon accès gratuit",
      ctaUrl: inviteUrl,
      secondaryLabel: "Consulter l'annuaire RESCERT",
      secondaryUrl: directoryUrl,
    })}

    <p style="margin: 18px 0 0 0; font-size: 13px; line-height: 1.45; color: #4D6374;">
      Une question sur nos dossiers ${escapeEmailHtml(provinceLocative)} ? Répondez simplement à ce message ou écrivez à <a href="mailto:contact@aegissolaire.com" style="color: #194767; text-decoration: underline;">contact@aegissolaire.com</a>.
    </p>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader,
    reference: `RÉSEAU RESCERT · ${provinceLabel.toUpperCase()}`,
    context: `SÉLECTION RÉSEAU AGRÉÉ · ${provinceLabel.toUpperCase()}`,
    contextColor: "#305A76",
    headline: `Chantiers vérifiés ${provinceLocative}`,
    subtitle: `Accès réservé aux installateurs RESCERT pour ${company}`,
    statusPill: {
      text: "0 €/mois · 3 crédits d'accueil après validation RESCERT",
      tone: "success",
    },
    bodyHtml,
    logoHref: inviteUrl,
    footerLinks: [
      { label: "Activer mon accès", href: inviteUrl },
      { label: "Annuaire RESCERT", href: directoryUrl },
      { label: "Ne plus recevoir d'invitations", href: optoutUrl },
    ],
    footerNote:
      "Invitation B2B envoyée sur la base du registre public RESCERT Wallonie/Bruxelles. Assistance : contact@aegissolaire.com.",
  })

  const text = [
    `SÉLECTION RÉSEAU RESCERT — ${provinceLabel.toUpperCase()}`,
    `Bonjour ${greetingName},`,
    "",
    `Votre entreprise étant certifiée RESCERT ${provinceLocative}, nous vous ouvrons l'accès au portail Aegis Solaire (0 €/mois, sans abonnement).`,
    sampleParts.length > 0
      ? `Exemple de chantier ouvert actuellement ${provinceLocative} : ${sampleParts.join(" · ")}`
      : "",
    "",
    "Conditions partenaires :",
    "- 0 €/mois d'abonnement : achat à la carte dès 29,50 € HT (Bancontact/Carte) ou packs jusqu'à -24 %",
    "- Concurrence limitée à 3 installateurs max en B2C (ou Exclusivité Totale B2C à 65 € HT · B2B 100 % exclusif)",
    "- Garantie prospect joignable (recrédit sous 24 h ouvrées)",
    "- 3 crédits d'accueil offerts dès validation de votre n° RESCERT",
    "",
    `Activer votre accès pré-rempli : ${inviteUrl}`,
    `Ne plus recevoir ces invitations : ${optoutUrl}`,
    "",
    "La Direction des Partenariats — Aegis Solaire (contact@aegissolaire.com)",
  ]
    .filter(Boolean)
    .join("\n")

  return { subject, text, html, inviteUrl, optoutUrl }
}
