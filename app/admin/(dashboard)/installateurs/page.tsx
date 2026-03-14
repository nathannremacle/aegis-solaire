import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { InstallateursClient } from "./installateurs-client"

async function getInstallateurs() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("installateurs")
    .select("*")
    .order("name")

  if (error) {
    console.error("Admin installateurs error:", error)
    return []
  }
  return data ?? []
}

export default async function AdminInstallateursPage() {
  const installateurs = await getInstallateurs()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Installateurs partenaires</h1>
      <InstallateursClient initialData={installateurs} />
    </div>
  )
}
