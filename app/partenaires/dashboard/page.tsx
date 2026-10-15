import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { PartnerDashboardShell } from "@/components/partners/dashboard/partner-dashboard-shell"
import { PartnerDashboardSkeleton } from "@/components/partners/dashboard/partner-dashboard-skeleton"

export const dynamic = "force-dynamic"

export default async function PartnerDashboardPage() {
  const partner = await getPartner()

  if (!partner) {
    redirect("/partenaires/login")
  }

  return (
    <Suspense fallback={<PartnerDashboardSkeleton />}>
      <PartnerDashboardLoader partnerId={partner.id} partnerRow={partner} />
    </Suspense>
  )
}

async function PartnerDashboardLoader({
  partnerId,
  partnerRow,
}: {
  partnerId: string
  partnerRow: any
}) {
  const admin = createServiceRoleClient()

  let initialPartner = partnerRow
  let initialMarketplace: any[] = []
  let initialPortfolio: any[] = []

  let rpcSuccess = false
  // 1. Appel de la RPC atomique get_partner_dashboard_init
  try {
    const { data: initPayload, error: rpcErr } = await admin.rpc(
      "get_partner_dashboard_init",
      { p_partner_id: partnerId }
    )

    if (!rpcErr && initPayload) {
      initialPartner = initPayload.partner || initialPartner
      initialMarketplace = initPayload.marketplace || []
      initialPortfolio = initPayload.portfolio || []
      rpcSuccess = true
    }
  } catch (e) {
    console.warn("[partner-dashboard] RPC fallback to server queries:", e)
  }

  if (!rpcSuccess) {
    // 2. Fallback résilient côté serveur si la migration SQL est en attente
    const [marketRes, purchasesRes, partnerCurrentRes] = await Promise.all([
    admin
      .from("leads")
      .select("id, segment, province, surface_type, surface_area, annual_electricity_bill, credit_cost, marketplace_status, created_at, postal_code, grd, estimated_roi_years, project_timeline, wants_irve, lead_score")
      .eq("marketplace_status", "available")
      .order("created_at", { ascending: false })
      .limit(60),
    admin
      .from("lead_purchases")
      .select("id, credits_spent, purchased_at, pipeline_status, notes, next_action_at, leads(id, first_name, last_name, email, phone, company, company_vat, province, segment, surface_type, surface_area, annual_electricity_bill, postal_code, lead_score)")
      .eq("partner_id", partnerId)
      .order("purchased_at", { ascending: false }),
    admin
      .from("partners")
      .select("id, company_name, email, phone, credits, segment, target_provinces")
      .eq("id", partnerId)
      .single(),
  ])

  if (partnerCurrentRes.data) {
    initialPartner = { ...partnerRow, ...partnerCurrentRes.data }
  }

  const myPurchases = purchasesRes.data ?? []
  const myPurchasedLeadIds = new Set(myPurchases.map((p: any) => p.leads?.id).filter(Boolean))

  initialPortfolio = myPurchases
    .filter((p: any) => Boolean(p.leads))
    .map((p: any) => ({
      purchase_id: p.id,
      purchased_at: p.purchased_at,
      credits_spent: p.credits_spent,
      pipeline_status: p.pipeline_status || "to_contact",
      notes: p.notes,
      next_action_at: p.next_action_at,
      ...p.leads,
    }))

    initialMarketplace = (marketRes.data ?? [])
      .filter((l) => !myPurchasedLeadIds.has(l.id))
      .map((l) => ({
        ...l,
        max_slots: l.segment === "B2B" ? 1 : 3,
        remaining_slots: l.segment === "B2B" ? 1 : 3,
        masked_postal_code: l.postal_code ? `${l.postal_code.slice(0, 2)}XX` : "—",
      }))
  }

  return (
    <PartnerDashboardShell
      initialPartner={initialPartner}
      initialMarketplace={initialMarketplace}
      initialPortfolio={initialPortfolio}
    />
  )
}
