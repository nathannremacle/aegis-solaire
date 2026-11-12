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

// 2. Données réelles du lead Oupeye (4680)
const leadData = {
  id: "e597cc47-01f2-47e4-a953-c7e6902b4680",
  city: "Oupeye",
  postalCode: "4680",
  zoneLabel: "Oupeye (4680) · Basse-Meuse liégeoise",
  zoneBadge: "OPPORTUNITÉ RÉSIDENTIELLE · PROVINCE DE LIÈGE (4680)",
  title: "Extension solaire + Batterie 10 kWh & Onduleur 10 kVA à Oupeye : attribution limitée à 2 installateurs",
  subject: "Chantier solaire qualifié disponible : Oupeye (4680)",
  surfaceArea: "Extension toiture · Tuiles terre cuite",
  estimatedPowerKwc: "Extension + Onduleur 10 kVA & Batterie 10 kWh",
  annualBill: "1 800 € / an (5 300 kWh)",
  ownership: "Propriétaire occupant (Vérifié)",
  photoUrl: "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-oupeye-4680-blurred.jpg",
  photoCaption: "PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · OUPEYE (4680)",
  projectHighlights: "Projet à forte marge : le client dispose déjà d'une base et souhaite ajouter 4 panneaux 460 Wc, remplacer son onduleur par un modèle hybride 10 kVA et poser une batterie de stockage de 10 kWh.",
  maxSlots: 2,
  unitPriceEuros: 29.50,
};

const LOGO_URL = "https://aegissolaire.com/logo.png";

// 3. Charger et filtrer les installateurs certifiés pour Liège 1
const allInstallers = JSON.parse(fs.readFileSync('lib/data/rescert-wallonie-installateurs.json', 'utf-8'));

// Filtre géographique : Liège Centre, Basse-Meuse, Liège Nord, Fléron, Herve
// Codes postaux : 4000-4053, 4400-4432, 4600-4690
// Exclusion stricte : MC Industry (déjà servi à la source)
const liege1Installers = allInstallers.filter(inst => {
  if (inst.provinceKey !== 'liege') return false;
  const pc = parseInt(inst.postalCode, 10);
  const isTargetZone = (pc >= 4000 && pc <= 4053) || (pc >= 4400 && pc <= 4432) || (pc >= 4600 && pc <= 4690);
  const comp = (inst.companyName || '').toLowerCase();
  if (comp.includes('mc industry')) return false;
  return isTargetZone && inst.email && inst.email.includes('@');
});

console.log(`\n============================================================`);
console.log(`LANCEMENT CAMPAGNE VAGUE LIÈGE 1 : OUPEYE (4680)`);
console.log(`Destinataires cibles : ${liege1Installers.length} installateurs certifiés`);
console.log(`Lead cible : ${leadData.title}`);
console.log(`============================================================\n`);

function buildHtml(installer, lead) {
  const leadUrl = `https://aegissolaire.com/partenaires/invitation?company=${encodeURIComponent(installer.companyName)}&name=${encodeURIComponent(installer.certifiedPerson)}&code=${encodeURIComponent(installer.postalCode)}&email=${encodeURIComponent(installer.email)}&phone=${encodeURIComponent(installer.phone || '')}&leadId=${lead.id}&ref=VAGUE-LIEGE1-OUPEYE-4680`;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${lead.title}</title>
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
                      Plateforme d'Ingénierie &amp; Distribution Éthique · Wallonie &amp; Bruxelles
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
                ${lead.zoneBadge}
              </div>

              <h1 style="margin: 0 0 16px 0; font-size: 21px; font-weight: 800; color: #0F172A; line-height: 1.35; letter-spacing: -0.01em;">
                ${lead.title}
              </h1>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Bonjour ${installer.certifiedPerson ? installer.certifiedPerson : 'Monsieur'},
              </p>

              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                La Cellule Technique d'Aegis Solaire a audité et validé une demande d'installation photovoltaïque résidentielle située sur votre zone d'intervention directe (<strong style="color: #0F172A;">${lead.zoneLabel}</strong>).
              </p>

              <p style="margin: 0 0 22px 0; font-size: 14px; line-height: 1.65; color: #1E293B;">
                Conformément à notre charte de distribution éthique, <strong style="color: #0F172A;">ce chantier est strictement plafonné à ${lead.maxSlots} installateurs certifiés maximum</strong>. Aucune guerre des prix destructrice : le dossier est automatiquement clôturé dès la 2ème attribution.
              </p>

              <!-- Photo réelle du bien floutée avec badge débloquer incrusté -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px; border-radius: 10px; overflow: hidden; border: 1px solid #CBD5E1; background-color: #F8FAFC;">
                <tr>
                  <td style="padding: 0; line-height: 0; background-color: #F1F5F9; text-align: center;">
                    <img src="${lead.photoUrl}" alt="Photo de la toiture transmise par le demandeur à ${lead.city}" width="542" style="width: 100%; max-width: 542px; height: auto; display: block; border: 0;" />
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
                            ${lead.photoCaption}
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
                      FICHE TECHNIQUE AUDITÉE · RÉF. #LIE-4680-01
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
                          ${lead.ownership}
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Toiture &amp; Faisabilité :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">${lead.surfaceArea}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Spécifications techniques :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">${lead.estimatedPowerKwc}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Consommation annuelle :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">${lead.annualBill}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="font-size: 13px; color: #475569;">Places disponibles :</td>
                        <td width="50%" style="font-size: 13px; font-weight: 800; color: #B45309; text-align: right; font-family: ui-monospace, monospace;">2 installateurs max</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note Spécifique d'Ingénierie -->
              <div style="background-color: #F8FAFC; border-left: 3px solid #0F172A; padding: 14px 18px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <div style="font-size: 13px; line-height: 1.55; color: #1E293B;">
                  <strong style="color: #0F172A;">Détail opérationnel du projet :</strong><br />
                  ${lead.projectHighlights}<br /><br />
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
                            Consulter &amp; Débloquer ce dossier à Oupeye &rarr;
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCampaign() {
  const results = [];
  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < liege1Installers.length; i++) {
    const inst = liege1Installers[i];
    const html = buildHtml(inst, leadData);

    console.log(`[${i + 1}/${liege1Installers.length}] Envoi à ${inst.companyName} (${inst.certifiedPerson}) · ${inst.email} [${inst.postalCode}]...`);

    try {
      const { data, error } = await resend.emails.send({
        from: `Aegis Solaire - Partenariats <${fromEmail}>`,
        replyTo: replyTo,
        to: [inst.email],
        subject: leadData.subject,
        html: html,
      });

      if (error) {
        console.error(`  ❌ Erreur Resend pour ${inst.email}:`, error);
        results.push({
          company: inst.companyName,
          person: inst.certifiedPerson,
          email: inst.email,
          postalCode: inst.postalCode,
          phone: inst.phone,
          status: 'failed',
          error: error.message || error,
          sentAt: new Date().toISOString(),
        });
        failCount++;
      } else {
        console.log(`  ✅ Envoyé avec succès (ID: ${data.id})`);
        results.push({
          company: inst.companyName,
          person: inst.certifiedPerson,
          email: inst.email,
          postalCode: inst.postalCode,
          phone: inst.phone,
          status: 'sent',
          id: data.id,
          sentAt: new Date().toISOString(),
        });
        sentCount++;
      }
    } catch (err) {
      console.error(`  ❌ Exception pour ${inst.email}:`, err.message);
      results.push({
        company: inst.companyName,
        person: inst.certifiedPerson,
        email: inst.email,
        postalCode: inst.postalCode,
        phone: inst.phone,
        status: 'exception',
        error: err.message,
        sentAt: new Date().toISOString(),
      });
      failCount++;
    }

    // Délai de précaution anti-spam (1,5 seconde entre chaque e-mail)
    await sleep(1500);
  }

  // Sauvegarde du rapport d'exécution
  const reportPath = path.resolve('scratch/wave-liege1-execution-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');

  console.log(`\n============================================================`);
  console.log(`BILAN CAMPAGNE LIÈGE 1 (OUPEYE) :`);
  console.log(`- Total traités : ${liege1Installers.length}`);
  console.log(`- Envoyés avec succès : ${sentCount}`);
  console.log(`- Échecs : ${failCount}`);
  console.log(`- Rapport complet enregistré dans : ${reportPath}`);
  console.log(`============================================================\n`);
}

runCampaign().catch((err) => {
  console.error("Erreur critique d'exécution:", err);
  process.exit(1);
});

