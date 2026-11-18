import { NextRequest, NextResponse } from "next/server"
import { resolveLeadPhoneE164 } from "@/lib/leads-validation"
import {
  checkTwilioVerifyOtp,
  createPhoneVerificationProof,
  isTwilioPhoneOtpEnabled,
} from "@/lib/twilio-verify"

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 })
    }

    const segment = body.segment === "B2B" ? "B2B" : "B2C"
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : ""
    const rawCode = typeof body.code === "string" ? body.code.replace(/\D/g, "") : ""
    const channelRaw = body.channel
    const lineType = typeof body.lineType === "string" ? body.lineType : null
    const carrierName = typeof body.carrierName === "string" ? body.carrierName : null

    if (!isTwilioPhoneOtpEnabled()) {
      return NextResponse.json(
        { error: "La vérification par SMS n'est pas activée sur cet environnement." },
        { status: 400 }
      )
    }

    const phoneResolved = resolveLeadPhoneE164(rawPhone, segment)
    if (!phoneResolved.valid || !phoneResolved.e164) {
      return NextResponse.json(
        { error: phoneResolved.error || "Numéro de téléphone invalide." },
        { status: 400 }
      )
    }
    const phoneE164 = phoneResolved.e164

    if (rawCode.length < 4 || rawCode.length > 8) {
      return NextResponse.json(
        { error: "Veuillez saisir le code à 6 chiffres reçu sur votre téléphone." },
        { status: 400 }
      )
    }

    const checkRes = await checkTwilioVerifyOtp({ phoneE164, code: rawCode })
    if (!checkRes.approved) {
      return NextResponse.json(
        { error: checkRes.error || "Code incorrect ou expiré." },
        { status: 400 }
      )
    }

    const safeChannel: "sms" | "call" | "dev_mock" =
      channelRaw === "call"
        ? "call"
        : channelRaw === "dev_mock"
          ? "dev_mock"
          : "sms"

    const verificationToken = createPhoneVerificationProof({
      phoneE164,
      channel: safeChannel,
      lineType,
      carrierName,
    })

    return NextResponse.json({
      ok: true,
      verifiedPhone: phoneE164,
      channel: safeChannel,
      verificationToken,
    })
  } catch (err) {
    console.error("[API phone-otp/verify] Erreur inattendue:", err)
    return NextResponse.json(
      { error: "Erreur lors du contrôle du code. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
