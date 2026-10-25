import { createClient } from "@/lib/supabase/server"
import { isAdminEmail, createServiceRoleClient } from "@/lib/supabase/admin"

/**
 * Vérifie que la requête actuelle a une session Supabase
 * et que l'utilisateur est soit listé dans ADMIN_EMAILS, soit dans public.admin_users.
 * À utiliser dans les layouts et API routes admin.
 */
export async function getAdminUser() {
  if (process.env.NODE_ENV === "development") {
    // FAKE ADMIN USER FOR LOCAL DEBUGGING
    return { email: "admin@exemple.be", id: "00000000-0000-0000-0000-000000000000" } as any
  }
  
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || !user.email) return null

  // 1. Contrôle direct via la variable d'environnement ADMIN_EMAILS
  if (isAdminEmail(user.email)) return user

  // 2. Contrôle de secours en base de données (public.admin_users)
  // Permet d'éviter d'être bloqué si une variable Vercel n'est pas encore rechargée
  try {
    const adminDb = createServiceRoleClient()
    const { data: adminRecord } = await adminDb
      .from("admin_users")
      .select("id")
      .ilike("email", user.email.trim())
      .maybeSingle()

    if (adminRecord) return user
  } catch (err) {
    console.error("[getAdminUser] Fallback DB error:", err)
  }

  return null
}

