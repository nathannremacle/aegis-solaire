"use client"

import * as React from "react"
import { Menu, AlertTriangle } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs"
import { AdminNav } from "@/components/admin-nav"

export function AdminHeader({
  pendingApplications,
  pendingMedia,
  needsReview,
  pendingCreditOrders,
  pendingDisputes = 0,
}: {
  pendingApplications: number
  pendingMedia: number
  needsReview: number
  pendingCreditOrders: number
  pendingDisputes?: number
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const totalSlaAlerts = (pendingCreditOrders > 0 ? 1 : 0) + (needsReview > 0 ? 1 : 0) + (pendingDisputes > 0 ? 1 : 0)

  // Current formatted date in French (Wallonie/Belgique)
  const todayStr = new Intl.DateTimeFormat("fr-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date())

  return (
    <header className="sticky top-0 z-20 flex h-12 w-full items-center justify-between border-b border-border bg-card/95 px-4 sm:px-6 backdrop-blur-xs">
      <div className="flex items-center gap-3">
        {/* Mobile menu sheet */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-secondary">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0 bg-card">
              <SheetTitle className="sr-only">Menu de navigation administrateur</SheetTitle>
              <AdminNav
                pendingApplications={pendingApplications}
                pendingMedia={pendingMedia}
                needsReview={needsReview}
                pendingCreditOrders={pendingCreditOrders}
                pendingDisputes={pendingDisputes}
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

      {/* Right operational controls */}
      <div className="flex items-center gap-3">
        {/* SLA Alert Chip if pending urgent items */}
        {totalSlaAlerts > 0 && (
          <a
            href="/admin/dashboard"
            title={`${needsReview + pendingCreditOrders + pendingDisputes} actions soumises au SLA 24h : ${needsReview} lead(s) à trier, ${pendingCreditOrders} virement(s) SEPA, ${pendingDisputes} litige(s)`}
            className="inline-flex items-center gap-1.5 rounded-sm bg-destructive/10 border border-destructive/25 px-2 py-0.5 text-xs font-mono font-medium text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
          >
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span className="font-mono tabular-nums">{needsReview + pendingCreditOrders + pendingDisputes} urgences SLA</span>
          </a>
        )}

        {/* Date pill (desktop) */}
        <div className="hidden lg:flex items-center rounded-sm bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground capitalize">
          <span>{todayStr}</span>
        </div>

        {/* Live system status */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-sm bg-secondary border border-border px-2 py-0.5 text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-chart-3" />
          <span className="font-mono text-muted-foreground">Live</span>
        </div>

        {/* Admin profile chip */}
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1">
          <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-[10px] font-mono font-semibold text-primary-foreground">
            NR
          </div>
          <span className="hidden sm:inline font-mono text-xs font-medium text-foreground">Admin</span>
        </div>
      </div>
    </header>
  )
}
