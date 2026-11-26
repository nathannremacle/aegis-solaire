import { NextRequest, NextResponse } from "next/server"
import {
  runBehavioralReactivationNudges,
  runWeeklyMarketProofDigest,
} from "@/lib/partner-growth-engine"
import { isWithinBusinessHours } from "@/lib/lead-relance-engine"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function getBrusselsWeekday(): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Brussels",
    weekday: "short",
  }).format(new Date())
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const forceDigest = searchParams.get("forceDigest") === "1"
  const isMonday = getBrusselsWeekday() === "Mon"

  try {
    const behavioralNudges = isWithinBusinessHours()
      ? await runBehavioralReactivationNudges()
      : { action: "behavioral_nudges", dryRun: false, eligibleCount: 0, sentCount: 0, skippedCount: 0, previews: [] }

    const weeklyDigest =
      isMonday || forceDigest
        ? await runWeeklyMarketProofDigest()
        : { action: "weekly_digest", dryRun: false, eligibleCount: 0, sentCount: 0, skippedCount: 0, previews: [] }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      isMonday,
      behavioralNudges,
      weeklyDigest,
    })
  } catch (err: any) {
    console.error("[cron partner-growth-engine error]:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Erreur lors du traitement growth engine" },
      { status: 500 }
    )
  }
}
