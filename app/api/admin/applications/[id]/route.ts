import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

type ApplicationRow = {
  id: string
  company_name: string
  siret: string
  first_name: string
  last_name: string
  job_title: string
  email: string
  phone: string
  rescert_ref: string
  regions: string[]
  admin_notes: string | null
}

/**
 * À l'approbation : crée ou met à jour un installateur (liste /admin/installateurs)
 * pour assignation des leads simulateur, etc.
 */
async function syncInstallateurFromApplication(
  supabase: ReturnType<typeof createServiceRoleClient>,
  app: ApplicationRow
) {
  const email = app.email.toLowerCase().trim()
  const regionStr =
    Array.isArray(app.regions) && app.regions.length > 0
      ? app.regions.join(", ").slice(0, 255)
      : null
  const notesParts = [
    `Candidature approuvée — ref. ${app.id}`,
    `Contact : ${app.first_name} ${app.last_name} — ${app.job_title}`,
    `BCE/KBO : ${app.siret}`,
    `RESCERT PV : ${app.rescert_ref}`,
  ]
  if (app.admin_notes?.trim()) notesParts.push(`Notes admin : ${app.admin_notes.trim()}`)
  const notes = notesParts.join("\n").slice(0, 2000)

  const payload = {
    name: app.company_name.trim().slice(0, 255),
    email,
    phone: app.phone?.trim().slice(0, 50) || null,
    region: regionStr,
    actif: true,
    notes,
  }

  const { data: existing } = await supabase.from("installateurs").select("id").eq("email", email).maybeSingle()

  if (existing?.id) {
    const { error } = await supabase.from("installateurs").update(payload).eq("id", existing.id)
    if (error) throw error
    return { created: false, installateurId: existing.id }
  }

  const { data: inserted, error } = await supabase.from("installateurs").insert(payload).select("id").single()
  if (error) {
    if (error.code === "23505") {
      const { data: row } = await supabase.from("installateurs").select("id").eq("email", email).maybeSingle()
      if (row?.id) {
        await supabase.from("installateurs").update(payload).eq("id", row.id)
        return { created: false, installateurId: row.id }
      }
    }
    throw error
  }
  return { created: true, installateurId: inserted?.id }
}

async function syncPartnerFromApplication(
  supabase: ReturnType<typeof createServiceRoleClient>,
  app: ApplicationRow
) {
  const email = app.email.toLowerCase().trim()

  const { data: existing } = await supabase
    .from("partners")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (existing?.id) {
    return { created: false, partnerId: existing.id }
  }

  const { data: inserted, error } = await supabase
    .from("partners")
    .insert({
      company_name: app.company_name.trim().slice(0, 255),
      email,
      phone: app.phone?.trim().slice(0, 50) || null,
      credits: 0,
      segment: "BOTH",
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === "23505") {
      const { data: row } = await supabase.from("partners").select("id").eq("email", email).maybeSingle()
      if (row?.id) return { created: false, partnerId: row.id }
    }
    throw error
  }
  return { created: true, partnerId: inserted?.id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const supabase = createServiceRoleClient()

  const updates: Record<string, unknown> = {}
  if (body.status && ["pending", "approved", "rejected"].includes(body.status)) {
    updates.status = body.status
    if (body.status !== "pending") {
      updates.reviewed_at = new Date().toISOString()
    }
  }
  if (typeof body.admin_notes === "string") {
    updates.admin_notes = body.admin_notes
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Rien à mettre à jour" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("installer_applications")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[admin/applications/PATCH]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let installateurSync: { created: boolean; installateurId?: string } | null = null
  let partnerSync: { created: boolean; partnerId?: string } | null = null
  if (data.status === "approved") {
    const app = data as ApplicationRow
    try {
      installateurSync = await syncInstallateurFromApplication(supabase, app)
    } catch (e) {
      console.error("[admin/applications] sync installateur:", e)
      return NextResponse.json(
        {
          error:
            "Candidature mise à jour mais échec de la création de l'installateur (vérifiez l'email unique ou les logs).",
          application: data,
        },
        { status: 500 }
      )
    }

    try {
      partnerSync = await syncPartnerFromApplication(supabase, app)
    } catch (e) {
      console.error("[admin/applications] sync partner:", e)
    }
  }

  return NextResponse.json({ ...data, installateurSync, partnerSync })
}
