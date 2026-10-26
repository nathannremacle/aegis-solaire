import fs from "node:fs"
import path from "node:path"
import { createHmac } from "node:crypto"

// Simulation des fonctions de lib/installer-welcome-emails et lib/installer-verification
function getSiteBaseUrl() {
  return "https://www.aegissolaire.com"
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function generateInstallerVerificationToken(applicationId, email) {
  const secret = "aegis-solaire-installer-verification-salt-wallonie-2026"
  const payload = `${applicationId.toLowerCase().trim()}:${email.toLowerCase().trim()}`
  return createHmac("sha256", secret).update(payload).digest("hex")
}

import {
  buildInstallerWelcomeVerificationEmail,
  buildInstallerMarketplaceWelcomeEmail,
} from "../lib/installer-welcome-emails.js"

// Données de test
const sampleApp = {
  applicationId: "a1b2c3d4-e5f6-47a8-b9c0-123456789abc",
  firstName: "Nathan",
  lastName: "Remacle",
  companyName: "Watt & Solutions Solaire SRL",
  email: "contact@watt-solutions.be",
  rescertRef: "RESCERT-PV-2026-4412",
}

const token = generateInstallerVerificationToken(sampleApp.applicationId, sampleApp.email)
const verificationUrl = `https://www.aegissolaire.com/api/installateurs/verify-email?id=${sampleApp.applicationId}&token=${token}`
const marketplaceUrl = `https://www.aegissolaire.com/partenaires/dashboard`

const email1 = buildInstallerWelcomeVerificationEmail({
  applicationId: sampleApp.applicationId,
  firstName: sampleApp.firstName,
  lastName: sampleApp.lastName,
  companyName: sampleApp.companyName,
  email: sampleApp.email,
  verificationUrl,
})

const email2 = buildInstallerMarketplaceWelcomeEmail({
  applicationId: sampleApp.applicationId,
  firstName: sampleApp.firstName,
  lastName: sampleApp.lastName,
  companyName: sampleApp.companyName,
  email: sampleApp.email,
  rescertRef: sampleApp.rescertRef,
  marketplaceUrl,
})

const scratchDir = path.resolve(process.cwd(), "scratch")
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true })
}

fs.writeFileSync(path.join(scratchDir, "email_1_bienvenue_verification.html"), email1.html, "utf8")
fs.writeFileSync(path.join(scratchDir, "email_2_bienvenue_marketplace.html"), email2.html, "utf8")

console.log("✅ EMAIL 1 GÉNÉRÉ:")
console.log("Sujet:", email1.subject)
console.log("Fichier HTML sauvegardé dans: scratch/email_1_bienvenue_verification.html\n")

console.log("✅ EMAIL 2 GÉNÉRÉ:")
console.log("Sujet:", email2.subject)
console.log("Fichier HTML sauvegardé dans: scratch/email_2_bienvenue_marketplace.html\n")
