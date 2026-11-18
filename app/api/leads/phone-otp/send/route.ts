import { NextRequest, NextResponse } from "next/server"
import {
  getEmailError,
  getPersonNameError,
  isWalloonPostalCode,
  resolveLeadPhoneE164,
} from "@/lib/leads-validation"
import { checkOtpSendRateLimit } from "@/lib/rate-limit"
import {
  isTwilioPhoneOtpEnabled,
  lookupPhoneNumberTwilio,
  maskPhoneForDisplay,
  sendTwilioVerifyOtp,
} from "@/lib/twilio-verify"

const MIN_FORM_FILL_TIME_MS = 4000

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 })
    }

    if (body.fax_number != null && String(body.fax_number).trim() !== "") {
      return NextResponse.json({ ok: true, otpRequired: false })
    }

    if (typeof body.form_opened_at === "string" && body.form_opened_at.trim()) {
      const opened = new Date(body.form_opened_at).getTime()
      if (Number.isNaN(opened) || Date.now() - opened < MIN_FORM_FILL_TIME_MS) {
        return NextResponse.json(
          { error: "Veuillez patienter quelques secondes avant de valider votre demande." },
          { status: 400 }
        )
      }
    }

    const segment = body.segment === "B2B" ? "B2B" : "B2C"
    const hasAlreadySavedLead =
      typeof body.leadId === "string" && body.leadId.trim().length > 0
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : ""
    const rawEmail = typeof body.email === "string" ? body.email.trim() : ""
    const rawFirstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
    const rawLastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
    const rawPostalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : ""
    const requestedChannel = body.channel === "call" ? "call" : body.channel === "sms" ? "sms" : null

    // 1. Pré-contrôles gratuits (évite toute consommation d'API Twilio sur données invalides)
    if (rawEmail) {
      const emailErr = getEmailError(rawEmail)
      if (emailErr) {
        return NextResponse.json({ error: emailErr }, { status: 400 })
      }
    }
    if (rawFirstName) {
      const firstErr = getPersonNameError(rawFirstName, "prénom")
      if (firstErr) return NextResponse.json({ error: firstErr }, { status: 400 })
    }
    if (rawLastName) {
      const lastErr = getPersonNameError(rawLastName, "nom")
      if (lastErr) return NextResponse.json({ error: lastErr }, { status: 400 })
    }
    if (segment === "B2C" && rawPostalCode && !isWalloonPostalCode(rawPostalCode)) {
      return NextResponse.json(
        {
          error:
            "Zone non couverte : notre comparateur RESCERT couvre exclusivement la Wallonie (1300-1499 et 4000-7999).",
        },
        { status: 400 }
      )
    }

    const phoneResolved = resolveLeadPhoneE164(rawPhone, segment)
    if (!phoneResolved.valid || !phoneResolved.e164) {
      return NextResponse.json(
        { error: phoneResolved.error || "Veuillez saisir un numéro de téléphone belge ou français valide." },
        { status: 400 }
      )
    }
    const phoneE164 = phoneResolved.e164

    // 2. Twilio Lookup v2 (Line Type + SMS Pumping Risk + Attribution opérateur)
    const lookup = await lookupPhoneNumberTwilio(phoneE164, {
      allowVoip: segment === "B2B",
    })
    if (lookup.configured && !lookup.valid && !lookup.transientError) {
      if (hasAlreadySavedLead) {
        return NextResponse.json({
          ok: true,
          otpRequired: false,
          normalizedPhone: phoneE164,
          lookup,
        })
      }
      return NextResponse.json(
        {
          error:
            lookup.blockedReason ||
            "Ce numéro ne semble pas actif ou attribué. Veuillez saisir un numéro joignable.",
        },
        { status: 400 }
      )
    }
    if (
      lookup.configured &&
      (lookup.lineType === "voip" || lookup.lineType === "nonFixedVoip") &&
      hasAlreadySavedLead
    ) {
      // Éviter d'envoyer un SMS payant sur une ligne VoIP déjà enregistrée en mode Soft OTP
      return NextResponse.json({
        ok: true,
        otpRequired: false,
        normalizedPhone: phoneE164,
        lookup,
      })
    }
    if (segment === "B2C" && lookup.configured && lookup.countryCode && lookup.countryCode !== "BE") {
      if (hasAlreadySavedLead) {
        return NextResponse.json({
          ok: true,
          otpRequired: false,
          normalizedPhone: phoneE164,
          lookup,
        })
      }
      return NextResponse.json(
        { error: "Un numéro de téléphone belge (+32) est requis en Wallonie." },
        { status: 400 }
      )
    }

    // 3. Si Twilio Verify n'est pas configuré dans l'environnement, ne pas bloquer le tunnel
    if (!isTwilioPhoneOtpEnabled()) {
      if (process.env.NODE_ENV === "production" && process.env.LEAD_PHONE_OTP_DISABLED !== "true") {
        console.error(
          "[API phone-otp/send] OTP désactivé silencieusement : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ou TWILIO_VERIFY_SERVICE_SID manquant en production."
        )
      }
      return NextResponse.json({
        ok: true,
        otpRequired: false,
        normalizedPhone: phoneE164,
        lookup,
      })
    }

    // 4. Rate limit strict anti-SMS pumping par IP et par numéro
    const rl = await checkOtpSendRateLimit(request, phoneE164)
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: rl.reason || "Trop de demandes de code sur ce numéro.",
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        { status: 429 }
      )
    }

    // 5. Choix du canal optimal (SMS sur mobile, appel vocal sur fixe belge/français)
    const isLikelyMobile =
      lookup.lineType === "mobile" ||
      (/^\+324[5-9]\d{7}$/.test(phoneE164) && lookup.lineType !== "landline") ||
      (/^\+33[67]\d{8}$/.test(phoneE164) && lookup.lineType !== "landline")

    const channel: "sms" | "call" =
      requestedChannel ?? (isLikelyMobile ? "sms" : "call")

    const sendRes = await sendTwilioVerifyOtp({ phoneE164, channel })
    if (!sendRes.ok) {
      console.error("[API phone-otp/send] Échec d'envoi OTP:", {
        channel,
        lineType: lookup.lineType,
        lookupTransientError: Boolean(lookup.transientError),
        twilioCode: sendRes.twilioCode ?? null,
        accountRestricted: Boolean(sendRes.accountRestricted),
        error: sendRes.error,
      })
      if (sendRes.accountRestricted && hasAlreadySavedLead) {
        return NextResponse.json({
          ok: true,
          otpRequired: false,
          normalizedPhone: phoneE164,
          lookup,
        })
      }
      return NextResponse.json(
        { error: sendRes.error || "Impossible d'envoyer le code de vérification." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      otpRequired: true,
      channel: sendRes.channel,
      normalizedPhone: phoneE164,
      maskedPhone: maskPhoneForDisplay(phoneE164),
      lineType: lookup.lineType,
      carrierName: lookup.carrierName,
      cooldownSeconds: 30,
    })
  } catch (err) {
    console.error("[API phone-otp/send] Erreur inattendue:", err)
    return NextResponse.json(
      { error: "Erreur lors de la vérification du numéro. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
