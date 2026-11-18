import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { fetchAdminDisputesWithStats } from "@/lib/admin/disputes-data"
import { DisputesClient } from "./disputes-client"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Litiges & Garantie Lead (SLA 24h)",
  description: "Arbitrage des contestations de leads installateurs et suivi du seuil anti-abus",
}

export default async function AdminDisputesPage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()
  const initialDisputes = await fetchAdminDisputesWithStats(supabase, 100)

  return (
    <DisputesClient
      initialDisputes={initialDisputes}
      adminEmail={user.email}
    />
  )
}
