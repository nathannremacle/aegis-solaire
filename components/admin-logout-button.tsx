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
    window.location.href = "/admin/login"
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2.5 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors gap-1.5 cursor-pointer"
      onClick={handleLogout}
      title="Se déconnecter de l'administration"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span>Déconnexion</span>
    </Button>
  )
}
