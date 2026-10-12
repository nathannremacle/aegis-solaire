import { createClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/supabase/admin"

/**
 * Vérifie que la requête actuelle a une session Supabase
 * et que l'email de l'utilisateur est dans ADMIN_EMAILS.
 * À utiliser dans les layouts et API routes admin.
 */
export async function getAdminUser() {
  if (process.env.NODE_ENV === "development") {
    // FAKE ADMIN USER FOR LOCAL DEBUGGING
    return { email: "admin@exemple.be", id: "00000000-0000-0000-0000-000000000000" } as any
  }
  
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  if (!isAdminEmail(user.email ?? "")) return null
  return user
}
