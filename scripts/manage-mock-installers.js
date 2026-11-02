/**
 * Script de gestion des 5 faux installateurs liégeois (entreprises réelles à Liège)
 * Permet de :
 *  - node scripts/manage-mock-installers.js seed     -> Insère ou met à jour les 5 installateurs dans Supabase
 *  - node scripts/manage-mock-installers.js status   -> Vérifie leur présence dans Supabase
 *  - node scripts/manage-mock-installers.js remove   -> Supprime proprement les 5 faux installateurs
 */

const fs = require('fs');
const path = require('path');

// 1. Chargement des variables d'environnement
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const MOCK_TAG = "[FAUX_INSTALLATEUR_LIEGE_DEMO]";

const MOCK_INSTALLERS = [
  {
    key: "sogreen",
    appId: "e1111111-1111-4111-a111-111111111111",
    installerId: "e1111111-2222-4111-a111-111111111111",
    partnerId: "e1111111-3333-4111-a111-111111111111",
    companyName: "Sogreen SRL",
    siret: "0829849252", // BCE BE 0829.849.252
    firstName: "Marc",
    lastName: "Laurent",
    jobTitle: "Gérant & Responsable Technique",
    email: "partenaire.sogreen@aegissolaire-pro.be",
    phone: "+3242288000",
    rescertRef: "07821",
    region: "Liège",
    targetProvinces: ["liege"],
    credits: 9,
  },
  {
    key: "enersol",
    appId: "e2222222-1111-4222-a222-222222222222",
    installerId: "e2222222-2222-4222-a222-222222222222",
    partnerId: "e2222222-3333-4222-a222-222222222222",
    companyName: "Enersol SA",
    siret: "0874697993", // BCE BE 0874.697.993
    firstName: "Samuel",
    lastName: "Bragard",
    jobTitle: "Directeur Technique",
    email: "partenaire.enersol@aegissolaire-pro.be",
    phone: "+3287680000",
    rescertRef: "06942",
    region: "Liège",
    targetProvinces: ["liege"],
    credits: 9,
  },
  {
    key: "hightechsolar",
    appId: "e3333333-1111-4333-a333-333333333333",
    installerId: "e3333333-2222-4333-a333-333333333333",
    partnerId: "e3333333-3333-4333-a333-333333333333",
    companyName: "High Tech Solar Group SRL",
    siret: "0757805471", // BCE BE 0757.805.471
    firstName: "Emmanuel",
    lastName: "Rigo",
    jobTitle: "Gérant Associé",
    email: "partenaire.hightechsolar@aegissolaire-pro.be",
    phone: "+3242750000",
    rescertRef: "08412",
    region: "Liège",
    targetProvinces: ["liege"],
    credits: 9,
  },
  {
    key: "solena",
    appId: "e4444444-1111-4444-a444-444444444444",
    installerId: "e4444444-2222-4444-a444-444444444444",
    partnerId: "e4444444-3333-4444-a444-444444444444",
    companyName: "Solena SRL",
    siret: "0801453986", // BCE BE 0801.453.986
    firstName: "Gilles",
    lastName: "Dethier",
    jobTitle: "Responsable Projets Solaire",
    email: "partenaire.solena@aegissolaire-pro.be",
    phone: "+3285250000",
    rescertRef: "07653",
    region: "Liège",
    targetProvinces: ["liege"],
    credits: 9,
  },
  {
    key: "belgasolar",
    appId: "e5555555-1111-4555-a555-555555555555",
    installerId: "e5555555-2222-4555-a555-555555555555",
    partnerId: "e5555555-3333-4555-a555-555555555555",
    companyName: "Belga Solar SRL",
    siret: "0844255138", // BCE BE 0844.255.138
    firstName: "Alain",
    lastName: "Vandevelde",
    jobTitle: "Responsable Commercial & Technique",
    email: "partenaire.belgasolar@aegissolaire-pro.be",
    phone: "+3243610000",
    rescertRef: "08194",
    region: "Liège",
    targetProvinces: ["liege"],
    credits: 9,
  },
];

async function seed() {
  console.log("=== SEED DES 5 FAUX INSTALLATEURS LIÉGEOIS DANS SUPABASE ===");
  const now = new Date().toISOString();

  for (const item of MOCK_INSTALLERS) {
    console.log(`\n-> Traitement de ${item.companyName} (${item.siret})...`);

    // 1. Insertion dans installer_applications (Statut pending = candidature)
    const applicationPayload = {
      id: item.appId,
      company_name: item.companyName,
      siret: item.siret,
      first_name: item.firstName,
      last_name: item.lastName,
      job_title: item.jobTitle,
      email: item.email,
      phone: item.phone,
      rescert_ref: item.rescertRef,
      regions: [item.region],
      status: "pending",
      admin_notes: `${MOCK_TAG} Compte fictif de simulation (Entreprise réelle liégeoise pour mise en concurrence et relances) | BCE: ${item.siret} | [EMAIL_VÉRIFIÉ: ${now}]`,
      created_at: now,
      updated_at: now,
    };

    const { error: errApp } = await supabase
      .from("installer_applications")
      .upsert(applicationPayload, { onConflict: "id" });

    if (errApp) console.error("  [Erreur installer_applications]:", errApp.message);
    else console.log("  ✓ installer_applications : Candidature 'pending' insérée/mise à jour.");

    // 2. Insertion dans installateurs (Annuaire installateurs de l'admin)
    const installerPayload = {
      id: item.installerId,
      name: item.companyName,
      email: item.email,
      phone: item.phone,
      region: item.region,
      actif: true,
      notes: `${MOCK_TAG} Installateur Liégeois (démonstration et emails de relance). BCE: ${item.siret}. Contact: ${item.firstName} ${item.lastName}.`,
      updated_at: now,
    };

    const { error: errInst } = await supabase
      .from("installateurs")
      .upsert(installerPayload, { onConflict: "id" });

    if (errInst) console.error("  [Erreur installateurs]:", errInst.message);
    else console.log("  ✓ installateurs : Profil actif inséré/mis à jour.");

    // 3. Insertion dans partners (Moteur de relance de leads)
    const partnerPayload = {
      id: item.partnerId,
      company_name: item.companyName,
      email: item.email,
      phone: item.phone,
      credits: item.credits,
      segment: "BOTH",
      target_provinces: item.targetProvinces,
      is_test: false, // Doit apparaître dans les relances réelles comme demandé
      updated_at: now,
    };

    const { error: errPartner } = await supabase
      .from("partners")
      .upsert(partnerPayload, { onConflict: "id" });

    if (errPartner) console.error("  [Erreur partners]:", errPartner.message);
    else console.log("  ✓ partners : Partenaire actif avec 9 crédits inséré/mis à jour (province Liège).");
  }

  console.log("\n>>> Terminé avec succès ! Les 5 installateurs sont actifs en candidature et dans le système de relance.");
}

async function status() {
  console.log("=== VÉRIFICATION DU STATUT DES 5 FAUX INSTALLATEURS ===");
  const emails = MOCK_INSTALLERS.map(i => i.email);
  const appIds = MOCK_INSTALLERS.map(i => i.appId);

  const { data: apps } = await supabase
    .from("installer_applications")
    .select("id, company_name, email, status, regions, admin_notes, created_at")
    .in("id", appIds);

  console.log("\n1. Table installer_applications (Candidatures):");
  if (!apps || apps.length === 0) console.log("  Aucun trouvé.");
  else {
    apps.forEach(a => console.log(`  - [${a.status.toUpperCase()}] ${a.company_name} <${a.email}> (${a.regions.join(", ")})`));
  }

  const instIds = MOCK_INSTALLERS.map(i => i.installerId);
  const { data: insts } = await supabase
    .from("installateurs")
    .select("id, name, email, region, actif")
    .in("id", instIds);

  console.log("\n2. Table installateurs (Annuaire):");
  if (!insts || insts.length === 0) console.log("  Aucun trouvé.");
  else {
    insts.forEach(i => console.log(`  - [${i.actif ? 'ACTIF' : 'INACTIF'}] ${i.name} <${i.email}> (Région: ${i.region})`));
  }

  const partnerIds = MOCK_INSTALLERS.map(i => i.partnerId);
  const { data: partners } = await supabase
    .from("partners")
    .select("id, company_name, email, credits, target_provinces, is_test")
    .in("id", partnerIds);

  console.log("\n3. Table partners (Moteur de relance leads):");
  if (!partners || partners.length === 0) console.log("  Aucun trouvé.");
  else {
    partners.forEach(p => console.log(`  - ${p.company_name} <${p.email}> : ${p.credits} crédits, Provinces: [${p.target_provinces?.join(", ")}], is_test: ${p.is_test}`));
  }
}

async function remove() {
  console.log("=== SUPPRESSION DES 5 FAUX INSTALLATEURS DE SUPABASE ===");
  const appIds = MOCK_INSTALLERS.map(i => i.appId);
  const instIds = MOCK_INSTALLERS.map(i => i.installerId);
  const partnerIds = MOCK_INSTALLERS.map(i => i.partnerId);
  const emails = MOCK_INSTALLERS.map(i => i.email);

  // 1. Suppression de installer_applications
  const { error: errApp } = await supabase
    .from("installer_applications")
    .delete()
    .in("id", appIds);
  if (errApp) console.error("Erreur suppression installer_applications:", errApp.message);
  else console.log("✓ Supprimés de installer_applications");

  // 2. Suppression de installateurs
  const { error: errInst } = await supabase
    .from("installateurs")
    .delete()
    .in("id", instIds);
  if (errInst) console.error("Erreur suppression installateurs:", errInst.message);
  else console.log("✓ Supprimés de installateurs");

  // 3. Suppression de partners
  const { error: errPartner } = await supabase
    .from("partners")
    .delete()
    .in("id", partnerIds);
  if (errPartner) console.error("Erreur suppression partners:", errPartner.message);
  else console.log("✓ Supprimés de partners");

  console.log("\nNettoyage complet terminé.");
}

const command = process.argv[2] || "seed";
if (command === "seed") seed().catch(console.error);
else if (command === "status") status().catch(console.error);
else if (command === "remove") remove().catch(console.error);
else {
  console.log("Commande inconnue. Utilisez 'seed', 'status' ou 'remove'.");
}
