import { redirect } from "next/navigation"
import Link from "next/link"
import { getAdminUser } from "@/lib/admin-auth"
import { LayoutDashboard, Users, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminLogoutButton } from "@/components/admin-logout-button"

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
      <aside className="w-full border-b border-border bg-card md:w-56 md:border-b-0 md:border-r">
        <div className="flex h-14 items-center border-b border-border px-4 md:h-16">
          <Link href="/admin/dashboard" className="font-semibold text-foreground">
            Aegis Admin
          </Link>
        </div>
        <nav className="flex flex-row gap-1 p-2 md:flex-col">
          <Link href="/admin/dashboard">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Tableau de bord
            </Button>
          </Link>
          <Link href="/admin/leads">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              Leads
            </Button>
          </Link>
          <Link href="/admin/installateurs">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Users className="h-4 w-4" />
              Installateurs
            </Button>
          </Link>
        </nav>
        <div className="mt-auto border-t border-border p-2">
          <AdminLogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
