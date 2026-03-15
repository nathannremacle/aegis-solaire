"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, FileText, ExternalLink, ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminLogoutButton } from "@/components/admin-logout-button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: FileText },
  { href: "/admin/installateurs", label: "Installateurs", icon: Users },
  { href: "/admin/audit", label: "Logs d'audit", icon: ScrollText },
]

export function AdminNav() {
  const pathname = usePathname()

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
      <nav className="flex flex-row gap-1 p-2 md:flex-col">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href))
          return (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          )
        })}
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
