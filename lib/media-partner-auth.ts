import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export type MediaPartnerRow = {
  id: string
  name: string
  email: string
  tracking_code: string
  commission_b2b: number
  commission_b2c: number
  status: string
  created_at: string
  updated_at: string
}

/**
 * Vérifie que la requête actuelle a une session Supabase
 * et que l'email correspond à un media_partner actif.
 */
export async function getMediaPartner(): Promise<MediaPartnerRow | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user?.email) return null

  const admin = createServiceRoleClient()
  const { data } = await admin
    .from("media_partners")
    .select("id, name, email, tracking_code, commission_b2b, commission_b2c, status, created_at, updated_at")
    .eq("email", user.email.toLowerCase().trim())
    .eq("status", "active")
    .single()

  return (data as MediaPartnerRow) ?? null
}
