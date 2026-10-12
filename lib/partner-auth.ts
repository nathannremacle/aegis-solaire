import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export type PartnerRow = {
  id: string
  company_name: string
  email: string
  phone: string | null
  credits: number
  segment: string | null
  target_provinces: string[] | null
  target_surfaces: string[] | null
  min_facture: number | null
  auth_user_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Server-side only. Returns the authenticated partner or null.
 * Matches by email (primary) or auth_user_id.
 */
export async function getPartner(): Promise<PartnerRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (process.env.NODE_ENV === "development" && (error || !user?.email)) {
    const admin = createServiceRoleClient()
    const { data: firstPartner } = await admin.from("partners").select("*").limit(1).maybeSingle()
    if (firstPartner) return firstPartner as PartnerRow
    return {
      id: "00000000-0000-0000-0000-000000000001",
      company_name: "Installateur Solaire Wallonie SPRL",
      email: "installateur@exemple.be",
      phone: "+32 4 220 00 00",
      credits: 25,
      segment: "ALL",
      target_provinces: ["liege", "namur", "hainaut"],
      target_surfaces: ["toiture", "parking"],
      min_facture: 0,
      auth_user_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  if (error || !user?.email) return null

  const admin = createServiceRoleClient()
  const email = user.email.toLowerCase().trim()

  const { data } = await admin
    .from("partners")
    .select(
      "id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture, auth_user_id, created_at, updated_at"
    )
    .or(`email.eq.${email},auth_user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()

  return (data as PartnerRow) ?? null
}
