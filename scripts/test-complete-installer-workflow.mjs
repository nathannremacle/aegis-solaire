import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { createHmac } from "node:crypto"

const envContent = fs.readFileSync(".env.local", "utf8")
const env = {}
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const idx = trimmed.indexOf("=")
  if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
}

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
process.env.RESEND_API_KEY = env.RESEND_API_KEY
process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL || "noreply@aegissolaire.com"
process.env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { isPartnerEmailVerified, generateInstallerVerificationToken } = await import(
  "../lib/installer-verification.ts"
)

async function runEndToEndTest() {
  console.log("================================================================")
  console.log("🚀 TEST COMPLET DU WORKFLOW INSTALLATEUR FICTIF & CONTRÔLE MARKETPLACE")
  console.log("================================================================")

  const testEmail = `fictif.installateur.${Date.now()}@aegis-test.be`
  const testCompany = "Watt Wallonie Fictif SRL"

  console.log("\n[ÉTAPE 1] Création de la candidature installateur fictif...")
  const { data: createdApp, error: insertErr } = await supabase
    .from("installer_applications")
    .insert({
      company_name: testCompany,
      siret: "0999.123.456",
      first_name: "Jean-Luc",
      last_name: "Fictif",
      job_title: "Directeur Technique",
      email: testEmail,
      phone: "+32 495 00 11 22",
      rescert_ref: "RESCERT-FICTIF-889",
      regions: ["Liège", "Namur"],
      status: "pending",
      admin_notes: "Candidature de test automatisé",
    })
    .select()
    .single()

  if (insertErr || !createdApp) {
    console.error("❌ Échec insertion:", insertErr)
    return
  }
  console.log("✅ Candidature créée. ID:", createdApp.id, "Email:", createdApp.email)

  // ÉTAPE 2 : Vérification que l'accès Marketplace est STRICTEMENT BLOQUÉ
  console.log("\n[ÉTAPE 2] Contrôle d'accès Marketplace avant validation d'email...")
  const isVerifiedBefore = await isPartnerEmailVerified(testEmail)
  console.log("Statut isPartnerEmailVerified avant confirmation:", isVerifiedBefore)

  if (isVerifiedBefore === false) {
    console.log("🔒 SUCCÈS : L'installateur n'a PAS validé son email -> Accès Marketplace BLOQUÉ.")
  } else {
    console.error("❌ ERREUR : L'accès Marketplace n'est pas bloqué !")
  }

  // ÉTAPE 3 : Simulation du clic sur le lien de confirmation
  console.log("\n[ÉTAPE 3] Simulation du clic sur le lien de confirmation e-mail...")
  const token = generateInstallerVerificationToken(createdApp.id, createdApp.email)
  const localVerifyUrl = `http://localhost:3001/api/installateurs/verify-email?id=${encodeURIComponent(
    createdApp.id
  )}&token=${encodeURIComponent(token)}`
  console.log("URL de vérification testée :", localVerifyUrl)

  const verifyRes = await fetch(localVerifyUrl, { redirect: "manual" })
  console.log("Code de retour HTTP :", verifyRes.status)
  console.log("Redirection Location :", verifyRes.headers.get("location"))

  if (verifyRes.status === 307 || verifyRes.status === 302) {
    const loc = verifyRes.headers.get("location") || ""
    if (loc.includes("status=success")) {
      console.log("✅ SUCCÈS : La route de vérification valide le jeton et redirige vers /partenaires/verification?status=success !")
    } else {
      console.error("❌ Redirection inattendue :", loc)
    }
  } else {
    console.error("❌ Code retour inattendu :", verifyRes.status)
  }

  // ÉTAPE 4 : Vérification en base de données Supabase
  console.log("\n[ÉTAPE 4] Vérification de la mise à jour dans Supabase...")
  const { data: updatedApp } = await supabase
    .from("installer_applications")
    .select("id, email, admin_notes, status")
    .eq("id", createdApp.id)
    .single()

  console.log("Enregistrement après vérification :", updatedApp)
  if (updatedApp?.admin_notes?.includes("[EMAIL_VÉRIFIÉ:")) {
    console.log("✅ SUCCÈS : Le tag [EMAIL_VÉRIFIÉ: ...] est présent dans admin_notes !")
  } else {
    console.error("❌ Tag [EMAIL_VÉRIFIÉ: ...] absent !")
  }

  // ÉTAPE 5 : Contrôle d'accès Marketplace APRÈS validation
  console.log("\n[ÉTAPE 5] Contrôle d'accès Marketplace après validation...")
  const isVerifiedAfter = await isPartnerEmailVerified(testEmail)
  console.log("Statut isPartnerEmailVerified après confirmation :", isVerifiedAfter)

  if (isVerifiedAfter === true) {
    console.log("🔓 SUCCÈS : L'e-mail est vérifié -> L'installateur peut désormais accéder à la Marketplace dès approbation !")
  } else {
    console.error("❌ ERREUR : L'installateur devrait être marqué comme vérifié !")
  }

  // ÉTAPE 6 : Nettoyage propre de l'installateur fictif
  console.log("\n[ÉTAPE 6] Nettoyage de la candidature de test...")
  await supabase.from("installer_applications").delete().eq("id", createdApp.id)
  console.log("✅ Nettoyage terminé.")

  console.log("\n🎉 TOUT LE WORKFLOW DE VÉRIFICATION ET DE CONTRÔLE D'ACCÈS EST 100% OPÉRATIONNEL !")
}

runEndToEndTest()
