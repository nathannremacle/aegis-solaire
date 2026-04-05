import { randomUUID } from "crypto"
import type { createServiceRoleClient } from "@/lib/supabase/admin"

/**
 * Génère un code tracking du type MP-SOCIETE-XXXXXXXX (unique dans media_partners).
 */
export function buildMediaPartnerTrackingCode(companyName: string): string {
  const slug = slugifySegment(companyName, 12)
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()
  return `MP-${slug}-${suffix}`
}

function slugifySegment(raw: string, maxLen: number): string {
  const base = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, maxLen)
  return base.length > 0 ? base : "PARTNER"
}

type ServiceSupabase = ReturnType<typeof createServiceRoleClient>

export async function ensureUniqueTrackingCode(
  supabase: ServiceSupabase,
  companyName: string,
  maxAttempts = 8
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const code = buildMediaPartnerTrackingCode(companyName + (i > 0 ? `-${i}` : ""))
    const { data } = await supabase.from("media_partners").select("id").eq("tracking_code", code).maybeSingle()
    if (!data) return code
  }
  return buildMediaPartnerTrackingCode(`${companyName}-${randomUUID().slice(0, 6)}`)
}
