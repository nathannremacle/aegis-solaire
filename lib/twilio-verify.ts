import { createHmac, timingSafeEqual } from "crypto"

export interface TwilioLookupResult {
  configured: boolean
  valid: boolean
  countryCode: string | null
  lineType: string | null
  carrierName: string | null
  smsPumpingRiskLevel: string | null
  smsPumpingRiskScore: number | null
  blockedReason?: string | null
  transientError?: boolean
}

export interface PhoneVerificationProof {
  phoneE164: string
  channel: "sms" | "call" | "dev_mock"
  lineType: string | null
  carrierName: string | null
  verifiedAt: string
  exp: number
}

const DISALLOWED_LINE_TYPES = new Set([
  "nonFixedVoip",
  "voip",
  "tollFree",
  "premiumRate",
  "sharedCost",
  "pager",
  "uan",
])

function getTwilioCredentials(): {
  accountSid: string
  authToken: string
  verifyServiceSid: string
} | null {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim()
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim()
  const verifyServiceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim()
  if (!accountSid || !authToken) return null
  return { accountSid, authToken, verifyServiceSid }
}

export function isTwilioLookupEnabled(): boolean {
  const creds = getTwilioCredentials()
  return Boolean(creds && creds.accountSid && creds.authToken)
}

export function isDevMockOtpEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean((process.env.TWILIO_OTP_MOCK_CODE ?? "").trim())
  )
}

export function isTwilioPhoneOtpEnabled(): boolean {
  if (process.env.LEAD_PHONE_OTP_DISABLED === "true") return false
  const creds = getTwilioCredentials()
  if (creds && creds.accountSid && creds.authToken && creds.verifyServiceSid) {
    return true
  }
  return isDevMockOtpEnabled()
}

function getProofSigningSecret(): string {
  return (
    process.env.PHONE_VERIFICATION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.RESEND_API_KEY ||
    "aegis-solaire-phone-proof-dev-salt-2026"
  )
}

function getAuthHeader(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`
}

export function maskPhoneForDisplay(phoneE164: string): string {
  const clean = phoneE164.replace(/\s+/g, "")
  if (clean.length < 8) return clean
  const prefix = clean.slice(0, 6)
  const suffix = clean.slice(-2)
  return `${prefix} •• •• ${suffix}`
}

/**
 * Contrôle opérateur en temps réel via Twilio Lookup v2 (Line Type Intelligence + SMS Pumping Risk).
 * Détecte les numéros non attribués, lignes virtuelles jetables (nonFixedVoip) et numéros à haut risque.
 */
export async function lookupPhoneNumberTwilio(
  phoneE164: string
): Promise<TwilioLookupResult> {
  const creds = getTwilioCredentials()
  if (!creds) {
    return {
      configured: false,
      valid: true,
      countryCode: null,
      lineType: null,
      carrierName: null,
      smsPumpingRiskLevel: null,
      smsPumpingRiskScore: null,
    }
  }

  try {
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(
      phoneE164
    )}?Fields=line_type_intelligence,sms_pumping_risk`

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(creds.accountSid, creds.authToken),
      },
      signal: AbortSignal.timeout(4500),
    })

    if (res.status === 404 || res.status === 400) {
      return {
        configured: true,
        valid: false,
        countryCode: null,
        lineType: null,
        carrierName: null,
        smsPumpingRiskLevel: null,
        smsPumpingRiskScore: null,
        blockedReason: "Ce numéro de téléphone n'existe pas ou n'est pas attribué.",
      }
    }

    if (!res.ok) {
      return {
        configured: true,
        valid: true,
        countryCode: null,
        lineType: null,
        carrierName: null,
        smsPumpingRiskLevel: null,
        smsPumpingRiskScore: null,
        transientError: true,
      }
    }

    const data = (await res.json()) as {
      valid?: boolean
      country_code?: string
      line_type_intelligence?: {
        type?: string
        carrier_name?: string
        error_code?: number | null
      } | null
      sms_pumping_risk?: {
        carrier_risk_category?: string
        sms_pumping_risk_score?: number
      } | null
    }

    const valid = data.valid !== false
    const countryCode = data.country_code ?? null
    const lineType = data.line_type_intelligence?.type ?? null
    const carrierName = data.line_type_intelligence?.carrier_name ?? null
    const smsPumpingRiskLevel = data.sms_pumping_risk?.carrier_risk_category ?? null
    const smsPumpingRiskScore =
      typeof data.sms_pumping_risk?.sms_pumping_risk_score === "number"
        ? data.sms_pumping_risk.sms_pumping_risk_score
        : null

    let blockedReason: string | null = null

    if (!valid) {
      blockedReason = "Ce numéro n'est pas attribué sur le réseau téléphonique."
    } else if (lineType && DISALLOWED_LINE_TYPES.has(lineType)) {
      blockedReason =
        "Les numéros virtuels ou spéciaux ne sont pas acceptés. Veuillez indiquer un numéro GSM ou fixe réel."
    } else if (
      smsPumpingRiskLevel === "high" ||
      (smsPumpingRiskScore !== null && smsPumpingRiskScore >= 85)
    ) {
      blockedReason =
        "Ce numéro présente un score de risque trop élevé. Veuillez utiliser votre téléphone personnel."
    }

    return {
      configured: true,
      valid: !blockedReason,
      countryCode,
      lineType,
      carrierName,
      smsPumpingRiskLevel,
      smsPumpingRiskScore,
      blockedReason,
    }
  } catch (err) {
    console.warn("[Twilio Lookup] Erreur temporaire non bloquante:", err)
    return {
      configured: true,
      valid: true,
      countryCode: null,
      lineType: null,
      carrierName: null,
      smsPumpingRiskLevel: null,
      smsPumpingRiskScore: null,
      transientError: true,
    }
  }
}

export async function sendTwilioVerifyOtp(params: {
  phoneE164: string
  channel: "sms" | "call"
}): Promise<{ ok: boolean; channel: "sms" | "call" | "dev_mock"; error?: string }> {
  const creds = getTwilioCredentials()

  if ((!creds || !creds.verifyServiceSid) && isDevMockOtpEnabled()) {
    return { ok: true, channel: "dev_mock" }
  }

  if (!creds || !creds.verifyServiceSid) {
    return { ok: false, channel: params.channel, error: "Service SMS non configuré." }
  }

  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(
        creds.verifyServiceSid
      )}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(creds.accountSid, creds.authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: params.phoneE164,
          Channel: params.channel,
          Locale: "fr",
        }).toString(),
        signal: AbortSignal.timeout(6000),
      }
    )

    const json = (await res.json().catch(() => ({}))) as {
      status?: string
      code?: number
      message?: string
    }

    if (!res.ok) {
      if (json.code === 60203) {
        return {
          ok: false,
          channel: params.channel,
          error: "Trop de tentatives d'envoi. Patientez quelques minutes avant de réessayer.",
        }
      }
      if (json.code === 60200 || json.code === 60205) {
        return {
          ok: false,
          channel: params.channel,
          error: "Ce numéro ne peut pas recevoir ce code. Vérifiez votre saisie ou passez par appel vocal.",
        }
      }
      return {
        ok: false,
        channel: params.channel,
        error: "Impossible d'envoyer le code de vérification sur ce numéro. Vérifiez le numéro saisi.",
      }
    }

    return { ok: true, channel: params.channel }
  } catch (err) {
    console.error("[Twilio Verify] Échec d'envoi OTP:", err)
    return {
      ok: false,
      channel: params.channel,
      error: "Service d'envoi temporairement indisponible. Réessayez dans quelques secondes.",
    }
  }
}

export async function checkTwilioVerifyOtp(params: {
  phoneE164: string
  code: string
}): Promise<{ approved: boolean; error?: string }> {
  const cleanCode = params.code.replace(/\D/g, "")
  if (cleanCode.length < 4 || cleanCode.length > 8) {
    return { approved: false, error: "Saisissez le code à 6 chiffres reçu sur votre téléphone." }
  }

  const creds = getTwilioCredentials()

  if ((!creds || !creds.verifyServiceSid) && isDevMockOtpEnabled()) {
    const mockCode = (process.env.TWILIO_OTP_MOCK_CODE ?? "").trim()
    if (cleanCode === mockCode) return { approved: true }
    return { approved: false, error: "Code incorrect. Vérifiez les 6 chiffres saisis." }
  }

  if (!creds || !creds.verifyServiceSid) {
    return { approved: false, error: "Service de vérification non configuré." }
  }

  try {
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(
        creds.verifyServiceSid
      )}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(creds.accountSid, creds.authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: params.phoneE164,
          Code: cleanCode,
        }).toString(),
        signal: AbortSignal.timeout(6000),
      }
    )

    const json = (await res.json().catch(() => ({}))) as {
      status?: string
      valid?: boolean
      code?: number
    }

    if (!res.ok) {
      if (json.code === 60202) {
        return {
          approved: false,
          error: "Nombre maximal d'essais atteint. Demandez l'envoi d'un nouveau code.",
        }
      }
      if (res.status === 404 || json.code === 20404) {
        return {
          approved: false,
          error: "Ce code a expiré. Demandez un nouveau code par SMS ou appel.",
        }
      }
      return { approved: false, error: "Code invalide ou expiré." }
    }

    if (json.status === "approved" && json.valid !== false) {
      return { approved: true }
    }

    return {
      approved: false,
      error: "Code incorrect. Vérifiez le SMS ou l'appel reçu et réessayez.",
    }
  } catch (err) {
    console.error("[Twilio Verify] Échec de contrôle OTP:", err)
    return {
      approved: false,
      error: "Impossible de vérifier le code pour le moment. Réessayez.",
    }
  }
}

export function createPhoneVerificationProof(params: {
  phoneE164: string
  channel: "sms" | "call" | "dev_mock"
  lineType?: string | null
  carrierName?: string | null
  ttlSeconds?: number
}): string {
  const nowSec = Math.floor(Date.now() / 1000)
  const payload: PhoneVerificationProof = {
    phoneE164: params.phoneE164,
    channel: params.channel,
    lineType: params.lineType ?? null,
    carrierName: params.carrierName ?? null,
    verifiedAt: new Date().toISOString(),
    exp: nowSec + (params.ttlSeconds ?? 1800),
  }

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  const sig = createHmac("sha256", getProofSigningSecret()).update(encoded).digest("hex")
  return `${encoded}.${sig}`
}

export function verifyPhoneVerificationProof(
  token: string | null | undefined,
  expectedPhoneE164: string
): PhoneVerificationProof | null {
  if (!token || typeof token !== "string" || !expectedPhoneE164) return null
  const dotIdx = token.indexOf(".")
  if (dotIdx <= 0) return null

  const encoded = token.slice(0, dotIdx)
  const providedSig = token.slice(dotIdx + 1)
  if (!encoded || !providedSig) return null

  const expectedSig = createHmac("sha256", getProofSigningSecret())
    .update(encoded)
    .digest("hex")

  const a = Buffer.from(providedSig, "utf8")
  const b = Buffer.from(expectedSig, "utf8")
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as PhoneVerificationProof

    if (!parsed || typeof parsed.phoneE164 !== "string" || typeof parsed.exp !== "number") {
      return null
    }

    const nowSec = Math.floor(Date.now() / 1000)
    if (parsed.exp < nowSec) return null
    if (parsed.phoneE164 !== expectedPhoneE164) return null

    return parsed
  } catch {
    return null
  }
}
