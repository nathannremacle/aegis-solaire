import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const supabase = createServiceRoleClient()

  const [mpRes, leadsRes] = await Promise.all([
    supabase
      .from("media_partners")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id, media_partner_code, segment, status, created_at")
      .not("media_partner_code", "is", null),
  ])

  const partners = mpRes.data ?? []
  const attributedLeads = leadsRes.data ?? []

  const enriched = partners.map((mp) => {
    const myLeads = attributedLeads.filter((l) => l.media_partner_code === mp.tracking_code)
    const qualifiedStatuses = ["qualified", "converted", "HOT_LEAD"]
    const qualified = myLeads.filter((l) => qualifiedStatuses.includes(l.status))
    const b2bQualified = qualified.filter((l) => l.segment === "B2B").length
    const b2cQualified = qualified.filter((l) => l.segment === "B2C").length
    const commissionDue =
      b2bQualified * (mp.commission_b2b ?? 100) +
      b2cQualified * (mp.commission_b2c ?? 25)

    return {
      ...mp,
      stats: {
        totalLeads: myLeads.length,
        qualifiedLeads: qualified.length,
        b2bQualified,
        b2cQualified,
        commissionDue,
      },
    }
  })

  return NextResponse.json(enriched)
}
