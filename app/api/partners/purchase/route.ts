import { NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { isShowcaseOnlyLeadId } from "@/lib/regional-leads-catalog"
import {
  sendAdminLeadSaleNotification,
  type LeadSaleBuyerSummary,
} from "@/lib/admin-sales-emails"
import { sendProspectExclusiveMatchEmail } from "@/lib/prospect-exclusive-match-email"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: { leadId?: string; exclusive?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 })
  }

  const leadId = typeof body.leadId === "string" ? body.leadId.trim() : ""
  const exclusive = Boolean(body.exclusive)
  if (!leadId) {
    return NextResponse.json({ error: "leadId requis" }, { status: 400 })
  }

  if (isShowcaseOnlyLeadId(leadId)) {
    return NextResponse.json(
      { error: "Ce dossier a déjà atteint son quota maximum d'installateurs et n'est plus disponible à l'achat." },
      { status: 400 }
    )
  }

  if (!UUID_REGEX.test(leadId)) {
    return NextResponse.json(
      { error: "Ce dossier n'est pas disponible à l'achat." },
      { status: 400 }
    )
  }

  const admin = createServiceRoleClient()

  // Garde-fou supplémentaire en base avant toute RPC d'achat
  const { data: leadCheck } = await admin
    .from("leads")
    .select("id, marketplace_status, qualification_metadata")
    .eq("id", leadId)
    .maybeSingle()

  if (!leadCheck) {
    return NextResponse.json(
      { error: "Ce dossier est introuvable ou n'est plus actif sur la marketplace." },
      { status: 404 }
    )
  }

  if (
    leadCheck.marketplace_status !== "available" ||
    Boolean((leadCheck.qualification_metadata as Record<string, unknown> | null)?.is_showcase)
  ) {
    return NextResponse.json(
      { error: "Ce dossier n'est plus disponible à l'achat." },
      { status: 400 }
    )
  }

  let purchaseResult: any = null
  let purchaseErr: any = null

  // 1. Tenter la nouvelle RPC atomique avec verrouillage pessimiste (avec p_exclusive)
  const { data: rpcData, error: rpcError } = await admin.rpc("purchase_marketplace_lead", {
    p_lead_id: leadId,
    p_partner_id: partner.id,
    p_exclusive: exclusive,
  })

  if (!rpcError && rpcData) {
    purchaseResult = rpcData
  } else if (rpcError && (rpcError.code === "42883" || rpcError.message?.includes("does not exist"))) {
    // 2. Fallback sur l'ancienne RPC 2-arg si la migration 202611180001 n'est pas encore appliquée
    const { data: retryData, error: retryErr } = !exclusive
      ? await admin.rpc("purchase_marketplace_lead", {
          p_lead_id: leadId,
          p_partner_id: partner.id,
        })
      : { data: null, error: rpcError }

    if (!retryErr && retryData) {
      purchaseResult = retryData
    } else {
      const { data: oldData, error: oldErr } = await admin.rpc("purchase_lead", {
        p_lead_id: leadId,
        p_partner_id: partner.id,
      })
      purchaseResult = oldData
      purchaseErr = oldErr
    }
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
      "id, first_name, last_name, email, phone, company, company_vat, province, postal_code, city, site_address, segment, max_slots, surface_type, surface_area, estimated_power_kwc, annual_electricity_bill, roof_material, project_timeline, lead_score, grd, contact_preference, project_details, message, qualification_metadata, created_at"
    )
    .eq("id", leadId)
    .single()

  let purchaseId = (result?.purchase_id as string) || (result?.purchaseId as string) || null

  if (!purchaseId) {
    const { data: lp } = await admin
      .from("lead_purchases")
      .select("id")
      .eq("lead_id", leadId)
      .eq("partner_id", partner.id)
      .order("purchased_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lp?.id) {
      purchaseId = lp.id
    }
  }

  const creditsSpent = (result?.credits_spent as number) ?? (result?.creditsSpent as number)
  const creditsRemaining =
    (result?.remaining_credits as number) ??
    (result?.creditsRemaining as number) ??
    (result?.credits_remaining as number)

  if (lead) {
    try {
      const shouldNotifyExclusiveProspect = Boolean(exclusive && lead.segment === "B2C" && lead.email)

      const [{ data: allLeadPurchases }, partnerAppRes] = await Promise.all([
        admin
          .from("lead_purchases")
          .select("id, partner_id, purchased_at, partners(id, company_name, is_test)")
          .eq("lead_id", leadId)
          .order("purchased_at", { ascending: true }),
        shouldNotifyExclusiveProspect && partner.email
          ? admin
              .from("installer_applications")
              .select("rescert_ref")
              .eq("email", partner.email.toLowerCase().trim())
              .eq("status", "approved")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      const buyers: LeadSaleBuyerSummary[] = (allLeadPurchases || []).map((row: any) => {
        const pRel = Array.isArray(row.partners) ? row.partners[0] : row.partners
        return {
          partnerId: row.partner_id,
          companyName: pRel?.company_name || "Partenaire",
          purchasedAt: row.purchased_at,
          isTest: Boolean(pRel?.is_test),
          isCurrentBuyer: row.partner_id === partner.id,
        }
      })

      const isExclusivePurchase = Boolean(result?.exclusive ?? (exclusive || lead.max_slots === 1))
      const maxSlots =
        isExclusivePurchase
          ? 1
          : typeof lead.max_slots === "number"
            ? lead.max_slots
            : lead.segment === "B2B"
              ? 2
              : 3
      const takenSlots = buyers.length > 0 ? buyers.length : 1

      const notificationTasks: Promise<unknown>[] = [
        sendAdminLeadSaleNotification({
          mode: "credits",
          purchaseId,
          partner: {
            id: partner.id,
            company_name: partner.company_name,
            email: partner.email,
            phone: partner.phone,
            credits: creditsRemaining ?? partner.credits,
          },
          lead,
          creditsSpent: Number(creditsSpent ?? (lead.segment === "B2B" ? 9 : 3)),
          creditsRemainingAfter: creditsRemaining ?? null,
          takenSlots,
          maxSlots,
          buyers,
        }),
      ]

      if (shouldNotifyExclusiveProspect) {
        const contactPref =
          (lead as { contact_preference?: string | null }).contact_preference ||
          ((lead.qualification_metadata as Record<string, unknown> | null)?.contactPreference as
            | string
            | undefined) ||
          null

        notificationTasks.push(
          sendProspectExclusiveMatchEmail({
            email: lead.email,
            firstName: lead.first_name,
            leadId: lead.id,
            city: lead.city,
            province: lead.province,
            estimatedPowerKwc: lead.estimated_power_kwc,
            surfaceArea: lead.surface_area,
            grd: lead.grd,
            contactPreference: contactPref,
            partnerCompany: partner.company_name || "Installateur agréé RESCERT",
            partnerEmail: partner.email,
            partnerPhone: partner.phone,
            partnerRescertRef: partnerAppRes?.data?.rescert_ref ?? null,
          }).catch((err) => {
            console.warn("[purchase] Prospect exclusive reassurance warning:", err)
          })
        )
      }

      await Promise.allSettled(notificationTasks)
    } catch (emailErr) {
      console.warn("[purchase] Admin sales notification warning:", emailErr)
    }
  }

  return NextResponse.json({
    success: true,
    purchaseId,
    purchase_id: purchaseId,
    creditsSpent,
    creditsRemaining,
    exclusive: Boolean(result?.exclusive ?? (exclusive || lead?.max_slots === 1)),
    lead,
  })
}
