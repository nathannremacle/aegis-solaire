import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { sendLeadAssignedEmail } from "@/lib/notify-installateur"
import { logAudit } from "@/lib/audit-log"

/**
 * Renvoie l'email du lead à l'installateur assigné (depuis le panel).
 * Requiert que le lead ait un installateur_id.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const supabase = createServiceRoleClient()

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, job_title, company, message, surface_type, surface_area, project_timeline, annual_electricity_bill, estimated_roi_years, estimated_savings, installateur_id")
    .eq("id", id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
  }
  if (!lead.installateur_id) {
    return NextResponse.json(
      { error: "Aucun installateur assigné à ce lead." },
      { status: 400 }
    )
  }

  const { data: inst } = await supabase
    .from("installateurs")
    .select("id, email")
    .eq("id", lead.installateur_id)
    .single()

  if (!inst?.email) {
    return NextResponse.json(
      { error: "Installateur introuvable ou sans email." },
      { status: 400 }
    )
  }

  try {
    await sendLeadAssignedEmail(inst.email, {
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      job_title: lead.job_title,
      company: lead.company ?? null,
      surface_type: lead.surface_type,
      surface_area: lead.surface_area,
      annual_electricity_bill: lead.annual_electricity_bill,
      project_timeline: lead.project_timeline ?? null,
      estimated_roi_years: lead.estimated_roi_years ?? null,
      estimated_savings: lead.estimated_savings ?? null,
      message: lead.message ?? null,
    })
  } catch (err) {
    console.error("Notify installateur failed:", err)
    return NextResponse.json(
      { error: "Échec de l'envoi de l'email." },
      { status: 500 }
    )
  }

  try {
    await logAudit({
      adminEmail: user.email!,
      action: "lead_notify_installateur",
      entityType: "lead",
      entityId: id,
      details: { installateur_id: lead.installateur_id },
    })
  } catch (e) {
    console.error("Audit log failed:", e)
  }

  return NextResponse.json({
    success: true,
    message: "Email envoyé à l'installateur.",
  })
}
