import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const supabase = createServiceRoleClient()

  const [partnerRes, purchaseRes, txRes] = await Promise.all([
    supabase.from("partners").select("*").order("created_at", { ascending: false }),
    supabase.from("lead_purchases").select("partner_id, credits_spent"),
    supabase
      .from("credit_transactions")
      .select("partner_id, amount, type")
      .eq("type", "topup"),
  ])

  const partners = partnerRes.data ?? []
  const purchases = purchaseRes.data ?? []
  const topups = txRes.data ?? []

  const enriched = partners.map((p) => {
    const myPurchases = purchases.filter((lp) => lp.partner_id === p.id)
    const myTopups = topups.filter((t) => t.partner_id === p.id)
    const totalSpent = myPurchases.reduce((s, lp) => s + (lp.credits_spent ?? 0), 0)
    const totalTopups = myTopups.reduce((s, t) => s + (t.amount ?? 0), 0)

    return {
      ...p,
      stats: {
        leadsPurchased: myPurchases.length,
        creditsSpent: totalSpent,
        creditsTopupped: totalTopups,
      },
    }
  })

  return NextResponse.json(enriched)
}
