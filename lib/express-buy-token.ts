import crypto from "node:crypto"

export interface ExpressBuyTokenPayload {
  leadId: string
  partnerId?: string | null
  rescertEmail?: string | null
  rescertCompany?: string | null
  rescertVat?: string | null
  rescertCity?: string | null
  distanceKm?: number | null
  exp: number
}

function getExpressBuySecret(): string {
  return (
    process.env.PARTNER_NOTIFY_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "aegis-solaire-express-buy-dev-secret"
  )
}

export function createExpressBuyToken(
  payload: Omit<ExpressBuyTokenPayload, "exp">,
  ttlHours = 72
): string {
  const fullPayload: ExpressBuyTokenPayload = {
    ...payload,
    exp: Date.now() + ttlHours * 60 * 60 * 1000,
  }
  const encoded = Buffer.from(JSON.stringify(fullPayload), "utf8").toString("base64url")
  const sig = crypto
    .createHmac("sha256", getExpressBuySecret())
    .update(encoded)
    .digest("base64url")
  return `${encoded}.${sig}`
}

export function verifyExpressBuyToken(
  token: string | null | undefined,
  expectedLeadId?: string
): ExpressBuyTokenPayload | null {
  if (!token || !token.includes(".")) return null
  const [encoded, sig] = token.split(".")
  if (!encoded || !sig) return null

  const expectedSig = crypto
    .createHmac("sha256", getExpressBuySecret())
    .update(encoded)
    .digest("base64url")

  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ExpressBuyTokenPayload
    if (!parsed?.leadId || typeof parsed.exp !== "number") return null
    if (Date.now() > parsed.exp) return null
    if (expectedLeadId && parsed.leadId !== expectedLeadId) return null
    return parsed
  } catch {
    return null
  }
}
