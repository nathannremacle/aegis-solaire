import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { DisputesClient, type DisputeItem } from "./disputes-client"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Litiges & Garantie Qualité 48h | Aegis Solaire Admin",
  description: "Arbitrage des contestations de leads installateurs et gestion des garanties contractuelles",
}

export default async function AdminDisputesPage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()

  // Charger les contestations récentes
  const { data: disputesData } = await supabase
    .from("lead_disputes")
    .select(`
      id,
      purchase_id,
      lead_id,
      partner_id,
      reason,
      details,
      status,
      admin_notes,
      credits_refunded,
      created_at,
      resolved_at,
      partners (
        id,
        company_name,
        email,
        phone
      ),
      leads (
        id,
        first_name,
        last_name,
        company,
        segment,
        province,
        surface_type,
        surface_area
      ),
      lead_purchases (
        credits_spent,
        purchased_at
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  const initialDisputes: DisputeItem[] = ((disputesData as any) ?? []).map((d: any) => ({
    id: d.id,
    purchase_id: d.purchase_id,
    lead_id: d.lead_id,
    partner_id: d.partner_id,
    reason: d.reason,
    details: d.details || "",
    status: d.status,
    admin_notes: d.admin_notes,
    credits_refunded: d.credits_refunded || 0,
    created_at: d.created_at,
    resolved_at: d.resolved_at,
    partners: d.partners || null,
    leads: d.leads || null,
    lead_purchases: d.lead_purchases || null,
  }))

  return (
    <DisputesClient
      initialDisputes={initialDisputes}
      adminEmail={user.email}
    />
  )
}
