import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  applyNotificationModeToSurfaces,
  getCleanTargetSurfaces,
  getEffectivePartnerSegment,
  getPartnerNotificationMode,
  isValidPartnerNotificationMode,
  normalizePartnerSegment,
  type PartnerNotificationMode,
  type PartnerSegmentPreference,
} from "@/lib/partner-notification-prefs"

export const dynamic = "force-dynamic"

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  let data: any = null
  let error: any = null

  const fullRes = await admin
    .from("partners")
    .select(
      "id, email, phone, segment, target_provinces, target_surfaces, min_facture, min_kwc, weekly_digest_enabled, email_notifications_enabled, email_relances_enabled, auto_buy_enabled, auto_buy_weekly_cap, auto_buy_include_b2c_exclusive, auto_topup_enabled, auto_topup_pack_id, sms_alerts_opt_in, mollie_mandate_status"
    )
    .eq("id", partner.id)
    .single()

  if (
    fullRes.error &&
    (fullRes.error.code === "42703" ||
      fullRes.error.message?.includes("auto_buy") ||
      fullRes.error.message?.includes("mollie_mandate_status") ||
      fullRes.error.message?.includes("min_kwc") ||
      fullRes.error.message?.includes("weekly_digest_enabled") ||
      fullRes.error.message?.includes("sms_alerts_opt_in"))
  ) {
    const legacyRes = await admin
      .from("partners")
      .select(
        "id, email, phone, segment, target_provinces, target_surfaces, min_facture, email_notifications_enabled, email_relances_enabled"
      )
      .eq("id", partner.id)
      .single()
    data = legacyRes.data
    error = legacyRes.error
  } else {
    data = fullRes.data
    error = fullRes.error
  }

  if (error) {
    console.error("[preferences] GET error:", error)
    return NextResponse.json({ error: "Erreur récupération préférences" }, { status: 500 })
  }

  return NextResponse.json({
    preferences: {
      provinces: data?.target_provinces ?? ["liege", "namur", "hainaut"],
      surfaces: getCleanTargetSurfaces(data?.target_surfaces),
      minFacture: data?.min_facture ?? 5000,
      minKwc: Number(data?.min_kwc) || 0,
      phone: data?.phone || null,
      segment: getEffectivePartnerSegment(data ?? partner),
      notificationMode: getPartnerNotificationMode(data),
      autoBuyEnabled: Boolean(data?.auto_buy_enabled),
      autoBuyWeeklyCap: Number(data?.auto_buy_weekly_cap) || 3,
      autoBuyIncludeB2cExclusive: Boolean(data?.auto_buy_include_b2c_exclusive),
      autoTopupEnabled: Boolean(data?.auto_topup_enabled),
      autoTopupPackId: data?.auto_topup_pack_id || "pack_24",
      smsAlertsOptIn: Boolean(data?.sms_alerts_opt_in),
      weeklyDigestEnabled: data?.weekly_digest_enabled !== false,
      mollieMandateStatus: data?.mollie_mandate_status || "none",
    },
  })
}

async function handleUpdate(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: {
    provinces?: string[]
    surfaces?: string[]
    minFacture?: number
    minKwc?: number
    segment?: PartnerSegmentPreference
    notificationMode?: PartnerNotificationMode
    autoBuyEnabled?: boolean
    autoBuyWeeklyCap?: number
    autoBuyIncludeB2cExclusive?: boolean
    autoTopupEnabled?: boolean
    autoTopupPackId?: string
    smsAlertsOptIn?: boolean
    weeklyDigestEnabled?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const resolvedMode: PartnerNotificationMode = isValidPartnerNotificationMode(body.notificationMode)
    ? body.notificationMode
    : getPartnerNotificationMode(partner)

  const resolvedSegment = normalizePartnerSegment(body.segment)

  const cleanSurfaces = Array.isArray(body.surfaces)
    ? getCleanTargetSurfaces(body.surfaces)
    : getCleanTargetSurfaces(partner.target_surfaces)

  const encodedSurfaces = applyNotificationModeToSurfaces(cleanSurfaces, resolvedMode)

  const baseUpdateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    target_surfaces: encodedSurfaces,
  }

  if (Array.isArray(body.provinces)) {
    baseUpdateData.target_provinces = body.provinces
  }
  if (typeof body.minFacture === "number") {
    baseUpdateData.min_facture = body.minFacture
  }
  if (resolvedSegment) {
    baseUpdateData.segment = resolvedSegment
  }

  const autoPilotFields: Record<string, unknown> = {}
  if (typeof body.autoBuyEnabled === "boolean") {
    autoPilotFields.auto_buy_enabled = body.autoBuyEnabled
  }
  if (typeof body.autoBuyWeeklyCap === "number") {
    autoPilotFields.auto_buy_weekly_cap = Math.min(50, Math.max(1, Math.round(body.autoBuyWeeklyCap)))
  }
  if (typeof body.autoBuyIncludeB2cExclusive === "boolean") {
    autoPilotFields.auto_buy_include_b2c_exclusive = body.autoBuyIncludeB2cExclusive
  }
  if (typeof body.autoTopupEnabled === "boolean") {
    autoPilotFields.auto_topup_enabled = body.autoTopupEnabled
  }
  if (body.autoTopupPackId === "pack_24" || body.autoTopupPackId === "pack_60") {
    autoPilotFields.auto_topup_pack_id = body.autoTopupPackId
  }
  if (typeof body.smsAlertsOptIn === "boolean") {
    autoPilotFields.sms_alerts_opt_in = body.smsAlertsOptIn
    if (body.smsAlertsOptIn) {
      autoPilotFields.sms_alerts_opt_in_at = new Date().toISOString()
    }
  }
  if (typeof body.weeklyDigestEnabled === "boolean") {
    autoPilotFields.weekly_digest_enabled = body.weeklyDigestEnabled
  }
  if (typeof body.minKwc === "number" && Number.isFinite(body.minKwc)) {
    autoPilotFields.min_kwc = Math.max(0, Math.min(1000, Math.round(body.minKwc)))
  }

  const { error: fullError } = await admin
    .from("partners")
    .update({
      ...baseUpdateData,
      email_notifications_enabled: resolvedMode !== "none",
      email_relances_enabled: resolvedMode === "all",
      ...autoPilotFields,
    })
    .eq("id", partner.id)

  let updateError = fullError
  if (
    fullError &&
    (fullError.code === "42703" ||
      fullError.message?.includes("email_notifications_enabled") ||
      fullError.message?.includes("email_relances_enabled") ||
      fullError.message?.includes("auto_buy") ||
      fullError.message?.includes("weekly_digest_enabled") ||
      fullError.message?.includes("min_kwc") ||
      fullError.message?.includes("sms_alerts_opt_in"))
  ) {
    // Fallback granulaire : tenter de sauver au moins sms_alerts_opt_in + baseUpdateData
    const minimalExtended: Record<string, unknown> = { ...baseUpdateData }
    if (typeof body.smsAlertsOptIn === "boolean") {
      minimalExtended.sms_alerts_opt_in = body.smsAlertsOptIn
    }
    const smsRes = await admin.from("partners").update(minimalExtended).eq("id", partner.id)
    if (smsRes.error && (smsRes.error.code === "42703" || smsRes.error.message?.includes("sms_alerts_opt_in"))) {
      const fallbackRes = await admin
        .from("partners")
        .update(baseUpdateData)
        .eq("id", partner.id)
      updateError = fallbackRes.error
    } else {
      updateError = smsRes.error
    }
  }

  if (updateError) {
    console.error("[preferences] update error:", updateError)
    return NextResponse.json({ error: "Erreur enregistrement préférences" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    preferences: {
      provinces: body.provinces ?? partner.target_provinces,
      surfaces: cleanSurfaces,
      targetSurfacesRaw: encodedSurfaces,
      minFacture: body.minFacture ?? partner.min_facture,
      minKwc:
        typeof body.minKwc === "number"
          ? Math.max(0, Math.min(1000, Math.round(body.minKwc)))
          : undefined,
      segment: resolvedSegment ?? getEffectivePartnerSegment(partner),
      notificationMode: resolvedMode,
      smsAlertsOptIn:
        typeof body.smsAlertsOptIn === "boolean" ? body.smsAlertsOptIn : undefined,
      weeklyDigestEnabled:
        typeof body.weeklyDigestEnabled === "boolean" ? body.weeklyDigestEnabled : undefined,
      autoBuyEnabled: typeof body.autoBuyEnabled === "boolean" ? body.autoBuyEnabled : undefined,
      autoBuyWeeklyCap:
        typeof body.autoBuyWeeklyCap === "number"
          ? Math.min(50, Math.max(1, Math.round(body.autoBuyWeeklyCap)))
          : undefined,
      autoBuyIncludeB2cExclusive:
        typeof body.autoBuyIncludeB2cExclusive === "boolean"
          ? body.autoBuyIncludeB2cExclusive
          : undefined,
    },
    message: "Préférences d'alerte et Auto-Pilot enregistrés avec succès.",
  })
}

export async function POST(request: Request) {
  return handleUpdate(request)
}

export async function PATCH(request: Request) {
  return handleUpdate(request)
}
