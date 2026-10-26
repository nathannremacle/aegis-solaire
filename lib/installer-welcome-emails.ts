import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "contact@aegissolaire.com"
const replyToEmail = process.env.RESEND_REPLY_TO ?? "contact@aegissolaire.com"

export function getSiteBaseUrl(reqOrigin?: string): string {
  if (reqOrigin && typeof reqOrigin === "string" && !reqOrigin.includes("localhost:0")) {
    return reqOrigin.replace(/\/$/, "")
  }
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.aegissolaire.com").replace(/\/$/, "")
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
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
  // Le logo doit toujours pointer vers l'URL publique HTTPS absolue pour être visible dans tous les webmails (Gmail, Outlook...)
  const publicAssetBase = "https://www.aegissolaire.com"
  const logoUrl = `${publicAssetBase}/logo.png`
  const firstName = data.firstName?.trim() ? data.firstName.trim() : "Partenaire"
  const company = data.companyName?.trim() ? data.companyName.trim() : "votre entreprise"
  const email = data.email?.trim() || ""

  const subject = `Bienvenue sur Aegis Solaire — Confirmez votre adresse email (${company})`

  const text = `Bonjour ${firstName},

Bienvenue sur la plateforme Aegis Solaire !

Nous avons bien enregistré votre demande d'adhésion au réseau des installateurs photovoltaïques certifiés en Région wallonne pour ${company}.

Pour confirmer qu'il s'agit bien de votre adresse email et activer le traitement prioritaire de votre dossier, veuillez cliquer sur le lien sécurisé ci-dessous :

👉 Confirmer mon adresse email :
${data.verificationUrl}

Prochaines étapes de votre intégration :
1. Validation de votre email (immédiat en 1 clic).
2. Contrôle de conformité de votre certification RESCERT Photovoltaïque et vérification BCE/TVA par nos équipes sous 24 à 48h.
3. Déblocage de votre accès à la Marketplace des leads solaires qualifiés dans vos zones d'intervention.

Aegis Solaire en bref :
✅ Pas d'abonnement – 100% à la carte, aucun engagement mensuel ni frais cachés.
✅ Fiches techniques complètes – surface de toiture, historique de consommation kWh, type de compteur et coordonnées vérifiées avant transmission.
✅ Concurrence plafonnée – 2 installateurs maximum par projet résidentiel et exclusivité stricte (1 seul artisan) sur les chantiers professionnels B2B.
✅ Vous gardez le contrôle – pas de chantiers sélectionnés ? Zéro coût.

Des questions sur votre adhésion ?
Notre équipe support partenaires est à votre disposition :
Email : contact@aegissolaire.com

Cordialement,
L'équipe Aegis Solaire

--
Plateforme éditée par INIT42 (Nathan Remacle) · BCE / TVA BE 1039.899.980 · Liège, Belgique.
Conformément au RGPD, vous disposez d'un droit d'accès et d'opposition (dpo@aegissolaire.com).`.trim()

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
    }
    table { border-collapse: separate; border-spacing: 0; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      font-variant-numeric: tabular-nums !important;
    }
    a { color: #2563EB; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-body { padding: 24px 18px !important; }
      .email-header { padding: 18px 18px !important; }
      .bento-cell { display: block !important; width: 100% !important; padding-right: 0 !important; margin-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 28px 12px 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container avec liseré Cobalt Tech au sommet -->
        <table role="presentation" class="email-container" width="600" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #2563EB; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header Blanc Pur pour contraste maximal avec logo.png -->
          <tr>
            <td class="email-header" style="background-color: #FFFFFF; padding: 22px 32px; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="https://www.aegissolaire.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${logoUrl}" alt="Aegis Solaire" width="160" height="34" style="height: 34px; width: auto; max-width: 180px; display: block; border: 0; outline: none; text-decoration: none;" />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span class="mono" style="display: inline-block; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; letter-spacing: 0.04em; text-transform: uppercase;">
                      Réseau Agréé Wallonie
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="email-body" style="padding: 34px 32px 28px 32px;">
              
              <!-- Greeting & Subject Headline -->
              <p class="mono" style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #2563EB; text-transform: uppercase; letter-spacing: 0.08em;">
                Validation de compte installateur
              </p>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; line-height: 1.25; color: #0F172A; letter-spacing: -0.02em;">
                Confirmez votre adresse email
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Bonjour <strong>${escapeHtml(firstName)}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Bienvenue sur <strong>Aegis Solaire</strong> ! Nous avons bien enregistré la candidature de votre société <strong>${escapeHtml(company)}</strong> pour rejoindre notre réseau sélectif d'installateurs photovoltaïques certifiés en Wallonie.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Veuillez confirmer qu'il s'agit bien de votre adresse email (<span class="mono" style="font-weight: 600; color: #0F172A;">${escapeHtml(email)}</span>) en cliquant sur le bouton ci-dessous :
              </p>

              <!-- Main Verification CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center" style="padding: 4px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #2563EB; border-radius: 10px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
                          <a href="${data.verificationUrl}" target="_blank" style="display: inline-block; padding: 15px 34px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: 0.01em;">
                            Confirmer mon adresse email &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span style="font-size: 12px; color: #64748B;">Lien sécurisé et immédiat · Valable 72 heures</span>
                  </td>
                </tr>
              </table>

              <!-- Bento Process Timeline -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 28px; padding: 20px;">
                <tr>
                  <td style="padding-bottom: 12px;">
                    <p class="mono" style="margin: 0; font-size: 11px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.06em;">
                      ⚡ Prochaines étapes de votre activation :
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #E2E8F0;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td width="28" valign="top" class="mono" style="font-weight: 700; color: #2563EB; font-size: 13px;">01.</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #334155;">
                          <strong style="color: #0F172A;">Confirmation e-mail :</strong> Valide votre canal officiel et sécurise votre compte partenaire.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #E2E8F0;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td width="28" valign="top" class="mono" style="font-weight: 700; color: #F59E0B; font-size: 13px;">02.</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #334155;">
                          <strong style="color: #0F172A;">Contrôle RESCERT & BCE :</strong> Nos auditeurs vérifient votre certification RESCERT Photovoltaïque et vos assurances sous 24 à 48h.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-top: 1px solid #E2E8F0;">
                    <table role="presentation" width="100%">
                      <tr>
                        <td width="28" valign="top" class="mono" style="font-weight: 700; color: #059669; font-size: 13px;">03.</td>
                        <td valign="top" style="font-size: 13px; line-height: 1.5; color: #334155;">
                          <strong style="color: #0F172A;">Accès Marketplace :</strong> Dès validation, vous accédez aux demandes de devis géolocalisées dans vos provinces cibles.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Aegis Solaire en bref (HomeDeal style) -->
              <h2 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #0F172A;">
                Aegis Solaire en bref :
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                    &#10003;
                  </td>
                  <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                    <strong style="color: #0F172A;">Pas d'abonnement</strong> &mdash; 100% à la carte, vous ne réglez que les dossiers que vous choisissez de débloquer.
                  </td>
                </tr>
                <tr>
                  <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                    &#10003;
                  </td>
                  <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                    <strong style="color: #0F172A;">Coordonnées &amp; données techniques</strong> &mdash; surface toiture, facture annuelle, photos et téléphone vérifiés.
                  </td>
                </tr>
                <tr>
                  <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                    &#10003;
                  </td>
                  <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                    <strong style="color: #0F172A;">Plafond strict de concurrence</strong> &mdash; 2 installateurs maximum en résidentiel, exclusivité 100% en tertiaire B2B.
                  </td>
                </tr>
                <tr>
                  <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                    &#10003;
                  </td>
                  <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                    <strong style="color: #0F172A;">Pas de dossiers pris ? Pas de frais !</strong> Vous conservez la maîtrise intégrale de votre planning.
                  </td>
                </tr>
              </table>

              <!-- Contact & Support -->
              <div style="background-color: #F1F5F9; border-left: 3px solid #0F172A; padding: 16px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0F172A;">
                  Une question sur votre adhésion ?
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #475569;">
                  Notre équipe support partenaires est à votre entière écoute. Répondez simplement à cet e-mail ou écrivez-nous directement à <a href="mailto:contact@aegissolaire.com" style="color: #2563EB; font-weight: 600; text-decoration: underline;">contact@aegissolaire.com</a>.
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br />
                <a href="${data.verificationUrl}" style="color: #2563EB; word-break: break-all;">${data.verificationUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 22px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; line-height: 1.6; color: #64748B;">
              <p style="margin: 0 0 6px 0;">
                <strong>Aegis Solaire</strong> &mdash; Plateforme d'audit financier et de mise en relation photovoltaïque indépendante en Wallonie.
              </p>
              <p style="margin: 0 0 6px 0;">
                Éditée par <strong>INIT42</strong> (Nathan Remacle, personne physique) · BCE/TVA <span class="mono">BE 1039.899.980</span> · Liège, Belgique.
              </p>
              <p style="margin: 0;">
                Vous recevez cet email car une candidature a été déposée pour votre société sur notre site. Conformément au RGPD, vous disposez d'un droit d'accès et d'opposition via <a href="mailto:dpo@aegissolaire.com" style="color: #475569;">dpo@aegissolaire.com</a>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  return { subject, text, html }
}

/* ==========================================================================
   2. EMAIL DE BIENVENUE SUR LA MARKETPLACE (CANDIDATURE VALIDÉE / ACCEPTÉE)
   ========================================================================== */

export interface InstallerMarketplaceWelcomeData {
  applicationId?: string
  firstName: string
  lastName?: string
  companyName: string
  email: string
  rescertRef?: string
  marketplaceUrl?: string
  baseUrl?: string
}

export function buildInstallerMarketplaceWelcomeEmail(data: InstallerMarketplaceWelcomeData): {
  subject: string
  text: string
  html: string
} {
  // Le logo doit toujours pointer vers l'URL publique HTTPS absolue pour être visible dans tous les webmails (Gmail, Outlook...)
  const publicAssetBase = "https://www.aegissolaire.com"
  const logoUrl = `${publicAssetBase}/logo.png`
  const firstName = data.firstName?.trim() ? data.firstName.trim() : "Partenaire"
  const company = data.companyName?.trim() ? data.companyName.trim() : "votre société"
  const rescert = data.rescertRef?.trim() ? ` (Réf. RESCERT : ${data.rescertRef.trim()})` : ""
  const baseUrl = data.baseUrl || publicAssetBase
  const marketplaceUrl =
    data.marketplaceUrl || `${baseUrl}/partenaires/dashboard`

  const subject = `${firstName}, votre compte est validé — Bienvenue sur la Marketplace Aegis Solaire`

  const text = `Cher ${firstName},

Excellente nouvelle : votre compte installateur pour ${company} a été validé avec succès par notre équipe technique${rescert} !

Vous avez désormais un accès direct à la Marketplace Aegis Solaire pour débloquer des demandes de devis solaires qualifiées dans votre région en Wallonie.

👉 Accéder à la Marketplace maintenant :
${marketplaceUrl}

La Marketplace Aegis Solaire en bref :
✅ Pas d’abonnement – vous ne payez que pour les demandes de devis que vous choisissez d'acquérir.
✅ Fiches techniques vérifiées – surface toiture, historique de facture kWh, raccordement ORES/RESA et coordonnées complètes à portée de main.
✅ Concurrence saine & maîtrisée – maximum 2 installateurs par projet résidentiel et exclusivité totale (1 seul installateur) en B2B.
✅ Facturation claire sans engagement et sans tracas.
✅ Pas de chantiers sélectionnés ? Zéro frais ! Vous gardez le contrôle total.

3 étapes rapides pour démarrer :
1. Connectez-vous à votre espace Marketplace : ${marketplaceUrl}
2. Définissez vos zones d'intervention favorites (Liège, Namur, Brabant wallon, Hainaut, Luxembourg).
3. Débloquez vos premières fiches techniques et contactez directement les porteurs de projet.

Des questions ?
Notre équipe support et relation partenaires est à votre entière disposition pour vous accompagner dans la prise en main de votre espace.
Il vous suffit de répondre directement à cet email ou de nous écrire à contact@aegissolaire.com.

Cordialement,
L'équipe Aegis Solaire
Aegis Solaire Wallonie

--
Plateforme éditée par INIT42 (Nathan Remacle) · BCE / TVA BE 1039.899.980 · Liège, Belgique.`.trim()

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
    }
    table { border-collapse: separate; border-spacing: 0; }
    img { border: 0; outline: none; text-decoration: none; display: block; }
    .mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      font-variant-numeric: tabular-nums !important;
    }
    a { color: #2563EB; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-body { padding: 24px 18px !important; }
      .email-header { padding: 18px 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 28px 12px 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container avec liseré Vert Émeraude au sommet -->
        <table role="presentation" class="email-container" width="600" style="width: 600px; max-width: 600px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: 4px solid #10B981; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
          
          <!-- Header Blanc Pur pour contraste maximal avec logo.png -->
          <tr>
            <td class="email-header" style="background-color: #FFFFFF; padding: 22px 32px; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="https://www.aegissolaire.com" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${logoUrl}" alt="Aegis Solaire" width="160" height="34" style="height: 34px; width: auto; max-width: 180px; display: block; border: 0; outline: none; text-decoration: none;" />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span class="mono" style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; color: #047857; font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; letter-spacing: 0.04em; text-transform: uppercase;">
                      &#10003; Compte Validé
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="email-body" style="padding: 34px 32px 28px 32px;">
              
              <p class="mono" style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.08em;">
                Accès Marketplace Débloqué
              </p>
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; line-height: 1.25; color: #0F172A; letter-spacing: -0.02em;">
                Bienvenue sur la Marketplace Aegis Solaire !
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Cher <strong>${escapeHtml(firstName)}</strong>,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Bonne nouvelle : votre dossier d'installateur pour <strong>${escapeHtml(company)}</strong> a été validé avec succès par notre équipe technique. Votre agrément <strong>RESCERT Photovoltaïque</strong> a bien été authentifié.
              </p>
              <p style="margin: 0 0 26px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Votre espace partenaire est désormais actif. Vous pouvez dès maintenant consulter et acquérir des demandes de devis rigoureusement auditées dans vos provinces d'intervention en Wallonie.
              </p>

              <!-- Main Marketplace CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center" style="padding: 4px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 10px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);">
                          <a href="${marketplaceUrl}" target="_blank" style="display: inline-block; padding: 15px 36px; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; letter-spacing: 0.01em;">
                            Accéder à la Marketplace des Leads &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span class="mono" style="font-size: 12px; color: #64748B;">Accès direct · Portail Installateurs Wallonie</span>
                  </td>
                </tr>
              </table>

              <!-- Points clés HomeDeal style Bento -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 22px; margin-bottom: 28px;">
                <h2 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em;">
                  La Marketplace Aegis Solaire en bref :
                </h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                      &#10003;
                    </td>
                    <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                      <strong style="color: #0F172A;">Pas d'abonnement</strong> &mdash; Vous ne payez que pour les demandes de devis que vous choisissez de débloquer.
                    </td>
                  </tr>
                  <tr>
                    <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                      &#10003;
                    </td>
                    <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                      <strong style="color: #0F172A;">Coordonnées &amp; fiches techniques complètes</strong> &mdash; Toiture, puissance estimée, compteur et coordonnées vérifiés.
                    </td>
                  </tr>
                  <tr>
                    <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                      &#10003;
                    </td>
                    <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                      <strong style="color: #0F172A;">Facturation claire et transparente</strong> &mdash; Sans engagement de durée, sans tracas administratif.
                    </td>
                  </tr>
                  <tr>
                    <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                      &#10003;
                    </td>
                    <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                      <strong style="color: #0F172A;">Plafond strict de concurrence</strong> &mdash; 2 installateurs maximum sur un dossier résidentiel (exclusivité 100% en B2B).
                    </td>
                  </tr>
                  <tr>
                    <td width="22" valign="top" style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #059669; line-height: 1.5;">
                      &#10003;
                    </td>
                    <td valign="top" style="padding: 6px 0; font-size: 14px; line-height: 1.5; color: #334155;">
                      <strong style="color: #0F172A;">Pas de chantiers sélectionnés ? Pas de frais !</strong> Vous conservez la totale liberté de vos interventions.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- 3 étapes pour démarrer -->
              <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
                Conseils pour bien démarrer :
              </h3>
              <ol style="margin: 0 0 26px 20px; padding: 0; font-size: 14px; line-height: 1.6; color: #334155;">
                <li style="margin-bottom: 6px;">
                  Connectez-vous sur votre espace <a href="${marketplaceUrl}" style="color: #2563EB; font-weight: 600;">Portail Partenaire</a>.
                </li>
                <li style="margin-bottom: 6px;">
                  Ajustez vos filtres régionaux pour cibler vos provinces de prédilection en Wallonie.
                </li>
                <li style="margin-bottom: 0;">
                  Consultez les dossiers disponibles et débloquez votre première opportunité.
                </li>
              </ol>

              <!-- Dedicated contact assistance -->
              <div style="background-color: #F1F5F9; border-left: 3px solid #2563EB; padding: 16px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0F172A;">
                  Des questions sur le fonctionnement ou un dossier ?
                </p>
                <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #475569;">
                  L'équipe support et relation partenaires Aegis Solaire est à votre entière disposition pour vous assister. Il vous suffit de répondre directement à cet e-mail ou de nous écrire à :
                </p>
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #0F172A;">
                  ✉️ <strong>Email d'assistance directe :</strong> <a href="mailto:contact@aegissolaire.com" style="color: #2563EB; font-weight: 600; text-decoration: underline;">contact@aegissolaire.com</a>
                </p>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                Lien direct vers la Marketplace :<br />
                <a href="${marketplaceUrl}" style="color: #2563EB; word-break: break-all;">${marketplaceUrl}</a>
              </p>

            </td>
          </tr>

          <!-- Footer Legal -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 22px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; line-height: 1.6; color: #64748B;">
              <p style="margin: 0 0 6px 0;">
                <strong>Aegis Solaire</strong> &mdash; Plateforme d'audit financier et de mise en relation photovoltaïque indépendante en Wallonie.
              </p>
              <p style="margin: 0 0 6px 0;">
                Éditée par <strong>INIT42</strong> (Nathan Remacle, personne physique) · BCE/TVA <span class="mono">BE 1039.899.980</span> · Liège, Belgique.
              </p>
              <p style="margin: 0;">
                Vous recevez cet email car votre entreprise est agréée en tant qu'installateur partenaire sur notre plateforme.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

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
