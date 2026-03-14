import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("installateurs")
    .select("*")
    .order("name")

  if (error) {
    console.error("Admin installateurs list error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const body = await request.json()
  const { name, email, phone, region, actif, notes } = body

  if (!name || !email || typeof name !== "string" || typeof email !== "string") {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("installateurs")
    .insert({
      name: name.trim().slice(0, 255),
      email: email.trim().toLowerCase().slice(0, 255),
      phone: phone ? String(phone).trim().slice(0, 50) : null,
      region: region ? String(region).trim().slice(0, 255) : null,
      actif: actif !== false,
      notes: notes ? String(notes).trim().slice(0, 2000) : null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Un installateur avec cet email existe déjà." }, { status: 400 })
    console.error("Admin installateurs create error:", error)
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })
  }

  return NextResponse.json(data)
}
