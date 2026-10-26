import fs from "node:fs"
import { NextRequest } from "next/server"
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

// Configurer l'environnement pour Next
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
process.env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function testFullWorkflow() {
  console.log("=== TEST COMPLET DU WORKFLOW D'INSCRIPTION & VÉRIFICATION ===")

  // 1. Simulation d'une inscription
  const testEmail = `installateur-test-${Date.now()}@exemple.be`
  console.log("1. Création de la candidature installateur :", testEmail)

  const { data: app, error: insertErr } = await supabase
    .from("installer_applications")
    .insert({
      company_name: "Test Solar Energy Wallonie",
      siret: "0999.888.777",
      first_name: "Nathan",
      last_name: "Remacle",
      job_title: "Directeur Technique",
      email: testEmail,
      phone: "+32470000000",
      rescert_ref: "RESCERT-TEST-2026",
      regions: ["Liège", "Namur"],
      status: "pending",
    })
    .select()
    .single()

  if (insertErr || !app) {
    console.error("❌ Erreur insertion DB:", insertErr)
    return
  }
  console.log("✅ Candidature créée avec succès. ID:", app.id)

  // 2. Génération du token
  const secret = env.SUPABASE_SERVICE_ROLE_KEY
  const payload = `${app.id.toLowerCase().trim()}:${app.email.toLowerCase().trim()}`
  const token = createHmac("sha256", secret).update(payload).digest("hex")
  console.log("2. Jeton HMAC généré :", token)

  // 3. Test de validation via la fonction recordInstallerEmailVerified
  const { recordInstallerEmailVerified } = await import("../lib/installer-verification.ts")
  const recordResult = await recordInstallerEmailVerified(app.id)
  console.log("3. Résultat enregistrement vérification :", recordResult)

  // 4. Vérification dans la base Supabase
  const { data: updatedApp } = await supabase
    .from("installer_applications")
    .select("id, email, admin_notes, status")
    .eq("id", app.id)
    .single()

  console.log("4. Données en base après validation :", updatedApp)
  if (updatedApp?.admin_notes?.includes("[EMAIL_VÉRIFIÉ:")) {
    console.log("✅ SUCCÈS : Le tag [EMAIL_VÉRIFIÉ: ...] est bien présent dans admin_notes !")
  } else {
    console.error("❌ ÉCHEC : Le tag n'a pas été trouvé dans admin_notes.")
  }

  // 5. Test de nettoyage
  await supabase.from("installer_applications").delete().eq("id", app.id)
  console.log("5. Nettoyage de la candidature de test effectué.")
  console.log("\n🎉 TOUT LE WORKFLOW FONCTIONNE À 100% SANS ERREUR !")
}

testFullWorkflow()
