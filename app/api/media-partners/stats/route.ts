import { NextRequest, NextResponse } from "next/server"
import { getMediaPartner } from "@/lib/media-partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const QUALIFIED_STATUSES = ["qualified", "converted", "HOT_LEAD"]

export async function GET(request: NextRequest) {
  const partner = await getMediaPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") ?? "all"

  const supabase = createServiceRoleClient()

  let dateFilter: string | null = null
  const now = new Date()
  if (period === "week") {
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    dateFilter = weekAgo.toISOString()
  } else if (period === "month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    dateFilter = monthStart.toISOString()
  }

  let baseQuery = supabase
    .from("leads")
    .select("id, segment, status, created_at", { count: "exact" })
    .eq("media_partner_code", partner.tracking_code)

  if (dateFilter) {
    baseQuery = baseQuery.gte("created_at", dateFilter)
  }

  const { data: leads, count: totalLeads } = await baseQuery

  const rows = leads ?? []
  let qualifiedB2B = 0
  let qualifiedB2C = 0
  let rejected = 0

  for (const lead of rows) {
    if (QUALIFIED_STATUSES.includes(lead.status)) {
      if (lead.segment === "B2C") qualifiedB2C++
      else qualifiedB2B++
    } else if (lead.status === "lost") {
      rejected++
    }
  }

  const commissionB2B = qualifiedB2B * partner.commission_b2b
  const commissionB2C = qualifiedB2C * partner.commission_b2c
  const totalCommission = commissionB2B + commissionB2C
  const totalQualified = qualifiedB2B + qualifiedB2C
  const qualificationRate =
    (totalLeads ?? 0) > 0
      ? Math.round((totalQualified / (totalLeads ?? 1)) * 100)
      : 0

  return NextResponse.json({
    totalLeads: totalLeads ?? 0,
    qualifiedB2B,
    qualifiedB2C,
    totalQualified,
    rejected,
    qualificationRate,
    commissionB2B,
    commissionB2C,
    totalCommission,
    trackingCode: partner.tracking_code,
    commissionRateB2B: partner.commission_b2b,
    commissionRateB2C: partner.commission_b2c,
  })
}
