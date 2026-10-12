import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 shadow-xs border-r border-slate-200 bg-white">
        <AdminNav 
          pendingApplications={installAppsCount ?? 0} 
          pendingMedia={mediaAppsCount ?? 0}
          needsReview={needsReviewCount ?? 0}
          pendingCreditOrders={pendingOrdersCount}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col min-w-0 md:pl-64 min-h-screen">
        {/* Sticky Header with Breadcrumbs & Mobile Nav */}
        <AdminHeader
          pendingApplications={installAppsCount ?? 0}
          pendingMedia={mediaAppsCount ?? 0}
          needsReview={needsReviewCount ?? 0}
          pendingCreditOrders={pendingOrdersCount}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
