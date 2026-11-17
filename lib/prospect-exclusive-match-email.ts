import { Resend } from "resend"
import { getProvinceDisplayLabel } from "@/lib/belgium-regions"
import { getGrdLabel } from "@/lib/lead-display-helpers"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

export interface ProspectExclusiveMatchPayload {
  email: string
  firstName?: string | null
  leadId?: string | null
  city?: string | null
  province?: string | null
  estimatedPowerKwc?: number | null
  surfaceArea?: number | null
  grd?: string | null
  contactPreference?: string | null
  partnerCompany: string
  partnerEmail?: string | null
  partnerPhone?: string | null
  partnerRescertRef?: string | null
  partnerCity?: string | null
}

function sanitizePartnerEmail(email?: string | null): string | null {
  const clean = email?.trim()
  if (!clean || !clean.includes("@")) return null
  if (clean.toLowerCase().endsWith("@aegissolaire.com")) return null
  return clean
}

function sanitizeRescertRef(ref?: string | null): string | null {
  const clean = ref?.trim()
  if (!clean) return null
  if (/^(0123456789\d*|test|none|na|n\/a)$/i.test(clean)) return null
  return clean
}

function resolveContactPreferenceCopy(pref?: string | null): {
  specLabel: string
  stepClauseHtml: string
  stepClauseText: string
} {
  const clean = (pref || "").toLowerCase().trim()
  if (
    clean === "written_first" ||
    clean.includes("écrit") ||
    clean.includes("ecrit") ||
    clean.includes("sms") ||
    clean.includes("email")
  ) {
    return {
      specLabel: "Par écrit d'abord (e-mail ou SMS) — consigne transmise",
      stepClauseHtml:
        "<strong>par écrit (e-mail ou SMS)</strong>, conformément à votre préférence, avant tout appel ou visite",
      stepClauseText:
        "par écrit (e-mail ou SMS), conformément à votre préférence, avant tout appel ou visite",
    }
  }
  if (clean === "direct_call" || clean.includes("appel")) {
    return {
      specLabel: "Appel téléphonique autorisé (9 h – 18 h) — consigne transmise",
      stepClauseHtml:
        "<strong>par téléphone en heures ouvrables (9&nbsp;h&nbsp;–&nbsp;18&nbsp;h)</strong>, selon votre préférence",
      stepClauseText:
        "par téléphone en heures ouvrables (9 h – 18 h), selon votre préférence",
    }
  }
  return {
    specLabel: "À votre rythme, sans démarchage abusif",
    stepClauseHtml: "à votre rythme et <strong>sans démarchage intrusif</strong>",
    stepClauseText: "à votre rythme et sans démarchage intrusif",
  }
}

function renderStepRow(
  stepNumber: string,
  title: string,
  descriptionHtml: string,
  isLast = false
): string {
  const borderStyle = isLast ? "border-bottom: 0;" : "border-bottom: 1px solid #E6EDF1;"
  return `<tr>
    <td style="padding: 10px 0; ${borderStyle} vertical-align: top;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td width="38" style="width: 38px; padding: 2px 10px 0 0; vertical-align: top;">
            <span class="tabular" style="display: inline-block; padding: 3px 7px; border-radius: 5px; background-color: #E8F2ED; color: #1D5D45; font-size: 12px; font-weight: bold; line-height: 1.25; font-variant-numeric: tabular-nums;">${escapeEmailHtml(stepNumber)}</span>
          </td>
          <td style="vertical-align: top;">
            <strong style="display: block; font-size: 14px; line-height: 1.35; color: #142D42;">${escapeEmailHtml(title)}</strong>
            <p style="margin: 3px 0 0 0; font-size: 14px; line-height: 1.5; color: #4D6374;">${descriptionHtml}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

/**
 * Construit l'e-mail envoyé au prospect B2C lorsqu'un installateur réserve
 * l'exclusivité totale de son dossier : positionnement assertif de tri comparatif
 * (3 solutions étudiées -> 2 écartées manuellement -> 1 retenue), transparence
 * sur la rémunération par le réseau partenaire (zéro surcoût client) et
 * protection stricte de l'exclusivité acquise par l'installateur.
 */
export function buildProspectExclusiveMatchEmail(
  payload: ProspectExclusiveMatchPayload
): {
  subject: string
  html: string
  text: string
} {
  const rawName = (payload.firstName || "").trim() || "Madame, Monsieur"
  const rawCity = (payload.city || "").trim()
  const rawProvince = (payload.province || "").trim()
  const provinceDisplay = rawProvince ? getProvinceDisplayLabel(rawProvince) : ""
  const cityLabel = rawCity || provinceDisplay || "Wallonie"
  const locationDisplay =
    rawCity &&
    provinceDisplay &&
    provinceDisplay.toLowerCase() !== rawCity.toLowerCase() &&
    !rawCity.toLowerCase().includes(provinceDisplay.toLowerCase())
      ? `${rawCity} (${provinceDisplay})`
      : cityLabel

  const baseUrl = getEmailSiteBaseUrl()
  const leadRefCode = payload.leadId ? String(payload.leadId).slice(0, 8).toUpperCase() : null

  const kwcLabel =
    payload.estimatedPowerKwc && payload.estimatedPowerKwc > 0
      ? `${payload.estimatedPowerKwc.toString().replace(".", ",")} kWc`
      : "Sur mesure"

  const surfaceText =
    payload.surfaceArea && payload.surfaceArea > 0
      ? `${Math.round(payload.surfaceArea).toLocaleString("fr-BE")} m²`
      : null

  const rawGrd = (payload.grd || "").trim()
  const rawGrdDisplay =
    rawGrd && rawGrd.toLowerCase() !== "unknown" ? getGrdLabel(rawGrd) : null
  const grdLabel =
    rawGrdDisplay === "Ores"
      ? "ORES"
      : rawGrdDisplay === "Resa"
        ? "RESA"
        : rawGrdDisplay

  const projectSublabelParts = [
    surfaceText ? `Toiture ${surfaceText}` : null,
    cityLabel,
    grdLabel,
  ].filter(Boolean)
  const projectSublabel = projectSublabelParts.join(" · ") || `Projet à ${cityLabel}`

  const kwcDetail =
    payload.estimatedPowerKwc && payload.estimatedPowerKwc > 0
      ? surfaceText
        ? `${kwcLabel} · Toiture ${surfaceText}`
        : kwcLabel
      : surfaceText
        ? `À affiner sur site · Toiture ${surfaceText}`
        : "À confirmer sur site avec vous"

  const cleanPhone = payload.partnerPhone?.trim() || null
  const cleanPartnerEmail = sanitizePartnerEmail(payload.partnerEmail)
  const partnerContact = [cleanPhone, cleanPartnerEmail].filter(Boolean).join(" · ")
  const cleanRescert = sanitizeRescertRef(payload.partnerRescertRef)
  const partnerCitySuffix =
    payload.partnerCity?.trim() &&
    !payload.partnerCompany.toLowerCase().includes(payload.partnerCity.trim().toLowerCase())
      ? ` (${payload.partnerCity.trim()})`
      : ""

  const contactPref = resolveContactPreferenceCopy(payload.contactPreference)
  const escapedPartner = escapeEmailHtml(payload.partnerCompany)
  const escapedCity = escapeEmailHtml(cityLabel)
  const mailtoSubject = encodeURIComponent(
    `Suivi de mon projet solaire à ${cityLabel}${leadRefCode ? ` (#${leadRefCode})` : ""}`
  )
  const mailtoHref = `mailto:contact@aegissolaire.com?subject=${mailtoSubject}`

  const subject = `Votre projet solaire à ${cityLabel} — 1 partenaire RESCERT retenu sur 3 (sans engagement)`
  const preheader = `Notre Cellule Technique a analysé 3 solutions locales sur ${cityLabel}, écarté 2 offres moins compétitives et retenu ${payload.partnerCompany} (RESCERT).`

  const bodyHtml = `
    <p style="margin: 16px 0 12px 0; font-size: 15px; line-height: 1.55; color: #142D42;">
      Bonjour <strong>${escapeEmailHtml(rawName)}</strong>,
    </p>

    <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.55; color: #142D42;">
      Suite à votre demande sur <strong>${escapedCity}</strong>, notre Cellule Technique a <strong>analysé et trié manuellement <span class="tabular" style="font-variant-numeric: tabular-nums;">3</span> solutions d'installateurs certifiés RESCERT</strong> de votre secteur afin de ne retenir que la plus avantageuse pour votre habitation.
    </p>

    <!-- Bloc résultat du tri comparatif manuel -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 14px 16px; background-color: #F0F5F8; border-left: 3px solid #1D5D45; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #1D5D45; line-height: 1.35;">
            Résultat de notre tri comparatif (<span class="tabular" style="font-variant-numeric: tabular-nums;">3</span> options étudiées &rarr; <span class="tabular" style="font-variant-numeric: tabular-nums;">1</span> retenue)
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #142D42;">
            &bull; <strong><span class="tabular" style="font-variant-numeric: tabular-nums;">2</span> propositions écartées d'avance pour vous protéger :</strong> nos analystes ont volontairement écarté deux sociétés de la zone dont les conditions n'étaient pas à la hauteur (tarifs <strong class="tabular" style="font-variant-numeric: tabular-nums;">25 à 35&nbsp;% plus chers</strong> à puissance égale, garanties plus faibles ou délais trop longs). Plutôt que de vous faire perdre du temps avec <span class="tabular" style="font-variant-numeric: tabular-nums;">2</span> rendez-vous inutiles et hors de prix, nous les avons bloquées avant même qu'elles ne vous contactent.
          </p>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #142D42;">
            &bull; <strong><span class="tabular" style="font-variant-numeric: tabular-nums;">1</span> seul partenaire retenu sur le volet — ${escapedPartner} :</strong> parmi les <span class="tabular" style="font-variant-numeric: tabular-nums;">3</span> profils comparés sur <strong>${escapedCity}</strong>, c'est l'installateur certifié <strong>RESCERT</strong> qui présente aujourd'hui le <strong>meilleur équilibre prix / qualité matériel / sérieux technique</strong> que nous connaissons dans votre région.
          </p>
        </td>
      </tr>
    </table>

    ${renderFiguresBox(
      {
        label: "Tri comparatif effectué",
        value: "1 retenu sur 3",
        sublabel: "2 options surcotées écartées",
        width: "50%",
      },
      {
        label: "Pré-dimensionnement",
        value: kwcLabel,
        sublabel: projectSublabel,
        width: "50%",
      }
    )}

    <!-- Bloc transparence & garanties -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px; width: 100%; background-color: #F6F8FA; border: 1px solid #DCE5EB; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td style="padding: 14px 16px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: bold; color: #142D42; line-height: 1.35;">
            Vos garanties Aegis Solaire (sans engagement)
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 3px 0; font-size: 14px; line-height: 1.5; color: #142D42;">
                &bull; <strong>Transparence sur notre rémunération :</strong> ce service de sélection est sans frais pour vous. Aegis Solaire est rémunéré uniquement par les installateurs agréés du réseau pour la mise en relation qualifiée — <strong>jamais par vous</strong>, et sans aucun surcoût ajouté à votre devis.
              </td>
            </tr>
            <tr>
              <td style="padding: 3px 0; font-size: 14px; line-height: 1.5; color: #142D42;">
                &bull; <strong>Confidentialité stricte &amp; zéro démarchage :</strong> vos coordonnées ne sont <strong>jamais revendues</strong> ni partagées à des centres d'appels. Seul <strong>${escapedPartner}</strong> dispose de votre dossier.
              </td>
            </tr>
            <tr>
              <td style="padding: 3px 0 0 0; font-size: 14px; line-height: 1.5; color: #142D42;">
                &bull; <strong>Entreprise contrôlée en Belgique :</strong> agrément <strong>RESCERT Photovoltaïque</strong>, numéro BCE, assurance décennale et conformité <strong>RGIE / GRD</strong> vérifiés. L'étude technique et le devis sont sans engagement.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Section 1 : Fiche partenaire et préférences -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 22px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #E6EDF1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
            Votre partenaire retenu et vos paramètres
          </h2>
          ${renderSpecsTable([
            { label: "Installateur retenu", value: `${payload.partnerCompany}${partnerCitySuffix}` },
            {
              label: "Sélection technique",
              value: `1 retenu sur 3 analysés à ${cityLabel} (2 offres écartées)`,
            },
            {
              label: "Agrément & conformité",
              value: cleanRescert
                ? `Certifié RESCERT PV (${cleanRescert}) · Normes RGIE`
                : "Certifié RESCERT Photovoltaïque · Normes RGIE",
            },
            { label: "Zone d'intervention", value: locationDisplay },
            { label: "Pré-dimensionnement", value: kwcDetail },
            ...(grdLabel ? [{ label: "Gestionnaire de réseau", value: grdLabel }] : []),
            { label: "Premier contact souhaité", value: contactPref.specLabel },
            ...(partnerContact
              ? [{ label: "Coordonnées directes", value: partnerContact }]
              : []),
            { label: "Étude & devis", value: "Sans frais et sans engagement" },
          ])}
        </td>
      </tr>
    </table>

    <!-- Section 2 : Déroulement étape par étape -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 22px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #E6EDF1;">
          <h2 style="margin: 0 0 8px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
            Comment se déroule la suite ?
          </h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
            ${renderStepRow(
              "01",
              "Prise de contact sereine",
              `<strong>${escapedPartner}</strong> dispose déjà de votre dossier (<span class="tabular" style="font-variant-numeric: tabular-nums;">${escapeEmailHtml(kwcLabel)}</span>) et prendra contact avec vous ${contactPref.stepClauseHtml}. Vous évitez d'avoir à répéter votre projet à trois sociétés.`
            )}
            ${renderStepRow(
              "02",
              "Étude technique & devis détaillé",
              `L'installateur valide votre toiture, le dimensionnement optimal et le raccordement ${grdLabel ? `(${escapeEmailHtml(grdLabel)})` : "au réseau"}, puis vous remet une offre chiffrée transparente avec matériel et garanties.`
            )}
            ${renderStepRow(
              "03",
              "Décision sereine à votre rythme",
              `Vous étudiez l'offre tranquillement chez vous, sans aucune obligation de signer. Si l'installateur tardait à vous joindre ou si vous aviez une question technique sur votre dossier, notre équipe reste joignable à tout moment.`,
              true
            )}
          </table>
        </td>
      </tr>
    </table>

    <!-- Section 3 : Suivi & assistance dossier -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 18px; width: 100%; background-color: #F0F5F8; border: 1px solid #DCE5EB; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td style="padding: 14px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td class="actions-td" style="vertical-align: middle;">
                <span style="display: block; color: #305A76; font-size: 13px; font-weight: bold; line-height: 1.35;">
                  Suivi de votre dossier
                </span>
                <strong style="display: block; margin: 3px 0 4px 0; font-size: 16px; font-weight: bold; line-height: 1.3; color: #142D42;">
                  Une question ou un délai de réponse inhabituel ?
                </strong>
                <span style="display: block; color: #4D6374; font-size: 13px; line-height: 1.45;">
                  Si <strong>${escapedPartner}</strong> tardait à vous recontacter ou si vous souhaitez une précision sur votre dossier, écrivez directement à notre équipe.
                </span>
              </td>
              <td class="actions-td action-cell" width="42%" style="width: 42%; padding-left: 14px; text-align: center; vertical-align: middle;">
                <a href="${escapeEmailHtml(mailtoHref)}" style="display: block; padding: 10px 12px; border: 1px solid #142D42; border-radius: 6px; background-color: #142D42; color: #FFFFFF; font-size: 14px; font-weight: bold; text-decoration: none; text-align: center;">Écrire à Aegis Solaire</a>
                <span class="tabular" style="display: inline-block; margin-top: 6px; font-size: 12px; color: #4D6374; font-variant-numeric: tabular-nums;">Réponse sous 24 h ouvrées</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader,
    reference: leadRefCode ? `Dossier #${leadRefCode}` : `Suivi · ${cityLabel}`,
    context: "Tri comparatif terminé · Label RESCERT",
    contextColor: "#1D5D45",
    headline: "1 partenaire RESCERT retenu sur 3",
    subtitle: `2 propositions moins compétitives écartées pour vous · Sélection : ${payload.partnerCompany}`,
    statusPill: { text: "Tri effectué · Étude sans frais et sans engagement", tone: "success" },
    bodyHtml,
    logoHref: baseUrl,
    footerNote:
      "Vous recevez cet e-mail suite à votre demande d'étude photovoltaïque sur Aegis Solaire. Aucun paiement ni engagement n'est lié à ce message.",
    footerLinks: [
      { label: "Site Aegis Solaire", href: baseUrl },
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Confidentialité & RGPD", href: `${baseUrl}/politique-confidentialite` },
    ],
  })

  const text = [
    `Bonjour ${rawName},`,
    "",
    `Suite à votre demande sur ${cityLabel}, notre Cellule Technique a analysé et trié manuellement 3 solutions d'installateurs certifiés RESCERT de votre secteur afin de ne retenir que la plus avantageuse pour votre habitation.`,
    "",
    "RÉSULTAT DE NOTRE TRI COMPARATIF (3 OPTIONS ÉTUDIÉES -> 1 RETENUE) :",
    "- 2 propositions écartées d'avance pour vous protéger : nos analystes ont volontairement écarté deux sociétés de la zone dont les conditions n'étaient pas à la hauteur (tarifs 25 à 35 % plus chers à puissance égale, garanties plus faibles ou délais trop longs), afin de vous éviter 2 rendez-vous inutiles et hors de prix.",
    `- 1 seul partenaire retenu sur le volet : ${payload.partnerCompany}${partnerCitySuffix} — l'installateur certifié RESCERT qui présente aujourd'hui le meilleur équilibre prix / qualité matériel / sérieux technique que nous connaissons sur ${cityLabel}.`,
    "",
    "VOS GARANTIES AEGIS SOLAIRE (SANS ENGAGEMENT) :",
    "- Transparence sur notre rémunération : ce service de sélection est sans frais pour vous. Aegis Solaire est rémunéré uniquement par les installateurs agréés du réseau pour la mise en relation qualifiée — jamais par vous, et sans aucun surcoût ajouté à votre devis.",
    `- Confidentialité stricte & zéro démarchage : vos coordonnées ne sont jamais revendues ni partagées à des centres d'appels. Seul ${payload.partnerCompany} dispose de votre dossier.`,
    "- Entreprise contrôlée en Belgique : agrément RESCERT Photovoltaïque, BCE, assurance décennale et conformité RGIE / GRD vérifiés. Étude et devis sans engagement.",
    "",
    "RÉCAPITULATIF DE VOTRE DOSSIER :",
    `- Installateur retenu : ${payload.partnerCompany}${partnerCitySuffix}`,
    `- Sélection technique : 1 retenu sur 3 analysés à ${cityLabel} (2 offres écartées)`,
    `- Agrément : ${cleanRescert ? `Certifié RESCERT PV (${cleanRescert}) · Normes RGIE` : "Certifié RESCERT Photovoltaïque · Normes RGIE"}`,
    `- Zone d'intervention : ${locationDisplay}`,
    `- Pré-dimensionnement : ${kwcDetail}`,
    grdLabel ? `- Gestionnaire de réseau : ${grdLabel}` : "",
    `- Premier contact souhaité : ${contactPref.specLabel}`,
    partnerContact ? `- Coordonnées directes : ${partnerContact}` : "",
    "- Étude & devis : Sans frais et sans engagement",
    "",
    "COMMENT SE DÉROULE LA SUITE ?",
    `01. Prise de contact sereine : ${payload.partnerCompany} dispose déjà de votre dossier (${kwcLabel}) et vous contactera ${contactPref.stepClauseText}.`,
    "02. Étude technique & devis détaillé : vérification de votre toiture et remise d'une offre chiffrée transparente avec matériel et garanties.",
    "03. Décision sereine à votre rythme : vous examinez l'offre tranquillement chez vous, sans aucune obligation de signer. En cas de question ou de délai de réponse inhabituel, écrivez-nous simplement.",
    "",
    "Une question sur votre dossier ? Répondez simplement à cet e-mail (contact@aegissolaire.com).",
    "",
    "La Cellule Technique Aegis Solaire",
    "contact@aegissolaire.com",
    "Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique",
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
