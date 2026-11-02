import { createClient } from "@/lib/supabase/server"
import { isAdminEmail, createServiceRoleClient } from "@/lib/supabase/admin"

export type AdminProfile = {
  name: string
  initials: string
  role: string
  email: string
}

export function getAdminProfile(email?: string | null): AdminProfile {
  const clean = email?.trim().toLowerCase()
  if (!clean) {
    return {
      name: "Administrateur",
      initials: "AD",
      role: "Admin",
      email: "",
    }
  }

  const primaryAdmin = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  if (primaryAdmin && clean === primaryAdmin) {
    return {
      name: "Direction Technique",
      initials: "DT",
      role: "Super Admin",
      email: clean,
    }
  }

  const partnershipsAdmin = process.env.PARTNERSHIPS_ADMIN_EMAIL?.trim().toLowerCase()
  if (partnershipsAdmin && clean === partnershipsAdmin) {
    return {
      name: "Direction Partenariats",
      initials: "DP",
      role: "Administrateur",
      email: clean,
    }
  }

  return {
    name: "Direction Aegis Solaire",
    initials: "AS",
    role: "Administrateur",
    email: clean,
  }
}

/**
 * Vérifie que la requête actuelle a une session Supabase
 * et que l'utilisateur est soit listé dans ADMIN_EMAILS, soit dans public.admin_users.
 * À utiliser dans les layouts et API routes admin.
 */
export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (!error && user && user.email) {
    // 1. Contrôle direct via la variable d'environnement ADMIN_EMAILS
    if (isAdminEmail(user.email)) return { ...user, email: user.email }

    // 2. Contrôle de secours en base de données (public.admin_users)
    try {
      const adminDb = createServiceRoleClient()
      const { data: adminRecord } = await adminDb
        .from("admin_users")
        .select("id")
        .ilike("email", user.email.trim())
        .maybeSingle()

      if (adminRecord) return { ...user, email: user.email }
    } catch (err) {
      console.error("[getAdminUser] Fallback DB error:", err)
    }
  }

  return null
}
