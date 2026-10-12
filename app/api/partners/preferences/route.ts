import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

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
      surfaces: data?.target_surfaces ?? ["toiture", "parking"],
      minFacture: data?.min_facture ?? 5000,
    },
  })
}

export async function PATCH(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: {
    provinces?: string[]
    surfaces?: string[]
    minFacture?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const updateData: Record<string, unknown> = {}

  if (Array.isArray(body.provinces)) {
    updateData.target_provinces = body.provinces
  }
  if (Array.isArray(body.surfaces)) {
    updateData.target_surfaces = body.surfaces
  }
  if (typeof body.minFacture === "number") {
    updateData.min_facture = body.minFacture
  }

  const { error } = await admin
    .from("partners")
    .update(updateData)
    .eq("id", partner.id)

  if (error) {
    console.error("[preferences] PATCH error:", error)
    return NextResponse.json({ error: "Erreur enregistrement préférences" }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: "Préférences d'alerte enregistrées avec succès.",
  })
}
