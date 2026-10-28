import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { calculateMarketplaceFinancials } from "@/lib/marketplace-pricing"
import { evaluateLeadPublishability } from "@/lib/lead-quality"

export const dynamic = "force-dynamic"

export async function GET() {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  let leads: Array<Record<string, any>> | null = null
  const canonicalSelect =
    "id, province, segment, surface_type, surface_area, annual_electricity_bill, credit_cost, marketplace_status, created_at, grd, estimated_roi_years, project_timeline, wants_irve, lead_score, first_name, last_name, company, postal_code, roof_material, ownership_status, project_driver, timeframe, qualification_metadata"
  const legacySelect =
    "id, province, segment, surface_type, surface_area, annual_electricity_bill, credit_cost, marketplace_status, created_at, grd, estimated_roi_years, project_timeline, wants_irve, lead_score, first_name, last_name, company"

  const q1 = await admin
    .from("leads")
    .select(canonicalSelect)
    .eq("marketplace_status", "available")
    .order("created_at", { ascending: false })
    .limit(60)

  if (q1.error && (q1.error.message?.includes("column") || q1.error.code === "42703")) {
    const q2 = await admin
      .from("leads")
      .select(legacySelect)
      .eq("marketplace_status", "available")
      .order("created_at", { ascending: false })
      .limit(60)

    if (q2.error) {
      console.error("[marketplace] leads query error (fallback):", q2.error)
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
    leads = q2.data
  } else if (q1.error) {
    console.error("[marketplace] leads query error:", q1.error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  } else {
    leads = q1.data
  }

  const leadIds = (leads ?? []).map((l) => l.id)

  let purchases: Array<{
    lead_id: string
    partner_id: string
    partners: { company_name: string } | null
  }> = []

  if (leadIds.length > 0) {
    const { data: purchaseData } = await admin
      .from("lead_purchases")
      .select("lead_id, partner_id, partners(company_name)")
      .in("lead_id", leadIds)

    if (purchaseData) {
      purchases = (purchaseData as unknown as Array<{
        lead_id: string
        partner_id: string
        partners: { company_name: string } | Array<{ company_name: string }> | null
      }>).map((p) => ({
        lead_id: p.lead_id,
        partner_id: p.partner_id,
        partners: Array.isArray(p.partners)
          ? p.partners[0] ?? null
          : p.partners ?? null,
      }))
    }
  }

  const { data: myPurchases } = await admin
    .from("lead_purchases")
    .select("lead_id")
    .eq("partner_id", partner.id)

  const myPurchasedIds = new Set((myPurchases ?? []).map((p) => p.lead_id))
  const myPurchasesCount = (myPurchases ?? []).length

  // Déterminer le palier partenaire
  const partnerTier = myPurchasesCount >= 15 ? "gold" : myPurchasesCount >= 5 ? "silver" : "certified"

  // Ne retenir que les leads viables et complets pour la marketplace
  const validLeads = (leads ?? []).filter((lead) => {
    // Si déjà acheté par ce partenaire, on l'affiche pour qu'il puisse le consulter
    if (myPurchasedIds.has(lead.id)) return true
    // Sinon, on s'assure qu'il est propre et qualifié
    return evaluateLeadPublishability(lead).isPublishable
  })

  const enrichedLeads = validLeads.map((lead) => {
    const lp = purchases.filter((p) => p.lead_id === lead.id)
    const isB2C = lead.segment === "B2C"
    const maxSlots = isB2C ? 3 : 1
    const cost = lead.credit_cost ?? (isB2C ? 3 : 9)

    // Calculs de valorisation financière rigoureux et crédibles
    const financials = calculateMarketplaceFinancials({
      segment: lead.segment,
      surfaceArea: lead.surface_area,
      annualBill: lead.annual_electricity_bill,
      creditCost: cost,
    })

    // Badges d'opportunité calculés sur données réelles
    const isUrgent = lead.project_timeline === "immediate" || lead.project_timeline === "within_3_months"
    const isFastRoi = lead.estimated_roi_years && Number(lead.estimated_roi_years) <= 4.5
    const isHighVolume = (lead.surface_area ?? 0) >= 400 || financials.estimatedPowerKwc >= 65
    const hasIrve = Boolean(lead.wants_irve)

    return {
      id: lead.id,
      province: lead.province,
      segment: lead.segment,
      surfaceType: lead.surface_type,
      surfaceArea: lead.surface_area,
      annualBill: lead.annual_electricity_bill,
      estimatedPowerKwc: financials.estimatedPowerKwc,
      estimatedRevenue: financials.revenueEstimatePerYear,
      estimatedContractValue: financials.estimatedContractValue,
      estimatedContractValueRange: financials.estimatedContractValueRange,
      estimatedInstallerMargin: financials.estimatedInstallerMargin,
      roiMultiplier: financials.roiMultiplier,
      roiDescription: financials.roiDescription,
      dataQuality: financials.dataQuality,
      creditCost: cost,
      creditCostEur: financials.creditCostEur,
      createdAt: lead.created_at,
      grd: lead.grd,
      projectTimeline: lead.project_timeline,
      estimatedRoiYears: lead.estimated_roi_years,
      postalCode: lead.postal_code ?? null,
      roofMaterial: lead.roof_material ?? null,
      ownershipStatus: lead.ownership_status ?? null,
      projectDriver: lead.project_driver ?? null,
      timeframe: lead.timeframe ?? null,
      qualificationMetadata: lead.qualification_metadata ?? null,
      wantsIrve: hasIrve,
      badges: {
        isTopDeal: isFastRoi || (isHighVolume && !isB2C),
        isUrgent,
        isHighVolume,
        hasIrve,
      },
      slots: {
        max: maxSlots,
        taken: lp.length,
        buyers: lp.map((p) => ({
          name: p.partner_id === partner.id ? (partner.company_name || "Votre entreprise") : "Installateur certifié",
          isMe: p.partner_id === partner.id,
        })),
      },
      alreadyPurchased: myPurchasedIds.has(lead.id),
    }
  })

  return NextResponse.json({
    leads: enrichedLeads,
    partner: {
      id: partner.id,
      credits: partner.credits,
      companyName: partner.company_name,
      tier: partnerTier,
      purchasesCount: myPurchasesCount,
    },
  })
}
