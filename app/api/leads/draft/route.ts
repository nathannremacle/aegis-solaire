import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { getEmailError, getWalloonProvinceKeyFromPostalCode } from "@/lib/leads-validation"
import { sendMetaConversionApiEvent } from "@/lib/meta-capi"

export async function POST(request: NextRequest) {
  try {
    if (!(await checkRateLimit(request))) {
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter." },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
    }

    const {
      sessionId,
      fullName,
      email,
      postalCode,
      city,
      province,
      estimatedKwc,
      funnelData,
      utmSource,
      utmCampaign,
      utmContent,
      utmTerm,
      eventId,
      fbclid,
      sourceUrl,
    } = body

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Identifiant de session requis" }, { status: 400 })
    }

    if (!email || typeof email !== "string" || getEmailError(email)) {
      return NextResponse.json({ error: "Adresse e-mail valide requise" }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 1. Vérifier si ce lead est déjà finalisé pour cette session
    const { data: existing } = await supabase
      .from("leads")
      .select("id, status")
      .eq("session_id", sessionId)
      .maybeSingle()

    if (existing && existing.status !== "draft_email_only") {
      return NextResponse.json({
        success: true,
        message: "Lead déjà finalisé",
        leadId: existing.id,
      })
    }

    // 2. Découpage Prénom / Nom
    const cleanFullName = (fullName || "").trim()
    const nameParts = cleanFullName ? cleanFullName.split(/\s+/) : []
    const firstName = nameParts[0] || "Prospect"
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Incomplet"

    const cleanEmail = email.trim().toLowerCase()
    const rawPostalDigits = postalCode ? String(postalCode).replace(/\D/g, "").slice(0, 4) : ""
    const safePostalCode = rawPostalDigits.length === 4 ? rawPostalDigits : null
    const derivedWalloonProvince = safePostalCode
      ? getWalloonProvinceKeyFromPostalCode(safePostalCode)
      : null

    if (safePostalCode && !derivedWalloonProvince) {
      return NextResponse.json(
        { error: "Zone non couverte : service réservé à la Wallonie." },
        { status: 400 }
      )
    }

    const safeCity = city ? String(city).trim().slice(0, 100) : null
    const safeProvince = derivedWalloonProvince || province || "liege"
    const parsedKwc = estimatedKwc ? Number(estimatedKwc) : null

    // 3. Payload brouillon sécurisé (non visible sur la marketplace des installateurs)
    const draftPayload = {
      session_id: sessionId,
      first_name: firstName,
      last_name: lastName,
      email: cleanEmail,
      job_title: "Particulier",
      postal_code: safePostalCode,
      city: safeCity,
      province: safeProvince,
      matched_province: safeProvince,
      estimated_power_kwc: parsedKwc && !isNaN(parsedKwc) ? parsedKwc : null,
      status: "draft_email_only",
      marketplace_status: "draft",
      contact_preference: "written_first",
      segment: "B2C",
      source: "simulator",
      source_form: "b2c_devis_landing",
      qualification_metadata: {
        ...(typeof funnelData === "object" && funnelData !== null ? funnelData : {}),
        is_draft: true,
        draft_relance_pending: true,
        captured_at: new Date().toISOString(),
        utm_source: utmSource || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        utm_term: utmTerm || null,
      },
      updated_at: new Date().toISOString(),
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from("leads")
      .upsert(draftPayload, { onConflict: "session_id" })
      .select("id")
      .single()

    if (upsertErr) {
      console.error("[Leads Draft] Erreur d'enregistrement du brouillon:", upsertErr)
      return NextResponse.json({ error: "Erreur enregistrement brouillon" }, { status: 500 })
    }

    // 4. Télémétrie d'entonnoir sans PII
    await supabase.from("funnel_step_events").insert({
      session_id: sessionId,
      step_number: 6,
      step_name: "STEP_6_EMAIL_CAPTURED_BLUR",
      province: safeProvince,
      utm_source: utmSource || null,
      utm_campaign: utmCampaign || null,
      utm_content: utmContent || null,
      utm_term: utmTerm || null,
    })

    // 5. Transmission micro-conversion CAPI Meta (Événement 'Contact' enrichi avec await borné)
    try {
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip")?.trim() ||
        undefined
      const userAgent = request.headers.get("user-agent") || undefined
      const fbp = request.cookies.get("_fbp")?.value
      const fbc = request.cookies.get("_fbc")?.value
      const resolvedEventId =
        typeof eventId === "string" && eventId.trim() !== ""
          ? eventId.trim()
          : `event_contact_${sessionId}`
      const resolvedSourceUrl =
        (typeof sourceUrl === "string" && sourceUrl.startsWith("http") ? sourceUrl : undefined) ||
        request.headers.get("referer") ||
        "https://www.aegissolaire.com/devis-panneaux-solaires"

      await sendMetaConversionApiEvent({
        eventName: "Contact",
        eventId: resolvedEventId,
        email: cleanEmail,
        firstName: firstName !== "Prospect" ? firstName : undefined,
        lastName: lastName !== "Incomplet" ? lastName : undefined,
        postalCode: safePostalCode || undefined,
        clientIp,
        userAgent,
        fbp,
        fbc,
        fbclid: typeof fbclid === "string" && fbclid.trim() !== "" ? fbclid.trim() : undefined,
        sourceUrl: resolvedSourceUrl,
        segment: "B2C",
        value: 20,
        contentName: "Audit Solaire - Contact E-mail Saisi",
      })
    } catch (capiErr) {
      console.warn("[Meta CAPI Contact Draft] Warning:", capiErr)
    }

    return NextResponse.json({
      success: true,
      leadId: upserted.id,
      status: "draft_email_only",
    })
  } catch (err) {
    console.error("[Leads Draft] Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

