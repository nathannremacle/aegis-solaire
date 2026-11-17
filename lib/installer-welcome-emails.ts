import { Resend } from "resend"
import type { AvailableLeadSummary } from "@/lib/lead-relance-engine"
import type { InvitationLeadSummary } from "@/lib/regional-leads-catalog"
import { buildPartnerExpressLeadUrls } from "@/lib/partner-notification-tokens"
import {
  escapeEmailHtml,
  renderActionBox,
  renderCalloutBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

export function getSiteBaseUrl(reqOrigin?: string): string {
  const canonical = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
  if (
    reqOrigin &&
    typeof reqOrigin === "string" &&
    !reqOrigin.includes("localhost:0") &&
    (reqOrigin.includes("localhost") ||
      reqOrigin.includes("127.0.0.1") ||
      reqOrigin.endsWith(".vercel.app"))
  ) {
    return reqOrigin.replace(/\/$/, "")
  }
  return canonical
}

/* ==========================================================================
   1. EMAIL DE BIENVENUE + VÉRIFICATION D'ADRESSE EMAIL (INSCRIPTION FORMULAIRE)
   ========================================================================== */

export interface InstallerWelcomeVerificationData {
  applicationId: string
  firstName: string
  lastName?: string
  companyName: string
  email: string
  verificationUrl: string
  baseUrl?: string
}

export function buildInstallerWelcomeVerificationEmail(data: InstallerWelcomeVerificationData): {
  subject: string
  text: string
  html: string
} {
  const firstName = data.firstName?.trim() ? data.firstName.trim() : "Partenaire"
  const company = data.companyName?.trim() ? data.companyName.trim() : "votre entreprise"
  const email = data.email?.trim() || ""
  const appRef = (data.applicationId || "ADHESION").slice(0, 8).toUpperCase()

  const subject = `Bienvenue sur Aegis Solaire — Confirmez votre adresse e-mail (${company})`

  const text = `Bonjour ${firstName},

Bienvenue sur la plateforme Aegis Solaire !

Nous avons bien enregistré votre demande d'adhésion au réseau des installateurs photovoltaïques certifiés en Région wallonne pour ${company}.

Pour confirmer qu'il s'agit bien de votre adresse e-mail et activer le traitement prioritaire de votre dossier, cliquez sur le lien sécurisé ci-dessous :

Confirmer mon adresse e-mail :
${data.verificationUrl}

Prochaines étapes de votre intégration :
1. Validation de votre e-mail (immédiat en 1 clic).
2. Contrôle de conformité de votre certification RESCERT Photovoltaïque et vérification BCE/TVA par nos équipes sous 24 à 48h.
3. Déblocage de votre accès à la Marketplace des leads solaires qualifiés dans vos zones d'intervention.

Aegis Solaire en bref :
- Pas d'abonnement – 100 % à la carte, aucun engagement mensuel ni frais cachés.
- Fiches techniques complètes – surface de toiture, consommation kWh et coordonnées vérifiées avant transmission.
- Concurrence plafonnée – 3 installateurs maximum par projet résidentiel et exclusivité stricte (1 seul artisan) en B2B.
- Pas de chantiers sélectionnés ? Zéro coût.

Des questions sur votre adhésion ? contact@aegissolaire.com

Cordialement,
L'équipe Aegis Solaire

--
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique
Conformément au RGPD, vous disposez d'un droit d'accès et d'opposition (dpo@aegissolaire.com).`.trim()

  const bodyHtml = `
    <p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.5; color: #142d42;">
      Bonjour <strong>${escapeEmailHtml(firstName)}</strong>, la candidature de <strong>${escapeEmailHtml(company)}</strong> a bien été enregistrée. Confirmez votre adresse e-mail pour lancer le contrôle RESCERT.
    </p>

    ${renderActionBox({
      kicker: "Adresse à confirmer",
      title: email || company,
      subtext: "Lien sécurisé · Valable 72 heures",
      ctaLabel: "Confirmer mon e-mail →",
      ctaUrl: data.verificationUrl,
    })}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Prochaines étapes
          </h2>
          ${renderSpecsTable([
            { label: "01 · Confirmation e-mail", value: "Immédiate en 1 clic" },
            { label: "02 · Contrôle RESCERT & BCE", value: "Sous 24 à 48 h ouvrées" },
            { label: "03 · Accès Marketplace", value: "Dossiers qualifiés en Wallonie" },
          ])}
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 16px; width: 100%; background-color: #f0f5f8; border: 1px solid #e2eaf0; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
      <tr>
        <td style="padding: 12px 15px;">
          <h2 style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Aegis Solaire en bref
          </h2>
          ${renderSpecsTable([
            { label: "Abonnement", value: "Aucun · 100 % à la carte" },
            { label: "Concurrence", value: "Max 3 artisans B2C · Exclusif en B2B" },
            { label: "Qualification", value: "Toiture, facture & coordonnées vérifiées" },
          ])}
        </td>
      </tr>
    </table>

    <p style="margin: 14px 0 0 0; font-size: 12px; line-height: 1.5; color: #4d6374;">
      Si le bouton ne fonctionne pas : <a href="${escapeEmailHtml(data.verificationUrl)}" style="color: #194767; word-break: break-all;">${escapeEmailHtml(data.verificationUrl)}</a>
    </p>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Confirmez votre adresse e-mail pour activer votre candidature partenaire (${company}).`,
    reference: `Dossier #${appRef}`,
    context: "Validation de compte installateur",
    headline: "Confirmez votre adresse e-mail",
    subtitle: `${company} · Réseau agréé Wallonie`,
    statusPill: { text: "Étape 1 sur 2 · En attente de confirmation", tone: "warning" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Droits RGPD", href: "mailto:dpo@aegissolaire.com" },
    ],
  })

  return { subject, text, html }
}

/* ==========================================================================
   2. EMAIL DE BIENVENUE SUR LA MARKETPLACE (CANDIDATURE VALIDÉE / ACCEPTÉE)
   ========================================================================== */

export interface InstallerMarketplaceWelcomeData {
  applicationId?: string
  partnerId?: string | null
  firstName: string
  lastName?: string
  companyName: string
  email: string
  rescertRef?: string
  marketplaceUrl?: string
  setupPasswordUrl?: string | null
  baseUrl?: string
  availableLeads?: AvailableLeadSummary[]
  closedTargetLead?: InvitationLeadSummary | null
  welcomeCredits?: number
}

export function buildInstallerMarketplaceWelcomeEmail(data: InstallerMarketplaceWelcomeData): {
  subject: string
  text: string
  html: string
} {
  const publicAssetBase = "https://www.aegissolaire.com"
  const firstName = data.firstName?.trim() ? data.firstName.trim() : "Partenaire"
  const company = data.companyName?.trim() ? data.companyName.trim() : "votre société"
  const rescert = data.rescertRef?.trim() ? ` (Réf. RESCERT : ${data.rescertRef.trim()})` : ""
  const welcomeCredits = Math.max(0, Number(data.welcomeCredits) || 0)
  const baseUrl = data.baseUrl || publicAssetBase
  let extractedLeadId: string | null = null
  if (data.marketplaceUrl) {
    try {
      extractedLeadId = new URL(data.marketplaceUrl).searchParams.get("lead")
    } catch {
      extractedLeadId = null
    }
  }
  const marketplaceUrl = data.partnerId
    ? buildPartnerExpressLeadUrls(baseUrl, data.partnerId, extractedLeadId, data.email).inspectLeadUrl
    : data.marketplaceUrl || `${baseUrl}/partenaires/dashboard`
  const primaryActionUrl = data.setupPasswordUrl || marketplaceUrl
  const hasSetupPasswordUrl = Boolean(data.setupPasswordUrl)

  const getDirectLeadInspectUrl = (leadId: string) =>
    data.partnerId
      ? buildPartnerExpressLeadUrls(baseUrl, data.partnerId, leadId, data.email).inspectLeadUrl
      : `${baseUrl}/partenaires/dashboard?lead=${encodeURIComponent(leadId)}`

  const leads = data.availableLeads || []
  const hasLeads = leads.length > 0
  const closedLead = data.closedTargetLead || null

  const subject = hasLeads
    ? `${firstName}, votre compte est validé — ${leads.length} projet${leads.length > 1 ? "s" : ""} solaire${leads.length > 1 ? "s" : ""} disponible${leads.length > 1 ? "s" : ""} dans votre zone`
    : `${firstName}, votre compte est validé — Bienvenue sur la Marketplace Aegis Solaire`

  const closedLeadTextSection = closedLead
    ? `\nÀ PROPOS DU DOSSIER DE ${closedLead.city.toUpperCase()} (${closedLead.postalCode}) :\nCe chantier vient d'atteindre son quota maximum d'installateurs (${closedLead.maxSlots}/${closedLead.maxSlots} places attribuées) et est désormais clôturé. Votre profil RESCERT étant maintenant validé, vous recevrez nos alertes prioritaires dès l'ouverture des prochains chantiers dans votre secteur.\n`
    : ""

  let leadsTextSection = ""
  if (hasLeads) {
    const listText = leads
      .map((l) => {
        const seg = l.segment === "B2B" ? "PRO B2B · Exclusif" : "Résidentiel B2C"
        const quota =
          l.segment === "B2B"
            ? "1 seul artisan"
            : `${l.remainingSlots}/${l.maxSlots} place${l.remainingSlots > 1 ? "s" : ""} restante${l.remainingSlots > 1 ? "s" : ""}`
        const loc = `${l.postalCode ? l.postalCode + " " : ""}${l.city || l.provinceLabel}`
        const directUrl = getDirectLeadInspectUrl(l.id)
        return `• [${seg}] ${loc} — ~${l.estimatedPowerKwc} kWc · Toiture ${l.surfaceArea} m² · ${l.creditCost} crédits (${quota})\n  Consulter & débloquer ce dossier : ${directUrl}`
      })
      .join("\n")

    leadsTextSection = `\nDOSSIERS ACTUELLEMENT DISPONIBLES DANS VOS ZONES D'INTERVENTION :\nNous avons ${leads.length} projet(s) solaire(s) vérifié(s) actuellement en attente d'artisan partenaire :\n${listText}\n`
  }

  const text = `Cher ${firstName},

Excellente nouvelle : votre compte installateur pour ${company} a été validé avec succès par notre équipe technique${rescert} !

Vous avez désormais un accès direct à la Marketplace Aegis Solaire pour débloquer des demandes de devis solaires qualifiées dans votre région en Wallonie.
${closedLeadTextSection}${leadsTextSection}
${hasSetupPasswordUrl ? `Définir votre mot de passe et accéder à la Marketplace :\n${primaryActionUrl}\n` : `Accéder à la Marketplace maintenant :\n${marketplaceUrl}`}

La Marketplace Aegis Solaire en bref :
- Pas d’abonnement – vous ne payez que pour les demandes de devis que vous choisissez d'acquérir.
- Fiches techniques vérifiées – toiture, consommation kWh, raccordement GRD et coordonnées complètes.
- Concurrence maîtrisée – maximum 3 installateurs par projet résidentiel (ou option Exclusivité Totale à 1 clic) et exclusivité native en B2B.
${welcomeCredits > 0 ? `- Solde de bienvenue offert : ${welcomeCredits} crédits sont déjà disponibles sur votre compte pour débloquer votre 1er chantier gratuitement.\n` : ""}- Pas de chantiers sélectionnés ? Zéro frais.

Des questions ? contact@aegissolaire.com

Cordialement,
L'équipe Aegis Solaire

--
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`.trim()

  const closedLeadHtml = closedLead
    ? renderCalloutBox({
        label: `Dossier ${closedLead.city} (${closedLead.postalCode}) · Quota atteint (${closedLead.maxSlots}/${closedLead.maxSlots})`,
        value:
          "Ce chantier est clôturé. Votre profil est désormais prioritaire pour les prochains dossiers dans votre secteur.",
        tone: "warning",
      })
    : ""

  const availableLeadsHtml = hasLeads
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 18px; width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
            <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
              ${leads.length} dossier${leads.length > 1 ? "s" : ""} disponible${leads.length > 1 ? "s" : ""} dans votre secteur
            </h2>
            ${leads
              .map((lead) => {
                const isB2B = lead.segment === "B2B"
                const quotaLabel = isB2B
                  ? "Exclusif · 1 artisan"
                  : `${lead.remainingSlots}/${lead.maxSlots} place${lead.remainingSlots > 1 ? "s" : ""} dispo`
                const locationStr = `${lead.postalCode ? `${lead.postalCode} ` : ""}${lead.city || lead.provinceLabel}`
                const powerFormatted = `${lead.estimatedPowerKwc.toLocaleString("fr-BE", { maximumFractionDigits: 1 })} kWc`
                return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 10px; width: 100%; background-color: #f0f5f8; border: 1px solid #dce5eb; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
                  <tr>
                    <td style="padding: 11px 14px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td align="left" valign="middle">
                            <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; background-color: ${isB2B ? "#142d42" : "#ffffff"}; color: ${isB2B ? "#ffffff" : "#305a76"}; border: 1px solid ${isB2B ? "#142d42" : "#ccd9e2"}; font-size: 11px; font-weight: bold;">${isB2B ? "PRO B2B" : "Résidentiel"}</span>
                            <strong style="margin-left: 6px; font-size: 15px; color: #142d42;">${escapeEmailHtml(locationStr)}</strong>
                          </td>
                          <td align="right" valign="middle" class="tabular" style="font-size: 12px; font-weight: bold; color: ${lead.remainingSlots === 1 ? "#89610e" : "#1d5d45"}; white-space: nowrap;">
                            ${escapeEmailHtml(quotaLabel)}
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top: 6px; font-size: 13px; color: #4d6374; font-variant-numeric: tabular-nums;">
                            <strong style="color: #142d42;">~${escapeEmailHtml(powerFormatted)}</strong> &middot; Toiture ${lead.surfaceArea} m² &middot; <strong style="color: #142d42;">${lead.creditCost} crédits</strong>
                            &nbsp;&middot;&nbsp;
                            <a href="${escapeEmailHtml(getDirectLeadInspectUrl(lead.id))}" target="_blank" style="color: #194767; font-weight: bold; text-decoration: underline;">Consulter &rarr;</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>`
              })
              .join("")}
          </td>
        </tr>
      </table>`
    : ""

  const ctaLabel = hasSetupPasswordUrl
    ? "Créer mon mot de passe →"
    : hasLeads
      ? "Accéder aux dossiers →"
      : "Accéder à la Marketplace →"

  const bodyHtml = `
    <p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.5; color: #142d42;">
      Bonjour <strong>${escapeEmailHtml(firstName)}</strong>, votre agrément <strong>RESCERT Photovoltaïque</strong> est validé. Votre accès partenaire est actif.
    </p>

    ${closedLeadHtml}

    ${renderActionBox({
      kicker: hasSetupPasswordUrl ? "Première connexion" : "Portail Partenaires Wallonie",
      title: company,
      subtext: hasSetupPasswordUrl
        ? "Définissez votre mot de passe personnel en 30 secondes."
        : "Accès direct · Sans abonnement ni engagement.",
      ctaLabel,
      ctaUrl: primaryActionUrl,
    })}

    ${welcomeCredits > 0 ? `<div style="margin-bottom: 16px;">${renderCalloutBox({
      label: `Cadeau de bienvenue · ${welcomeCredits} crédits déjà disponibles`,
      value: `Votre portefeuille est déjà crédité de ${welcomeCredits} crédits offerts pour tester la Marketplace dès aujourd'hui et débloquer votre premier dossier résidentiel sans avance de frais.`,
      tone: "success",
    })}</div>` : ""}

    ${availableLeadsHtml}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #e4edf1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142d42;">
            Fonctionnement de votre espace
          </h2>
          ${renderSpecsTable([
            { label: "Modèle tarifaire", value: "100 % à la carte · Zéro abonnement" },
            { label: "Concurrence", value: "Max 3 artisans B2C · Exclusif B2B" },
            { label: "Zones d'alerte", value: "Modifiables à tout moment" },
          ])}
        </td>
      </tr>
    </table>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: `Compte installateur validé pour ${company}${hasLeads ? ` · ${leads.length} dossier(s) disponible(s) dans votre secteur` : ""}.`,
    reference: "Compte validé",
    context: "Accès Marketplace débloqué",
    contextColor: "#1d5d45",
    headline: "Bienvenue sur Aegis Solaire",
    subtitle: `${company}${data.rescertRef?.trim() ? ` · RESCERT ${data.rescertRef.trim()}` : ""}`,
    statusPill: { text: "Compte partenaire actif", tone: "success" },
    bodyHtml,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Accéder à mon espace", href: marketplaceUrl },
    ],
  })

  return { subject, text, html }
}

/* ==========================================================================
   3. ROUTEUR D'ENVOI D'EMAILS VIA RESEND AVEC REPLI LOCAL SIMULÉ
   ========================================================================== */

export async function sendInstallerEmail({
  to,
  subject,
  html,
  text,
  tag = "installer-transactional",
}: {
  to: string
  subject: string
  html: string
  text: string
  tag?: string
}): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
  const recipient = to.toLowerCase().trim()

  if (!recipient || !recipient.includes("@")) {
    return { success: false, error: "Adresse email destinataire invalide." }
  }

  // Si pas de clé Resend en environnement local / test
  if (!resendApiKey) {
    console.info(`[Installer Email: ${tag}] (Simulation locale) Envoyé à ${recipient} : "${subject}"`)
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    }
  }

  try {
    const resend = new Resend(resendApiKey)
    const formattedFrom = `Aegis Solaire <${fromEmail}>`

    const { data, error } = await resend.emails.send({
      from: formattedFrom,
      to: [recipient],
      replyTo: replyToEmail,
      subject: subject.trim(),
      html,
      text,
      tags: [{ name: "category", value: tag }],
    })

    if (error) {
      console.error(`[Installer Email: ${tag}] Erreur Resend:`, error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      simulated: false,
      messageId: data?.id,
    }
  } catch (err: any) {
    console.error(`[Installer Email: ${tag}] Exception:`, err)
    return { success: false, error: err.message || "Erreur interne lors de l'envoi." }
  }
}
