"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ExternalLink, 
  ScrollText, 
  Megaphone, 
  Building2, 
  ClipboardCheck, 
  Coins
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminLogoutButton } from "@/components/admin-logout-button"
import { AdminCommandMenu } from "@/components/admin-command-menu"
import { cn } from "@/lib/utils"

type NavGroup = {
  title?: string
  items: {
    href: string
    label: string
    icon: any
    badgeCount?: number
    badgeVariant?: "red" | "amber" | "blue"
  }[]
}

export function AdminNav({ 
  pendingApplications = 0, 
  pendingMedia = 0,
  needsReview = 0,
  pendingCreditOrders = 0,
  onNavigate,
}: { 
  pendingApplications?: number
  pendingMedia?: number
  needsReview?: number
  pendingCreditOrders?: number
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const navGroups: NavGroup[] = [
    {
      title: "Opérations",
      items: [
        { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
        { 
          href: "/admin/leads", 
          label: "Contrôle des Leads", 
          icon: FileText, 
          badgeCount: needsReview,
          badgeVariant: "red"
        },
      ]
    },
    {
      title: "Réseau Installateurs",
      items: [
        { href: "/admin/installateurs", label: "Installateurs", icon: Users },
        { 
          href: "/admin/applications", 
          label: "Candidatures", 
          icon: ClipboardCheck, 
          badgeCount: pendingApplications,
          badgeVariant: "blue"
        },
        { 
          href: "/admin/partners", 
          label: "Marketplace & Crédits", 
          icon: Coins, 
          badgeCount: pendingCreditOrders,
          badgeVariant: "amber"
        },
      ]
    },
    {
      title: "Marketing & Ventes",
      items: [
        { 
          href: "/admin/media-partners", 
          label: "Apporteurs d'affaires", 
          icon: Megaphone, 
          badgeCount: pendingMedia,
          badgeVariant: "blue"
        },
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
    <div className="flex h-full flex-col bg-white text-slate-800 select-none border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <Link 
          href="/admin/dashboard" 
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <span className="relative h-8 w-8 shrink-0 md:h-9 md:w-9">
            <Image
              src="/logo-square.png"
              alt="Aegis Admin"
              fill
              className="object-contain"
              sizes="36px"
            />
          </span>
          <span className="truncate font-extrabold text-base tracking-tight text-slate-900">
            Aegis Admin
          </span>
        </Link>
      </div>

      {/* System Status Pill */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200/90 px-2.5 py-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-700">Réseau Opérationnel</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">BE · Live</span>
        </div>
      </div>

      {/* Global Command Search */}
      <div className="p-3">
        <AdminCommandMenu />
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-1 custom-scrollbar">
        {navGroups.map((group, i) => (
          <div key={i} className="space-y-1">
            {group.title && (
              <h4 className="px-2 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.title}
              </h4>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon, badgeCount, badgeVariant }) => {
                const isActive = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href))
                
                return (
                  <Link key={href} href={href} onClick={onNavigate} className="block w-full">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 px-2.5 h-9 rounded-lg text-xs transition-all duration-150 font-medium",
                        isActive && "bg-slate-100 text-[#001D3D] font-extrabold border-l-2 border-[#001D3D] pl-2 shadow-2xs",
                        !isActive && "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors", 
                        isActive ? "text-[#001D3D]" : "text-slate-400 group-hover:text-slate-600"
                      )} />
                      <span className="flex-1 text-left truncate">{label}</span>
                      
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className={cn(
                          "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black shadow-2xs",
                          badgeVariant === "amber" && "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse",
                          badgeVariant === "red" && "bg-rose-100 text-rose-800 border border-rose-200",
                          badgeVariant === "blue" && "bg-blue-100 text-blue-800 border border-blue-200",
                          !badgeVariant && "bg-slate-100 text-slate-800"
                        )}>
                          {badgeCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin User Footer */}
      <div className="mt-auto border-t border-slate-200 p-3 space-y-2 bg-slate-50/70">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#001D3D] text-amber-400 font-extrabold text-xs shadow-2xs">
            NR
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">Nathan Remacle</p>
            <p className="text-[10px] text-slate-500 truncate">INIT42 · Super Admin</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            <span>Voir le site</span>
          </a>
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}
