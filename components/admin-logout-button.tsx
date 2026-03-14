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
      className="w-full justify-start gap-2 text-muted-foreground"
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      Déconnexion
    </Button>
  )
}
