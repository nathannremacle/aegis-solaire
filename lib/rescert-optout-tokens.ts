import crypto from "node:crypto"

function getSigningSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "aegis-solaire-rescert-optout-v1"
  )
}

export function normalizeOptoutEmail(email: string): string {
  return String(email || "").toLowerCase().trim()
}

export function createRescertOptoutToken(email: string): string {
  const normalized = normalizeOptoutEmail(email)
  return crypto
    .createHmac("sha256", getSigningSecret())
    .update(`rescert_outreach_optout:${normalized}`)
    .digest("hex")
    .slice(0, 32)
}

export function verifyRescertOptoutToken(email: string, token: string): boolean {
  const normalized = normalizeOptoutEmail(email)
  if (!normalized || !token) return false
  const expected = createRescertOptoutToken(normalized)
  const actual = token.trim().toLowerCase()
  if (expected.length !== actual.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(actual, "utf8"))
  } catch {
    return false
  }
}

export function buildRescertOptoutUrl(baseUrl: string, email: string): string {
  const cleanBase = baseUrl.replace(/\/$/, "")
  const normalized = normalizeOptoutEmail(email)
  const token = createRescertOptoutToken(normalized)
  return `${cleanBase}/api/partners/rescert-optout?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`
}
