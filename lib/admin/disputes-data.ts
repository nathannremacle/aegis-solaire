import type { SupabaseClient } from "@supabase/supabase-js"
import {
  DISPUTE_ABUSE_ROLLING_DAYS,
  computePartnerDisputeStats30d,
  type PartnerDisputeStats30d,
} from "@/lib/disputes-policy"
import { fetchPartnersDisputePrivilegeMap } from "@/lib/partner-dispute-privilege"

export type AdminDisputeRecord = {
  id: string
  purchase_id: string
  lead_id: string
  partner_id: string
  reason: "unreachable" | "wrong_number" | "out_of_scope" | "already_equipped" | "duplicate" | "other"
  details: string
  status: "pending" | "approved" | "rejected"
  admin_notes?: string | null
  credits_refunded: number
  created_at: string
  resolved_at?: string | null
  partners?: {
    id: string
    company_name: string
    email: string
    phone?: string | null
    disputes_suspended?: boolean
    disputes_suspended_at?: string | null
    disputes_suspended_reason?: string | null
  } | null
  leads?: {
    id: string
    first_name: string
    last_name?: string
    company?: string
    segment: string
    province?: string
    surface_type?: string
    surface_area?: number
    contact_preference?: string | null
    phone_verified?: boolean | null
    email_verified?: boolean | null
  } | null
  lead_purchases?: {
    credits_spent: number
    purchased_at?: string
  } | null
  partnerStats30d?: PartnerDisputeStats30d
}

export async function fetchAdminDisputesWithStats(
  supabase: SupabaseClient,
  limit = 100
): Promise<AdminDisputeRecord[]> {
  const cutoffIso = new Date(
    Date.now() - DISPUTE_ABUSE_ROLLING_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const [{ data: disputesData, error }, { data: recentPurchases }, { data: recentDisputes }] =
    await Promise.all([
      supabase
        .from("lead_disputes")
        .select(`
          id,
          purchase_id,
          lead_id,
          partner_id,
          reason,
          details,
          status,
          admin_notes,
          credits_refunded,
          created_at,
          resolved_at,
          partners (
            id,
            company_name,
            email,
            phone
          ),
          leads (
            id,
            first_name,
            last_name,
            company,
            segment,
            province,
            surface_type,
            surface_area,
            contact_preference,
            phone_verified,
            email_verified
          ),
          lead_purchases (
            credits_spent,
            purchased_at
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("lead_purchases")
        .select("partner_id, purchased_at")
        .gte("purchased_at", cutoffIso),
      supabase
        .from("lead_disputes")
        .select("partner_id, status, created_at")
        .gte("created_at", cutoffIso),
    ])

  if (error || !disputesData) {
    return []
  }

  const statsMap = computePartnerDisputeStats30d({
    purchases: recentPurchases ?? [],
    disputes: recentDisputes ?? [],
  })

  const partnerIds = (disputesData as any[]).map((d) => d.partner_id).filter(Boolean)
  const privilegeMap = await fetchPartnersDisputePrivilegeMap(supabase, partnerIds)

  return (disputesData as any[]).map((d) => {
    const privilege = privilegeMap.get(d.partner_id)
    return {
      id: d.id,
      purchase_id: d.purchase_id,
      lead_id: d.lead_id,
      partner_id: d.partner_id,
      reason: d.reason,
      details: d.details || "",
      status: d.status,
      admin_notes: d.admin_notes,
      credits_refunded: d.credits_refunded || 0,
      created_at: d.created_at,
      resolved_at: d.resolved_at,
      partners: d.partners
        ? {
            ...d.partners,
            disputes_suspended: privilege?.disputes_suspended ?? false,
            disputes_suspended_at: privilege?.disputes_suspended_at ?? null,
            disputes_suspended_reason: privilege?.disputes_suspended_reason ?? null,
          }
        : null,
      leads: d.leads || null,
      lead_purchases: d.lead_purchases || null,
      partnerStats30d: statsMap.get(d.partner_id) ?? {
        purchases30d: 0,
        disputes30d: 0,
        approved30d: 0,
        rejected30d: 0,
        disputeRatePct: 0,
        exceedsAbuseThreshold: false,
      },
    }
  })
}
