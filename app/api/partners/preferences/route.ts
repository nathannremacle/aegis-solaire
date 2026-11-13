import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  applyNotificationModeToSurfaces,
  getCleanTargetSurfaces,
  getPartnerNotificationMode,
  isValidPartnerNotificationMode,
  type PartnerNotificationMode,
} from "@/lib/partner-notification-prefs"

export const dynamic = "force-dynamic"

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("partners")
    .select("id, target_provinces, target_surfaces, min_facture")
    .eq("id", partner.id)
    .single()

  if (error) {
    console.error("[preferences] GET error:", error)
    return NextResponse.json({ error: "Erreur récupération préférences" }, { status: 500 })
  }

  return NextResponse.json({
    preferences: {
      provinces: data?.target_provinces ?? ["liege", "namur", "hainaut"],
      surfaces: getCleanTargetSurfaces(data?.target_surfaces),
      minFacture: data?.min_facture ?? 5000,
      notificationMode: getPartnerNotificationMode(data),
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
    notificationMode?: PartnerNotificationMode
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

  const { error: fullError } = await admin
    .from("partners")
    .update({
      ...baseUpdateData,
      email_notifications_enabled: resolvedMode !== "none",
      email_relances_enabled: resolvedMode === "all",
    })
    .eq("id", partner.id)

  let updateError = fullError
  if (
    fullError &&
    (fullError.code === "42703" ||
      fullError.message?.includes("email_notifications_enabled") ||
      fullError.message?.includes("email_relances_enabled"))
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
      notificationMode: resolvedMode,
    },
    message: "Préférences d'alerte enregistrées avec succès.",
  })
}

export async function POST(request: Request) {
  return handleUpdate(request)
}

export async function PATCH(request: Request) {
  return handleUpdate(request)
}
