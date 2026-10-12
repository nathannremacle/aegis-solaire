import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { sendLeadAssignedEmail } from "@/lib/notify-installateur"
import { logAudit } from "@/lib/audit-log"

const LEAD_SELECT =
  "id, first_name, last_name, email, phone, job_title, company, message, surface_type, surface_area, annual_electricity_bill, project_timeline, estimated_roi_years, autoconsumption_rate, estimated_savings, status, marketplace_status, lead_score, installateur_id, segment, province, admin_notes, created_at"

const VALID_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
  "HOT_LEAD",
  "NEEDS_HUMAN_REVIEW",
] as const

const VALID_MARKETPLACE_STATUSES = [
  "pending_review",
  "available",
  "sold",
  "rejected",
] as const

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
  const { status, marketplace_status, installateur_id: installateurId, admin_notes } = body

  const updates: {
    status?: string
    marketplace_status?: string
    installateur_id?: string | null
    admin_notes?: string
    updated_at: string
  } = {
    updated_at: new Date().toISOString(),
  }

  let installateurEmailForNotify: string | null = null

  if (typeof status === "string" && VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    updates.status = status
  }

  if (
    typeof marketplace_status === "string" &&
    VALID_MARKETPLACE_STATUSES.includes(
      marketplace_status as (typeof VALID_MARKETPLACE_STATUSES)[number]
    )
  ) {
    updates.marketplace_status = marketplace_status
  }

  if (installateurId !== undefined) {
    if (installateurId === null || installateurId === "") {
      updates.installateur_id = null
    } else if (typeof installateurId === "string" && /^[0-9a-f-]{36}$/i.test(installateurId)) {
      const supabaseCheck = createServiceRoleClient()
      const { data: inst } = await supabaseCheck.from("installateurs").select("id, email").eq("id", installateurId).single()
      if (!inst) {
        return NextResponse.json({ error: "Installateur introuvable." }, { status: 400 })
      }
      updates.installateur_id = installateurId
      installateurEmailForNotify = inst.email ?? null
    } else {
      return NextResponse.json({ error: "installateur_id invalide." }, { status: 400 })
    }
  }

  if (admin_notes !== undefined) {
    if (typeof admin_notes === "string" || admin_notes === null) {
      updates.admin_notes = admin_notes ?? ""
    }
  }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select(LEAD_SELECT)
    .single()

  if (error || !data) {
    console.error("Admin lead patch error:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour du lead" }, { status: 500 })
  }

  let installateur_notified = false
  if (installateurEmailForNotify && data.installateur_id) {
    try {
      await sendLeadAssignedEmail(installateurEmailForNotify, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        job_title: data.job_title,
        company: data.company ?? null,
        surface_type: data.surface_type,
        surface_area: data.surface_area,
        annual_electricity_bill: data.annual_electricity_bill,
        project_timeline: data.project_timeline ?? null,
        estimated_roi_years: data.estimated_roi_years ?? null,
        estimated_savings: data.estimated_savings ?? null,
        message: data.message ?? null,
      })
      installateur_notified = true
    } catch (err) {
      console.error("Notify installateur failed:", err)
    }
  }

  try {
    await logAudit({
      adminEmail: user.email!,
      action: "lead_updated",
      entityType: "lead",
      entityId: id,
      details: {
        status: updates.status,
        marketplace_status: updates.marketplace_status,
        installateur_id: updates.installateur_id,
        admin_notes: updates.admin_notes !== undefined ? true : undefined,
        installateur_notified,
      },
    })
  } catch (auditErr) {
    console.error("Audit log failed:", auditErr)
  }

  return NextResponse.json({ ...data, installateur_notified })
}
