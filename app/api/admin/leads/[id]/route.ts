import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const LEAD_SELECT = "id, first_name, last_name, email, phone, job_title, company, message, surface_type, surface_area, project_timeline, annual_electricity_bill, estimated_roi_years, autoconsumption_rate, estimated_savings, status, lead_score, installateur_id, created_at, updated_at"

const VALID_STATUSES = ["new", "contacted", "qualified", "converted", "lost", "HOT_LEAD", "NEEDS_HUMAN_REVIEW"] as const

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
  const { status, installateur_id: installateurId } = body

  const updates: { status?: string; installateur_id?: string | null; updated_at: string } = {
    updated_at: new Date().toISOString(),
  }

  if (typeof status === "string" && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    updates.status = status
  }

  if (installateurId !== undefined) {
    if (installateurId === null || installateurId === "") {
      updates.installateur_id = null
    } else if (typeof installateurId === "string" && /^[0-9a-f-]{36}$/i.test(installateurId)) {
      const supabaseCheck = createServiceRoleClient()
      const { data: inst } = await supabaseCheck.from("installateurs").select("id").eq("id", installateurId).single()
      if (!inst) {
        return NextResponse.json({ error: "Installateur introuvable." }, { status: 400 })
      }
      updates.installateur_id = installateurId
    } else {
      return NextResponse.json({ error: "installateur_id invalide." }, { status: 400 })
    }
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: "Aucune modification valide (status ou installateur_id)." }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .update(updates)
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
