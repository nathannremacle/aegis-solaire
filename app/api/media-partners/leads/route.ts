import { NextRequest, NextResponse } from "next/server"
import { getMediaPartner } from "@/lib/media-partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const partner = await getMediaPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = Math.min(50, Math.max(10, parseInt(searchParams.get("limit") ?? "20", 10)))
  const period = searchParams.get("period") ?? "all"
  const from = (page - 1) * limit

  const supabase = createServiceRoleClient()

  let query = supabase
    .from("leads")
    .select("id, segment, province, status, created_at", { count: "exact" })
    .eq("media_partner_code", partner.tracking_code)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1)

  if (period === "week") {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    query = query.gte("created_at", weekAgo.toISOString())
  } else if (period === "month") {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    query = query.gte("created_at", monthStart.toISOString())
  }

  const { data, error, count } = await query

  if (error) {
    console.error("Media partner leads error:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
  }

  const QUALIFIED_STATUSES = ["qualified", "converted", "HOT_LEAD"]

  const leads = (data ?? []).map((lead) => {
    const isQualified = QUALIFIED_STATUSES.includes(lead.status)
    const commission = isQualified
      ? lead.segment === "B2C"
        ? partner.commission_b2c
        : partner.commission_b2b
      : 0

    return {
      id: lead.id,
      segment: lead.segment,
      province: lead.province,
      status: lead.status,
      commission,
      created_at: lead.created_at,
    }
  })

  return NextResponse.json({
    leads,
    total: count ?? 0,
    page,
    limit,
  })
}
