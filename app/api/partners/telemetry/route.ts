import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import {
  recordPartnerActivityEvent,
  VALID_PARTNER_TELEMETRY_EVENTS,
  type PartnerTelemetryEventType,
} from "@/lib/partner-telemetry"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const rawText = await request.text().catch(() => "")
    if (!rawText) {
      return NextResponse.json({ ok: false, error: "Payload vide" }, { status: 400 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 })
    }

    const eventType = String(body.eventType || "") as PartnerTelemetryEventType
    if (!VALID_PARTNER_TELEMETRY_EVENTS.includes(eventType)) {
      return NextResponse.json({ ok: false, error: "Type d'événement invalide" }, { status: 400 })
    }

    let partner = await getPartner()

    // Support du mode simulation/développement sur localhost uniquement
    if (!partner && process.env.NODE_ENV === "development") {
      const devEmail = typeof body.devPartnerEmail === "string" ? body.devPartnerEmail.trim() : ""
      const devId = typeof body.devPartnerId === "string" ? body.devPartnerId.trim() : ""
      const devName = typeof body.devPartnerName === "string" ? body.devPartnerName.trim() : ""
      partner = {
        id: devId || "mock-partner-dev",
        email: devEmail || "partenaire@aegissolaire.com",
        company_name: devName || "Artisan Solaire Wallonie SRL",
      } as any
    }

    if (!partner) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 })
    }

    const leadId = typeof body.leadId === "string" && body.leadId.trim() ? body.leadId.trim() : null
    const leadRef = typeof body.leadRef === "string" && body.leadRef.trim() ? body.leadRef.trim() : null
    const sessionId =
      typeof body.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim().slice(0, 80)
        : "session"
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim().slice(0, 64)
        : "marketplace"
    const rawDuration = Number(body.durationMs)
    const durationMs = Number.isFinite(rawDuration)
      ? Math.min(1800000, Math.max(0, Math.round(rawDuration)))
      : 0

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : {}

    const result = await recordPartnerActivityEvent({
      partnerId: partner.id,
      partnerEmail: partner.email,
      partnerName: partner.company_name || partner.email,
      leadId,
      leadRef,
      sessionId,
      eventType,
      durationMs,
      source,
      metadata,
    })

    return NextResponse.json({ ok: true, backend: result.backend })
  } catch (err) {
    console.error("[api/partners/telemetry] error:", err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

