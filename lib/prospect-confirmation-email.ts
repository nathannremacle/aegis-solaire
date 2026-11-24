import crypto from "node:crypto"
import { Resend } from "resend"
import {
  escapeEmailHtml,
  getEmailSiteBaseUrl,
  renderActionBox,
  renderCalloutBox,
  renderFiguresBox,
  renderInstallerEmailShell,
  renderSpecsTable,
} from "@/lib/email-templates/installer-email-layout"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

function getEmailVerifySecret(): string {
  return (
    process.env.PARTNER_NOTIFY_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "aegis-solaire-prospect-email-verify-dev-salt"
  )
}

export function createProspectEmailVerifyToken(leadId: string, email: string): string {
  const payload = `${leadId}:${email.toLowerCase().trim()}:email_verify`
  return crypto.createHmac("sha256", getEmailVerifySecret()).update(payload).digest("hex").slice(0, 32)
}

export function verifyProspectEmailVerifyToken(
  leadId: string,
  email: string,
  token: string
): boolean {
  if (!leadId || !email || !token) return false
  const expected = createProspectEmailVerifyToken(leadId, email)
  if (expected.length !== token.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token))
}

export type ProspectConfirmationPayload = {
  leadId?: string | null
  email: string
  firstName: string
  lastName?: string | null
  segment: "B2B" | "B2C"
  surfaceType?: string | null
  surfaceArea?: number | null
  annualElectricityBill?: number | null
  estimatedSavings?: number | null
  estimatedROIYears?: number | null
  province?: string | null
  allocationMode?: string | null
}

export function buildProspectConfirmationEmail(payload: ProspectConfirmationPayload): {
  subject: string
  text: string
  html: string
} {
  const isB2C = payload.segment === "B2C"
  const isSingleVetted = isB2C && payload.allocationMode === "single_vetted"
  const rawName = payload.firstName?.trim() || "Bonjour"
  const baseUrl = getEmailSiteBaseUrl()
  const surface = payload.surfaceArea
    ? `${payload.surfaceArea.toLocaleString("fr-BE")} m²`
    : "Non spécifiée"
  const economies = payload.estimatedSavings
    ? `${payload.estimatedSavings.toLocaleString("fr-BE")} € / an`
    : "Étude en cours"
  const roi = payload.estimatedROIYears
    ? `~${payload.estimatedROIYears} ans`
    : "Selon autoconsommation"

  const subject = isB2C
    ? "Votre étude solaire — Mise en concurrence RESCERT activée pour vous obtenir le meilleur prix"
    : "Votre étude solaire B2B — Sélection du meilleur tarif RESCERT sans compromis qualité"
  const verifyUrl = payload.leadId
    ? `${baseUrl}/api/leads/verify-email?id=${encodeURIComponent(payload.leadId)}&token=${encodeURIComponent(
      createProspectEmailVerifyToken(payload.leadId, payload.email)
    )}`
    : null

  const text = `Bonjour ${rawName},

Votre dossier est entre de bonnes mains. Chez Aegis Solaire, notre rôle est d'agir de votre côté : nous mettons en concurrence les installateurs certifiés RESCERT de votre région pour vous obtenir le meilleur prix du marché, sans aucune contrepartie sur la qualité de votre future installation.

Synthèse de votre modélisation :
- Segment : ${isB2C ? "Résidentiel (Particulier)" : "Professionnel & Entreprise (B2B)"}
- Surface utile estimée : ${surface}
- Économies annuelles potentielles : ${economies}
- Retour sur investissement estimé : ${roi}

${verifyUrl
      ? `Confirmez votre adresse e-mail en 1 clic pour lancer vos devis en priorité :\n${verifyUrl}\n\n`
      : ""
    }Prochaines étapes & protection de votre budget :
${isB2C
      ? "- Mise en concurrence directe : jusqu'à 3 installateurs certifiés RESCERT locaux sont mis en compétition sur votre dossier. Sachant qu'ils sont comparés via Aegis Solaire, ils ajustent d'eux-mêmes leur marge commerciale dès le premier devis (en moyenne -18 % constatés en Wallonie)."
      : "- Sélection comparative RESCERT : votre dossier technique est confié à l'opérateur tertiaire certifié RESCERT le plus compétitif sur votre cahier des charges (toiture, cabine HT, raccordement ORES/RESA) pour maximiser votre rentabilité."
    }
- Zéro compromis sur la qualité : agrément RESCERT obligatoire, matériel Tier-1, assurance décennale et conformité RGIE / Synergrid C10/11 vérifiés.
- Protection & liberté : service 100 % gratuit, zéro surcoût ajouté à vos devis et aucune obligation de signer.

Pourquoi Aegis Solaire vous obtient un meilleur prix à qualité égale ?
Lorsqu'un installateur répond via Aegis Solaire, il sait qu'il est comparé à armes égales sur un cahier des charges strict. Il ne peut ni rogner sur la qualité, ni gonfler ses prix : c'est vous qui gardez le pouvoir de négociation, en toute sérénité.

Besoin d'une précision ? Répondez directement à cet e-mail ou écrivez à contact@aegissolaire.com.

Conformément au RGPD, vous disposez d'un droit d'accès, d'opposition et de rectification de vos données personnelles (dpo@aegissolaire.com).
Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique`

  const bodyHtml = `
    <p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.5; color: #142D42;">
      Bonjour <strong>${escapeEmailHtml(rawName)}</strong>, votre dossier est entre de bonnes mains. Notre rôle chez Aegis Solaire est d'agir <strong>de votre côté</strong> : nous mettons en concurrence les installateurs certifiés <strong>RESCERT</strong> de votre région pour vous obtenir <strong>le meilleur prix du marché, sans aucune contrepartie sur la qualité</strong> de votre future installation.
    </p>

    ${renderFiguresBox(
    {
      label: "Économies estimées",
      value: economies,
      sublabel: `Surface projetée · ${surface}`,
    },
    {
      label: "Amortissement indicatif",
      value: roi,
      sublabel: isB2C ? "3 devis mis en concurrence (-18 % moy.)" : "Sélection au meilleur rapport qualité/prix B2B",
    }
  )}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px; width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding-top: 16px; border-top: 1px solid #E6EDF1;">
          <h2 style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.25; font-weight: bold; color: #142D42;">
            Prochaines étapes &amp; protection de votre budget
          </h2>
          ${renderSpecsTable([
    { label: "Segment", value: isB2C ? "Résidentiel (Particulier)" : "Professionnel (B2B)" },
    {
      label: "Mécanisme de prix",
      value: isB2C
        ? "Jusqu'à 3 installateurs RESCERT mis en concurrence directe (baisse des marges commerciales dès le 1er devis)"
        : "Sélection comparative parmi nos installateurs RESCERT tertiaires pour retenir l'offre la plus compétitive",
    },
    {
      label: "Exigence qualité verrouillée",
      value: "Zéro compromis : agrément RESCERT obligatoire, panneaux Tier-1, conformité RGIE & Synergrid C10/11",
    },
    {
      label: "Protection & liberté",
      value: "100 % gratuit, zéro surcoût sur vos devis et sans aucun engagement de votre part",
    },
  ])}
        </td>
      </tr>
    </table>

    ${verifyUrl
      ? renderActionBox({
        kicker: "Priorisation de votre appel d'offres",
        title: "Confirmez votre e-mail en 1 clic pour lancer vos devis",
        subtext:
          "En certifiant votre adresse, vous activez l'envoi prioritaire de vos offres chiffrées. Les installateurs savent que votre dossier est vérifié et qu'ils sont mis en concurrence : ils vous proposent d'emblée leur meilleur tarif.",
        ctaLabel: "Activer ma mise en concurrence en 1 clic →",
        ctaUrl: verifyUrl,
      })
      : ""
    }

    ${renderCalloutBox({
      label: isSingleVetted
        ? "Barème Officiel €/kWc Wallonie 2026 & Grille de Contrôle Tier-1"
        : !isB2C
          ? "Inclus gratuitement : Visa de Conformité Avant Acompte (B2B)"
          : "Pourquoi Aegis Solaire vous obtient un meilleur prix à qualité égale ?",
      value: isSingleVetted
        ? "Votre étude est confiée à 1 seul installateur RESCERT sélectionné (zéro démarchage multiple). Pour contrôler son offre en toute sérénité : en 2026 en Wallonie, un tarif juste Tier-1 hors batterie se situe entre 1 150 € et 1 350 € HTVA/kWc installé (comptez +350 à +550 €/kWh pour une batterie LFP). Exigez la référence exacte des panneaux Tier-1, de l'onduleur Synergrid C10/11 et le passage RGIE inclus."
        : !isB2C
          ? "Dès que vous retenez une proposition finale, transmettez le bon de commande à notre Cellule Technique (contact@aegissolaire.com) avant versement de l'acompte pour obtenir sous 24 h votre Visa Gratuit de Conformité Cahier des Charges (Tier-1, Synergrid C10/11, DPI 40 % & garanties décennales)."
          : "Lorsqu'un installateur répond via Aegis Solaire, il sait qu'il est comparé à armes égales sur un cahier des charges strict (matériel Tier-1, garantie décennale, certification RESCERT). Il ne peut ni rogner sur la qualité, ni gonfler ses prix : c'est vous qui gardez le pouvoir de négociation, en toute sérénité.",
      tone: "info",
    })}

    <p style="margin: 14px 0 0 0; font-size: 14px; line-height: 1.5; color: #4D6374;">
      Une question ou une précision à apporter ? Répondez directement à cet e-mail ou écrivez à <a href="mailto:contact@aegissolaire.com" style="color: #194767; text-decoration: underline;">contact@aegissolaire.com</a> : notre équipe veille sur votre dossier.
    </p>
  `

  const html = renderInstallerEmailShell({
    subject,
    preheader: isB2C
      ? `Aegis Solaire met en concurrence les installateurs RESCERT de votre région pour vous obtenir le meilleur prix, sans compromis qualité · Économies estimées : ${economies}.`
      : `Aegis Solaire sélectionne le meilleur tarif RESCERT B2B sans compromis sur la qualité · Économies estimées : ${economies}.`,
    reference: isB2C ? "Résidentiel" : "B2B Expert",
    context: "Dossier pris en charge · Tiers de confiance de votre côté",
    headline: "Votre estimation solaire & mise en concurrence",
    subtitle: isB2C ? "Étude résidentielle · Wallonie" : "Étude professionnelle B2B · Wallonie",
    statusPill: {
      text: isB2C
        ? "Mise en concurrence RESCERT activée · Zéro compromis qualité"
        : "Sélection comparative RESCERT activée · Cahier des charges Tier-1",
      tone: "success",
    },
    bodyHtml,
    logoHref: baseUrl,
    footerLinks: [
      { label: "Assistance technique", href: "mailto:contact@aegissolaire.com" },
      { label: "Droits RGPD", href: "mailto:dpo@aegissolaire.com" },
      { label: "Politique de confidentialité", href: `${baseUrl}/politique-confidentialite#desinscription` },
    ],
  })

  return { subject, text, html }
}

export async function sendProspectConfirmationEmail(
  payload: ProspectConfirmationPayload
): Promise<{ success: boolean; emailId?: string | null; error?: string }> {
  if (!resendApiKey) {
    if (process.env.NODE_ENV === "development") {
      console.log("[Prospect confirmation] RESEND_API_KEY non configurée — envoi ignoré en dev pour:", payload.email)
    }
    return { success: true, emailId: null }
  }

  try {
    const resend = new Resend(resendApiKey)
    const { subject, text, html } = buildProspectConfirmationEmail(payload)

    const res = await resend.emails.send({
      from: fromEmail,
      to: payload.email,
      replyTo: replyToEmail,
      subject,
      text,
      html,
    })

    if (res.error) {
      console.error("[Prospect confirmation] Erreur Resend:", res.error)
      return { success: false, error: res.error.message }
    }

    return { success: true, emailId: res.data?.id ?? null }
  } catch (err) {
    console.error("[Prospect confirmation] Exception Resend:", err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}
