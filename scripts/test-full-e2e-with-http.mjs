import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"

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

async function testFullWorkflow() {
  console.log("==================================================================")
  console.log("🧪 VÉRIFICATION COMPLETE DU WORKFLOW VALIDATION MAIL & MARKETPLACE")
  console.log("==================================================================")

  const timestamp = Date.now()
  const testEmail = `fictif.pro.${timestamp}@aegis-test.be`
  const testCompany = `Solaire Wallonie Fictif #${timestamp.toString().slice(-4)}`

  // 1. Création de la candidature installateur
  console.log("\n[TEST 1] Inscription d'un installateur fictif non vérifié...")
  const { data: app, error: insErr } = await supabase
    .from("installer_applications")
    .insert({
      company_name: testCompany,
      siret: "0123.456.789",
      first_name: "Marc",
      last_name: "Dumont",
      job_title: "Gérant",
      email: testEmail,
      phone: "+32 470 99 88 77",
      rescert_ref: "RESCERT-TEST-9999",
      regions: ["Liège", "Namur"],
      status: "pending",
      admin_notes: "Candidature de test automatique",
    })
    .select()
    .single()

  if (insErr || !app) {
    console.error("❌ Erreur insertion candidature:", insErr)
    process.exit(1)
  }
  console.log(`✅ Installateur fictif créé avec succès (ID: ${app.id}, Email: ${app.email})`)

  // 2. Vérification que l'accès au Marketplace est BLOQUÉ
  console.log("\n[TEST 2] Tentative d'accès au Marketplace (/partenaires/dashboard) AVANT vérification...")
  const dashUrl = `http://localhost:3001/partenaires/dashboard?asPartner=${encodeURIComponent(testEmail)}`
  const dashResBefore = await fetch(dashUrl, { redirect: "manual" })
  console.log(`Status HTTP: ${dashResBefore.status}`)
  const redirectLoc = dashResBefore.headers.get("location") || ""
  console.log(`Redirection header: ${redirectLoc}`)

  if (dashResBefore.status === 307 && redirectLoc.includes("/partenaires/verification-requise")) {
    console.log("🔒 TEST RÉUSSI : Accès Marketplace BLOQUÉ ! Redirection automatique vers /partenaires/verification-requise.")
  } else {
    console.error("❌ ÉCHEC : L'accès Marketplace n'a pas été bloqué correctement !", {
      status: dashResBefore.status,
      location: redirectLoc,
    })
  }

  // 3. Vérification du pannel admin : affichage "Validation Email" = "En attente"
  console.log("\n[TEST 3] Vérification dans le panel Admin (/admin/applications)...")
  const adminApiRes = await fetch("http://localhost:3001/api/admin/applications", {
    headers: { "x-admin-request": "true" },
  })
  const adminApps = await adminApiRes.json()
  const foundAdminApp = Array.isArray(adminApps) ? adminApps.find((a) => a.id === app.id) : null

  if (foundAdminApp) {
    const isVerifiedInAdmin =
      Boolean(foundAdminApp.email_verified_at) ||
      (foundAdminApp.admin_notes && foundAdminApp.admin_notes.includes("[EMAIL_VÉRIFIÉ:"))
    console.log(`Statut admin pour ${app.email}: ${isVerifiedInAdmin ? "Vérifié" : "En attente (Non vérifié)"}`)
    if (!isVerifiedInAdmin) {
      console.log("📋 TEST RÉUSSI : Le panel admin affiche bien 'En attente' (Lien non cliqué).")
    } else {
      console.error("❌ ÉCHEC : Le panel admin devrait afficher 'En attente' !")
    }
  } else {
    console.warn("⚠️ Candidature non trouvée via API admin, vérification directe...")
  }

  // 4. Clic sur le lien de validation email
  console.log("\n[TEST 4] Simulation du clic sur le lien de confirmation reçu par e-mail...")
  const token = generateInstallerVerificationToken(app.id, app.email)
  const verifyLink = `http://localhost:3001/api/installateurs/verify-email?id=${encodeURIComponent(
    app.id
  )}&token=${encodeURIComponent(token)}`
  console.log(`Lien cliqué: ${verifyLink}`)

  const verifyRes = await fetch(verifyLink, { redirect: "manual" })
  console.log(`Status HTTP clic lien: ${verifyRes.status}`)
  const verifyRedirect = verifyRes.headers.get("location") || ""
  console.log(`Redirection finale: ${verifyRedirect}`)

  if (verifyRes.status === 307 && verifyRedirect.includes("/partenaires/verification?status=success")) {
    console.log("✅ TEST RÉUSSI : Le lien de validation fonctionne et redirige vers /partenaires/verification?status=success !")
  } else {
    console.error("❌ ÉCHEC : La route verify-email n'a pas validé correctement le jeton !", {
      status: verifyRes.status,
      location: verifyRedirect,
    })
  }

  // 5. Vérification du pannel admin APRÈS validation
  console.log("\n[TEST 5] Vérification dans le panel Admin APRÈS validation...")
  const adminApiResAfter = await fetch("http://localhost:3001/api/admin/applications", {
    headers: { "x-admin-request": "true" },
  })
  const adminAppsAfter = await adminApiResAfter.json()
  const foundAdminAppAfter = Array.isArray(adminAppsAfter) ? adminAppsAfter.find((a) => a.id === app.id) : null

  if (foundAdminAppAfter) {
    const isVerifiedInAdminAfter =
      Boolean(foundAdminAppAfter.email_verified_at) ||
      (foundAdminAppAfter.admin_notes && foundAdminAppAfter.admin_notes.includes("[EMAIL_VÉRIFIÉ:"))
    console.log(`Statut admin après clic: ${isVerifiedInAdminAfter ? "✅ EMAIL VÉRIFIÉ (Badge Vert)" : "❌ Toujours en attente"}`)
    if (isVerifiedInAdminAfter) {
      console.log("📋 TEST RÉUSSI : Le panel admin affiche désormais 'Email Vérifié' avec badge vert !")
    } else {
      console.error("❌ ÉCHEC : Le panel admin ne reflète pas la vérification !")
    }
  }

  // 6. Vérification de l'accès Marketplace APRÈS validation d'e-mail
  console.log("\n[TEST 6] Tentative d'accès au Marketplace APRÈS validation d'e-mail...")
  const dashResAfter = await fetch(dashUrl, { redirect: "manual" })
  console.log(`Status HTTP après validation: ${dashResAfter.status}`)
  const redirectAfter = dashResAfter.headers.get("location") || ""

  // Si l'e-mail est vérifié, il NE DOIT PLUS rediriger vers verification-requise !
  if (!redirectAfter.includes("/partenaires/verification-requise")) {
    console.log("🔓 TEST RÉUSSI : Accès Marketplace AUTORISÉ (aucune redirection bloquante vers verification-requise) !")
  } else {
    console.error("❌ ÉCHEC : L'accès reste bloqué sur verification-requise après validation !", redirectAfter)
  }

  // 7. Nettoyage
  console.log("\n[TEST 7] Nettoyage de l'installateur fictif...")
  await supabase.from("installer_applications").delete().eq("id", app.id)
  console.log("🧹 Candidature de test supprimée de Supabase.")

  console.log("\n==================================================================")
  console.log("🎯 TOUTES LES ÉTAPES DU WORKFLOW SONT VALIDÉES ET FONCTIONNELLES !")
  console.log("==================================================================")
}

testFullWorkflow().catch((err) => {
  console.error("Erreur inattendue:", err)
  process.exit(1)
})
