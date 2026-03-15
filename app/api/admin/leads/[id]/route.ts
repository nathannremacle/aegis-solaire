import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const LEAD_SELECT = "id, first_name, last_name, email, phone, job_title, company, surface_type, surface_area, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, created_at, updated_at"

const VALID_STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error?.code === "PGRST116") {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }
    console.error("Admin lead get error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération du lead" }, { status: 500 })
  }

  return NextResponse.json(data)
}

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
  const { status } = body

  if (typeof status !== "string" || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return NextResponse.json(
      { error: "Statut invalide. Valeurs acceptées : new, contacted, qualified, converted, lost" },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(LEAD_SELECT)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
    }
    console.error("Admin lead patch error:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour du statut" }, { status: 500 })
  }

  return NextResponse.json(data)
}
