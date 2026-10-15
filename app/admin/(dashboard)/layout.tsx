import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin-nav"
import { AdminHeader } from "@/components/admin-header"
import { getAdminDashboardData } from "@/lib/admin/queries"

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

  let badges = {
    pending_installer_apps: 0,
    pending_media_apps: 0,
    pending_review_leads: 0,
    pending_credit_orders: 0,
  }

  try {
    const data = await getAdminDashboardData()
    if (data?.badges) {
      badges = {
        pending_installer_apps: data.badges.pending_installer_apps ?? 0,
        pending_media_apps: data.badges.pending_media_apps ?? 0,
        pending_review_leads: data.badges.pending_review_leads ?? 0,
        pending_credit_orders: data.badges.pending_credit_orders ?? 0,
      }
    }
  } catch (err) {
    console.error("[admin-layout] Error getting dashboard badges:", err)
  }

  const {
    pending_installer_apps: installAppsCount,
    pending_media_apps: mediaAppsCount,
    pending_review_leads: needsReviewCount,
    pending_credit_orders: pendingOrdersCount,
  } = badges

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 shadow-xs border-r border-slate-200 bg-white">
        <AdminNav 
          pendingApplications={installAppsCount} 
          pendingMedia={mediaAppsCount}
          needsReview={needsReviewCount}
          pendingCreditOrders={pendingOrdersCount}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col min-w-0 md:pl-64 min-h-screen">
        {/* Sticky Header with Breadcrumbs & Mobile Nav */}
        <AdminHeader
          pendingApplications={installAppsCount}
          pendingMedia={mediaAppsCount}
          needsReview={needsReviewCount}
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
