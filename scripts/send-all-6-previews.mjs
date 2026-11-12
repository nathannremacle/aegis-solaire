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
const testRecipient = 'mrnathanrem@gmail.com';

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY absente dans .env.local');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

const LOGO_URL = "https://aegissolaire.com/logo.png";

const regionalLeads = [
  {
    num: "1/6",
    id: "lead_oupeye_alfieri_4680",
    slug: "oupeye-4680",
    zoneBadge: "OPPORTUNITÉ RÉSIDENTIELLE · PROVINCE DE LIÈGE (4680)",
    city: "Oupeye",
    postalCode: "4680",
    zoneLabel: "Oupeye (4680) · Basse-Meuse liégeoise",
    title: "Extension solaire + Batterie 10 kWh & Onduleur 10 kVA à Oupeye : attribution limitée à 2 installateurs",
    prospectName: "Famille Alfieri",
    surfaceArea: "Extension toiture · Tuiles terre cuite",
    estimatedPowerKwc: "Extension + Onduleur 10 kVA & Batterie 10 kWh",
    annualBill: "1 800 € / an (5 300 kWh)",
    ownership: "Propriétaire occupant (Vérifié)",
    photoUrl: "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-oupeye-4680-blurred.jpg",
    photoCaption: "PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · OUPEYE (4680)",
    projectHighlights: "Projet à forte marge : le client dispose déjà d'une base et souhaite ajouter 4 panneaux 460 Wc, remplacer son onduleur par un modèle 10 kVA et poser une batterie de stockage de 10 kWh.",
    maxSlots: 2,
    unitPriceEuros: 29.50,
  },
  {
    num: "2/6",
    id: "lead_remicourt_mathieu_4350",
    slug: "remicourt-4350",
    zoneBadge: "OPPORTUNITÉ RÉSIDENTIELLE · HESBAYE LIÉGEOISE (4350)",
    city: "Remicourt",
    postalCode: "4350",
    zoneLabel: "Remicourt (4350) · Proximité Waremme",
    title: "Installation complète PV + Batterie de stockage à Remicourt : attribution limitée à 2 installateurs",
    prospectName: "Famille Mathieu",
    surfaceArea: "38 m² · Maison 4 façades tuiles",
    estimatedPowerKwc: "~6,2 kWc (14 panneaux) + Système Batterie",
    annualBill: "1 850 € / an (> 5 400 kWh)",
    ownership: "Propriétaire occupant (Vérifié)",
    photoUrl: "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-remicourt-4350-blurred.jpg",
    photoCaption: "PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · REMICOURT (4350)",
    projectHighlights: "Maison individuelle 4 façades avec toiture bien orientée. Foyer à forte consommation électrique (> 5 400 kWh) cherchant une solution combinée panneaux solaires et batterie pour effacer l'impact du tarif prosumer.",
    maxSlots: 2,
    unitPriceEuros: 29.50,
  },
  {
    num: "3/6",
    id: "lead_gingelom_vaassen_3890",
    slug: "gingelom-3890",
    zoneBadge: "OPPORTUNITÉ RÉSIDENTIELLE · ZONE WAREMME / HESBAYE (3890)",
    city: "Gingelom",
    postalCode: "3890",
    zoneLabel: "Gingelom (3890) · Frontière Waremme / Oreye",
    title: "Chantier solaire toiture plein Sud à Gingelom : attribution limitée à 2 installateurs certifiés",
    prospectName: "Famille Vaassen",
    surfaceArea: "34 m² · Toiture moderne plein Sud",
    estimatedPowerKwc: "~5,2 kWc (12 panneaux de 440 Wc)",
    annualBill: "1 560 € / an (4 600 kWh)",
    ownership: "Propriétaire occupant (Vérifié)",
    photoUrl: "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-gingelom-3890-blurred.jpg",
    photoCaption: "PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · GINGELOM (3890)",
    projectHighlights: "Toiture récente orientée plein Sud avec gisement solaire exceptionnel sans aucun ombrage. Famille de 4 personnes désirant sécuriser leur budget énergie sur le long terme.",
    maxSlots: 2,
    unitPriceEuros: 29.50,
  },
  {
    num: "4/6",
    id: "lead_andenne_henry_5300",
    slug: "andenne-5300",
    zoneBadge: "OPPORTUNITÉ RÉSIDENTIELLE · VALLÉE DE LA MEUSE (5300)",
    city: "Andenne",
    postalCode: "5300",
    zoneLabel: "Andenne (5300) · Province de Namur",
    title: "Demande de devis solaire vérifiée à Andenne : exclusivité réservée à 1 installateur certifié",
    prospectName: "Famille Henry",
    surfaceArea: "34 m² · Toiture unifamiliale tuiles",
    estimatedPowerKwc: "~5,2 kWc (environ 12 panneaux 440 Wc)",
    annualBill: "1 560 € / an (4 600 kWh)",
    ownership: "Propriétaire occupant (Vérifié)",
    photoUrl: "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-andenne-5300-blurred.jpg",
    photoCaption: "PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · ANDENNE (5300)",
    projectHighlights: "Maison en pierre et briques dans le bassin mosan. Projet planifié sous 1 à 3 mois. Pour préserver votre marge, ce dossier est distribué sous exclusivité totale Aegis Solaire.",
    maxSlots: 1,
    unitPriceEuros: 29.50,
  },
  {
    num: "5/6",
    id: "lead_ohey_bauwens_5350",
    slug: "ohey-5350",
    zoneBadge: "OPPORTUNITÉ RÉSIDENTIELLE · CONDROZ NAMUROIS (5350)",
    city: "Ohey",
    postalCode: "5350",
    zoneLabel: "Ohey (5350) · Proximité Ciney / Andenne",
    title: "Projet solaire couplé à recharge Véhicule Électrique à Ohey : exclusivité 1 installateur",
    prospectName: "Famille Bauwens",
    surfaceArea: "38 m² · Toiture Sud-Est",
    estimatedPowerKwc: "~6,0 kWc (14 panneaux de 440 Wc)",
    annualBill: "1 150 € + recharge VE en cours",
    ownership: "Propriétaire occupant (Vérifié)",
    photoUrl: "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-ohey-5350-blurred.jpg",
    photoCaption: "PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · OHEY (5350)",
    projectHighlights: "Propriétaire disposant d'un véhicule électrique (borne de recharge en place) souhaitant maximiser son autoconsommation solaire diurne. Toiture Sud-Est très bien dégagée.",
    maxSlots: 1,
    unitPriceEuros: 29.50,
  },
  {
    num: "6/6",
    id: "lead_assesse_botelho_5330",
    slug: "assesse-5330",
    zoneBadge: "OPPORTUNITÉ RÉSIDENTIELLE · AXE NAMUR-CINEY (5330)",
    city: "Assesse",
    postalCode: "5330",
    zoneLabel: "Assesse (5330) · Axe N4 Namur",
    title: "Chantier solaire toiture Sud avec batterie à Assesse : exclusivité 1 installateur agréé",
    prospectName: "Famille Botelho",
    surfaceArea: "36 m² · Plain-pied toiture Sud",
    estimatedPowerKwc: "~5,5 kWc (12 à 14 panneaux) + Batterie",
    annualBill: "1 600 € / an",
    ownership: "Propriétaire occupant (Vérifié)",
    photoUrl: "https://fvvdfhbqojtnnqsrthwl.supabase.co/storage/v1/object/public/lead-media/lead-assesse-5330-blurred.jpg",
    photoCaption: "PHOTO RÉELLE DU BIEN TRANSMISE PAR LE PROSPECT · ASSESSE (5330)",
    projectHighlights: "Maison de plain-pied avec toiture en pente orientée plein Sud. Projet complet avec stockage batterie pour réduire au minimum la dépendance au réseau de distribution ORES.",
    maxSlots: 1,
    unitPriceEuros: 29.50,
  },
];

function buildLeadHtml(lead, installer) {
  const leadUrl = `https://aegissolaire.com/partenaires/invitation?company=${encodeURIComponent(installer.companyName)}&name=${encodeURIComponent(installer.certifiedPerson)}&code=${encodeURIComponent(installer.postalCode)}&email=${encodeURIComponent(installer.email)}&phone=${encodeURIComponent(installer.phone || '')}&leadId=${lead.id}&ref=TEST-APERÇU-${lead.slug.toUpperCase()}`;

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
                Conformément à notre charte de distribution éthique, <strong style="color: #0F172A;">ce chantier est strictement plafonné à ${lead.maxSlots} installateur${lead.maxSlots > 1 ? 's' : ''} certifié${lead.maxSlots > 1 ? 's' : ''} maximum</strong>. Aucune guerre des prix destructrice : le dossier est automatiquement clôturé dès son attribution.
              </p>

              <!-- Photo réelle du bien floutée avec icône SVG -->
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
                      FICHE TECHNIQUE AUDITÉE · RÉF. #${lead.slug.toUpperCase()}
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
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Dimensionnement recommandé :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">${lead.estimatedPowerKwc}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Consommation &amp; Facture :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">${lead.annualBill}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; color: #475569;">Places restantes :</td>
                        <td width="50%" style="padding-bottom: 11px; font-size: 13px; font-weight: 800; color: #B45309; text-align: right; font-family: ui-monospace, monospace;">${lead.maxSlots} place${lead.maxSlots > 1 ? 's' : ''} disponible${lead.maxSlots > 1 ? 's' : ''}</td>
                      </tr>
                      <tr>
                        <td width="50%" style="font-size: 13px; color: #475569;">Conditions d'accès :</td>
                        <td width="50%" style="font-size: 13px; font-weight: 800; color: #0F172A; text-align: right; font-family: ui-monospace, monospace;">${lead.unitPriceEuros.toFixed(2)} € HTVA (Achat à l'unité)</td>
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
                            Consulter &amp; Débloquer ce dossier à ${lead.city} &rarr;
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

async function sendAllPreviews() {
  console.log(`\n===============================================================`);
  console.log(`🚀 ENVOI DES 6 APERÇUS RÉGIONAUX À : ${testRecipient}`);
  console.log(`===============================================================\n`);

  const mockInstaller = {
    companyName: "Solar Test Confrère",
    certifiedPerson: "Installateur Agréé",
    email: testRecipient,
    postalCode: "4000",
    phone: "+32470000000",
  };

  for (let i = 0; i < regionalLeads.length; i++) {
    const lead = regionalLeads[i];
    const subject = `[APERÇU ${lead.num}] Chantier solaire qualifié : ${lead.city} (${lead.postalCode}) — ${lead.title}`;
    const html = buildLeadHtml(lead, mockInstaller);

    console.log(`[${i + 1}/${regionalLeads.length}] Envoi aperçu pour ${lead.city} (${lead.slug})...`);

    try {
      const res = await resend.emails.send({
        from: `Aegis Solaire Partenariats <${fromEmail}>`,
        reply_to: replyTo,
        to: testRecipient,
        subject,
        html,
      });

      if (res.error) {
        console.error(`  ❌ Échec : ${res.error.message || JSON.stringify(res.error)}`);
      } else {
        console.log(`  ✅ Délivré ! Resend ID : ${res.data?.id}`);
      }
    } catch (err) {
      console.error(`  ❌ Exception : ${err.message}`);
    }

    if (i < regionalLeads.length - 1) {
      await sleep(1000);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 LES 6 APERÇUS ONT ÉTÉ ENVOYÉS SUR ${testRecipient} !`);
  console.log(`===============================================================\n`);
}

sendAllPreviews().catch(console.error);

