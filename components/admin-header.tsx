"use client"

import * as React from "react"
import { Menu, Search, Shield, Bell, CheckCircle2, UserCheck } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs"
import { AdminNav } from "@/components/admin-nav"

export function AdminHeader({
  pendingApplications,
  pendingMedia,
  needsReview,
  pendingCreditOrders,
}: {
  pendingApplications: number
  pendingMedia: number
  needsReview: number
  pendingCreditOrders: number
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const totalAlerts = (pendingCreditOrders > 0 ? 1 : 0) + (needsReview > 0 ? 1 : 0) + (pendingApplications > 0 ? 1 : 0)

  // Current formatted date in French
  const todayStr = new Intl.DateTimeFormat("fr-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-2xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu sheet */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-700 hover:bg-slate-100">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-0 bg-white">
              <SheetTitle className="sr-only">Menu de navigation administrateur</SheetTitle>
              <AdminNav
                pendingApplications={pendingApplications}
                pendingMedia={pendingMedia}
                needsReview={needsReview}
                pendingCreditOrders={pendingCreditOrders}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center">
          <AdminBreadcrumbs />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Date pill (desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-100/80 border border-slate-200 px-3 py-1 text-xs text-slate-600 font-medium capitalize">
          <span>{todayStr}</span>
        </div>

        {/* Live system status */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] text-emerald-800 font-semibold shadow-2xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <span>Système Live</span>
        </div>

        {/* Admin profile chip */}
        <div className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-slate-50/80 p-1 pr-3 shadow-2xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#001D3D] text-[11px] font-black text-amber-400 ring-2 ring-amber-400/30">
            NR
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">Nathan R.</p>
            <p className="text-[10px] text-slate-500 leading-none">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  )
}
