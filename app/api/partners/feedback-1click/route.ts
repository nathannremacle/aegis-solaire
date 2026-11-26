import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getPartner } from "@/lib/partner-auth"
import {
  verifyPartnerUnsubscribeToken,
  type PartnerMicroFeedbackReason,
} from "@/lib/partner-notification-tokens"
import { getEmailSiteBaseUrl } from "@/lib/email-templates/installer-email-layout"

export const dynamic = "force-dynamic"

const VALID_REASONS = new Set<PartnerMicroFeedbackReason>([
  "price",
  "out_of_zone",
  "too_small",
  "competition",
  "other",
])

async function persistMicroFeedback(params: {
  partnerId: string
  leadId: string | null
  reason: PartnerMicroFeedbackReason
  customNote?: string | null
  source: string
}) {
  const supabase = createServiceRoleClient()
  let actionApplied: string | null = null

  if (params.reason === "too_small") {
    actionApplied = "min_kwc_15_min_facture_6000"
    const { error: prefErr } = await supabase
      .from("partners")
      .update({
        min_facture: 6000,
        min_kwc: 15,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.partnerId)

    if (prefErr && (prefErr.code === "42703" || prefErr.message?.includes("min_kwc"))) {
      await supabase
        .from("partners")
        .update({
          min_facture: 6000,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.partnerId)
    }
  }

  const { error: insertErr } = await supabase.from("partner_micro_feedback").insert({
    partner_id: params.partnerId,
    lead_id: params.leadId,
    reason: params.reason,
    custom_note: params.customNote || null,
    source: params.source,
    action_applied: actionApplied,
  })

  if (
    insertErr &&
    (insertErr.code === "42P01" ||
      insertErr.code === "PGRST205" ||
      insertErr.message?.includes("partner_micro_feedback"))
  ) {
    await supabase.from("audit_log").insert({
      admin_email: "system:partner_feedback",
      action: "partner_micro_feedback",
      entity_type: "partner",
      entity_id: params.partnerId,
      details: {
        lead_id: params.leadId,
        reason: params.reason,
        custom_note: params.customNote || null,
        source: params.source,
        action_applied: actionApplied,
      },
    })
  }

  return { actionApplied }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const partnerId = (searchParams.get("partner") || "").trim()
  const token = (searchParams.get("token") || "").trim()
  const rawReason = (searchParams.get("reason") || "other").trim() as PartnerMicroFeedbackReason
  const leadId = (searchParams.get("lead") || "").trim() || null

  if (!partnerId || !verifyPartnerUnsubscribeToken(partnerId, token)) {
    return NextResponse.json({ error: "Lien de feedback invalide ou expiré." }, { status: 403 })
  }

  const reason: PartnerMicroFeedbackReason = VALID_REASONS.has(rawReason) ? rawReason : "other"

  await persistMicroFeedback({
    partnerId,
    leadId,
    reason,
    source: "email_1click",
  })

  const baseUrl = getEmailSiteBaseUrl()
  const redirectUrl = `${baseUrl}/partenaires/notifications?partner=${encodeURIComponent(
    partnerId
  )}&token=${encodeURIComponent(token)}&feedback=${encodeURIComponent(reason)}`
  return NextResponse.redirect(redirectUrl, { status: 302 })
}

export async function POST(request: NextRequest) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: {
    leadId?: string | null
    reason?: string
    customNote?: string | null
    source?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 })
  }

  const rawReason = String(body.reason || "other").trim() as PartnerMicroFeedbackReason
  const reason: PartnerMicroFeedbackReason = VALID_REASONS.has(rawReason) ? rawReason : "other"
  const leadId = typeof body.leadId === "string" && body.leadId.trim() ? body.leadId.trim() : null
  const customNote =
    typeof body.customNote === "string" && body.customNote.trim()
      ? body.customNote.trim().slice(0, 500)
      : null
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim().slice(0, 48) : "drawer_in_app"

  const { actionApplied } = await persistMicroFeedback({
    partnerId: partner.id,
    leadId,
    reason,
    customNote,
    source,
  })

  return NextResponse.json({
    success: true,
    reason,
    actionApplied,
  })
}
