"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

export type AdminBadges = {
  pending_installer_apps: number
  pending_media_apps: number
  pending_review_leads: number
  pending_credit_orders: number
  pending_disputes: number
}

const defaultBadges: AdminBadges = {
  pending_installer_apps: 0,
  pending_media_apps: 0,
  pending_review_leads: 0,
  pending_credit_orders: 0,
  pending_disputes: 0,
}

const AdminBadgesContext = React.createContext<{
  badges: AdminBadges
  refreshBadges: () => Promise<void>
}>({
  badges: defaultBadges,
  refreshBadges: async () => {},
})

export const REFRESH_ADMIN_BADGES_EVENT = "admin:badges-refresh"

export function triggerAdminBadgesRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(REFRESH_ADMIN_BADGES_EVENT))
  }
}

export function AdminBadgesProvider({
  initialBadges,
  children,
}: {
  initialBadges: AdminBadges
  children: React.ReactNode
}) {
  const [badges, setBadges] = React.useState<AdminBadges>(initialBadges)
  const pathname = usePathname()

  // Mettre à jour si initialBadges change (ex: suite à un SSR fresh)
  React.useEffect(() => {
    setBadges(initialBadges)
  }, [initialBadges])

  const refreshBadges = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/badges", {
        headers: { "x-admin-request": "true" },
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        setBadges({
          pending_installer_apps: Number(data.pending_installer_apps ?? 0),
          pending_media_apps: Number(data.pending_media_apps ?? 0),
          pending_review_leads: Number(data.pending_review_leads ?? 0),
          pending_credit_orders: Number(data.pending_credit_orders ?? 0),
          pending_disputes: Number(data.pending_disputes ?? 0),
        })
      }
    } catch {
      // Échec silencieux
    }
  }, [])

  // 1. Rafraîchir à chaque navigation dans l'admin
  React.useEffect(() => {
    refreshBadges()
  }, [pathname, refreshBadges])

  // 2. Écouter les événements de mutation (suppression lead, validation litige, etc.)
  React.useEffect(() => {
    const handleEvent = () => {
      refreshBadges()
    }
    window.addEventListener(REFRESH_ADMIN_BADGES_EVENT, handleEvent)
    return () => {
      window.removeEventListener(REFRESH_ADMIN_BADGES_EVENT, handleEvent)
    }
  }, [refreshBadges])

  return (
    <AdminBadgesContext.Provider value={{ badges, refreshBadges }}>
      {children}
    </AdminBadgesContext.Provider>
  )
}

export function useAdminBadges() {
  return React.useContext(AdminBadgesContext)
}
