import { NextRequest, NextResponse } from "next/server"
import { revalidateTag, revalidatePath } from "next/cache"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { z } from "zod"
import { Resend } from "resend"
import { buildCreditOrderConfirmationEmail } from "@/lib/email-templates/installer-transactional"
import { ensureInvoiceForCreditOrder } from "@/lib/accounting/invoice-service"
import { ensurePartnerReferralCode, triggerPartnerReferralReward } from "@/lib/partner-referrals"
import { triggerDistributorBonusReward } from "@/lib/distributor-partners"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { id } = await params
  const parsed = z.object({ action: z.enum(["validate", "cancel"]), notes: z.string().max(2000).optional() })
    .safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 })
  const body = parsed.data
  const supabase = createServiceRoleClient()

  // 1. Récupérer la commande
  const { data: order, error: orderErr } = await supabase
    .from("credit_orders")
    .select("*, partners(id, company_name, email, credits)")
    .eq("id", id)
    .single()

  if (orderErr || !order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
  }

  const action = body.action // 'validate' | 'cancel'

  if (action === "validate") {
    const { data: result, error: rpcErr } = await supabase.rpc("settle_credit_order", {
      p_order_id: id,
      p_provider: "bank_transfer",
      p_notes: body.notes ?? null,
    })
    if (rpcErr || !result) {
      console.error("[validate-order] Settlement failed:", rpcErr)
      return NextResponse.json({ error: "Impossible de valider cette commande." }, { status: 409 })
    }
    const newCredits = result.newCredits as number
    if (result.alreadyPaid) {
      return NextResponse.json({ success: true, alreadyPaid: true, newCredits, orderStatus: "paid" })
    }

    // 4. Log d'audit
    try {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "credit_order_validated",
        entity_type: "credit_order",
        entity_id: id,
        details: {
          credits: order.credits,
          partner_id: order.partner_id,
          reference: order.transfer_reference,
          newCredits,
        },
      })
    } catch { /* silent */ }

    // 5. Émission de la facture séquentielle & Email de notification au partenaire
    const issuedInvoice = await ensureInvoiceForCreditOrder(id)
    const partnerEmail = order.partners?.email
    if (partnerEmail && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const invoiceRef = issuedInvoice.invoiceNumber || order.transfer_reference || `AEGIS-${order.id.slice(0, 8).toUpperCase()}`
        const referralCode = await ensurePartnerReferralCode(
          supabase,
          order.partner_id,
          order.partners?.company_name
        ).catch(() => null)
        const rendered = buildCreditOrderConfirmationEmail({
          orderId: order.id,
          invoiceRef,
          companyName: order.partners?.company_name || "Partenaire Installateur",
          packName: order.pack_name,
          credits: Number(order.credits || 0),
          newCreditsBalance: newCredits,
          priceHtva: order.price_htva ?? 0,
          vatAmount: order.vat_amount ?? 0,
          priceTtc: order.price_ttc ?? 0,
          paymentMethodLabel: "Virement bancaire",
          referralCode,
        })

        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "contact@aegissolaire.com",
          to: partnerEmail,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        }).catch((mailErr) => {
          console.warn("[validate-order] email notification failed:", mailErr)
        })
      } catch { /* silent */ }
    }

    revalidateTag("admin-badges", "max")
    revalidateTag("admin-kpis", "max")
    revalidatePath("/admin", "layout")

    try {
      await triggerPartnerReferralReward(supabase, order.partner_id, "first_credit_order")
      await triggerDistributorBonusReward(supabase, order.partner_id, "first_bank_transfer_order")
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({
      success: true,
      message: `${order.credits} crédits attribués avec succès.`,
      newCredits,
      orderStatus: "paid",
    })
  }

  if (action === "cancel") {
    const { error: cancelErr } = await supabase.rpc("cancel_credit_order", {
      p_order_id: id,
      p_notes: body.notes ?? null,
    })
    if (cancelErr) {
      return NextResponse.json({ error: "Impossible d’annuler cette commande. Une commande payée doit faire l’objet d’un remboursement." }, { status: 409 })
    }

    try {
      await supabase.from("audit_log").insert({
        admin_email: user.email || "admin",
        action: "credit_order_cancelled",
        entity_type: "credit_order",
        entity_id: id,
        details: { reference: order.transfer_reference },
      })
    } catch { /* silent */ }

    revalidateTag("admin-badges", "max")
    revalidateTag("admin-kpis", "max")
    revalidatePath("/admin", "layout")

    return NextResponse.json({
      success: true,
      message: "Commande annulée.",
      orderStatus: "cancelled",
    })
  }

  return NextResponse.json({ error: "Action non reconnue" }, { status: 400 })
}
