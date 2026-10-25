import { cache } from "react"
import { unstable_cache } from "next/cache"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export type AdminDashboardData = {
  generated_at: string
  leads: {
    total_leads: number
    leads_month: number
    leads_today: number
    leads_b2b: number
    leads_b2c: number
    available_count: number
    available_credits_pool: number
    sold_out_count: number
    pending_review_count: number
    status_new_count: number
    status_qualified_count: number
    publishable_pool_count: number
  }
  partners: {
    active_partners_count: number
    total_partner_credits_balance: number
    b2b_partners_count: number
    b2c_partners_count: number
  }
  purchases: {
    total_purchases: number
    total_credits_spent: number
    distinct_purchased_leads: number
    sell_through_rate: number
  }
  revenue: {
    pending_orders_count: number
    pending_htva: number
    pending_ttc: number
    paid_htva_total: number
    paid_ttc_total: number
    paid_htva_month: number
  }
  media_partners: {
    total_commissions_due: number
    breakdown: Array<{
      id: string
      company_name: string
      tracking_code: string
      attributed_leads_count: number
      validated_leads_count: number
      total_commission_due: number
    }>
  }
  badges: {
    pending_review_leads: number
    pending_credit_orders: number
    pending_installer_apps: number
    pending_media_apps: number
    pending_disputes: number
  }
  lists: {
    needs_review: any[]
    recent_leads: any[]
    pending_orders: any[]
    pending_disputes: any[]
    audit_logs: any[]
    paid_orders?: any[]
    active_partners?: any[]
    available_leads?: any[]
  }
}

/**
 * Exécute la RPC PostgreSQL get_admin_dashboard_kpis() si disponible,
 * avec un fallback applicatif résilient au cas où la migration 026
 * n'a pas encore été appliquée sur l'instance Supabase.
 */
async function fetchAdminKpisRaw(): Promise<AdminDashboardData> {
  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase.rpc("get_admin_dashboard_kpis")
    if (!error && data) {
      // Enrichir avec les listes détaillées pour la transparence des KPIs (modales d'audit)
      const [paidOrdersRes, partnersRes, availableLeadsRes] = await Promise.all([
        supabase
          .from("credit_orders")
          .select("id, partner_id, pack_name, credits, price_htva, price_ttc, transfer_reference, status, created_at, validated_at, partners(company_name)")
          .eq("status", "paid")
          .order("validated_at", { ascending: false })
          .limit(20),
        supabase
          .from("partners")
          .select("id, company_name, email, phone, credits, segment, target_provinces, created_at, is_test")
          .eq("is_test", false)
          .order("credits", { ascending: false })
          .limit(20),
        supabase
          .from("leads")
          .select("id, first_name, last_name, company, postal_code, city, province, credit_cost, segment, surface_area, annual_electricity_bill, created_at")
          .eq("marketplace_status", "available")
          .order("created_at", { ascending: false })
          .limit(20),
      ])

      const typedData = data as AdminDashboardData
      typedData.lists.paid_orders = (paidOrdersRes.data ?? []).map((o: any) => ({
        ...o,
        partner_name: o.partners?.company_name || "Partenaire",
      }))
      typedData.lists.active_partners = partnersRes.data ?? []
      typedData.lists.available_leads = availableLeadsRes.data ?? []

      return typedData
    }
    if (error && error.code !== "42883" && !error.message?.includes("does not exist")) {
      console.warn("[admin-kpis] RPC error, falling back to query scan:", error.message)
    }
  } catch (err) {
    console.warn("[admin-kpis] RPC exception, falling back:", err)
  }

  // Fallback résilient en attendant la migration SQL
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [
    totalLeadsRes,
    leadsMonthRes,
    leadsTodayRes,
    leadsB2BRes,
    leadsB2CRes,
    leadsAvailableRes,
    leadsSoldRes,
    leadsNeedsReviewRes,
    leadsNewRes,
    leadsQualifiedRes,
    recentLeadsRes,
    installerAppsRes,
    mediaAppsRes,
    partnersRes,
    purchasesRes,
    mediaPartnersRes,
    creditOrdersRes,
    disputesRes,
    auditLogsRes,
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startOfDay),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("segment", "B2B"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("segment", "B2C"),
    supabase.from("leads").select("id, credit_cost, segment").eq("marketplace_status", "available"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("marketplace_status", "sold_out"),
    supabase.from("leads").select("id, created_at, first_name, last_name, company, segment, province, surface_area, annual_electricity_bill, lead_score, status, marketplace_status, credit_cost").or("marketplace_status.eq.pending_review,status.eq.NEEDS_HUMAN_REVIEW").order("created_at", { ascending: false }).limit(10),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "qualified"),
    supabase.from("leads").select("id, created_at, first_name, last_name, email, phone, company, segment, province, status, marketplace_status, credit_cost, lead_score, media_partner_code, surface_type, surface_area, estimated_roi_years").order("created_at", { ascending: false }).limit(15),
    supabase.from("installer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("media_partner_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("partners").select("id, company_name, email, phone, credits, segment, target_provinces, created_at, is_test"),
    supabase.from("lead_purchases").select("id, lead_id, partner_id, credits_spent, purchased_at"),
    supabase.from("media_partners").select("id, name, tracking_code, commission_b2b, commission_b2c, status"),
    supabase.from("credit_orders").select("id, partner_id, pack_name, credits, price_htva, price_ttc, transfer_reference, status, created_at, validated_at, partners(company_name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("lead_disputes").select("id, purchase_id, lead_id, partner_id, reason, details, created_at, status, partners(company_name), leads(first_name, last_name, company, segment)").eq("status", "pending").order("created_at", { ascending: true }).limit(10),
    supabase.from("audit_log").select("id, admin_email, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(10),
  ])

  const avail = leadsAvailableRes.data ?? []
  const availCount = avail.length
  const availCredits = avail.reduce((acc, l) => acc + (Number(l.credit_cost) || (l.segment === "B2B" ? 5 : 2)), 0)

  const realPartners = (partnersRes.data ?? []).filter((p) => !p.is_test && !p.company_name?.toLowerCase().includes("test"))
  const realPartnerIds = new Set(realPartners.map((p) => p.id))

  const validPurchases = (purchasesRes.data ?? []).filter((lp) => realPartnerIds.has(lp.partner_id))
  const distinctPurchased = new Set(validPurchases.map((lp) => lp.lead_id)).size
  const totalPublishable = availCount + (leadsSoldRes.count ?? 0)
  const sellThrough = totalPublishable > 0 ? Math.round((distinctPurchased / totalPublishable) * 100) : 0

  const orders = creditOrdersRes.data ?? []
  const pendingOrders = orders.filter((o) => o.status === "pending")
  const paidOrders = orders.filter((o) => o.status === "paid")

  return {
    generated_at: now.toISOString(),
    leads: {
      total_leads: totalLeadsRes.count ?? 0,
      leads_month: leadsMonthRes.count ?? 0,
      leads_today: leadsTodayRes.count ?? 0,
      leads_b2b: leadsB2BRes.count ?? 0,
      leads_b2c: leadsB2CRes.count ?? 0,
      available_count: availCount,
      available_credits_pool: availCredits,
      sold_out_count: leadsSoldRes.count ?? 0,
      pending_review_count: leadsNeedsReviewRes.data?.length ?? 0,
      status_new_count: leadsNewRes.count ?? 0,
      status_qualified_count: leadsQualifiedRes.count ?? 0,
      publishable_pool_count: totalPublishable,
    },
    partners: {
      active_partners_count: realPartners.length,
      total_partner_credits_balance: realPartners.reduce((acc, p) => acc + (Number(p.credits) || 0), 0),
      b2b_partners_count: realPartners.filter((p) => p.segment?.toUpperCase() === "B2B" || p.segment?.toUpperCase() === "BOTH").length,
      b2c_partners_count: realPartners.filter((p) => p.segment?.toUpperCase() === "B2C" || p.segment?.toUpperCase() === "BOTH").length,
    },
    purchases: {
      total_purchases: validPurchases.length,
      total_credits_spent: validPurchases.reduce((acc, lp) => acc + (Number(lp.credits_spent) || 0), 0),
      distinct_purchased_leads: distinctPurchased,
      sell_through_rate: sellThrough,
    },
    revenue: {
      pending_orders_count: pendingOrders.length,
      pending_htva: pendingOrders.reduce((acc, o) => acc + (Number(o.price_htva) || 0), 0),
      pending_ttc: pendingOrders.reduce((acc, o) => acc + (Number(o.price_ttc) || 0), 0),
      paid_htva_total: paidOrders.reduce((acc, o) => acc + (Number(o.price_htva) || 0), 0),
      paid_ttc_total: paidOrders.reduce((acc, o) => acc + (Number(o.price_ttc) || 0), 0),
      paid_htva_month: paidOrders.filter((o) => o.validated_at && o.validated_at >= startOfMonth).reduce((acc, o) => acc + (Number(o.price_htva) || 0), 0),
    },
    media_partners: {
      total_commissions_due: 0,
      breakdown: (mediaPartnersRes.data ?? []).map((mp: any) => ({
        id: mp.id,
        company_name: mp.company_name || mp.name || "Partenaire Média",
        tracking_code: mp.tracking_code,
        attributed_leads_count: 0,
        validated_leads_count: 0,
        total_commission_due: 0,
      })),
    },
    badges: {
      pending_review_leads: leadsNeedsReviewRes.data?.length ?? 0,
      pending_credit_orders: pendingOrders.length,
      pending_installer_apps: installerAppsRes.count ?? 0,
      pending_media_apps: mediaAppsRes.count ?? 0,
      pending_disputes: disputesRes.data?.length ?? 0,
    },
    lists: {
      needs_review: leadsNeedsReviewRes.data ?? [],
      recent_leads: recentLeadsRes.data ?? [],
      pending_orders: pendingOrders.map((o: any) => ({
        ...o,
        partner_name: o.partners?.company_name || "Partenaire",
      })),
      pending_disputes: (disputesRes.data ?? []).map((d: any) => ({
        ...d,
        partner_name: d.partners?.company_name || "Partenaire",
        lead_name: d.leads ? `${d.leads.first_name} ${d.leads.last_name}` : "Lead",
        lead_company: d.leads?.company,
        segment: d.leads?.segment,
      })),
      audit_logs: (auditLogsRes.data ?? []).map((l: any) => ({
        ...l,
        payload: l.details || l.payload || null,
      })),
      paid_orders: paidOrders.map((o: any) => ({
        ...o,
        partner_name: o.partners?.company_name || "Partenaire",
      })),
      active_partners: realPartners,
      available_leads: avail,
    },
  }
}

export const getAdminKpisCached = unstable_cache(
  fetchAdminKpisRaw,
  ["admin-dashboard-kpis-v1"],
  {
    revalidate: 30,
    tags: ["admin-kpis", "admin-badges"],
  }
)

/**
 * Dédupliqué par requête au sein de React (Server Components).
 * Partagé instantanément entre app/admin/(dashboard)/layout.tsx et app/admin/(dashboard)/dashboard/page.tsx.
 */
export const getAdminDashboardData = cache(async () => {
  return await getAdminKpisCached()
})
