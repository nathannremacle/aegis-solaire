import { cookies, headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { verifyPartnerUnsubscribeToken } from "@/lib/partner-notification-tokens"

export const PARTNER_EXPRESS_COOKIE_NAME = "aegis_partner_express"
const PARTNER_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

const PARTNER_SELECT_COLUMNS =
  "id, company_name, email, phone, credits, segment, target_provinces, target_surfaces, min_facture, auth_user_id, created_at, updated_at"

async function resolvePartnerFromExpressToken(
  rawTokenValue: string | undefined | null
): Promise<PartnerRow | null> {
  if (!rawTokenValue || typeof rawTokenValue !== "string") return null
  const dotIdx = rawTokenValue.indexOf(".")
  if (dotIdx <= 0) return null

  const partnerId = rawTokenValue.slice(0, dotIdx).trim()
  const token = rawTokenValue.slice(dotIdx + 1).trim()
  if (!PARTNER_UUID_REGEX.test(partnerId) || !token) return null

  const admin = createServiceRoleClient()
  const { data } = await admin
    .from("partners")
    .select(PARTNER_SELECT_COLUMNS)
    .eq("id", partnerId)
    .maybeSingle()

  if (!data) return null
  if (!verifyPartnerUnsubscribeToken(data.id, token, data.email)) return null

  return data as PartnerRow
}

/**
 * Server-side only. Returns the authenticated partner or null.
 * Prioritizes verified express HMAC token from email deep-links, then Supabase session, then express cookie.
 */
export async function getPartner(): Promise<PartnerRow | null> {
  try {
    const headerStore = await headers()
    const headerExpress = headerStore.get("x-aegis-express-partner")
    if (headerExpress) {
      const expressPartner = await resolvePartnerFromExpressToken(headerExpress)
      if (expressPartner) return expressPartner
    }
  } catch {
    // headers() indisponible hors contexte requête HTTP
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!error && user?.email) {
    const admin = createServiceRoleClient()
    const email = user.email.toLowerCase().trim()

    const { data } = await admin
      .from("partners")
      .select(PARTNER_SELECT_COLUMNS)
      .or(`email.eq.${email},auth_user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle()

    if (data) {
      return data as PartnerRow
    }
  }

  try {
    const cookieStore = await cookies()
    const cookieExpress = cookieStore.get(PARTNER_EXPRESS_COOKIE_NAME)?.value
    if (cookieExpress) {
      const expressPartner = await resolvePartnerFromExpressToken(cookieExpress)
      if (expressPartner) return expressPartner
    }
  } catch {
    // cookies() indisponible hors contexte requête HTTP
  }

  return null
}
