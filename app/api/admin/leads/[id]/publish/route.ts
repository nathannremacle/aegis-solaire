import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { evaluateLeadPublishability } from "@/lib/lead-quality"
import { sendPartnerLeadTeaserEmails } from "@/lib/partner-lead-teaser-email"

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
    .select("id, province, surface_area, surface_type, annual_electricity_bill, segment, first_name, last_name, email, phone, company")
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

  // 2. Mettre à jour le lead vers le statut marketplace "available"
  const { data: updatedLead, error: updateError } = await admin
    .from("leads")
    .update({
      marketplace_status: "available",
    })
    .eq("id", id)
    .select("id, first_name, last_name, company, marketplace_status")
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
      admin_email: user.email || "admin@aegis-solaire.be",
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

  // 4. Notification teaser vers les installateurs partenaires certifiés
  try {
    const { data: partners } = await admin
      .from("partners")
      .select("email")
      .in("segment", [leadToPublish.segment || "B2B", "BOTH"])

    const targetEmails = partners ? partners.map((p) => p.email).filter(Boolean) : []
    if (targetEmails.length > 0) {
      void sendPartnerLeadTeaserEmails({
        targetEmails,
        segment: leadToPublish.segment || "B2B",
        province: leadToPublish.province || "Wallonie",
        surfaceType: leadToPublish.surface_type || "toiture",
        surfaceArea: leadToPublish.surface_area || 0,
        annualElectricityBill: leadToPublish.annual_electricity_bill || 0,
        grd: null,
        projectDetails: null,
      }).catch((err) => console.error("[publish teaser notification failed]", err))
    }
  } catch (err) {
    console.warn("[admin publish] teaser notification failed:", err)
  }

  return NextResponse.json({
    success: true,
    lead: updatedLead,
    warnings: qualityCheck.warnings,
  })
}
