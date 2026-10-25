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
  if (clean === "fabrice.remacle@gmail.com") {
    return {
      name: "Fabrice Remacle",
      initials: "FR",
      role: "Administrateur",
      email: clean,
    }
  }
  if (clean === "mrnathanrem@gmail.com") {
    return {
      name: "Nathan Remacle",
      initials: "NR",
      role: "Super Admin",
      email: clean,
    }
  }
  if (!clean) {
    return {
      name: "Administrateur",
      initials: "AD",
      role: "Admin",
      email: "",
    }
  }
  const prefix = clean.split("@")[0]
  const parts = prefix.split(/[._-]/).filter(Boolean)
  const name = parts.length >= 2 
    ? parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
    : prefix.charAt(0).toUpperCase() + prefix.slice(1)
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()

  return {
    name,
    initials,
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
  
  if (user && user.email) {
    // 1. Contrôle direct via la variable d'environnement ADMIN_EMAILS
    if (isAdminEmail(user.email)) return user

    // 2. Contrôle de secours en base de données (public.admin_users)
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
  }

  // Fallback dev local uniquement si aucune session réelle n'est connectée
  if (process.env.NODE_ENV === "development") {
    return { email: "mrnathanrem@gmail.com", id: "00000000-0000-0000-0000-000000000000" } as any
  }

  return null
}

