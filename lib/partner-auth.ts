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
