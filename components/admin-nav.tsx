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
  ShieldCheck, 
  Coins, 
  Sparkles,
  Layers,
  ArrowUpRight
} from "lucide-react"
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
      title: "Opérations & Flux",
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
      title: "Gouvernance & Sécurité",
      items: [
        { href: "/admin/audit", label: "Journal d'audit", icon: ScrollText },
      ]
    }
  ]

  return (
    <div className="flex h-full flex-col bg-[#001428] text-slate-200 select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-[#002850]/80 px-4">
        <Link 
          href="/admin/dashboard" 
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-md shadow-amber-500/20 ring-1 ring-white/20">
            <ShieldCheck className="h-5 w-5 text-[#001D3D]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white tracking-tight">AEGIS SOLAIRE</span>
              <span className="rounded bg-amber-400/20 px-1 py-0.2 text-[9px] font-black uppercase text-amber-300 ring-1 ring-amber-400/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">Console Super Admin</p>
          </div>
        </Link>
      </div>

      {/* System Status Pill */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between rounded-lg bg-[#001D3D]/90 border border-[#002d5a] px-2.5 py-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-300">Réseau Opérationnel</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">BE · Live</span>
        </div>
      </div>

      {/* Global Command Search */}
      <div className="p-3">
        <AdminCommandMenu />
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-1 custom-scrollbar">
        {navGroups.map((group, i) => (
          <div key={i} className="space-y-1">
            {group.title && (
              <h4 className="px-2.5 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
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
                        isActive && "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-white font-bold border-l-2 border-amber-400 pl-2 shadow-xs",
                        !isActive && "text-slate-300 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors", 
                        isActive ? "text-amber-400" : "text-slate-400 group-hover:text-slate-200"
                      )} />
                      <span className="flex-1 text-left truncate">{label}</span>
                      
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className={cn(
                          "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-black shadow-xs",
                          badgeVariant === "amber" && "bg-amber-400 text-[#001D3D] ring-1 ring-amber-300/40 animate-pulse",
                          badgeVariant === "red" && "bg-rose-500 text-white ring-1 ring-rose-400/40",
                          badgeVariant === "blue" && "bg-blue-500 text-white ring-1 ring-blue-400/40",
                          !badgeVariant && "bg-amber-400 text-[#001D3D]"
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
      <div className="mt-auto border-t border-[#002850]/80 p-3 space-y-2 bg-[#001020]">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 text-[#001D3D] font-black text-xs shadow-xs">
            NR
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate leading-tight">Nathan Remacle</p>
            <p className="text-[10px] text-slate-400 truncate">INIT42 · Super Admin</p>
          </div>
        </div>

        <div className="flex items-center gap-1 pt-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Voir le site</span>
          </a>
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}
