import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, email, phone, region, actif, notes } = body

  const updates: Record<string, unknown> = {}
  if (typeof name === "string") updates.name = name.trim().slice(0, 255)
  if (typeof email === "string") updates.email = email.trim().toLowerCase().slice(0, 255)
  if (phone !== undefined) updates.phone = phone ? String(phone).trim().slice(0, 50) : null
  if (region !== undefined) updates.region = region ? String(region).trim().slice(0, 255) : null
  if (typeof actif === "boolean") updates.actif = actif
  if (notes !== undefined) updates.notes = notes ? String(notes).trim().slice(0, 2000) : null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("installateurs")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Un installateur avec cet email existe déjà." }, { status: 400 })
    console.error("Admin installateurs update error:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from("installateurs").delete().eq("id", id)

  if (error) {
    console.error("Admin installateurs delete error:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
