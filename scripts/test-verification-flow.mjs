import { createHmac } from "node:crypto"

function generateInstallerVerificationToken(applicationId, email) {
  const secret = "aegis-solaire-installer-verification-salt-wallonie-2026"
  const payload = `${applicationId.toLowerCase().trim()}:${email.toLowerCase().trim()}`
  return createHmac("sha256", secret).update(payload).digest("hex")
}

function verifyInstallerVerificationToken(applicationId, email, token) {
  if (!applicationId || !email || !token) return false
  const expected = generateInstallerVerificationToken(applicationId, email)
  return expected.toLowerCase() === token.toLowerCase().trim()
}

const appId = "3d5f992a-0a25-4c07-b371-33e38c3534d8"
const email = "installateur@solaire-liege.be"

const token = generateInstallerVerificationToken(appId, email)
console.log("Generated Token:", token)

const validCheck = verifyInstallerVerificationToken(appId, email, token)
console.log("Valid check:", validCheck === true ? "✅ PASS" : "❌ FAIL")

const invalidEmailCheck = verifyInstallerVerificationToken(appId, "autre@solaire.be", token)
console.log("Invalid email check (should be false):", invalidEmailCheck === false ? "✅ PASS" : "❌ FAIL")

const tamperedTokenCheck = verifyInstallerVerificationToken(appId, email, token + "xyz")
console.log("Tampered token check (should be false):", tamperedTokenCheck === false ? "✅ PASS" : "❌ FAIL")
