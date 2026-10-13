"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"

const HIDDEN_PREFIXES = [
  "/admin",
  "/devis-panneaux-solaires",
  "/partenaires/dashboard",
]

export function SiteHeader() {
  const pathname = usePathname()

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  return (
    <>
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[110] -translate-x-[200%] rounded bg-primary px-3 py-2.5 text-sm text-primary-foreground transition-transform focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [margin-left:env(safe-area-inset-left)] [margin-top:env(safe-area-inset-top)]"
      >
        Aller au contenu principal
      </a>
      <Header />
    </>
  )
}
