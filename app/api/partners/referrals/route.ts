import { NextRequest, NextResponse } from "next/server"
import { getPartner } from "@/lib/partner-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  buildPartnerReferralShareData,
  ensurePartnerReferralCode,
  PARTNER_REFERRAL_REWARD_CREDITS,
} from "@/lib/partner-referrals"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const partner = await getPartner()
  if (!partner) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const referralCode = await ensurePartnerReferralCode(
    supabase,
    partner.id,
    partner.company_name
  )

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.nextUrl.origin ||
    "https://www.aegissolaire.com"
  ).replace(/\/$/, "")
  const { referralUrl } = buildPartnerReferralShareData({
    referralCode,
    companyName: partner.company_name,
    baseUrl: siteUrl,
    rewardCredits: PARTNER_REFERRAL_REWARD_CREDITS,
  })

  const { data: rows, error } = await supabase
    .from("partner_referrals")
    .select(
      "id, referred_email, referred_company_name, status, reward_credits_referrer, reward_credits_referred, trigger_event, rewarded_at, created_at"
    )
    .eq("referrer_partner_id", partner.id)
    .order("created_at", { ascending: false })
    .limit(50)

  const referrals =
    error && error.code === "42P01"
      ? []
      : (rows ?? []).map((row) => ({
          id: row.id,
          companyName: row.referred_company_name || "Entreprise RESCERT",
          email: row.referred_email,
          status: row.status,
          rewardCredits: Number(row.reward_credits_referrer ?? PARTNER_REFERRAL_REWARD_CREDITS),
          rewardedAt: row.rewarded_at,
          createdAt: row.created_at,
        }))

  const stats = {
    totalInvited: referrals.length,
    approvedCount: referrals.filter((r) => r.status === "approved" || r.status === "rewarded").length,
    rewardedCount: referrals.filter((r) => r.status === "rewarded").length,
    totalCreditsEarned: referrals
      .filter((r) => r.status === "rewarded")
      .reduce((sum, r) => sum + r.rewardCredits, 0),
  }

  return NextResponse.json({
    referralCode,
    referralUrl,
    rewardCredits: PARTNER_REFERRAL_REWARD_CREDITS,
    stats,
    referrals,
  })
}
