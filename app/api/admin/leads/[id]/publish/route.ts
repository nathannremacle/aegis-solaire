import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { evaluateLeadPublishability } from "@/lib/lead-quality"
import { triggerPostPublishDispatch } from "@/lib/lead-relance-engine"

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID de lead manquant" }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // 1. Récupération préalable et contrôle de qualité rigoureux
  const { data: leadToPublish, error: fetchError } = await admin
    .from("leads")
    .select(
      "id, province, postal_code, city, site_address, surface_area, surface_type, annual_electricity_bill, segment, first_name, last_name, email, email_delivery_status, phone, company, company_vat, ownership_status, qualification_metadata"
    )
    .eq("id", id)
    .single()

  if (fetchError || !leadToPublish) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 })
  }

  const qualityCheck = evaluateLeadPublishability(leadToPublish)
  if (!qualityCheck.isPublishable) {
    return NextResponse.json(
      {
        error: "Ce dossier ne respecte pas les critères minimaux de qualité pour la marketplace.",
        missingFields: qualityCheck.missingFields,
      },
      { status: 422 }
    )
  }

  const existingMeta =
    leadToPublish.qualification_metadata && typeof leadToPublish.qualification_metadata === "object"
      ? (leadToPublish.qualification_metadata as Record<string, unknown>)
      : {}
  const nowIso = new Date().toISOString()

  // 2. Mettre à jour le lead vers le statut marketplace "available"
  const { data: updatedLead, error: updateError } = await admin
    .from("leads")
    .update({
      status: "qualified",
      marketplace_status: "available",
      qualification_metadata: {
        ...existingMeta,
        withdrawn_from_marketplace: false,
        published_at: existingMeta.published_at || nowIso,
        ...(existingMeta.withdrawn_from_marketplace === true ? { republished_at: nowIso } : {}),
      },
      updated_at: nowIso,
    })
    .eq("id", id)
    .select("id, first_name, last_name, company, status, marketplace_status, qualification_metadata")
    .single()

  if (updateError) {
    console.error("[admin publish] error updating lead:", updateError)
    return NextResponse.json(
      { error: "Impossible de publier le lead sur la marketplace" },
      { status: 500 }
    )
  }

  // 3. Journalisation dans l'audit_log
  try {
    await admin.from("audit_log").insert({
      admin_email: user.email || "admin@aegissolaire.com",
      action: "publish_lead_marketplace",
      entity_type: "leads",
      entity_id: id,
      details: {
        new_status: "available",
        lead_name: `${updatedLead.first_name} ${updatedLead.last_name}`,
        quality_score: qualityCheck.score,
      },
    })
  } catch (err) {
    console.warn("[admin publish] audit log insertion failed:", err)
  }

  // 4. Auto-Pilot puis déclenchement Vague 1 si créneaux restants
  const dispatch = await triggerPostPublishDispatch(id)

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/leads")
  revalidatePath("/partenaires/dashboard")

  return NextResponse.json({
    success: true,
    lead: updatedLead,
    warnings: qualityCheck.warnings,
    dispatch,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "ID de lead manquant" }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const { data: existingLead, error: fetchError } = await admin
    .from("leads")
    .select("id, marketplace_status, qualification_metadata")
    .eq("id", id)
    .single()

  if (fetchError || !existingLead) {
    return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 })
  }

  const existingMeta =
    existingLead.qualification_metadata && typeof existingLead.qualification_metadata === "object"
      ? (existingLead.qualification_metadata as Record<string, unknown>)
      : {}
  const nowIso = new Date().toISOString()

  const { data: updatedLead, error: updateError } = await admin
    .from("leads")
    .update({
      marketplace_status: "pending_review",
      qualification_metadata: {
        ...existingMeta,
        withdrawn_from_marketplace: true,
        withdrawn_at: nowIso,
        withdrawn_by: user.email || "admin@aegissolaire.com",
      },
      updated_at: nowIso,
    })
    .eq("id", id)
    .select("id, first_name, last_name, company, status, marketplace_status, qualification_metadata")
    .single()

  if (updateError) {
    console.error("[admin unpublish] error updating lead:", updateError)
    return NextResponse.json(
      { error: "Impossible de retirer le lead de la marketplace" },
      { status: 500 }
    )
  }

  try {
    await admin.from("audit_log").insert({
      admin_email: user.email || "admin@aegissolaire.com",
      action: "LEAD_UNPUBLISHED_FROM_MARKETPLACE",
      entity_type: "leads",
      entity_id: id,
      details: {
        previous_marketplace_status: existingLead.marketplace_status,
        withdrawn_at: nowIso,
      },
    })
  } catch (err) {
    console.warn("[admin unpublish] audit log insertion failed:", err)
  }

  revalidateTag("admin-kpis", "max")
  revalidateTag("admin-badges", "max")
  revalidateTag("marketplace-feed", "max")
  revalidatePath("/admin", "layout")
  revalidatePath("/admin/dashboard")
  revalidatePath("/admin/leads")
  revalidatePath("/partenaires/dashboard")

  return NextResponse.json({
    success: true,
    lead: updatedLead,
  })
}
