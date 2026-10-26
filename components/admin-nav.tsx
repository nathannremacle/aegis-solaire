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
  ClipboardCheck,
  Coins,
  ShieldAlert,
  Flame,
  SendHorizonal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminLogoutButton } from "@/components/admin-logout-button"
import { AdminCommandMenu } from "@/components/admin-command-menu"
import { cn } from "@/lib/utils"
import type { AdminProfile } from "@/lib/admin-auth"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeCount?: number
  badgeVariant?: "destructive" | "accent" | "neutral"
}

type NavGroup = {
  title?: string
  items: NavItem[]
}

export function AdminNav({
  adminProfile,
  pendingApplications = 0,
  pendingMedia = 0,
  needsReview = 0,
  pendingCreditOrders = 0,
  pendingDisputes = 0,
  onNavigate,
}: {
  adminProfile?: AdminProfile
  pendingApplications?: number
  pendingMedia?: number
  needsReview?: number
  pendingCreditOrders?: number
  pendingDisputes?: number
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const navGroups: NavGroup[] = [
    {
      title: "Opérations",
      items: [
        {
          href: "/admin/dashboard",
          label: "Cockpit",
          icon: LayoutDashboard,
        },
        {
          href: "/admin/leads?view=triage",
          label: "Triage des Leads",
          icon: Flame,
          badgeCount: needsReview,
          badgeVariant: needsReview > 0 ? "destructive" : "neutral",
        },
        {
          href: "/admin/leads",
          label: "Pipeline Leads",
          icon: FileText,
        },
        {
          href: "/admin/disputes",
          label: "Litiges & Qualité",
          icon: ShieldAlert,
          badgeCount: pendingDisputes,
          badgeVariant: pendingDisputes > 0 ? "destructive" : "neutral",
        },
        {
          href: "/admin/relances",
          label: "Relances Mails",
          icon: SendHorizonal,
        },
      ],
    },
    {
      title: "Réseau Installateurs",
      items: [
        {
          href: "/admin/partners",
          label: "Installateurs",
          icon: Users,
        },
        {
          href: "/admin/applications",
          label: "Candidatures",
          icon: ClipboardCheck,
          badgeCount: pendingApplications,
          badgeVariant: "neutral",
        },
        {
          href: "/admin/media-partners",
          label: "Apporteurs d'affaires",
          icon: Megaphone,
          badgeCount: pendingMedia,
          badgeVariant: "neutral",
        },
      ],
    },
    {
      title: "Finances & Système",
      items: [
        {
          href: "/admin/finance",
          label: "Finances & Virements",
          icon: Coins,
          badgeCount: pendingCreditOrders,
          badgeVariant: pendingCreditOrders > 0 ? "accent" : "neutral",
        },
        {
          href: "/admin/audit",
          label: "Journal d'audit",
          icon: ScrollText,
        },
      ],
    },
  ]

  return (
    <div className="flex h-full flex-col bg-card text-foreground select-none border-r border-border">
      {/* Brand Header */}
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Link
          href="/admin/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <span className="relative h-8 w-8 shrink-0">
            <Image
              src="/logo-square.png"
              alt="Aegis Admin"
              fill
              className="object-contain"
              sizes="32px"
            />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="truncate font-heading text-sm font-semibold tracking-tight text-foreground">
              Aegis Ops
            </span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Administration Wallonie
            </span>
          </div>
        </Link>
      </div>

      {/* System Status Indicator */}
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between rounded-md bg-secondary/50 border border-border px-2.5 py-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-chart-3" />
            <span className="font-medium text-foreground">Réseau Opérationnel</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">BE · Live</span>
        </div>
      </div>

      {/* Global Command Search */}
      <div className="p-3">
        <AdminCommandMenu />
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-5">
        {navGroups.map((group, i) => (
          <div key={i} className="flex flex-col gap-1">
            {group.title && (
              <h2 className="px-2 pb-1 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.title}
              </h2>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ href, label, icon: Icon, badgeCount, badgeVariant }) => {
                const isExactLead = href === "/admin/leads" && pathname === "/admin/leads"
                const isTriage = href.includes("view=triage") && pathname === "/admin/leads"
                const isActive =
                  pathname === href ||
                  (href !== "/admin/dashboard" && !href.includes("?") && pathname.startsWith(href)) ||
                  (href === "/admin/partners" && pathname.startsWith("/admin/installateurs"))

                return (
                  <Link key={href} href={href} onClick={onNavigate} className="block w-full">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2.5 px-2.5 h-8 rounded-md text-xs transition-colors font-medium",
                        isActive && "bg-secondary text-foreground font-semibold border-l-2 border-primary pl-2 shadow-2xs",
                        !isActive && "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="flex-1 text-left truncate">{label}</span>

                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span
                          className={cn(
                            "ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-medium tabular-nums border",
                            badgeVariant === "destructive" && "bg-destructive text-destructive-foreground border-destructive",
                            badgeVariant === "accent" && "bg-accent/15 text-accent border-accent/30",
                            badgeVariant === "neutral" && "bg-secondary text-secondary-foreground border-border"
                          )}
                        >
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
      <div className="mt-auto border-t border-border p-3 flex flex-col gap-2 bg-secondary/30">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-card border border-border">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-semibold">
            {adminProfile?.initials || "AD"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate leading-tight">
              {adminProfile?.name || "Administrateur"}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground truncate">
              {adminProfile?.role || "Admin"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
            <span>Voir le site</span>
          </a>
          <AdminLogoutButton />
        </div>
      </div>
    </div>
  )
}
