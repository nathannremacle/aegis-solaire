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
import {
  AI_PROJECTION_BADGE_SHORT,
  AI_PROJECTION_EMAIL_CAPTION,
} from "@/lib/lead-images"

export interface RescertSampleLeadImage {
  url: string
  isAiProjection?: boolean
}

export interface RescertSampleLeadPreview {
  id: string
  city?: string | null
  postalCode?: string | null
  provinceLabel?: string | null
  segmentLabel?: string | null
  surfaceAreaM2?: number | null
  roofMaterialLabel?: string | null
  estimatedPowerKwc?: number | null
  panelCount?: number | null
  annualBillEur?: number | null
  creditCost?: number | null
  maxSlots?: number | null
  remainingSlots?: number | null
  phoneVerifiedBySms?: boolean
  phoneCarrier?: string | null
  emailVerified?: boolean
  addressVerified?: boolean
  roofImages?: RescertSampleLeadImage[]
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

export function buildSampleLeadSummaryParts(sample: RescertSampleLeadPreview): string[] {
  const parts: string[] = []
  const loc = [sample.postalCode, sample.city].filter(Boolean).join(" ")
  if (loc) parts.push(loc)
  if (sample.surfaceAreaM2 && sample.surfaceAreaM2 > 0) {
    const mat = sample.roofMaterialLabel ? ` (${sample.roofMaterialLabel})` : ""
    parts.push(`Toiture ${Math.round(sample.surfaceAreaM2)} m²${mat}`)
  } else if (sample.roofMaterialLabel) {
    parts.push(sample.roofMaterialLabel)
  }
  if (sample.estimatedPowerKwc && sample.estimatedPowerKwc > 0) {
    const panels = sample.panelCount && sample.panelCount > 0 ? ` · ${sample.panelCount} panneaux` : ""
    parts.push(`~${String(sample.estimatedPowerKwc).replace(".", ",")} kWc${panels}`)
  }
  if (sample.annualBillEur && sample.annualBillEur > 0) {
    parts.push(`Facture ${Math.round(sample.annualBillEur).toLocaleString("fr-BE")} €/an`)
  }
  return parts
}

function renderVerificationPillHtml(text: string, tone: "success" | "info"): string {
  const palette =
    tone === "success"
      ? { bg: "#e8f2ed", color: "#1d5d45" }
      : { bg: "#f0f5f8", color: "#305a76" }
  return `<span class="tabular" style="display: inline-block; margin: 4px 6px 0 0; padding: 3px 8px; border-radius: 5px; background-color: ${palette.bg}; color: ${palette.color}; font-size: 11px; font-weight: bold; line-height: 1.35; font-variant-numeric: tabular-nums;">${escapeEmailHtml(text)}</span>`
}

export function renderSampleLeadShowcaseBox(
  sample: RescertSampleLeadPreview,
  sectionLabel: string,
  freeCredits = 3
): string {
  const loc = [sample.postalCode, sample.city].filter(Boolean).join(" ") || sample.provinceLabel || "Wallonie"
  const titleParts = [loc, sample.segmentLabel].filter(Boolean).join(" · ")
  const creditCost = typeof sample.creditCost === "number" && sample.creditCost > 0 ? sample.creditCost : 3
  const coveredByWelcome = freeCredits >= creditCost
  const maxSlots = typeof sample.maxSlots === "number" && sample.maxSlots > 0 ? sample.maxSlots : 3

  const techBits: string[] = []
  if (sample.surfaceAreaM2 && sample.surfaceAreaM2 > 0) {
    techBits.push(
      `Toiture ${Math.round(sample.surfaceAreaM2)} m²${sample.roofMaterialLabel ? ` (${sample.roofMaterialLabel})` : ""}`
    )
  }
  if (sample.estimatedPowerKwc && sample.estimatedPowerKwc > 0) {
    const panels = sample.panelCount && sample.panelCount > 0 ? ` (${sample.panelCount} panneaux)` : ""
    techBits.push(`~${String(sample.estimatedPowerKwc).replace(".", ",")} kWc${panels}`)
  }
  if (sample.annualBillEur && sample.annualBillEur > 0) {
    techBits.push(`Facture ${Math.round(sample.annualBillEur).toLocaleString("fr-BE")} €/an`)
  }
  techBits.push(`Max ${maxSlots} installateurs`)

  const pills: string[] = []
  if (sample.phoneVerifiedBySms) {
    const carrier = sample.phoneCarrier ? ` · ${sample.phoneCarrier}` : ""
    pills.push(renderVerificationPillHtml(`Téléphone vérifié par SMS (OTP)${carrier}`, "success"))
  }
  if (sample.addressVerified) {
    pills.push(renderVerificationPillHtml("Adresse certifiée SPW ICAR", "info"))
  }
  if (sample.emailVerified) {
    pills.push(renderVerificationPillHtml("E-mail confirmé", "info"))
  }

  const images = (sample.roofImages || []).filter((img) => Boolean(img?.url)).slice(0, 2)
  let imagesHtml = ""
  if (images.length === 2) {
    imagesHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 12px; width: 100%; border-collapse: collapse;">
      <tr>
        ${images
          .map((img, idx) => {
            const padStyle = idx === 0 ? "padding-right: 7px;" : "padding-left: 7px;"
            const caption = img.isAiProjection
              ? `<p style="margin: 6px 0 0 0; padding: 5px 8px; background-color: #fff5df; border-left: 3px solid #d69729; border-radius: 0 5px 5px 0; font-size: 11px; line-height: 1.35; color: #684916;">
                  <strong>${escapeEmailHtml(AI_PROJECTION_BADGE_SHORT)}</strong><br />
                  ${escapeEmailHtml(AI_PROJECTION_EMAIL_CAPTION)}
                </p>`
              : `<p style="margin: 5px 0 0 0; font-size: 12px; line-height: 1.35; color: #4d6374;">
                  <strong style="color: #142d42;">Photo réelle du bâtiment</strong> &middot; incluse avant déblocage
                </p>`
            return `<td class="photo-cell" width="50%" style="width: 50%; ${padStyle} vertical-align: top;">
              <img src="${escapeEmailHtml(img.url)}" alt="${escapeEmailHtml(img.isAiProjection ? "Vue 3D indicative de la toiture" : "Photo réelle du bâtiment")}" width="268" style="display: block; width: 100%; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 7px; border: 1px solid #e2eaf0;" />
              ${caption}
            </td>`
          })
          .join("")}
      </tr>
    </table>`
  } else if (images.length === 1) {
    const img = images[0]
    const caption = img.isAiProjection
      ? `<p style="margin: 6px 0 0 0; padding: 5px 8px; background-color: #fff5df; border-left: 3px solid #d69729; border-radius: 0 5px 5px 0; font-size: 11px; line-height: 1.35; color: #684916;">
          <strong>${escapeEmailHtml(AI_PROJECTION_BADGE_SHORT)}</strong> &mdash; ${escapeEmailHtml(AI_PROJECTION_EMAIL_CAPTION)}
        </p>`
      : `<p style="margin: 5px 0 0 0; font-size: 12px; line-height: 1.35; color: #4d6374;">
          <strong style="color: #142d42;">Photo du bâtiment incluse</strong> sur la fiche avant déblocage
        </p>`
    imagesHtml = `<div style="margin-top: 12px;">
      <img src="${escapeEmailHtml(img.url)}" alt="Visuel du bâtiment concerné" width="320" style="display: block; width: 100%; max-width: 340px; height: auto; aspect-ratio: 3 / 2; object-fit: cover; border-radius: 7px; border: 1px solid #e2eaf0;" />
      ${caption}
    </div>`
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0; background-color: #ffffff;">
    <tr>
      <td style="padding: 14px 15px;">
        <p style="margin: 0; font-size: 12px; font-weight: bold; color: #305a76; line-height: 1.35;">
          ${escapeEmailHtml(sectionLabel)}
        </p>
        <h3 style="margin: 3px 0 0 0; font-size: 17px; line-height: 1.25; font-weight: bold; color: #142d42;">
          ${escapeEmailHtml(titleParts)}
        </h3>
        ${
          techBits.length > 0
            ? `<p class="tabular" style="margin: 4px 0 0 0; font-size: 13px; line-height: 1.45; color: #4d6374; font-variant-numeric: tabular-nums;">${escapeEmailHtml(techBits.join(" · "))}</p>`
            : ""
        }
        ${pills.length > 0 ? `<div style="margin-top: 4px;">${pills.join("")}</div>` : ""}
        ${imagesHtml}
        <p class="tabular" style="margin: 10px 0 0 0; padding-top: 9px; border-top: 1px solid #e6edf1; font-size: 13px; line-height: 1.4; color: #142d42; font-variant-numeric: tabular-nums;">
          <strong>Tarif de ce dossier :</strong> ${creditCost} crédits ${
            coveredByWelcome
              ? `<span style="color: #1d5d45; font-weight: bold;">&rarr; 0 &euro; avec votre 1er dossier B2C offert</span>`
              : `(${freeCredits} crédits d'accueil déduits dès activation)`
          }
        </p>
      </td>
    </tr>
  </table>`
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
  inviteQuery.set("credits", "3")
  if (params.sampleLead?.id) inviteQuery.set("leadId", params.sampleLead.id)

  const inviteUrl = `${baseUrl}/partenaires/invitation?${inviteQuery.toString()}`
  const directoryUrl = `${baseUrl}/partenaires/annuaire`

  const hasLocalSample = Boolean(params.sampleLead?.id)
  const localLabel =
    params.provinceOpenCount > 0
      ? `dont ${params.provinceOpenCount} ouvert${params.provinceOpenCount > 1 ? "s" : ""} ${provinceLocative}`
      : `Wallonie · demandes vérifiées`

  const sampleLocShort = params.sampleLead
    ? [params.sampleLead.postalCode, params.sampleLead.city].filter(Boolean).join(" ")
    : ""
  const sampleKwcShort =
    params.sampleLead?.estimatedPowerKwc && params.sampleLead.estimatedPowerKwc > 0
      ? `~${String(params.sampleLead.estimatedPowerKwc).replace(".", ",")} kWc`
      : ""

  const subject = hasLocalSample && sampleLocShort
    ? `${company} — 1er dossier B2C offert (${sampleLocShort}${sampleKwcShort ? ` · ${sampleKwcShort}` : ""} · tél. SMS vérifié)`
    : `${company} — 1er dossier B2C offert en Wallonie (tél. vérifié SMS & vue 3D)`

  const preheader = `1er dossier B2C offert (3 crédits · valeur 29,50 € HT) · Téléphone vérifié par SMS (OTP) · Photos du bâtiment & vue 3D du toit avant déblocage.`

  const sampleParts = params.sampleLead ? buildSampleLeadSummaryParts(params.sampleLead) : []

  const greetingName = certifiedPersonClean
    ? `${certifiedPersonClean} (${company})`
    : company

  const bodyHtml = `
    <p style="margin: 18px 0 0 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Bonjour <strong>${escapeEmailHtml(greetingName)}</strong>,
    </p>
    <p style="margin: 10px 0 0 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Votre entreprise figurant au registre officiel <strong>RESCERT photovoltaïque</strong> ${escapeEmailHtml(provinceLocative)}, nous vous offrons votre <strong>1er dossier B2C (3 crédits d'accueil · 0 € à débourser)</strong> pour tester la qualité de nos chantiers vérifiés par téléphone SMS (OTP), photos du bien et vue 3D du toit.
    </p>

    ${renderFiguresBox(
      {
        label: "1er dossier B2C",
        value: "Offert (0 €)",
        sublabel: "3 crédits crédités · valeur 29,50 € HT",
      },
      {
        label: "Chantiers ouverts",
        value: `${Math.max(1, params.totalOpenWalloniaCount)} dossier${params.totalOpenWalloniaCount > 1 ? "s" : ""}`,
        sublabel: localLabel,
      }
    )}

    ${
      hasLocalSample && params.sampleLead
        ? renderSampleLeadShowcaseBox(
            params.sampleLead,
            `Exemple de dossier disponible ${provinceLocative}`,
            3
          )
        : renderCalloutBox({
            label: "Inclus sur chaque dossier avant déblocage",
            value: "Téléphone vérifié par SMS (OTP), photos du bâtiment, vue 3D indicative du toit et adresse certifiée SPW ICAR.",
            tone: "info",
          })
    }

    <h2 style="margin: 22px 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
      Pourquoi les installateurs préfèrent Aegis Solaire
    </h2>

    ${renderSpecsTable([
      { label: "1er dossier B2C offert", value: "3 crédits d'accueil offerts (0 € à débourser · valeur 29,50 € HT)" },
      { label: "Téléphone vérifié par SMS", value: "Validation obligatoire par code SMS (OTP) + contrôle opérateur" },
      { label: "Photos + vue 3D du toit", value: "Visuels du bâtiment & reconstitution 3D visibles avant déblocage" },
      { label: "Abonnement mensuel", value: "0 €/mois — aucun engagement ni forfait" },
      { label: "Concurrence plafonnée", value: "Max 3 artisans B2C (ou Exclusivité dès 59 € HT) · Max 2 en B2B (ou exclusif)" },
      { label: "Garantie prospect joignable", value: "Injoignable après 3 essais → recrédit sous 24 h ouvrées" },
    ])}

    ${renderActionBox({
      kicker: `1er dossier B2C offert · ${provinceLabel}`,
      title: "Activer mon accès & tester gratuitement",
      subtext: "Validation RESCERT en 2 min · 3 crédits offerts (0 € sans carte bancaire)",
      ctaLabel: hasLocalSample ? "Voir ce dossier & m'inscrire" : "Activer mon 1er dossier offert",
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
    headline: `1er dossier B2C offert ${provinceLocative}`,
    subtitle: `${company} · Tél. vérifié SMS (OTP), photos & vue 3D du toit`,
    statusPill: {
      text: "1er dossier B2C offert (3 crédits) · Tél. vérifié SMS · 0 €/mois",
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
    `Votre entreprise étant certifiée RESCERT ${provinceLocative}, nous vous offrons votre 1er dossier B2C (3 crédits d'accueil · 0 € à débourser, valeur 29,50 € HT) pour tester la qualité de nos chantiers sur Aegis Solaire.`,
    sampleParts.length > 0
      ? `Exemple de dossier ouvert actuellement ${provinceLocative} : ${sampleParts.join(" · ")}${params.sampleLead?.phoneVerifiedBySms ? " · Téléphone vérifié par SMS (OTP)" : ""}`
      : "",
    "",
    "Atouts de la plateforme avant déblocage :",
    "- 1er dossier B2C offert : 3 crédits offerts dès validation RESCERT (0 €/mois d'abonnement, sans carte bancaire)",
    "- Téléphone vérifié par SMS (code OTP) + contrôle ligne opérateur + adresse certifiée SPW ICAR",
    "- Photos réelles du bien + vue 3D indicative du toit visibles avant de débloquer",
    "- Concurrence limitée à 3 installateurs max en B2C (ou Exclusivité Totale dès 59 € HT) · Max 2 en B2B (ou exclusif)",
    "- Garantie prospect joignable : recrédit sous 24 h ouvrées",
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
