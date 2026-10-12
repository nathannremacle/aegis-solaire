"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export function AdminLogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2.5 text-[11px] font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-colors gap-1.5"
      onClick={handleLogout}
      title="Se déconnecter de l'administration"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Déconnexion</span>
    </Button>
  )
}
