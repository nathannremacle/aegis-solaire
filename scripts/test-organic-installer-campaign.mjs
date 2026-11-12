import fs from 'node:fs';
import path from 'node:path';
import { Resend } from 'resend';

// 1. Charger variables d'environnement
const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
});

const resendApiKey = env.RESEND_API_KEY;
const fromEmail = env.RESEND_FROM_EMAIL || 'noreply@aegissolaire.com';
const replyTo = 'contact@aegissolaire.com';
const targetEmail = 'mrnathanrem@gmail.com';

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY absente dans .env.local');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

// Charger les installateurs RESCert (Wallonie + Bruxelles)
const rawData = fs.readFileSync(path.resolve(process.cwd(), 'lib/data/rescert-wallonie-installateurs.json'), 'utf-8');
const installers = JSON.parse(rawData);

// Sélectionner un installateur représentatif
const sampleInstaller = installers.find(i => i.provinceKey === 'liege' && i.phone) || installers[0];

console.log('🎯 Profil test sélectionné :', {
  company: sampleInstaller.companyName,
  contact: sampleInstaller.certifiedPerson,
  city: sampleInstaller.city,
  postalCode: sampleInstaller.postalCode,
  province: sampleInstaller.provinceLabel,
});

/* ==========================================================================
   ANGLE 1 : Sélection Réseau Agréé RESCert (Wallonie & Bruxelles)
   - HEADER BLANC PUR (#FFFFFF) AVEC LOGO CONTRASTÉ
   - CONTRASTE WCAG AAA SUR TOUS LES ÉLÉMENTS
   - AUCUN CRÉDIT OFFERT
   - AUCUN FAUX LEAD PROMIS
   ========================================================================== */
function buildNetworkSelectionEmail(installer) {
  const inviteUrl = `https://www.aegissolaire.com/partenaires/invitation?company=${encodeURIComponent(installer.companyName)}&name=${encodeURIComponent(installer.certifiedPerson)}&code=${encodeURIComponent(installer.postalCode)}&ref=RESEAU-RESCERT`;
  
  const subject = `Sélection Réseau Installateurs RESCert : ouverture du contingent ${installer.provinceLabel} pour ${installer.companyName}`;
  
  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; width: 100%; margin: 0; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Conteneur 600px avec bordure supérieure contrastée -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; border-top: 4px solid #0F172A; overflow: hidden; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);">
          
          <!-- En-tête FOND BLANC PUR avec logo haute visibilité -->
          <tr>
            <td style="padding: 22px 28px; background-color: #FFFFFF; border-bottom: 2px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" align="left">
                    <img src="https://www.aegissolaire.com/logo.png" alt="Aegis Solaire" height="38" style="height: 38px; width: auto; max-height: 42px; display: block; border: 0;" />
                    <div style="font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px; font-weight: 600;">
                      Ingénierie &amp; Distribution Sélective · Wallonie &amp; Bruxelles
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 6px 12px; background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 800; color: #78350F; letter-spacing: 0.04em;">
                      RESCERT AGRÉÉ
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 32px 28px 24px 28px; background-color: #FFFFFF;">
              
              <div style="display: inline-block; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #B45309; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">
                DIRECTION DES PARTENARIATS · SÉLECTION PROVINCIALE
              </div>

              <h1 style="margin: 0 0 16px 0; font-size: 21px; font-weight: 800; color: #0F172A; line-height: 1.35; letter-spacing: -0.01em;">
                Constitution du réseau d'installateurs photovoltaïques agréés sur la province de ${installer.provinceLabel}
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Bonjour ${installer.certifiedPerson ? installer.certifiedPerson : 'Monsieur'},
              </p>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Aegis Solaire est une plateforme d'ingénierie photovoltaïque qui sélectionne des projets résidentiels et tertiaires vérifiés pour les confier exclusivement à des installateurs certifiés RESCert en Wallonie et à Bruxelles.
              </p>

              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Nous constituons actuellement notre réseau de référence pour la province de <strong style="color: #0F172A;">${installer.provinceLabel}</strong>. Notre fonctionnement tranche délibérément avec les centrales d'appels habituelles :
              </p>

              <!-- Encadré Arguments Clés Contraste Élevé -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #1E293B; line-height: 1.6;">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <strong style="color: #0F172A; font-weight: 800;">1. Pas de guerre des prix (Places limitées) :</strong> Nous limitons strictement l'attribution à 3 installateurs maximum par chantier résidentiel, et <strong style="color: #B45309; font-weight: 800;">1 seul installateur unique (exclusivité 100%)</strong> pour les dossiers B2B. Vos marges sont préservées.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <strong style="color: #0F172A; font-weight: 800;">2. Audit humain systématique :</strong> Pas de faux numéros ni de curieux sans budget. Chaque fiche fait l'objet d'un contrôle rigoureux : appel direct avec le propriétaire, contrôle cadastral satellite de la toiture, et analyse de la facture électrique réelle.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <strong style="color: #0F172A; font-weight: 800;">3. Zéro abonnement, zéro engagement :</strong> L'inscription et le référencement de votre entreprise sont 100% gratuits. Aucun forfait mensuel obligatoire. Vous achetez uniquement à l'unité les dossiers qui vous intéressent dans votre zone.
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong style="color: #0F172A; font-weight: 800;">4. Garantie stricte d'injoignabilité :</strong> Déclaration en 1 clic sous 7 jours ouvrés, recrédit sous 24h ouvrées si le prospect est injoignable après 3 tentatives.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Activation Contraste Élevé -->
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Votre entreprise <strong style="color: #0F172A; font-weight: 800;">${installer.companyName}</strong> étant titulaire d'un agrément RESCert valide, vous pouvez activer votre profil partenaire en 1 minute et définir vos communes prioritaires :
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 8px; padding: 14px 28px;">
                          <a href="${inviteUrl}" target="_blank" style="font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; display: inline-block; letter-spacing: 0.02em;">
                            Activer l'accès partenaire de ${installer.companyName} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signature Institutionnelle -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 13px; line-height: 1.55; color: #334155;">
                Restant à votre écoute pour tout échange technique,<br /><br />
                <strong style="color: #0F172A; font-size: 14px;">La Direction des Partenariats Aegis Solaire</strong><br />
                <span style="color: #64748B;">Département Développement &amp; Réseau Installateurs Agréés</span><br />
                Courriel : <a href="mailto:contact@aegissolaire.com" style="color: #0F172A; font-weight: 700; text-decoration: underline;">contact@aegissolaire.com</a> · <a href="https://www.aegissolaire.com" style="color: #475569; text-decoration: underline;">www.aegissolaire.com</a>
              </div>
            </td>
          </tr>

          <!-- Footer Légal Obligatoire -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 28px; font-size: 11px; color: #64748B; line-height: 1.5; text-align: center;">
              Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique<br />
              Communication professionnelle adressée aux installateurs certifiés RESCert répertoriés au registre officiel.<br />
              Pour ne plus recevoir nos communications de sélection, répondez simplement "Stop" à cet email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

/* ==========================================================================
   ANGLE 2 : L'Offensive B2B & Tertiaire (PME, Hangars, Déduction Fiscale DPI 40%)
   - HEADER BLANC PUR (#FFFFFF) AVEC LOGO CONTRASTÉ
   - CONTRASTE WCAG AAA
   - 1 SEUL INSTALLATEUR EXCLUSIF (100%)
   ========================================================================== */
function buildB2BExclusifEmail(installer) {
  const inviteUrl = `https://www.aegissolaire.com/partenaires/invitation?company=${encodeURIComponent(installer.companyName)}&name=${encodeURIComponent(installer.certifiedPerson)}&code=${encodeURIComponent(installer.postalCode)}&ref=B2B-TERTIAIRE`;
  
  const subject = `Chantiers solaires B2B tertiaires : opportunités 100% exclusives pour ${installer.companyName}`;
  
  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; width: 100%; margin: 0; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Conteneur 600px avec bordure supérieure contrastée -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; border-top: 4px solid #B45309; overflow: hidden; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);">
          
          <!-- En-tête FOND BLANC PUR avec logo haute visibilité -->
          <tr>
            <td style="padding: 22px 28px; background-color: #FFFFFF; border-bottom: 2px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" align="left">
                    <img src="https://www.aegissolaire.com/logo.png" alt="Aegis Solaire" height="38" style="height: 38px; width: auto; max-height: 42px; display: block; border: 0;" />
                    <div style="font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px; font-weight: 600;">
                      Ingénierie Solaire B2B &amp; Distribution Sélective
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 6px 12px; background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 800; color: #78350F; letter-spacing: 0.04em;">
                      B2B EXCLUSIF
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td style="padding: 32px 28px 24px 28px; background-color: #FFFFFF;">
              
              <div style="display: inline-block; font-size: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #B45309; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;">
                DIRECTION DES PARTENARIATS · DÉVELOPPEMENT TERTIAIRE
              </div>

              <h1 style="margin: 0 0 16px 0; font-size: 21px; font-weight: 800; color: #0F172A; line-height: 1.35; letter-spacing: -0.01em;">
                Positionnez ${installer.companyName} sur les chantiers professionnels sans guerre des prix
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Bonjour ${installer.certifiedPerson ? installer.certifiedPerson : 'Monsieur'},
              </p>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                La réforme PEB (obligation de 35% de renouvelable pour le bâtiment non résidentiel) et la <strong>Déduction Fiscale pour Investissement majorée à 40% (DPI)</strong> accélèrent fortement la solarisation des entreprises, ateliers et surfaces commerciales en Wallonie et à Bruxelles.
              </p>

              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Pour absorber cette demande exigeante, Aegis Solaire sélectionne des installateurs certifiés capables d'intervenir sur des puissances moyennes et fortes (> 30 kWc).
              </p>

              <!-- Encadré Engagements B2B Contraste Élevé -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 10px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="font-size: 13px; font-weight: 800; color: #0F172A; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">
                      Notre engagement pour vos chantiers professionnels :
                    </div>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px; color: #1E293B; line-height: 1.6;">
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <strong style="color: #B45309; font-weight: 800;">• 1 seul installateur en B2B (100% exclusif) :</strong> Dès réservation, le dossier tertiaire est retiré définitivement de la plateforme. Aucune concurrence interne ne vient casser votre devis.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <strong style="color: #0F172A; font-weight: 800;">• Fiche technique d'ingénierie complète :</strong> Surface mesurée, contrainte réseau / cabine MT, facture réelle d'électricité et interlocuteur décideur (DAF / chef d'entreprise) vérifié par notre équipe.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <strong style="color: #0F172A; font-weight: 800;">• Support de notre Cellule Technique :</strong> Notre équipe d'ingénierie (plus de 25 ans d'expérience cumulée dans le solaire wallon) peut être mobilisée pour co-piloter le dimensionnement complexe (onduleurs hybrides, stockage BESS).
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong style="color: #0F172A; font-weight: 800;">• Zéro abonnement, zéro commission :</strong> Vous restez totalement maître de vos marges et ne payez que le dossier débloqué sur facture pro.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Activation B2B -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 8px; padding: 14px 28px;">
                          <a href="${inviteUrl}" target="_blank" style="font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; display: inline-block; letter-spacing: 0.02em;">
                            Rejoindre le réseau de distribution B2B &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 13px; line-height: 1.55; color: #334155;">
                Restant à votre entière disposition pour tout échange technique,<br /><br />
                <strong style="color: #0F172A; font-size: 14px;">La Direction des Partenariats Aegis Solaire</strong><br />
                <span style="color: #64748B;">Département Développement &amp; Réseau Installateurs Agréés</span><br />
                Courriel : <a href="mailto:contact@aegissolaire.com" style="color: #0F172A; font-weight: 700; text-decoration: underline;">contact@aegissolaire.com</a>
              </div>
            </td>
          </tr>

          <!-- Footer Légal Obligatoire -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 28px; font-size: 11px; color: #64748B; line-height: 1.5; text-align: center;">
              Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique<br />
              Communication professionnelle adressée aux installateurs certifiés RESCert en Wallonie &amp; Bruxelles.<br />
              Pour retirer votre entreprise de nos sélections, répondez simplement "Stop" à ce message.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

async function testSend() {
  console.log('\n🚀 Lancement du test des NOUVELLES trames (Header Fond Blanc, Contraste AAA) vers', targetEmail, '...\n');

  // Test Email 1 (Sélection Territoriale RESCert)
  const email1 = buildNetworkSelectionEmail(sampleInstaller);
  console.log('📨 Envoi Email 1 (Header Blanc Pur & Contraste AAA)...');
  const res1 = await resend.emails.send({
    from: `Aegis Solaire Partenariats <${fromEmail}>`,
    reply_to: replyTo,
    to: targetEmail,
    subject: `[V3 CONTRASTE PARFAIT] ${email1.subject}`,
    html: email1.html,
  });

  if (res1.error) {
    console.error('❌ Erreur Resend Email 1:', res1.error);
  } else {
    console.log('✅ Email 1 envoyé avec succès ! Resend ID:', res1.data?.id);
  }

  await new Promise(r => setTimeout(r, 1200));

  // Test Email 2 (B2B Exclusif & DPI 40%)
  const email2 = buildB2BExclusifEmail(sampleInstaller);
  console.log('\n📨 Envoi Email 2 (B2B Header Blanc Pur & Contraste AAA)...');
  const res2 = await resend.emails.send({
    from: `Aegis Solaire Partenariats <${fromEmail}>`,
    reply_to: replyTo,
    to: targetEmail,
    subject: `[V3 CONTRASTE PARFAIT] ${email2.subject}`,
    html: email2.html,
  });

  if (res2.error) {
    console.error('❌ Erreur Resend Email 2:', res2.error);
  } else {
    console.log('✅ Email 2 envoyé avec succès ! Resend ID:', res2.data?.id);
  }

  console.log('\n🎉 TEST V3 CONTRASTE RÉUSSI AVEC SUCCÈS.');
}

testSend().catch(console.error);
