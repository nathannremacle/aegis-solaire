import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  getRelancesOverviewStats,
  getUpcomingRelancesSchedule,
  getSentRelancesHistory,
  dispatchLeadWave,
  processPendingLeadRelances,
} from "@/lib/lead-relance-engine"
import { renderInstallerLeadTeaserEmail } from "@/lib/email-templates/installer-lead-teaser"
import { calculateMarketplaceFinancials, calculateLeadCreditCost } from "@/lib/marketplace-pricing"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const [stats, upcoming, sent] = await Promise.all([
      getRelancesOverviewStats(),
      getUpcomingRelancesSchedule(),
      getSentRelancesHistory(150),
    ])

    return NextResponse.json({
      success: true,
      stats,
      upcoming,
      sent,
    })
  } catch (err: any) {
    console.error("[GET /api/admin/relances error]:", err)
    return NextResponse.json(
      { error: err.message || "Erreur lors de la récupération des relances" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { action } = body

    // 1. Déclencher le cron pour toutes les relances prêtes
    if (action === "run_cron") {
      const summary = await processPendingLeadRelances()
      const stats = await getRelancesOverviewStats()
      return NextResponse.json({
        success: true,
        message: `Cycle exécuté : ${summary.triggeredWaves.length} vague(s) déclenchée(s).`,
        summary,
        stats,
      })
    }

    // 2. Déclencher immédiatement une vague spécifique pour un lead
    if (action === "dispatch_wave") {
      const { leadId, waveNumber = 1, force = true } = body
      if (!leadId) {
        return NextResponse.json({ error: "leadId requis" }, { status: 400 })
      }

      const result = await dispatchLeadWave(leadId, waveNumber, force)
      return NextResponse.json({
        success: result.success,
        result,
      })
    }

    // 3. Prévisualiser le template d'e-mail pour un lead et un installateur
    if (action === "preview_email") {
      const { leadId, waveNumber = 1, partnerId } = body
      if (!leadId) {
        return NextResponse.json({ error: "leadId requis" }, { status: 400 })
      }

      const supabase = createServiceRoleClient()

      const { data: lead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single()

      if (!lead) {
        return NextResponse.json({ error: "Lead introuvable" }, { status: 404 })
      }

      let partner: any = null
      if (partnerId) {
        const { data: p } = await supabase
          .from("partners")
          .select("id, company_name, email, credits")
          .eq("id", partnerId)
          .single()
        partner = p
      }

      if (!partner) {
        // Fallback default installer preview
        partner = {
          id: "preview-id",
          company_name: "Installateur Certifié Wallon",
          credits: 24,
        }
      }

      const { data: purchases } = await supabase
        .from("lead_purchases")
        .select("id, partner_id, partners(is_test, company_name)")
        .eq("lead_id", leadId)

      const realPurchases = (purchases || []).filter(
        (p: any) => !p.partners?.is_test && !p.partners?.company_name?.toLowerCase().includes("test")
      )
      const takenSlots = realPurchases.length
      const maxSlots = lead.segment === "B2B" ? 1 : 3
      const creditCost = lead.credit_cost || calculateLeadCreditCost(lead)
      const financials = calculateMarketplaceFinancials({
        segment: lead.segment,
        surfaceArea: lead.surface_area_m2 || lead.surface_area,
        surfaceType: lead.surface_type,
        annualBill: lead.annual_bill_eur || lead.annual_electricity_bill,
        creditCost,
      })

      const emailData = {
        partner: {
          id: partner.id,
          companyName: partner.company_name,
          contactName: partner.company_name,
          credits: partner.credits || 0,
        },
        lead: {
          id: lead.id,
          segment: lead.segment || "B2C",
          province: lead.province || "wallonie",
          provinceFreeText: lead.province_free_text || null,
          postalCode: lead.postal_code || null,
          city: lead.city || null,
          surfaceType: lead.surface_type || "toiture",
          surfaceArea: lead.surface_area_m2 || lead.surface_area || 45,
          roofMaterial: lead.roof_material || null,
          annualElectricityBill: lead.annual_bill_eur || lead.annual_electricity_bill || 2000,
          estimatedPowerKwc: financials.estimatedPowerKwc,
          timeframe: lead.timeframe || null,
          ownershipStatus: lead.ownership_status || null,
          projectDriver: lead.project_driver || null,
          projectDetails: lead.project_details || lead.message || null,
          firstName: lead.first_name || "Client",
          lastName: lead.last_name || "",
          grd: lead.grd || null,
          createdAt: lead.created_at || new Date().toISOString(),
        },
        waveNumber,
        takenSlots,
        maxSlots,
        creditCost,
        financials,
      }

      const rendered = renderInstallerLeadTeaserEmail(emailData)
      return NextResponse.json({
        success: true,
        preview: rendered,
      })
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 })
  } catch (err: any) {
    console.error("[POST /api/admin/relances error]:", err)
    return NextResponse.json(
      { error: err.message || "Erreur lors de l'action de relance" },
      { status: 500 }
    )
  }
}
