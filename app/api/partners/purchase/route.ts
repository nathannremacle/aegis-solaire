import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: { leadId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 })
  }

  if (!body.leadId) {
    return NextResponse.json({ error: "leadId requis" }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  let purchaseResult: any = null
  let purchaseErr: any = null

  // 1. Tenter la nouvelle RPC atomique avec verrouillage pessimiste
  const { data: rpcData, error: rpcError } = await admin.rpc("purchase_marketplace_lead", {
    p_lead_id: body.leadId,
    p_partner_id: partner.id,
  })

  if (!rpcError && rpcData) {
    purchaseResult = rpcData
  } else if (rpcError && (rpcError.code === "42883" || rpcError.message?.includes("does not exist"))) {
    // 2. Fallback sur l'ancienne RPC purchase_lead
    const { data: oldData, error: oldErr } = await admin.rpc("purchase_lead", {
      p_lead_id: body.leadId,
      p_partner_id: partner.id,
    })
    purchaseResult = oldData
    purchaseErr = oldErr
  } else {
    purchaseErr = rpcError
  }

  if (purchaseErr) {
    console.error("[purchase] rpc error:", purchaseErr)
    return NextResponse.json({ error: purchaseErr.message }, { status: 400 })
  }

  const result = purchaseResult as Record<string, unknown> | null
  if (result?.error) {
    return NextResponse.json(result, { status: 400 })
  }

  const { data: lead } = await admin
    .from("leads")
    .select(
      "id, first_name, last_name, email, phone, company, company_vat, province, segment, surface_type, surface_area, annual_electricity_bill, grd, project_details, message"
    )
    .eq("id", body.leadId)
    .single()

  let purchaseId = (result?.purchase_id as string) || (result?.purchaseId as string) || null

  if (!purchaseId) {
    const { data: lp } = await admin
      .from("lead_purchases")
      .select("id")
      .eq("lead_id", body.leadId)
      .eq("partner_id", partner.id)
      .order("purchased_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lp?.id) {
      purchaseId = lp.id
    }
  }

  return NextResponse.json({
    success: true,
    purchaseId,
    purchase_id: purchaseId,
    creditsSpent: (result?.credits_spent as number) ?? (result?.creditsSpent as number),
    creditsRemaining: (result?.remaining_credits as number) ?? (result?.creditsRemaining as number) ?? (result?.credits_remaining as number),
    lead,
  })
}
