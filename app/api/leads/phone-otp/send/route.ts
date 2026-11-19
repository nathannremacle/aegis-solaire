import { NextRequest, NextResponse } from "next/server"
import {
  getEmailError,
  getPersonNameError,
  isWalloonPostalCode,
  resolveLeadPhoneE164,
} from "@/lib/leads-validation"
import { checkOtpSendRateLimit } from "@/lib/rate-limit"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { dispatchDeferredAdminLeadAlert } from "@/lib/notify-admin-lead"
import {
  isTwilioPhoneOtpEnabled,
  lookupPhoneNumberTwilio,
  maskPhoneForDisplay,
  sendTwilioVerifyOtp,
  type TwilioLookupResult,
} from "@/lib/twilio-verify"

const MIN_FORM_FILL_TIME_MS = 4000
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOOKUP_REUSE_TTL_MS = 10 * 60 * 1000

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
    const rawLeadId = typeof body.leadId === "string" ? body.leadId.trim() : ""
    const rawSessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
    const hasAlreadySavedLead = rawLeadId.length > 0
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : ""
    const rawEmail = typeof body.email === "string" ? body.email.trim() : ""
    const rawFirstName = typeof body.firstName === "string" ? body.firstName.trim() : ""
    const rawLastName = typeof body.lastName === "string" ? body.lastName.trim() : ""
    const rawPostalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : ""
    const requestedChannel =
      body.channel === "call" ? "call" : body.channel === "sms" ? "sms" : null

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
        {
          error:
            phoneResolved.error ||
            "Veuillez saisir un numéro de téléphone belge ou français valide.",
        },
        { status: 400 }
      )
    }
    const phoneE164 = phoneResolved.e164

    type ExistingLeadRow = {
      id: string
      phone: string | null
      session_id: string | null
      phone_verified: boolean | null
      phone_verification_method: string | null
      phone_carrier: string | null
      phone_line_type: string | null
      qualification_metadata: Record<string, unknown> | null
    }

    // 1b. Chargement optionnel du dossier enregistré (traçabilité OTP & réutilisation Lookup)
    const supabase =
      rawLeadId && UUID_REGEX.test(rawLeadId) ? createServiceRoleClient() : null
    let existingLead: ExistingLeadRow | null = null

    if (supabase && rawLeadId) {
      try {
        const { data: ex } = await supabase
          .from("leads")
          .select(
            "id, phone, session_id, phone_verified, phone_verification_method, phone_carrier, phone_line_type, qualification_metadata"
          )
          .eq("id", rawLeadId)
          .maybeSingle()
        existingLead = (ex as ExistingLeadRow | null) ?? null
      } catch (err) {
        console.warn("[API phone-otp/send] Lecture lead non bloquante:", err)
      }
    }

    const ownsLead = Boolean(
      existingLead &&
        (existingLead.phone === phoneE164 ||
          (rawSessionId !== "" && existingLead.session_id === rawSessionId))
    )

    const existingMeta =
      existingLead?.qualification_metadata &&
      typeof existingLead.qualification_metadata === "object"
        ? (existingLead.qualification_metadata as Record<string, any>)
        : {}
    const existingVerifs =
      existingMeta.verifications && typeof existingMeta.verifications === "object"
        ? (existingMeta.verifications as Record<string, any>)
        : {}
    const existingOtp =
      existingVerifs.phoneOtp && typeof existingVerifs.phoneOtp === "object"
        ? (existingVerifs.phoneOtp as Record<string, any>)
        : {}

    const persistPhoneOtpEvent = async (
      patch: Record<string, unknown>,
      lookupSnapshot?: Record<string, unknown> | null
    ) => {
      if (!supabase || !ownsLead || !existingLead) return
      if (existingLead.phone_verified === true && patch.verified !== true) return

      try {
        const { data: freshRow } = await supabase
          .from("leads")
          .select("qualification_metadata, phone_verification_method, phone_carrier, phone_line_type")
          .eq("id", existingLead.id)
          .maybeSingle()

        const freshMeta =
          freshRow?.qualification_metadata &&
          typeof freshRow.qualification_metadata === "object"
            ? (freshRow.qualification_metadata as Record<string, any>)
            : existingMeta
        const freshVerifs =
          freshMeta.verifications && typeof freshMeta.verifications === "object"
            ? (freshMeta.verifications as Record<string, any>)
            : existingVerifs
        const freshOtp =
          freshVerifs.phoneOtp && typeof freshVerifs.phoneOtp === "object"
            ? (freshVerifs.phoneOtp as Record<string, any>)
            : existingOtp
        const freshLookup =
          freshVerifs.twilioLookup && typeof freshVerifs.twilioLookup === "object"
            ? (freshVerifs.twilioLookup as Record<string, any>)
            : {}

        const nextLookup = lookupSnapshot ? { ...freshLookup, ...lookupSnapshot } : freshVerifs.twilioLookup
        const updatePayload: Record<string, unknown> = {
          qualification_metadata: {
            ...freshMeta,
            verifications: {
              ...freshVerifs,
              phoneOtp: {
                ...freshOtp,
                ...patch,
              },
              ...(nextLookup !== undefined ? { twilioLookup: nextLookup } : {}),
            },
          },
          updated_at: new Date().toISOString(),
        }

        if (lookupSnapshot && lookupSnapshot.valid === true && lookupSnapshot.transientError !== true) {
          if (typeof lookupSnapshot.carrierName === "string" && lookupSnapshot.carrierName) {
            updatePayload.phone_carrier = lookupSnapshot.carrierName
          }
          if (typeof lookupSnapshot.lineType === "string" && lookupSnapshot.lineType) {
            updatePayload.phone_line_type = lookupSnapshot.lineType
          }
          if (!freshRow?.phone_verification_method) {
            updatePayload.phone_verification_method = "twilio_lookup"
          }
        }

        await supabase.from("leads").update(updatePayload).eq("id", existingLead.id)
      } catch (persistErr) {
        console.warn("[API phone-otp/send] Persistance statut OTP non bloquante:", persistErr)
      }
    }

    // 2. Twilio Lookup v2 (avec réutilisation si déjà validé pour ce même numéro dans les 10 dernières min)
    const cachedLookup =
      existingVerifs.twilioLookup && typeof existingVerifs.twilioLookup === "object"
        ? (existingVerifs.twilioLookup as Record<string, any>)
        : null
    const canReuseLookup = Boolean(
      ownsLead &&
        existingLead?.phone === phoneE164 &&
        cachedLookup?.configured === true &&
        cachedLookup?.valid === true &&
        cachedLookup?.transientError !== true &&
        typeof cachedLookup?.checkedAt === "string" &&
        Date.now() - new Date(cachedLookup.checkedAt).getTime() < LOOKUP_REUSE_TTL_MS
    )

    let lookup: TwilioLookupResult
    let freshLookupSnapshot: Record<string, unknown> | null = null

    if (canReuseLookup && cachedLookup) {
      lookup = {
        configured: true,
        valid: true,
        countryCode: (cachedLookup.countryCode as string | null) ?? "BE",
        lineType: (cachedLookup.lineType as string | null) ?? null,
        carrierName: (cachedLookup.carrierName as string | null) ?? null,
        smsPumpingRiskLevel: (cachedLookup.smsPumpingRiskLevel as string | null) ?? null,
        smsPumpingRiskScore:
          typeof cachedLookup.smsPumpingRiskScore === "number"
            ? cachedLookup.smsPumpingRiskScore
            : null,
      }
    } else {
      lookup = await lookupPhoneNumberTwilio(phoneE164, {
        allowVoip: segment === "B2B",
      })
      if (lookup.configured) {
        freshLookupSnapshot = {
          configured: true,
          valid: Boolean(lookup.valid && !lookup.transientError),
          countryCode: lookup.countryCode,
          lineType: lookup.lineType,
          carrierName: lookup.carrierName,
          smsPumpingRiskLevel: lookup.smsPumpingRiskLevel,
          smsPumpingRiskScore: lookup.smsPumpingRiskScore,
          transientError: Boolean(lookup.transientError),
          checkedAt: new Date().toISOString(),
        }
      }
    }

    const nowIso = new Date().toISOString()

    if (lookup.configured && !lookup.valid && !lookup.transientError) {
      if (hasAlreadySavedLead) {
        await persistPhoneOtpEvent(
          {
            verified: false,
            status: "not_attempted_invalid_lookup",
            failedAt: nowIso,
            error: lookup.blockedReason || null,
          },
          freshLookupSnapshot
        )
        if (supabase && ownsLead && existingLead) {
          await dispatchDeferredAdminLeadAlert(supabase, existingLead.id, "otp_send_terminal")
        }
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
      await persistPhoneOtpEvent(
        {
          verified: false,
          status: "not_attempted_voip",
          error: null,
        },
        freshLookupSnapshot
      )
      if (supabase && ownsLead && existingLead) {
        await dispatchDeferredAdminLeadAlert(supabase, existingLead.id, "otp_send_terminal")
      }
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
        await persistPhoneOtpEvent(
          {
            verified: false,
            status: "not_attempted_non_be",
            error: null,
          },
          freshLookupSnapshot
        )
        if (supabase && ownsLead && existingLead) {
          await dispatchDeferredAdminLeadAlert(supabase, existingLead.id, "otp_send_terminal")
        }
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
      const disabledStatus =
        process.env.LEAD_PHONE_OTP_DISABLED === "true" ? "disabled" : "not_configured"
      if (process.env.NODE_ENV === "production" && process.env.LEAD_PHONE_OTP_DISABLED !== "true") {
        console.error(
          "[API phone-otp/send] OTP désactivé silencieusement : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ou TWILIO_VERIFY_SERVICE_SID manquant en production."
        )
      }
      await persistPhoneOtpEvent(
        {
          verified: false,
          status: disabledStatus,
        },
        freshLookupSnapshot
      )
      if (supabase && ownsLead && existingLead) {
        await dispatchDeferredAdminLeadAlert(supabase, existingLead.id, "otp_send_terminal")
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
      await persistPhoneOtpEvent(
        {
          verified: false,
          status: "rate_limited",
          failedAt: nowIso,
          error: rl.reason || "Trop de demandes de code sur ce numéro.",
        },
        freshLookupSnapshot
      )
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

    const channel: "sms" | "call" = requestedChannel ?? (isLikelyMobile ? "sms" : "call")
    const prevAttempts =
      typeof existingOtp.sendAttempts === "number" ? existingOtp.sendAttempts : 0

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
      await persistPhoneOtpEvent(
        {
          verified: false,
          status: "send_failed",
          channel,
          failedAt: nowIso,
          twilioCode: sendRes.twilioCode ?? null,
          accountRestricted: Boolean(sendRes.accountRestricted),
          error: sendRes.error || "Impossible d'envoyer le code de vérification.",
          sendAttempts: prevAttempts + 1,
        },
        freshLookupSnapshot
      )
      if (sendRes.accountRestricted && hasAlreadySavedLead) {
        if (supabase && ownsLead && existingLead) {
          await dispatchDeferredAdminLeadAlert(supabase, existingLead.id, "otp_send_terminal")
        }
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

    await persistPhoneOtpEvent(
      {
        verified: false,
        status: "sent_pending",
        channel: sendRes.channel,
        sentAt: nowIso,
        sendAttempts: prevAttempts + 1,
        twilioCode: null,
        accountRestricted: false,
        error: null,
      },
      freshLookupSnapshot
    )

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
