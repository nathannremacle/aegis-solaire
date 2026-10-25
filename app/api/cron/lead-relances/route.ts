import { NextRequest, NextResponse } from "next/server"
import { processPendingLeadRelances } from "@/lib/lead-relance-engine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  // Vérification de sécurité optionnelle par Bearer Token ou CRON_SECRET Vercel
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const summary = await processPendingLeadRelances()
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    })
  } catch (err: any) {
    console.error("[cron lead-relances error]:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Erreur lors du traitement des relances" },
      { status: 500 }
    )
  }
}
