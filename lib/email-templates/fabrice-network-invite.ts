/**
 * Modèle et générateur d'invitation réseau grossiste de Fabrice Remacle
 * pour les installateurs photovoltaïques agréés en Wallonie.
 * Posture : Grossiste de confiance de longue date -> proposition de chantiers qualifiés sans guerre des prix.
 */

export interface FabriceInviteData {
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

/**
 * Remplace les variables dynamiques (ex: {{prenom}}, {{lien}}, {{entreprise}}, {{credits}})
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
  const credits = String(variables.freeCredits ?? 2)

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

  // Si le texte contient l'URL d'invitation brute, s'assurer qu'elle pointe vers le lien dynamique
  if (result.includes("/partenaires/invitation")) {
    result = result.replace(/https?:\/\/[^\s\n]+\/partenaires\/invitation[^\s\n]*/g, variables.inviteUrl)
  }

  return result
}

/**
 * Construit l'objet du mail
 */
export function buildFabriceInviteSubject(data: FabriceInviteData): string {
  const company = data.companyName?.trim() ? ` pour ${data.companyName.trim()}` : ""
  const name = data.installerName?.trim() || "partenaire"

  if (data.tone === "tutoiement") {
    return `Un mot de Fabrice : chantiers photovoltaïques qualifiés en Wallonie${company}`
  }
  if (data.tone === "court_whatsapp") {
    return `Fabrice Remacle — Chantiers solaires qualifiés Wallonie`
  }
  return `Fabrice Remacle — Opportunités de chantiers solaires vérifiés${company}`
}

/**
 * Construit le texte brut par défaut selon l'angle et le ton choisi
 * avec tournure de phrase professionnelle et gestion de l'option de crédits.
 */
export function buildFabriceInvitePlainText(data: FabriceInviteData): string {
  const name = data.installerName?.trim() || (data.tone === "tutoiement" ? "{{prenom}}" : "Monsieur")
  const company = data.companyName?.trim() ? ` chez ${data.companyName.trim()}` : ""
  const showCredits = data.includeCreditsText !== false && data.freeCredits > 0
  const creditsCount = data.freeCredits > 0 ? data.freeCredits : 2

  const creditsBlockTutoiement = showCredits
    ? `\nComme on se connaît bien, je t'ai fait créditer ${creditsCount} crédits d'accueil sur ton espace pour que tu puisses tester et débloquer ton 1er dossier B2C gratuitement sans rien payer.\n`
    : `\n`

  const creditsBlockVouvoiement = showCredits
    ? `\nDans le cadre de nos relations, je vous ai fait allouer ${creditsCount} crédits d'accueil sur votre espace afin que vous puissiez tester et débloquer votre 1er dossier sans aucun engagement financier.\n`
    : `\n`

  const noteBlock = data.customNote?.trim() ? `\nNote personnelle : ${data.customNote.trim()}\n` : ""

  if (data.tone === "tutoiement") {
    return `Salut ${name},

Je t'écris pour te recommander une plateforme wallonne avec laquelle je collabore : Aegis Solaire. C'est un réseau de confiance qui sélectionne uniquement des installateurs sérieux pour des projets photovoltaïques concrets, en résidentiel et en tertiaire (B2C & B2B).

Leur fonctionnement tranche nettement avec les centrales d'appels habituelles :
1. Maximum 3 artisans par projet en résidentiel (et exclusivité totale 100% à un seul installateur en B2B/tertiaire).
2. Dossier technique complet avant diffusion : surface, pente, toiture, facture d'électricité réelle, photo satellite et coordonnées vérifiées par téléphone avant publication.
3. Zéro abonnement, zéro commission sur ton chiffre d'affaires : tu choisis uniquement les dossiers qui t'intéressent dans ta zone via un système simple de crédits.
${noteBlock}${creditsBlockTutoiement}
Tu peux activer ton accès réservé en 1 minute ici :
${data.inviteUrl}

Regarde les dossiers actuellement disponibles en Wallonie. Si tu as la moindre question ou si tu veux qu'on regarde un projet ensemble, donne-moi un coup de fil sur mon portable.

À très bientôt,

Fabrice Remacle
Email : contact@aegissolaire.com`.trim()
  }

  if (data.tone === "court_whatsapp") {
    const bonus = showCredits
      ? ` Je t'ai fait réserver ${creditsCount} crédits offerts pour tester ton 1er dossier gratuit : ${data.inviteUrl} .`
      : ` Tu peux activer ton accès réservé ici : ${data.inviteUrl} .`
    return `Salut ${name}, c'est Fabrice Remacle. Je te conseille de t'inscrire sur Aegis Solaire, une plateforme sérieuse avec qui je collabore pour des chantiers solaires qualifiés en Wallonie (toiture & facture vérifiées, max 3 artisans, zéro commission).${bonus} Donne-moi un coup de fil sur mon portable si tu as la moindre question !`.trim()
  }

  // Vouvoiement
  return `Bonjour ${name}${company},

Je me permets de vous contacter pour vous recommander la plateforme wallonne Aegis Solaire, avec laquelle je collabore. Il s'agit d'un réseau de confiance qui sélectionne des installateurs de référence pour des projets photovoltaïques concrets et vérifiés, en résidentiel et en tertiaire (B2C & B2B).

Leur fonctionnement se distingue nettement des centrales d'appels habituelles :
1. Maximum 3 installateurs par projet en résidentiel (et exclusivité totale 100% à un seul installateur en B2B/tertiaire).
2. Dossier technique complet avant diffusion : surface, pente, toiture, facture d'électricité réelle, photo satellite et coordonnées vérifiées par téléphone avant publication.
3. Zéro abonnement, zéro commission sur votre chiffre d'affaires : vous choisissez uniquement les dossiers qui vous intéressent dans votre zone via un système simple de crédits.
${noteBlock}${creditsBlockVouvoiement}
Vous pouvez activer votre accès réservé en 1 minute ici :
${data.inviteUrl}

N'hésitez pas à consulter les dossiers actuellement disponibles en Wallonie. Si vous avez la moindre question ou si vous souhaitez que l'on étudie un projet ensemble, vous pouvez me contacter par e-mail à contact@aegissolaire.com.

Bien cordialement,

Fabrice Remacle
Email : contact@aegissolaire.com`.trim()
}

/**
 * Génère un message WhatsApp optimisé et court
 */
export function buildFabriceWhatsAppMessage(data: FabriceInviteData): string {
  const name = data.installerName?.trim() || "l'ami"
  const showCredits = data.includeCreditsText !== false && data.freeCredits > 0
  const bonus = showCredits ? ` (je t'ai fait réserver ${data.freeCredits} crédits offerts pour tester)` : ""

  return `Salut ${name}, c'est Fabrice Remacle. Je te conseille de regarder Aegis Solaire, une plateforme sérieuse avec qui je collabore pour des chantiers photovoltaïques qualifiés en Wallonie (max 3 installateurs, audit toiture & facture vérifiés, zéro commission). Voici ton lien d'accès privilégié${bonus} : ${data.inviteUrl} . Donne-moi un coup de fil sur mon portable si tu as des questions !`
}

/**
 * Rendu HTML professionnel formaté Swiss Editorial avec logo officiel contrasté sur fond blanc
 */
export function renderFabriceInviteHtml(data: FabriceInviteData, customBodyText?: string): string {
  const baseUrl = getSiteBaseUrl()
  const logoUrl = `${baseUrl}/logo.png`
  const subject = buildFabriceInviteSubject(data)
  const name = escapeHtml(data.installerName?.trim() || (data.tone === "tutoiement" ? "Partenaire" : "Monsieur"))
  const company = data.companyName?.trim() ? ` (${escapeHtml(data.companyName.trim())})` : ""

  const rawText = customBodyText?.trim() || buildFabriceInvitePlainText(data)
  
  // Formatage des paragraphes pour le HTML
  const formattedParagraphs = rawText
    .split(/\n\n+/)
    .map((p) => {
      const cleanP = escapeHtml(p.trim())
      // Détection des listes à puces 1. 2. 3.
      if (cleanP.includes("1.") && cleanP.includes("2.")) {
        const items = cleanP
          .split(/\n/)
          .map((item) => `<li style="margin-bottom: 6px; line-height: 1.5;">${item.replace(/^[0-9]+\.\s*/, "")}</li>`)
          .join("")
        return `<ol style="margin: 14px 0 16px 20px; padding: 0; color: #111815; font-size: 14px;">${items}</ol>`
      }
      // Remplacement du lien brut par un bouton/lien stylisé s'il est isolé
      if (cleanP === escapeHtml(data.inviteUrl)) {
        return `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
            <tr>
              <td align="left">
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="background-color: #0B2B22; border-radius: 4px; padding: 13px 26px;">
                      <a href="${data.inviteUrl}" target="_blank" style="font-size: 14px; font-weight: 700; color: #FAF8F5; text-decoration: none; display: inline-block; letter-spacing: 0.02em;">
                        Activer mon accès privilégié &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `
      }
      return `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.65; color: #111815;">${cleanP.replace(/\n/g, "<br />")}</p>`
    })
    .join("")

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; background-color: #FAF8F5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; font-variant-numeric: tabular-nums !important; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; color: #111815;">

  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5;">
    <tr>
      <td align="center" style="padding: 24px 12px 40px 12px;">

        <!-- Main Wrapper (600px) -->
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2DDD3; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 12px -4px rgba(17, 24, 21, 0.06);">
          
          <!-- Header Blanc Pur avec logo contrasté -->
          <tr>
            <td style="background-color: #FFFFFF; padding: 20px 24px; border-bottom: 2px solid #0B2B22;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <img src="${logoUrl}" alt="Aegis Solaire" height="34" style="display: block; max-height: 34px; width: auto;" />
                  </td>
                  <td align="right" valign="middle" class="mono" style="font-family: ui-monospace, monospace; font-size: 11px; color: #0B2B22; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
                    Réseau Partenaires · Wallonie
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Eyebrow Bar Privée -->
          <tr>
            <td style="background-color: #F0ECE3; padding: 9px 24px; border-bottom: 1px solid #E2DDD3;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" class="mono" style="font-family: ui-monospace, monospace; font-size: 11px; font-weight: 600; color: #0B2B22; text-transform: uppercase; letter-spacing: 0.05em;">
                    INVITATION DIRECTE · RÉSEAU FABRICE REMACLE
                  </td>
                  <td align="right" class="mono" style="font-family: ui-monospace, monospace; font-size: 11px; color: #525E59;">
                    ${escapeHtml(data.companyName || "Artisan Qualifié")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contenu du message -->
          <tr>
            <td style="padding: 28px 24px 20px 24px;">
              ${formattedParagraphs}

              <!-- Encadré réassurance réseau -->
              <div style="margin-top: 24px; padding: 14px 18px; background-color: #FAF8F5; border-left: 3px solid #0B2B22; border-radius: 4px;">
                <p style="margin: 0; font-size: 12px; color: #525E59; line-height: 1.5;">
                  <strong>Engagement qualité :</strong> Aegis Solaire est une initiative gérée en direct depuis la région liégeoise, dédiée exclusivement aux artisans RESCERT et entreprises d'installation en Wallonie.
                </p>
              </div>

              <!-- Signature Fabrice Remacle -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 28px; border-top: 1px solid #E2DDD3; padding-top: 18px;">
                <tr>
                  <td align="left" valign="middle">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #111815;">
                      Fabrice Remacle
                    </p>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #525E59;">
                      Fournisseur &amp; Partenaire Matériel Photovoltaïque
                    </p>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #525E59;" class="mono">
                      Email : contact@aegissolaire.com · Wallonie, Belgique
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer institutionnel légal -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 14px 24px; border-top: 1px solid #E2DDD3; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #8C827A;" class="mono">
                Aegis Solaire · Initiative exploitée par INIT42 (Liège, Belgique — BCE 1039.899.980)
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`.trim()
}
