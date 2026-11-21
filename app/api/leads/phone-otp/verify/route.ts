import { NextRequest, NextResponse } from "next/server"
import { resolveLeadPhoneE164 } from "@/lib/leads-validation"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  buildAdminLeadAlertPayloadFromLeadRow,
  dispatchDeferredAdminLeadAlert,
  sendAdminLeadOtpConfirmedEmail,
} from "@/lib/notify-admin-lead"
import {
  checkTwilioVerifyOtp,
  createPhoneVerificationProof,
  isTwilioPhoneOtpEnabled,
} from "@/lib/twilio-verify"
import { sendMetaConversionApiLead } from "@/lib/meta-capi"
import { shouldTrackMetaLeadConversion } from "@/lib/meta-lead-filter"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    const rawLeadId = typeof body.leadId === "string" ? body.leadId.trim() : ""
    const rawSessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""

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
      if (rawLeadId && UUID_REGEX.test(rawLeadId)) {
        try {
          const supabase = createServiceRoleClient()
          const { data: existingLead } = await supabase
            .from("leads")
            .select("id, phone, session_id, phone_verified, qualification_metadata")
            .eq("id", rawLeadId)
            .maybeSingle()

          const canUpdateLead =
            Boolean(existingLead) &&
            !existingLead!.phone_verified &&
            (existingLead!.phone === phoneE164 ||
              (rawSessionId !== "" && existingLead!.session_id === rawSessionId))

          if (existingLead && canUpdateLead) {
            const existingMeta =
              existingLead.qualification_metadata &&
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
            const prevVerifyFailed =
              typeof existingOtp.verifyFailedAttempts === "number"
                ? existingOtp.verifyFailedAttempts
                : 0

            await supabase
              .from("leads")
              .update({
                qualification_metadata: {
                  ...existingMeta,
                  verifications: {
                    ...existingVerifs,
                    phoneOtp: {
                      ...existingOtp,
                      verifyFailedAttempts: prevVerifyFailed + 1,
                      lastVerifyError: checkRes.error || "Code incorrect ou expiré.",
                    },
                  },
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", rawLeadId)
          }
        } catch (err) {
          console.warn("[API phone-otp/verify] Journalisation tentative échouée:", err)
        }
      }

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

    // Mise à niveau Soft OTP en base si le dossier lead vient d'être enregistré
    let leadUpdated = false
    if (rawLeadId && UUID_REGEX.test(rawLeadId)) {
      try {
        const supabase = createServiceRoleClient()
        const { data: existingLead } = await supabase
          .from("leads")
          .select(
            "id, phone, session_id, phone_verified, phone_carrier, phone_line_type, lead_score, marketplace_status, qualification_metadata"
          )
          .eq("id", rawLeadId)
          .maybeSingle()

        const canUpgradeLead =
          Boolean(existingLead) &&
          (existingLead!.phone === phoneE164 ||
            (rawSessionId !== "" && existingLead!.session_id === rawSessionId))

        if (existingLead && canUpgradeLead) {
          const nowIso = new Date().toISOString()
          const existingMeta =
            existingLead.qualification_metadata &&
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
          const existingLookup =
            existingVerifs.twilioLookup && typeof existingVerifs.twilioLookup === "object"
              ? (existingVerifs.twilioLookup as Record<string, any>)
              : {}
          const existingBadges = Array.isArray(existingVerifs.trustBadges)
            ? (existingVerifs.trustBadges as string[])
            : []
          const otpBadge =
            safeChannel === "call"
              ? "Téléphone certifié par appel vocal OTP"
              : "Téléphone certifié par SMS OTP"
          const mergedBadges = Array.from(new Set([...existingBadges, otpBadge]))
          const nextScore = existingLead.phone_verified
            ? Number(existingLead.lead_score || 0)
            : Math.min(100, Number(existingLead.lead_score || 0) + 15)

          const method =
            safeChannel === "call"
              ? "twilio_call"
              : safeChannel === "dev_mock"
                ? "dev_mock"
                : "twilio_sms"

          const { data: updatedLeadRow, error: upErr } = await supabase
            .from("leads")
            .update({
              phone: phoneE164,
              phone_verified: true,
              phone_verified_at: nowIso,
              phone_verification_method: method,
              phone_carrier: carrierName ?? existingLead.phone_carrier ?? null,
              phone_line_type: lineType ?? existingLead.phone_line_type ?? null,
              lead_score: nextScore,
              qualification_metadata: {
                ...existingMeta,
                verifications: {
                  ...existingVerifs,
                  phoneOtp: {
                    ...existingOtp,
                    verified: true,
                    status: "verified",
                    channel: safeChannel,
                    verifiedAt: nowIso,
                    required: false,
                    error: null,
                    twilioCode: null,
                  },
                  twilioLookup: {
                    ...existingLookup,
                    valid: true,
                    ...(lineType ? { lineType } : {}),
                    ...(carrierName ? { carrierName } : {}),
                  },
                  trustBadges: mergedBadges,
                },
              },
              updated_at: nowIso,
            })
            .eq("id", rawLeadId)
            .select("*")
            .maybeSingle()

          if (!upErr) {
            leadUpdated = true
            const alertStatus = existingMeta.admin_alert_status as string | undefined
            if (alertStatus === "pending_otp") {
              await dispatchDeferredAdminLeadAlert(supabase, rawLeadId, "otp_verified").catch(
                (err) => console.warn("[API phone-otp/verify] Alerte admin différée échouée:", err)
              )
            } else if (
              alertStatus === "sent" &&
              !existingLead.phone_verified &&
              updatedLeadRow
            ) {
              const payload = buildAdminLeadAlertPayloadFromLeadRow(updatedLeadRow)
              await sendAdminLeadOtpConfirmedEmail({
                ...payload,
                marketplaceStatus: updatedLeadRow.marketplace_status ?? null,
              }).catch((err) =>
                console.warn("[API phone-otp/verify] Notification OTP tardif échouée:", err)
              )
            }

            if (updatedLeadRow && !existingMeta.meta_capi_lead_sent_at) {
              try {
                const updatedMeta =
                  updatedLeadRow.qualification_metadata &&
                  typeof updatedLeadRow.qualification_metadata === "object"
                    ? (updatedLeadRow.qualification_metadata as Record<string, any>)
                    : {}
                const resolvedSegment = updatedLeadRow.segment || segment
                const isDeferredMetaEligible = shouldTrackMetaLeadConversion({
                  email: updatedLeadRow.email,
                  phone: updatedLeadRow.phone,
                  segment: resolvedSegment,
                  ownershipStatus: updatedLeadRow.ownership_status ?? null,
                  isResubmitSameFinalizedSession: false,
                  hasDuplicateEmail: Boolean(existingVerifs.duplicateCheck?.hasDuplicateEmail),
                  hasDuplicatePhone: Boolean(existingVerifs.duplicateCheck?.hasDuplicatePhone),
                  finalScore: nextScore,
                  lineType: updatedLeadRow.phone_line_type ?? lineType ?? null,
                  phoneVerified: true,
                })

                if (isDeferredMetaEligible) {
                  const clientIp =
                    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                    request.headers.get("x-real-ip") ||
                    undefined
                  const fbclid =
                    typeof existingMeta.fbclid === "string" && existingMeta.fbclid.trim()
                      ? existingMeta.fbclid.trim()
                      : undefined
                  const capiSent = await sendMetaConversionApiLead({
                    advertisingConsent: true,
                    eventId: updatedLeadRow.id,
                    email: updatedLeadRow.email || "",
                    phone: updatedLeadRow.phone || phoneE164,
                    firstName: updatedLeadRow.first_name || undefined,
                    lastName: updatedLeadRow.last_name || undefined,
                    postalCode: updatedLeadRow.postal_code || undefined,
                    countryCode: "be",
                    segment: resolvedSegment,
                    sourceUrl: request.headers.get("referer") || undefined,
                    clientIp,
                    userAgent: request.headers.get("user-agent") || undefined,
                    fbp: request.cookies.get("_fbp")?.value,
                    fbc: request.cookies.get("_fbc")?.value,
                    fbclid,
                  })

                  if (capiSent) {
                    await supabase
                      .from("leads")
                      .update({
                        qualification_metadata: {
                          ...updatedMeta,
                          meta_capi_lead_sent_at: new Date().toISOString(),
                          meta_capi_lead_source: "deferred_otp_verify",
                        },
                      })
                      .eq("id", rawLeadId)
                      .then(() => undefined, () => undefined)
                  }
                }
              } catch (capiErr) {
                console.warn("[API phone-otp/verify] Meta CAPI différé échoué:", capiErr)
              }
            }
          }
        }
      } catch (upgradeErr) {
        console.warn("[API phone-otp/verify] Upgrade lead non bloquant:", upgradeErr)
      }
    }

    return NextResponse.json({
      ok: true,
      verifiedPhone: phoneE164,
      channel: safeChannel,
      verificationToken,
      leadUpdated,
    })
  } catch (err) {
    console.error("[API phone-otp/verify] Erreur inattendue:", err)
    return NextResponse.json(
      { error: "Erreur lors du contrôle du code. Veuillez réessayer." },
      { status: 500 }
    )
  }
}
