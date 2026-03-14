import { createClient } from "@supabase/supabase-js"

/**
 * Client Supabase avec la clé SERVICE ROLE.
 * À utiliser UNIQUEMENT côté serveur (API routes, Server Actions).
 * Ne jamais exposer ce client au navigateur.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour l'admin.")
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

const ADMIN_EMAILS_KEY = "ADMIN_EMAILS"

/** Liste des emails autorisés à accéder au panel admin (séparés par des virgules). */
export function getAdminEmails(): string[] {
  const raw = process.env[ADMIN_EMAILS_KEY]
  if (!raw || typeof raw !== "string") return []
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.trim().toLowerCase())
}
