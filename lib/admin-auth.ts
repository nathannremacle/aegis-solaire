import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/supabase/admin"

/**
 * Vérifie que la requête actuelle a une session Supabase
 * et que l'email de l'utilisateur est dans ADMIN_EMAILS.
 * À utiliser dans les layouts et API routes admin.
 */
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  if (!isAdminEmail(user.email ?? "")) return null
  return user
}
