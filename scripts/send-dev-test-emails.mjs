import fs from "node:fs"
import { Resend } from "resend"
import { createHmac } from "node:crypto"

const envContent = fs.readFileSync(".env.local", "utf8")
const env = {}
for (const line of envContent.split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const idx = trimmed.indexOf("=")
  if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
}

process.env.RESEND_API_KEY = env.RESEND_API_KEY
process.env.RESEND_FROM_EMAIL = env.RESEND_FROM_EMAIL || "noreply@aegissolaire.com"
process.env.NEXT_PUBLIC_SITE_URL = env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const {
  buildInstallerWelcomeVerificationEmail,
  buildInstallerMarketplaceWelcomeEmail,
} = await import("../lib/installer-welcome-emails.ts")

const { generateInstallerVerificationToken } = await import("../lib/installer-verification.ts")

async function sendTestEmails() {
  console.log("=== ENVOI DES E-MAILS DE TEST À L'INSTALLATEUR DEV TEST ===")
  const resendApiKey = env.RESEND_API_KEY
  if (!resendApiKey) {
    console.error("❌ RESEND_API_KEY manquante.")
    return
  }

  const resend = new Resend(resendApiKey)
  const fromEmail = env.RESEND_FROM_EMAIL || "noreply@aegissolaire.com"
  const formattedFrom = `Aegis Solaire <${fromEmail}>`
  const toEmail = "mrnathanrem@gmail.com"

  const devApp = {
    id: "2faf2f84-d94f-4861-9f52-48c9e7181d76",
    company_name: "DEV TEST",
    first_name: "Nathan",
    last_name: "DEV",
    email: toEmail,
    rescert_ref: "012345678910",
  }

  // Pour tester en local sur le serveur de dev port 3001
  const baseUrl = "http://localhost:3001"
  const token = generateInstallerVerificationToken(devApp.id, devApp.email)
  const verificationUrl = `${baseUrl}/api/installateurs/verify-email?id=${encodeURIComponent(
    devApp.id
  )}&token=${encodeURIComponent(token)}`
  const marketplaceUrl = `${baseUrl}/partenaires/dashboard`

  // 1. Email 1: Bienvenue + Vérification email
  console.log("\n1. Envoi de l'E-mail 1 : Bienvenue & Vérification email vers", toEmail)
  const email1 = buildInstallerWelcomeVerificationEmail({
    applicationId: devApp.id,
    firstName: devApp.first_name,
    lastName: devApp.last_name,
    companyName: devApp.company_name,
    email: devApp.email,
    verificationUrl,
    baseUrl,
  })

  const sendResult1 = await resend.emails.send({
    from: formattedFrom,
    to: [toEmail],
    replyTo: "contact@aegissolaire.com",
    subject: `[TEST] ${email1.subject}`,
    html: email1.html,
    text: email1.text,
  })

  if (sendResult1.error) {
    console.error("❌ Erreur envoi Email 1:", sendResult1.error)
  } else {
    console.log("✅ Email 1 envoyé avec succès ! ID Resend:", sendResult1.data?.id)
  }

  // 2. Email 2: Bienvenue sur la Marketplace
  console.log("\n2. Envoi de l'E-mail 2 : Bienvenue Marketplace vers", toEmail)
  const email2 = buildInstallerMarketplaceWelcomeEmail({
    applicationId: devApp.id,
    firstName: devApp.first_name,
    lastName: devApp.last_name,
    companyName: devApp.company_name,
    email: devApp.email,
    rescertRef: devApp.rescert_ref,
    marketplaceUrl,
    baseUrl,
  })

  const sendResult2 = await resend.emails.send({
    from: formattedFrom,
    to: [toEmail],
    replyTo: "contact@aegissolaire.com",
    subject: `[TEST] ${email2.subject}`,
    html: email2.html,
    text: email2.text,
  })

  if (sendResult2.error) {
    console.error("❌ Erreur envoi Email 2:", sendResult2.error)
  } else {
    console.log("✅ Email 2 envoyé avec succès ! ID Resend:", sendResult2.data?.id)
  }

  console.log("\n🎉 LES DEUX EMAILS ONT ÉTÉ ENVOYÉS À MRNATHANREM@GMAIL.COM !")
}

sendTestEmails()
