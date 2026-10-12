"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, FileText, ExternalLink, ScrollText, Megaphone, Building2, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminLogoutButton } from "@/components/admin-logout-button"
import { AdminCommandMenu } from "@/components/admin-command-menu"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type NavGroup = {
  title?: string
  items: {
    href: string
    label: string
    icon: any
    badgeCount?: number
  }[]
}

export function AdminNav({ 
  pendingApplications = 0, 
  pendingMedia = 0,
  needsReview = 0,
  pendingCreditOrders = 0,
}: { 
  pendingApplications?: number
  pendingMedia?: number
  needsReview?: number
  pendingCreditOrders?: number
}) {
  const pathname = usePathname()

  const navGroups: NavGroup[] = [
    {
      title: "Opérations",
      items: [
        { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/admin/leads", label: "Contrôle des Leads", icon: FileText, badgeCount: needsReview },
      ]
    },
    {
      title: "Réseau Installateurs",
      items: [
        { href: "/admin/installateurs", label: "Installateurs", icon: Users },
        { href: "/admin/applications", label: "Candidatures", icon: ClipboardCheck, badgeCount: pendingApplications },
        { href: "/admin/partners", label: "Marketplace & Crédits", icon: Building2, badgeCount: pendingCreditOrders },
      ]
    },
    {
      title: "Marketing & Ventes",
      items: [
        { href: "/admin/media-partners", label: "Apporteurs d'affaires", icon: Megaphone, badgeCount: pendingMedia },
      ]
    },
    {
      title: "Système",
      items: [
        { href: "/admin/audit", label: "Logs d'audit", icon: ScrollText },
      ]
    }
  ]

  return (
    <>
      <div className="flex h-14 items-center gap-3 border-b border-border px-4 md:h-16">
        <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-3 font-semibold text-foreground">
          <span className="relative h-8 w-8 shrink-0 md:h-9 md:w-9">
            <Image
              src="/logo-square.png"
              alt=""
              fill
              className="object-contain"
              sizes="36px"
            />
          </span>
          <span className="truncate">Aegis Admin</span>
        </Link>
      </div>
      <div className="p-3 pb-0">
        <AdminCommandMenu />
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {navGroups.map((group, i) => (
          <div key={i} className="space-y-1">
            {group.title && (
              <h4 className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.title}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon, badgeCount }) => {
                const isActive = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href))
                return (
                  <Link key={href} href={href} className="block w-full">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 px-3 h-10 transition-all duration-200",
                        isActive && "bg-primary/10 text-primary font-medium shadow-sm ring-1 ring-inset ring-primary/20",
                        !isActive && "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-primary" : "text-muted-foreground/70")} />
                      <span className="flex-1 text-left text-sm truncate">{label}</span>
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/20">
                          {badgeCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-1 border-t border-border p-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Voir le site
        </a>
        <AdminLogoutButton />
      </div>
    </>
  )
}
