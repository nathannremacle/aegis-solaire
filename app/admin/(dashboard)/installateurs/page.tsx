import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { InstallateursClient } from "./installateurs-client"

async function getInstallateurs() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const [{ data }, { data: leads }] = await Promise.all([
    supabase.from("installateurs").select("*").order("name"),
    supabase.from("leads").select("id, installateur_id, status, updated_at, created_at").not("installateur_id", "is", null)
  ])

  if (!data) return []

  return data.map((inst: any) => {
    const instLeads = leads?.filter(l => l.installateur_id === inst.id) || []
    const lastLead = instLeads.sort((a,b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0]

    return {
      ...inst,
      leads_count: instLeads.length,
      converted_count: instLeads.filter(l => l.status === "converted").length,
      last_activity: lastLead ? (lastLead.updated_at || lastLead.created_at) : null
    }
  })
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
