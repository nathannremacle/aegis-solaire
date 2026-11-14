import { NextRequest, NextResponse } from "next/server"
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
import { verifyPartnerUnsubscribeToken } from "@/lib/partner-notification-tokens"

export const dynamic = "force-dynamic"

async function persistPartnerNotificationMode(
  partnerId: string,
  currentSurfaces: string[] | null | undefined,
  mode: PartnerNotificationMode,
  extra?: {
    provinces?: string[]
    surfaces?: string[]
    minFacture?: number
    segment?: PartnerSegmentPreference | null
  }
) {
  const admin = createServiceRoleClient()
  const cleanSurfaces = Array.isArray(extra?.surfaces)
    ? getCleanTargetSurfaces(extra.surfaces)
    : getCleanTargetSurfaces(currentSurfaces)
  const encodedSurfaces = applyNotificationModeToSurfaces(cleanSurfaces, mode)

  const baseUpdates: Record<string, unknown> = {
    target_surfaces: encodedSurfaces,
    updated_at: new Date().toISOString(),
  }
  if (Array.isArray(extra?.provinces)) {
    baseUpdates.target_provinces = extra.provinces
  }
  if (typeof extra?.minFacture === "number") {
    baseUpdates.min_facture = extra.minFacture
  }
  if (extra?.segment) {
    baseUpdates.segment = extra.segment
  }

  const { error: fullError } = await admin
    .from("partners")
    .update({
      ...baseUpdates,
      email_notifications_enabled: mode !== "none",
      email_relances_enabled: mode === "all",
    })
    .eq("id", partnerId)

  if (
    fullError &&
    (fullError.code === "42703" ||
      fullError.message?.includes("email_notifications_enabled") ||
      fullError.message?.includes("email_relances_enabled"))
  ) {
    const { error: fallbackError } = await admin
      .from("partners")
      .update(baseUpdates)
      .eq("id", partnerId)
    return { error: fallbackError, cleanSurfaces, encodedSurfaces }
  }

  return { error: fullError, cleanSurfaces, encodedSurfaces }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const partnerId = (searchParams.get("partner") || "").trim()
  const token = (searchParams.get("token") || "").trim()

  if (!partnerId || !verifyPartnerUnsubscribeToken(partnerId, token)) {
    return NextResponse.json({ error: "Lien de gestion invalide ou expiré." }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const { data: partner, error } = await admin
    .from("partners")
    .select("id, company_name, email, segment, target_provinces, target_surfaces, min_facture, email_notifications_enabled, email_relances_enabled")
    .eq("id", partnerId)
    .maybeSingle()

  if (error || !partner) {
    return NextResponse.json({ error: "Compte partenaire introuvable." }, { status: 404 })
  }

  return NextResponse.json({
    partner: {
      id: partner.id,
      companyName: partner.company_name,
      email: partner.email,
      segment: getEffectivePartnerSegment(partner),
      provinces: partner.target_provinces ?? [],
      surfaces: getCleanTargetSurfaces(partner.target_surfaces),
      minFacture: partner.min_facture ?? 0,
      notificationMode: getPartnerNotificationMode(partner),
    },
  })
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let partnerId = (searchParams.get("partner") || "").trim()
  let token = (searchParams.get("token") || "").trim()
  let modeParam: unknown = searchParams.get("mode")
  let segmentParam: unknown = searchParams.get("segment")
  let extraProvinces: string[] | undefined
  let extraSurfaces: string[] | undefined
  let extraMinFacture: number | undefined

  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json()
      if (typeof body.partnerId === "string" && !partnerId) partnerId = body.partnerId.trim()
      if (typeof body.token === "string" && !token) token = body.token.trim()
      if (body.mode !== undefined) modeParam = body.mode
      if (body.segment !== undefined) segmentParam = body.segment
      if (Array.isArray(body.provinces)) extraProvinces = body.provinces
      if (Array.isArray(body.surfaces)) extraSurfaces = body.surfaces
      if (typeof body.minFacture === "number") extraMinFacture = body.minFacture
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 })
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    // Support RFC 8058 One-Click Unsubscribe (List-Unsubscribe=One-Click)
    const text = await request.text().catch(() => "")
    if (text.includes("List-Unsubscribe=One-Click") && !modeParam) {
      modeParam = "none"
    }
  }

  if (!partnerId || !verifyPartnerUnsubscribeToken(partnerId, token)) {
    return NextResponse.json({ error: "Lien de gestion invalide ou expiré." }, { status: 403 })
  }

  const requestedSegment = normalizePartnerSegment(segmentParam)

  const admin = createServiceRoleClient()
  const { data: partner, error: fetchErr } = await admin
    .from("partners")
    .select("id, company_name, email, segment, target_provinces, target_surfaces, min_facture, email_notifications_enabled, email_relances_enabled")
    .eq("id", partnerId)
    .maybeSingle()

  if (fetchErr || !partner) {
    return NextResponse.json({ error: "Compte partenaire introuvable." }, { status: 404 })
  }

  const mode: PartnerNotificationMode = isValidPartnerNotificationMode(modeParam)
    ? modeParam
    : modeParam === undefined || modeParam === null
      ? getPartnerNotificationMode(partner)
      : "none"

  const { error: updateErr, cleanSurfaces } = await persistPartnerNotificationMode(
    partner.id,
    partner.target_surfaces,
    mode,
    {
      provinces: extraProvinces,
      surfaces: extraSurfaces,
      minFacture: extraMinFacture,
      segment: requestedSegment,
    }
  )

  if (updateErr) {
    console.error("[unsubscribe] update error:", updateErr)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de vos préférences." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    notificationMode: mode,
    segment: requestedSegment ?? getEffectivePartnerSegment(partner),
    surfaces: cleanSurfaces,
    provinces: extraProvinces ?? partner.target_provinces ?? [],
    minFacture: extraMinFacture ?? partner.min_facture ?? 0,
  })
}

