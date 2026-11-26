import { NextRequest, NextResponse } from "next/server"
import { getAdminUser } from "@/lib/admin-auth"
import {
  runBehavioralReactivationNudges,
  runWeeklyMarketProofDigest,
} from "@/lib/partner-growth-engine"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  let body: { action?: string; dryRun?: boolean; maxEmails?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 })
  }

  const dryRun = Boolean(body.dryRun)
  const maxEmails = typeof body.maxEmails === "number" ? body.maxEmails : undefined

  if (body.action === "weekly_digest") {
    const result = await runWeeklyMarketProofDigest({ dryRun, maxEmails })
    return NextResponse.json({ success: true, result })
  }

  if (body.action === "behavioral_nudges") {
    const result = await runBehavioralReactivationNudges({ dryRun, maxEmails })
    return NextResponse.json({ success: true, result })
  }

  return NextResponse.json(
    { error: "Action inconnue. Utilisez 'weekly_digest' ou 'behavioral_nudges'." },
    { status: 400 }
  )
}
