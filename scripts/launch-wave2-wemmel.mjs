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

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY absente dans .env.local');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

// 2. Données réelles du lead Carlos Marcelino (Wemmel - 1780)
const leadData = {
  id: "e597cc47-01f2-47e4-a953-c7e6902b2028",
  city: "Wemmel",
  postalCode: "1780",
  zoneLabel: "Wemmel (1780) · Périphérie Nord Bruxelles",
  surfaceArea: 42,
  estimatedPowerKwc: 5.4,
  annualBill: 1150,
  ownership: "Propriétaire occupant (Vérifié par téléphone)",
  roofType: "Toiture inclinée · Tuiles terre cuite",
  maxSlots: 3,
  availableSlots: 3,
  unitPriceEuros: 29.50,
};

const CARLOS_REAL_BLURRED_PHOTO_URL = "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/carlos-marcelino-wemmel-blurred.jpg";
const LOGO_URL = "https://aegissolaire.com/logo.png";

// 3. Charger et filtrer les installateurs certifiés pour la Vague 2 (75 cibles)
const wave1File = path.resolve('scratch/wave1-execution-report.json');
const wave1 = fs.existsSync(wave1File) ? JSON.parse(fs.readFileSync(wave1File, 'utf-8')) : [];
const alreadyContacted = new Set(wave1.map(w => (w.email || '').toLowerCase().trim()));

const allInstallers = JSON.parse(fs.readFileSync('lib/data/rescert-wallonie-installateurs.json', 'utf-8'));
const remaining = allInstallers.filter(inst => !alreadyContacted.has((inst.email || '').toLowerCase().trim()));

// 54 installateurs de Bruxelles-Capitale restants (100% du solde)
const bxl = remaining.filter(inst => inst.provinceLabel === 'Bruxelles-Capitale');

// 21 installateurs du Brabant wallon les plus proches de Bruxelles
const bw = remaining
  .filter(inst => inst.provinceLabel === 'Brabant wallon')
  .sort((a, b) => parseInt(a.postalCode, 10) - parseInt(b.postalCode, 10));

const neededBw = Math.max(0, 75 - bxl.length);
const selectedBw = bw.slice(0, neededBw);

const wave2Installers = [...bxl, ...selectedBw].slice(0, 75);

console.log(`Cibles sélectionnées pour la Vague 2 : ${wave2Installers.length} installateurs certifiés`);
console.log(` - Bruxelles-Capitale : ${bxl.length}`);
console.log(` - Brabant wallon : ${selectedBw.length}`);

function buildHtml(installer, lead) {
  const leadUrl = `https://aegissolaire.com/partenaires/invitation?company=${encodeURIComponent(installer.companyName)}&name=${encodeURIComponent(installer.certifiedPerson)}&code=${encodeURIComponent(installer.postalCode)}&email=${encodeURIComponent(installer.email)}&phone=${encodeURIComponent(installer.phone || '')}&leadId=${lead.id}&ref=VAGUE2-WEMMEL-1780`;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chantier solaire qualifié disponible : Wemmel (${lead.postalCode})</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; width: 100%; margin: 0; padding: 36px 12px;">
    <tr>
      <td align="center">
        
        <!-- Conteneur 600px unifié -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 14px; border: 1px solid #CBD5E1; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);">
          
          <!-- En-tête Fond Blanc Pur avec logo contrasté et badge 1 ligne -->
          <tr>
            <td style="padding: 24px 28px; background-color: #FFFFFF; border-bottom: 2px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td valign="middle" align="left" style="padding-right: 12px;">
                    <img src="${LOGO_URL}" alt="Aegis Solaire" height="38" style="height: 38px; width: auto; max-height: 42px; display: block; border: 0;" />
                    <div style="font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px; font-weight: 600;">
                      Plateforme d'Ingénierie &amp; Distribution Éthique · Bruxelles &amp; Wallonie
                    </div>
                  </td>
                  <td align="right" valign="middle" style="white-space: nowrap; width: 1%; text-align: right;">
                    <span style="display: inline-block; white-space: nowrap; padding: 6px 14px; background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 800; color: #78350F; letter-spacing: 0.04em; line-height: 1.2; text-align: center;">
                      CHANTIER QUALIFIÉ
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
                OPPORTUNITÉ RÉSIDENTIELLE · ZONE BRUXELLES-NORD (1780)
              </div>

              <h1 style="margin: 0 0 16px 0; font-size: 21px; font-weight: 800; color: #0F172A; line-height: 1.35; letter-spacing: -0.01em;">
                Demande de devis solaire vérifiée à Wemmel : attribution limitée à 3 installateurs
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Bonjour ${installer.certifiedPerson ? installer.certifiedPerson : 'Monsieur'},
              </p>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                La Cellule Technique d'Aegis Solaire a audité et validé une demande d'installation photovoltaïque résidentielle située sur votre zone d'intervention directe (<strong style="color: #0F172A;">Wemmel - 1780</strong>, périphérie Nord de Bruxelles).
              </p>

              <p style="margin: 0 0 22px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Conformément à notre charte de distribution éthique, <strong style="color: #0F172A;">ce chantier est strictement plafonné à 3 installateurs certifiés maximum</strong>. Aucune guerre des prix à 6 ou 7 poseurs : le dossier est automatiquement clôturé dès la 3ème attribution.
              </p>

              <!-- Photo réelle du bien (Carlos) floutée avec icône SVG -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px; border-radius: 10px; overflow: hidden; border: 1px solid #CBD5E1; background-color: #F8FAFC;">
                <tr>
                  <td style="padding: 0; line-height: 0; background-color: #F1F5F9; text-align: center;">
                    <img src="${CARLOS_REAL_BLURRED_PHOTO_URL}" alt="Photo de la toiture transmise par le demandeur à Wemmel" width="542" style="width: 100%; max-width: 542px; height: auto; display: block; border: 0;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; background-color: #F8FAFC; border-top: 1px solid #CBD5E1;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="middle" align="left">
                          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6px; display: inline-block;">
                              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                              <circle cx="12" cy="13" r="3"/>
                            </svg>
                            PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · WEMMEL (1780)
                          </span>
                        </td>
                        <td valign="middle" align="right" style="white-space: nowrap;">
                          <span style="font-family: ui-monospace, monospace; font-size: 10px; font-weight: 800; color: #15803D; background-color: #DCFCE7; border: 1px solid #86EFAC; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
                            AUDIT PHOTO VALIDÉ
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Fiche Technique Auditée -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 10px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td style="padding: 13px 20px; background-color: #F1F5F9; border-bottom: 1px solid #CBD5E1;">
                    <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 6px; display: inline-block;">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                      </svg>
                      FICHE TECHNIQUE AUDITÉE · RÉF. #BXL-1780-01
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Localisation du projet :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 700; color: #0F172A; text-align: right;">${lead.zoneLabel}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Statut de l'occupant :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 700; color: #16A34A; text-align: right;">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px; display: inline-block;">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          Propriétaire occupant (Vérifié)
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Surface toiture mesurée :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">42 m² · Tuiles terre cuite</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Puissance recommandée :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">~5,4 kWc (environ 12 panneaux)</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Facture électrique annuelle :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">1 150 € / an</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Places restantes :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #B45309; text-align: right; font-family: ui-monospace, monospace;">3 / 3 places disponibles</td>
                      </tr>
                      <tr>
                        <td width="50%" style="font-size: 13px; color: #475569;">Conditions d'accès :</td>
                        <td width="50%" style="font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">29,50 € HTVA (Achat à l'unité)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Engagements -->
              <div style="background-color: #F8FAFC; border-left: 3px solid #0F172A; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 13px; line-height: 1.55; color: #1E293B;">
                  <strong style="color: #0F172A;">Rappel des engagements Aegis Solaire :</strong><br />
                  • <strong>Zéro abonnement forcé :</strong> Vous ne réglez que si vous choisissez de débloquer ce dossier.<br />
                  • <strong>Zéro commission sur vos devis :</strong> Votre marge d'installation vous appartient à 100%.<br />
                  • <strong>Garantie 7 jours ouvrés :</strong> Recrédit sous 24h ouvrées si le prospect ne répond pas après 3 tentatives.
                </div>
              </div>

              <!-- Bouton d'action principal -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #0F172A; border-radius: 8px; padding: 14px 28px;">
                          <a href="${leadUrl}" target="_blank" style="font-size: 14px; font-weight: 800; color: #FFFFFF; text-decoration: none; display: inline-block; letter-spacing: 0.02em;">
                            Consulter &amp; Débloquer ce dossier à Wemmel &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Signature Institutionnelle -->
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 13px; line-height: 1.55; color: #334155;">
                Restant à votre écoute pour toute question technique,<br /><br />
                <strong style="color: #0F172A; font-size: 14px;">La Direction des Partenariats Aegis Solaire</strong><br />
                <span style="color: #64748B;">Département Développement &amp; Réseau Installateurs Agréés</span><br />
                Courriel : <a href="mailto:contact@aegissolaire.com" style="color: #0F172A; font-weight: 700; text-decoration: underline;">contact@aegissolaire.com</a> · <a href="https://aegissolaire.com" style="color: #475569; text-decoration: underline;">www.aegissolaire.com</a>
              </div>
            </td>
          </tr>

          <!-- Footer Légal Obligatoire -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 28px; font-size: 11px; color: #64748B; line-height: 1.5; text-align: center;">
              Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique<br />
              Communication professionnelle adressée aux installateurs certifiés RESCert répertoriés au registre officiel.<br />
              Pour ne plus recevoir nos opportunités de chantiers, répondez simplement "Stop" à cet email.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runWave2() {
  console.log(`\n===============================================================`);
  console.log(`🚀 LANCEMENT DE LA VAGUE 2 : WEMMEL (${wave2Installers.length} INSTALLATEURS)`);
  console.log(`===============================================================\n`);

  const results = [];

  for (let i = 0; i < wave2Installers.length; i++) {
    const installer = wave2Installers[i];
    const subject = `Chantier solaire qualifié disponible : Wemmel (${leadData.postalCode}) — 3 places pour installateurs certifiés`;
    const html = buildHtml(installer, leadData);

    console.log(`[${i + 1}/${wave2Installers.length}] Envoi à : ${installer.companyName} (${installer.certifiedPerson}) <${installer.email}> [${installer.postalCode} ${installer.city}]...`);

    try {
      const res = await resend.emails.send({
        from: `Aegis Solaire Partenariats <${fromEmail}>`,
        reply_to: replyTo,
        to: installer.email,
        subject,
        html,
      });

      if (res.error) {
        console.error(`  ❌ Échec : ${res.error.message || JSON.stringify(res.error)}`);
        results.push({
          company: installer.companyName,
          person: installer.certifiedPerson,
          email: installer.email,
          postalCode: installer.postalCode,
          phone: installer.phone,
          status: 'error',
          error: res.error,
        });
      } else {
        console.log(`  ✅ Succès ! Resend ID : ${res.data?.id}`);
        results.push({
          company: installer.companyName,
          person: installer.certifiedPerson,
          email: installer.email,
          postalCode: installer.postalCode,
          phone: installer.phone,
          status: 'sent',
          id: res.data?.id,
          sentAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`  ❌ Exception : ${err.message}`);
      results.push({
        company: installer.companyName,
        person: installer.certifiedPerson,
        email: installer.email,
        status: 'exception',
        error: err.message,
      });
    }

    // Temporisation de 900 ms pour respecter les quotas de débit de l'API Resend
    if (i < wave2Installers.length - 1) {
      await sleep(900);
    }
  }

  // Sauvegarde du journal d'exécution
  const reportPath = path.resolve('scratch/wave2-execution-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\n===============================================================`);
  console.log(`🎉 VAGUE 2 TERMINÉE : ${results.filter(r => r.status === 'sent').length}/${wave2Installers.length} e-mails délivrés avec succès !`);
  console.log(`📁 Rapport complet enregistré dans : ${reportPath}`);
  console.log(`===============================================================\n`);
}

runWave2().catch(console.error);

