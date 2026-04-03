import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

/**
 * Credit packs (EUR TTC).
 * In production: prices should live in the DB or Revolut product catalog.
 */
const CREDIT_PACKS: Record<string, { credits: number; priceEur: number }> = {
  pack_10: { credits: 10, priceEur: 149 },
  pack_50: { credits: 50, priceEur: 599 },
  pack_100: { credits: 100, priceEur: 999 },
}

/**
 * POST /api/payments/revolut
 *
 * Stub / démo : accepte un JSON minimal (event, partnerId, packId, transactionId).
 * Production : voir docs/FONCTIONNEMENT-SITE.md § 7.4 (signature Revolut, metadata
 * commande → partnerId + packId, idempotence avant add_credits).
 */
export async function POST(request: Request) {
  let body: {
    event?: string
    partnerId?: string
    packId?: string
    transactionId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.event !== "payment.completed") {
    return NextResponse.json({ received: true })
  }

  const pack = CREDIT_PACKS[body.packId ?? ""]
  if (!pack || !body.partnerId) {
    return NextResponse.json({ error: "Invalid pack or partner" }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  const { data: newCredits, error } = await admin.rpc("add_credits", {
    p_partner_id: body.partnerId,
    p_amount: pack.credits,
    p_type: "topup",
    p_reference: body.transactionId ?? `revolut_${body.packId}`,
  })

  if (error) {
    console.error("[revolut webhook] add_credits error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    creditsAdded: pack.credits,
    newBalance: newCredits,
  })
}
