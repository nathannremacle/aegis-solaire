import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit-log"
import { ensureUniqueTrackingCode } from "@/lib/media-partner-tracking-code"

type ApplicationRow = {
  id: string
  name: string
  email: string
  company_name: string
  website_url: string | null
  experience_description: string
  expected_leads_per_month: number
  status: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user?.email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 })
  }

  const action = body.action
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action attendue : approve | reject" }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const adminEmail = user.email

  const { data: app, error: fetchErr } = await supabase
    .from("media_partner_applications")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchErr || !app) {
    return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 })
  }

  const row = app as ApplicationRow
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Candidature déjà traitée." }, { status: 400 })
  }

  if (action === "reject") {
    const { error } = await supabase.from("media_partner_applications").update({ status: "rejected" }).eq("id", id)
    if (error) {
      console.error("[media-partner-applications] reject", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    await logAudit({
      adminEmail,
      action: "media_partner_application_rejected",
      entityType: "media_partner_application",
      entityId: id,
      details: { email: row.email, company_name: row.company_name },
    })
    return NextResponse.json({ ok: true, status: "rejected" })
  }

  const email = row.email.toLowerCase().trim()

  const { data: existingMp } = await supabase.from("media_partners").select("id").eq("email", email).maybeSingle()
  if (existingMp?.id) {
    return NextResponse.json(
      { error: "Un marketeur avec cet e-mail existe déjà dans media_partners." },
      { status: 409 }
    )
  }

  const tracking_code = await ensureUniqueTrackingCode(supabase, row.company_name)

  const { data: inserted, error: insertErr } = await supabase
    .from("media_partners")
    .insert({
      name: row.name.trim().slice(0, 255),
      email,
      tracking_code,
      commission_b2b: 100,
      commission_b2c: 25,
      status: "active",
    })
    .select("id")
    .single()

  if (insertErr || !inserted) {
    console.error("[media-partner-applications] insert media_partner", insertErr)
    return NextResponse.json({ error: insertErr?.message ?? "Échec création marketeur" }, { status: 500 })
  }

  const { error: updErr } = await supabase.from("media_partner_applications").update({ status: "approved" }).eq("id", id)

  if (updErr) {
    await supabase.from("media_partners").delete().eq("id", inserted.id)
    console.error("[media-partner-applications] update application", updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  await logAudit({
    adminEmail,
    action: "media_partner_application_approved",
    entityType: "media_partner_application",
    entityId: id,
    details: {
      media_partner_id: inserted.id,
      tracking_code,
      email,
      company_name: row.company_name,
    },
  })

  return NextResponse.json({
    ok: true,
    status: "approved",
    mediaPartnerId: inserted.id,
    tracking_code,
  })
}
