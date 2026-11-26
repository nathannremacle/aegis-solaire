import type { SupabaseClient } from "@supabase/supabase-js"

export interface DistributorPartnerRecord {
  id: string
  slug: string
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  referral_code: string
  reward_credits_referred: number
  status: "active" | "paused"
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DistributorWithStats extends DistributorPartnerRecord {
  stats: {
    applicationsCount: number
    partnersCount: number
    activatedPartnersCount: number
    totalBonusCreditsAwarded: number
  }
}

export function slugifyDistributorName(name: string): string {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
}

export function generateDistributorCode(name: string): string {
  const clean = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
  const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)
  return `DIST-${clean || "PRO"}${suffix ? `-${suffix}` : ""}`
}

function isMissingDistributorSchemaError(
  err: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!err) return false
  return (
    err.code === "42P01" ||
    err.code === "42703" ||
    err.code === "42883" ||
    err.code === "PGRST205" ||
    Boolean(err.message?.includes("distributor_partners")) ||
    Boolean(err.message?.includes("distributor_partner_id"))
  )
}

export async function resolveDistributorByCodeOrSlug(
  supabase: SupabaseClient<any, "public", any>,
  codeOrSlug: string | null | undefined
): Promise<DistributorPartnerRecord | null> {
  const raw = String(codeOrSlug || "").trim()
  if (!raw) return null

  const normalizedSlug = slugifyDistributorName(raw)
  const normalizedCode = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "")

  try {
    const { data, error } = await supabase
      .from("distributor_partners")
      .select("*")
      .or(
        `slug.eq.${normalizedSlug},referral_code.eq.${normalizedCode}`
      )
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (error) {
      if (!isMissingDistributorSchemaError(error)) {
        console.warn("[distributor-partners] resolve error:", error)
      }
      return null
    }

    return (data as DistributorPartnerRecord) || null
  } catch {
    return null
  }
}

export async function listDistributorsWithStats(
  supabase: SupabaseClient<any, "public", any>
): Promise<{ tableMissing: boolean; distributors: DistributorWithStats[] }> {
  const { data: rows, error } = await supabase
    .from("distributor_partners")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    if (isMissingDistributorSchemaError(error)) {
      return { tableMissing: true, distributors: [] }
    }
    throw error
  }

  const distributors = (rows || []) as DistributorPartnerRecord[]
  if (distributors.length === 0) {
    return { tableMissing: false, distributors: [] }
  }

  const [{ data: apps }, { data: partners }] = await Promise.all([
    supabase
      .from("installer_applications")
      .select("id, distributor_partner_id")
      .not("distributor_partner_id", "is", null),
    supabase
      .from("partners")
      .select("id, distributor_partner_id, distributor_bonus_rewarded_at")
      .not("distributor_partner_id", "is", null),
  ])

  const appsByDist = new Map<string, number>()
  for (const a of apps || []) {
    const dId = String((a as any).distributor_partner_id || "")
    if (dId) appsByDist.set(dId, (appsByDist.get(dId) || 0) + 1)
  }

  const partnersByDist = new Map<string, number>()
  const activatedByDist = new Map<string, number>()
  for (const p of partners || []) {
    const dId = String((p as any).distributor_partner_id || "")
    if (!dId) continue
    partnersByDist.set(dId, (partnersByDist.get(dId) || 0) + 1)
    if ((p as any).distributor_bonus_rewarded_at) {
      activatedByDist.set(dId, (activatedByDist.get(dId) || 0) + 1)
    }
  }

  return {
    tableMissing: false,
    distributors: distributors.map((d) => {
      const activated = activatedByDist.get(d.id) || 0
      return {
        ...d,
        stats: {
          applicationsCount: appsByDist.get(d.id) || 0,
          partnersCount: partnersByDist.get(d.id) || 0,
          activatedPartnersCount: activated,
          totalBonusCreditsAwarded: activated * (Number(d.reward_credits_referred) || 0),
        },
      }
    }),
  }
}

export async function triggerDistributorBonusReward(
  supabase: SupabaseClient<any, "public", any>,
  partnerId: string,
  triggerEvent: "first_credit_order" | "first_direct_lead_purchase" | "first_bank_transfer_order"
): Promise<{ rewarded: boolean }> {
  if (!partnerId) return { rewarded: false }

  try {
    const { data, error } = await supabase.rpc("reward_distributor_bonus_if_eligible", {
      p_partner_id: partnerId,
      p_trigger_event: triggerEvent,
    })

    if (error) {
      if (!isMissingDistributorSchemaError(error)) {
        console.warn("[distributor-partners] reward RPC warning:", error)
      }
      return { rewarded: false }
    }

    return { rewarded: Boolean(data?.rewarded) }
  } catch {
    return { rewarded: false }
  }
}
