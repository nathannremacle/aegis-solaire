import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import { getPartnerTelemetryAnalytics } from "@/lib/partner-telemetry"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const partnerId = searchParams.get("partnerId") || undefined
  const leadId = searchParams.get("leadId") || undefined
  const rawDays = parseInt(searchParams.get("days") || "30", 10)
  const days = Number.isFinite(rawDays) ? Math.min(365, Math.max(1, rawDays)) : 30
  const includeTest = searchParams.get("includeTest") === "true"

  try {
    const analytics = await getPartnerTelemetryAnalytics({
      partnerId,
      leadId,
      days,
      includeTest,
    })
    return NextResponse.json(analytics)
  } catch (err) {
    console.error("[api/admin/partner-telemetry] error:", err)
    return NextResponse.json({ error: "Erreur lors de l'analyse de télémétrie" }, { status: 500 })
  }
}

