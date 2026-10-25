import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { PartnerDashboardShell } from "@/components/partners/dashboard/partner-dashboard-shell"
import { PartnerDashboardSkeleton } from "@/components/partners/dashboard/partner-dashboard-skeleton"

export const dynamic = "force-dynamic"

interface PartnerDashboardPageProps {
  searchParams?: Promise<{ lead?: string }>
}

export default async function PartnerDashboardPage({ searchParams }: PartnerDashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const targetLeadId = resolvedSearchParams.lead?.trim() || null

  const partner = await getPartner()

  if (!partner) {
    const returnUrl = targetLeadId
      ? `/partenaires/dashboard?lead=${encodeURIComponent(targetLeadId)}`
      : "/partenaires/dashboard"
    redirect(`/partenaires/login?returnUrl=${encodeURIComponent(returnUrl)}`)
  }

  return (
    <Suspense fallback={<PartnerDashboardSkeleton />}>
      <PartnerDashboardLoader
        partnerId={partner.id}
        partnerRow={partner}
        targetLeadId={targetLeadId}
      />
    </Suspense>
  )
}

async function PartnerDashboardLoader({
  partnerId,
  partnerRow,
  targetLeadId,
}: {
  partnerId: string
  partnerRow: any
  targetLeadId?: string | null
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
      const feed = initPayload.marketplace || []
      // Si la RPC active ne retourne pas encore 'city', basculer sur la requête riche
      if (feed.length === 0 || feed[0].city !== undefined) {
        initialPartner = initPayload.partner || initialPartner
        initialMarketplace = feed
        initialPortfolio = initPayload.portfolio || []
        rpcSuccess = true
      }
    }
  } catch (e) {
    console.warn("[partner-dashboard] RPC fallback to server queries:", e)
  }

  if (!rpcSuccess) {
    // 2. Fallback résilient côté serveur si la migration SQL est en attente
    const [marketRes, purchasesRes, partnerCurrentRes] = await Promise.all([
      admin
        .from("leads")
        .select(`
          id, segment, province, city, postal_code, site_address, surface_type, surface_area, surface_area_m2,
          annual_electricity_bill, annual_bill_eur, estimated_power_kwc, roof_material, ownership_status,
          timeframe, project_timeline, project_driver, project_details, message, first_name, last_name,
          credit_cost, marketplace_status, created_at, grd, estimated_roi_years, estimated_savings,
          wants_irve, lead_score,
          lead_purchases(id)
        `)
        .eq("marketplace_status", "available")
        .order("created_at", { ascending: false })
        .limit(60),
      admin
        .from("lead_purchases")
        .select("id, credits_spent, purchased_at, pipeline_status, notes, next_action_at, leads(id, first_name, last_name, email, phone, company, company_vat, province, city, segment, surface_type, surface_area, annual_electricity_bill, postal_code, lead_score)")
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
      .filter((l: any) => !myPurchasedLeadIds.has(l.id))
      .map((l: any) => {
        const maxSlots = l.segment === "B2B" ? 1 : 3
        const takenSlots = Array.isArray(l.lead_purchases) ? l.lead_purchases.length : 0
        const remainingSlots = Math.max(0, maxSlots - takenSlots)
        return {
          ...l,
          max_slots: maxSlots,
          taken_slots: takenSlots,
          remaining_slots: remainingSlots,
          masked_postal_code: l.postal_code ? `${l.postal_code.slice(0, 2)}XX` : "—",
        }
      })
      .filter((l: any) => l.remaining_slots > 0)
  }

  return (
    <PartnerDashboardShell
      initialPartner={initialPartner}
      initialMarketplace={initialMarketplace}
      initialPortfolio={initialPortfolio}
      targetLeadId={targetLeadId ?? undefined}
    />
  )
}
