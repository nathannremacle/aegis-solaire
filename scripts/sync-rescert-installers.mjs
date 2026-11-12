/**
 * Script d'extraction et de structuration officielle des installateurs RESCert Photovoltaïques
 * en Région wallonne et Région de Bruxelles-Capitale.
 * Source de données : rescert.be (Catégorie 2 - Systèmes solaires photovoltaïques).
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function decodeDoubleBase64(str) {
  if (!str) return '';
  try {
    const s1 = Buffer.from(str.trim(), 'base64').toString('utf8');
    const s2 = Buffer.from(s1.trim(), 'base64').toString('utf8');
    return s2.trim();
  } catch {
    return '';
  }
}

function cleanText(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Codes postaux belges :
 * - Bruxelles-Capitale : 1000 - 1299
 * - Brabant Wallon : 1300 - 1499
 * - Liège : 4000 - 4999
 * - Namur : 5000 - 5999
 * - Hainaut : 6000 - 6599 & 7000 - 7999
 * - Luxembourg : 6600 - 6999
 */
function getRegionOrProvince(postalCode) {
  const pc = parseInt(postalCode, 10);
  if (isNaN(pc)) return null;
  if (pc >= 1000 && pc <= 1299) return { key: 'bruxelles', label: 'Bruxelles-Capitale' };
  if (pc >= 1300 && pc <= 1499) return { key: 'brabant_wallon', label: 'Brabant wallon' };
  if (pc >= 4000 && pc <= 4999) return { key: 'liege', label: 'Liège' };
  if (pc >= 5000 && pc <= 5999) return { key: 'namur', label: 'Namur' };
  if ((pc >= 6000 && pc <= 6599) || (pc >= 7000 && pc <= 7999)) return { key: 'hainaut', label: 'Hainaut' };
  if (pc >= 6600 && pc <= 6999) return { key: 'luxembourg', label: 'Luxembourg' };
  return null;
}

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('0032')) clean = '+32' + clean.slice(4);
  else if (clean.startsWith('04') && clean.length === 10) clean = '+32' + clean.slice(1);
  return clean || phone.trim();
}

async function run() {
  console.log('🔄 Connexion au registre public RESCert (Wallonie & Bruxelles)...');
  const res = await fetchPage('https://www.rescert.be/fr/list?res_category=2');
  
  if (res.status !== 200) {
    throw new Error(`Erreur HTTP RESCert: ${res.status}`);
  }

  console.log('📄 Parsing de l\'annuaire...');
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows = [...res.body.matchAll(rowRegex)];
  
  const installersMap = new Map();

  for (let i = 1; i < rows.length; i++) {
    const rowHtml = rows[i][1];
    const tds = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
    if (tds.length < 7) continue;

    const personName = cleanText(tds[0].split('<')[0]);
    const personEmailMatch = tds[0].match(/data-email="([^"]+)"/);
    const personEmail = personEmailMatch ? decodeDoubleBase64(personEmailMatch[1]) : '';

    const personPostalCode = cleanText(tds[1]);
    const personCity = cleanText(tds[2]);

    const companyRaw = cleanText(tds[3].split('<')[0]);
    const companyEmailMatch = tds[3].match(/data-email="([^"]+)"/);
    const companyEmail = companyEmailMatch ? decodeDoubleBase64(companyEmailMatch[1]) : '';

    const phoneMatch = tds[4].match(/data-email="([^"]+)"/);
    const rawPhone = phoneMatch ? decodeDoubleBase64(phoneMatch[1]) : '';
    const phone = cleanPhoneNumber(rawPhone);

    const companyPostalCode = cleanText(tds[5]);
    const companyCity = cleanText(tds[6]);

    const effectivePostalCode = companyPostalCode || personPostalCode;
    const effectiveCity = companyCity || personCity;
    const regionInfo = getRegionOrProvince(effectivePostalCode);

    // Ne retenir que les installateurs localisés en Wallonie ou à Bruxelles
    if (!regionInfo) continue;

    const companyName = companyRaw || personName;
    const email = companyEmail || personEmail;

    // Déduplication par combinaison raison sociale + commune
    const uniqueKey = `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${effectivePostalCode}`;

    if (!installersMap.has(uniqueKey)) {
      installersMap.set(uniqueKey, {
        id: `rescert-${effectivePostalCode}-${installersMap.size + 1}`,
        companyName,
        certifiedPerson: personName,
        email: email.toLowerCase().trim(),
        phone,
        postalCode: effectivePostalCode,
        city: effectiveCity,
        provinceKey: regionInfo.key,
        provinceLabel: regionInfo.label,
        category: 'Systèmes solaires photovoltaïques',
        certified: true,
      });
    } else {
      const existing = installersMap.get(uniqueKey);
      if (!existing.email && email) existing.email = email.toLowerCase().trim();
      if (!existing.phone && phone) existing.phone = phone;
    }
  }

  const result = Array.from(installersMap.values()).sort((a, b) => 
    a.provinceLabel.localeCompare(b.provinceLabel) || a.city.localeCompare(b.city) || a.companyName.localeCompare(b.companyName)
  );

  console.log(`\n✅ Extraction terminée avec succès : ${result.length} entreprises et installateurs certifiés uniques en Wallonie & Bruxelles.`);

  // Statistiques par région/province
  const byProvince = {};
  for (const inst of result) {
    byProvince[inst.provinceLabel] = (byProvince[inst.provinceLabel] || 0) + 1;
  }
  console.log('\nRépartition géographique :');
  for (const [prov, count] of Object.entries(byProvince)) {
    console.log(`- ${prov}: ${count} installateurs certifiés`);
  }

  // Sauvegarde dans lib/data/rescert-wallonie-installateurs.json
  const targetDir = path.resolve(process.cwd(), 'lib', 'data');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outputPath = path.join(targetDir, 'rescert-wallonie-installateurs.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`📁 Fichier mis à jour dans : ${outputPath}`);
}

run().catch((err) => {
  console.error('❌ Erreur critique lors de la synchronisation:', err);
  process.exit(1);
});
