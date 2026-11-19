import { NextRequest, NextResponse } from "next/server"
import { resolveLeadPhoneE164 } from "@/lib/leads-validation"
import { dispatchDeferredAdminLeadAlert } from "@/lib/notify-admin-lead"
import { createServiceRoleClient } from "@/lib/supabase/admin"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 })
    }

    const rawLeadId = typeof body.leadId === "string" ? body.leadId.trim() : ""
    const rawSessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : ""
    const rawPhone = typeof body.phone === "string" ? body.phone.trim() : ""
    const segment = body.segment === "B2B" ? "B2B" : "B2C"

    if (!rawLeadId || !UUID_REGEX.test(rawLeadId)) {
      return NextResponse.json({ error: "Identifiant de dossier invalide." }, { status: 400 })
    }

    const phoneResolved = rawPhone ? resolveLeadPhoneE164(rawPhone, segment) : null
    const phoneE164 = phoneResolved?.valid ? phoneResolved.e164 : null

    const supabase = createServiceRoleClient()
    const { data: existingLead, error: fetchErr } = await supabase
      .from("leads")
      .select("id, phone, session_id, phone_verified, qualification_metadata")
      .eq("id", rawLeadId)
      .maybeSingle()

    if (fetchErr || !existingLead) {
      return NextResponse.json({ ok: true, found: false })
    }

    const ownsLead =
      (phoneE164 !== null && existingLead.phone === phoneE164) ||
      (rawSessionId !== "" && existingLead.session_id === rawSessionId)

    if (!ownsLead) {
      return NextResponse.json({ error: "Accès non autorisé pour ce dossier." }, { status: 403 })
    }

    if (existingLead.phone_verified) {
      return NextResponse.json({ ok: true, alreadyVerified: true })
    }

    const nowIso = new Date().toISOString()
    const existingMeta =
      existingLead.qualification_metadata &&
      typeof existingLead.qualification_metadata === "object"
        ? (existingLead.qualification_metadata as Record<string, any>)
        : {}
    const existingVerifs =
      existingMeta.verifications && typeof existingMeta.verifications === "object"
        ? (existingMeta.verifications as Record<string, any>)
        : {}
    const existingOtp =
      existingVerifs.phoneOtp && typeof existingVerifs.phoneOtp === "object"
        ? (existingVerifs.phoneOtp as Record<string, any>)
        : {}

    await supabase
      .from("leads")
      .update({
        qualification_metadata: {
          ...existingMeta,
          verifications: {
            ...existingVerifs,
            phoneOtp: {
              ...existingOtp,
              verified: false,
              status: "skipped_by_prospect",
              skippedAt: nowIso,
            },
          },
        },
        updated_at: nowIso,
      })
      .eq("id", rawLeadId)

    await dispatchDeferredAdminLeadAlert(supabase, rawLeadId, "otp_skipped").catch((err) =>
      console.warn("[API phone-otp/skip] Alerte admin différée échouée:", err)
    )

    return NextResponse.json({ ok: true, skipped: true })
  } catch (err) {
    console.error("[API phone-otp/skip] Erreur inattendue:", err)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du choix." },
      { status: 500 }
    )
  }
}
