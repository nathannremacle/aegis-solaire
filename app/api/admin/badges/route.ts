import { NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("get_admin_dashboard_kpis")
    if (!rpcErr && rpcData?.badges) {
      return NextResponse.json(
        {
          pending_installer_apps: Number(rpcData.badges.pending_installer_apps ?? 0),
          pending_media_apps: Number(rpcData.badges.pending_media_apps ?? 0),
          pending_review_leads: Number(rpcData.badges.pending_review_leads ?? 0),
          pending_credit_orders: Number(rpcData.badges.pending_credit_orders ?? 0),
          pending_disputes: Number(rpcData.badges.pending_disputes ?? 0),
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
        }
      )
    }
  } catch (err) {
    console.warn("[admin:badges] RPC error, using fallback queries:", err)
  }

  // Fallback direct sur les tables
  const [
    appsRes,
    mediaRes,
    reviewLeadsRes,
    ordersRes,
    disputesRes,
  ] = await Promise.all([
    supabase.from("installer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("media_partner_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("leads").select("*", { count: "exact", head: true }).or("marketplace_status.eq.pending_review,status.eq.NEEDS_HUMAN_REVIEW"),
    supabase.from("credit_orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
    // Garantir qu'un litige n'est comptabilisé que si son lead existe toujours
    supabase.from("lead_disputes").select("id, leads!inner(id)").eq("status", "pending"),
  ])

  return NextResponse.json(
    {
      pending_installer_apps: appsRes.count ?? 0,
      pending_media_apps: mediaRes.count ?? 0,
      pending_review_leads: reviewLeadsRes.count ?? 0,
      pending_credit_orders: ordersRes.count ?? 0,
      pending_disputes: disputesRes.data?.length ?? 0,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  )
}
