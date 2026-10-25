"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

const routeMap: Record<string, string> = {
  admin: "Accueil",
  dashboard: "Cockpit",
  leads: "Leads",
  installateurs: "Installateurs",
  applications: "Candidatures",
  partners: "Installateurs",
  "media-partners": "Apporteurs d'affaires",
  marketplace: "Marketplace",
  finance: "Finances & Virements",
  disputes: "Litiges & Qualité",
  audit: "Journal d'audit",
  logs: "Logs d'audit",
  settings: "Paramètres",
}

export function AdminBreadcrumbs() {
  const pathname = usePathname()
  const paths = pathname.split("/").filter(Boolean)

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground">
      <Link
        href="/admin/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join("/")}`
        const isLast = index === paths.length - 1
        const label = routeMap[path] || path

        if (path === "admin") return null

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 opacity-50" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors capitalize"
              >
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
