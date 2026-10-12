import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin-nav"
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs"
import { createServiceRoleClient } from "@/lib/supabase/admin"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  try {
    user = await getAdminUser()
  } catch {
    redirect("/admin/login")
  }
  if (!user) {
    redirect("/admin/login")
  }

  const supabase = createServiceRoleClient()
  const [
    { count: installAppsCount },
    { count: mediaAppsCount },
    { count: needsReviewCount },
    creditOrdersRes,
  ] = await Promise.all([
    supabase.from("installer_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("media_partner_applications").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "NEEDS_HUMAN_REVIEW"),
    Promise.resolve(
      supabase.from("credit_orders").select("*", { count: "exact", head: true }).eq("status", "pending")
    ).catch(() => ({ count: 0, data: null, error: null })),
  ])

  const pendingOrdersCount = creditOrdersRes?.count ?? 0

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex w-full flex-col border-b border-border bg-card md:w-56 md:border-b-0 md:border-r">
        <AdminNav 
          pendingApplications={installAppsCount ?? 0} 
          pendingMedia={mediaAppsCount ?? 0}
          needsReview={needsReviewCount ?? 0}
          pendingCreditOrders={pendingOrdersCount}
        />
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <AdminBreadcrumbs />
        {children}
      </main>
    </div>
  )
}
