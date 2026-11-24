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
      "id, email, segment, target_provinces, target_surfaces, min_facture, email_notifications_enabled, email_relances_enabled, auto_buy_enabled, auto_buy_weekly_cap, auto_buy_include_b2c_exclusive, auto_topup_enabled, auto_topup_pack_id, sms_alerts_opt_in, mollie_mandate_status"
    )
    .eq("id", partner.id)
    .single()

  if (
    fullRes.error &&
    (fullRes.error.code === "42703" ||
      fullRes.error.message?.includes("auto_buy") ||
      fullRes.error.message?.includes("mollie_mandate_status"))
  ) {
    const legacyRes = await admin
      .from("partners")
      .select(
        "id, email, segment, target_provinces, target_surfaces, min_facture, email_notifications_enabled, email_relances_enabled"
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
      segment: getEffectivePartnerSegment(data ?? partner),
      notificationMode: getPartnerNotificationMode(data),
      autoBuyEnabled: Boolean(data?.auto_buy_enabled),
      autoBuyWeeklyCap: Number(data?.auto_buy_weekly_cap) || 3,
      autoBuyIncludeB2cExclusive: Boolean(data?.auto_buy_include_b2c_exclusive),
      autoTopupEnabled: Boolean(data?.auto_topup_enabled),
      autoTopupPackId: data?.auto_topup_pack_id || "pack_24",
      smsAlertsOptIn: Boolean(data?.sms_alerts_opt_in),
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
    segment?: PartnerSegmentPreference
    notificationMode?: PartnerNotificationMode
    autoBuyEnabled?: boolean
    autoBuyWeeklyCap?: number
    autoBuyIncludeB2cExclusive?: boolean
    autoTopupEnabled?: boolean
    autoTopupPackId?: string
    smsAlertsOptIn?: boolean
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
      fullError.message?.includes("auto_buy"))
  ) {
    const fallbackRes = await admin
      .from("partners")
      .update(baseUpdateData)
      .eq("id", partner.id)
    updateError = fallbackRes.error
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
      segment: resolvedSegment ?? getEffectivePartnerSegment(partner),
      notificationMode: resolvedMode,
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
