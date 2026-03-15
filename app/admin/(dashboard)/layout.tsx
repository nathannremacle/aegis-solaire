import { redirect } from "next/navigation"
import { getAdminUser } from "@/lib/admin-auth"
import { AdminNav } from "@/components/admin-nav"

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

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex w-full flex-col border-b border-border bg-card md:w-56 md:border-b-0 md:border-r">
        <AdminNav />
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
