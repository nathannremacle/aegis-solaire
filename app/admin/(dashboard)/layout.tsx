import { redirect } from "next/navigation"
import { getAdminUser, getAdminProfile } from "@/lib/admin-auth"
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

  const adminProfile = getAdminProfile(user.email)

  let badges = {
    pending_installer_apps: 0,
    pending_media_apps: 0,
    pending_review_leads: 0,
    pending_credit_orders: 0,
    pending_disputes: 0,
  }

  try {
    const data = await getAdminDashboardData()
    if (data?.badges) {
      badges = {
        pending_installer_apps: data.badges.pending_installer_apps ?? 0,
        pending_media_apps: data.badges.pending_media_apps ?? 0,
        pending_review_leads: data.badges.pending_review_leads ?? 0,
        pending_credit_orders: data.badges.pending_credit_orders ?? 0,
        pending_disputes: data.badges.pending_disputes ?? 0,
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
    pending_disputes: pendingDisputesCount,
  } = badges

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-border bg-card">
        <AdminNav
          adminProfile={adminProfile}
          pendingApplications={installAppsCount}
          pendingMedia={mediaAppsCount}
          needsReview={needsReviewCount}
          pendingCreditOrders={pendingOrdersCount}
          pendingDisputes={pendingDisputesCount}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col min-w-0 md:pl-60 min-h-screen">
        {/* Sticky Header with Breadcrumbs & Mobile Nav */}
        <AdminHeader
          adminProfile={adminProfile}
          pendingApplications={installAppsCount}
          pendingMedia={mediaAppsCount}
          needsReview={needsReviewCount}
          pendingCreditOrders={pendingOrdersCount}
          pendingDisputes={pendingDisputesCount}
        />

        {/* Page Content: Full-width for dense operational tables */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
