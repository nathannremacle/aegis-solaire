import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getMollieClient } from "@/lib/mollie"
import { fulfillPaidLeadDirectPurchase } from "@/lib/mollie-fulfillment"

export const dynamic = "force-dynamic"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id: leadId } = await params
  if (!leadId) {
    return NextResponse.json({ error: "leadId manquant" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get("payment_id")

  const supabase = createServiceRoleClient()

  // 1. Vérifier si le dossier est déjà débloqué pour ce partenaire
  const { data: existingPurchase } = await supabase
    .from("lead_purchases")
    .select("*, leads(*)")
    .eq("lead_id", leadId)
    .eq("partner_id", partner.id)
    .maybeSingle()

  if (existingPurchase) {
    return NextResponse.json({
      status: "paid",
      alreadyUnlocked: true,
      purchaseId: existingPurchase.id,
      purchase: existingPurchase,
      lead: existingPurchase.leads,
    })
  }

  // 2. Si on a un paymentId, interroger Mollie
  if (paymentId && process.env.MOLLIE_API_KEY) {
    try {
      const mollie = getMollieClient()
      const payment = await mollie.payments.get(paymentId)

      if (payment.status === "paid") {
        const result = await fulfillPaidLeadDirectPurchase(leadId, partner.id, payment)
        if (result.success) {
          return NextResponse.json({
            status: "paid",
            freshlyUnlocked: true,
            purchaseId: result.purchaseId,
            purchase: result.purchase,
            lead: result.lead,
          })
        } else {
          return NextResponse.json({
            status: "error",
            error: result.error || "Impossible de finaliser l'attribution.",
          }, { status: 400 })
        }
      }

      if (["canceled", "failed", "expired"].includes(payment.status)) {
        return NextResponse.json({
          status: "cancelled",
          message: "La transaction de paiement a été abandonnée ou refusée.",
        })
      }

      return NextResponse.json({
        status: payment.status,
        message: "Paiement en cours de validation par votre établissement bancaire.",
      })
    } catch (checkErr: any) {
      console.warn("[Lead Check Payment] Erreur consultation Mollie:", checkErr)
    }
  }

  return NextResponse.json({
    status: "pending",
    message: "En attente de confirmation bancaire.",
  })
}

