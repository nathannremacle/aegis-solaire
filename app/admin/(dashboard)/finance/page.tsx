import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { getAdminDashboardData } from "@/lib/admin/queries"
import { FinanceClient, type CreditOrder, type FinanceKpis } from "./finance-client"

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Finances & Virements SEPA | Aegis Solaire Admin",
  description: "Contrôle financier, rapprochement bancaire SEPA et validation des packs de crédits",
}

export default async function AdminFinancePage() {
  const user = await getAdminUser()
  if (!user) redirect("/admin/login")

  const supabase = createServiceRoleClient()

  // 1. Charger les commandes de crédits avec le profil partenaire associé
  const { data: ordersData } = await supabase
    .from("credit_orders")
    .select(`
      id,
      partner_id,
      pack_id,
      pack_name,
      credits,
      price_htva,
      vat_amount,
      price_ttc,
      transfer_reference,
      status,
      created_at,
      validated_at,
      notes,
      payment_provider,
      payment_id,
      checkout_url,
      partners (
        id,
        company_name,
        email,
        phone,
        credits
      )
    `)
    .order("created_at", { ascending: false })
    .limit(150)

  // 2. Charger les KPIs financiers
  const dashboardData = await getAdminDashboardData()

  const kpis: FinanceKpis = {
    paid_htva_month: dashboardData.revenue.paid_htva_month ?? 0,
    paid_ttc_month: (dashboardData.revenue.paid_htva_month ?? 0) * 1.21,
    pending_orders_count: dashboardData.revenue.pending_orders_count ?? 0,
    pending_htva: dashboardData.revenue.pending_htva ?? 0,
    pending_ttc: dashboardData.revenue.pending_ttc ?? 0,
    paid_htva_total: dashboardData.revenue.paid_htva_total ?? 0,
    total_partner_credits_balance: dashboardData.partners.total_partner_credits_balance ?? 0,
  }

  const initialOrders: CreditOrder[] = ((ordersData as any) ?? []).map((o: any) => ({
    id: o.id,
    partner_id: o.partner_id,
    pack_id: o.pack_id,
    pack_name: o.pack_name || `Pack ${o.credits} crédits`,
    credits: o.credits,
    price_htva: Number(o.price_htva) || 0,
    vat_amount: Number(o.vat_amount) || 0,
    price_ttc: Number(o.price_ttc) || 0,
    transfer_reference: o.transfer_reference || `ORDER-${o.id.slice(0, 8)}`,
    status: o.status,
    created_at: o.created_at,
    validated_at: o.validated_at,
    notes: o.notes,
    payment_provider: o.payment_provider || "bank_transfer",
    payment_id: o.payment_id || null,
    checkout_url: o.checkout_url || null,
    partners: o.partners || null,
  }))

  return (
    <FinanceClient
      initialOrders={initialOrders}
      kpis={kpis}
      adminEmail={user.email}
    />
  )
}
