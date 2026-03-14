"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToSimulator = () => {
    const element = document.getElementById("simulator")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:min-h-20 sm:py-4 sm:px-6 lg:px-8 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <Link href="/" className="flex min-w-0 shrink items-center gap-3 sm:gap-3">
          <div className="relative h-16 w-60 shrink-0 sm:h-20 sm:w-80">
            <Image
              src="/logo.png"
              alt="Aegis Solaire"
              fill
              className="object-contain object-left"
              priority
              sizes="(max-width: 640px) 240px, 320px"
            />
          </div>
          <span className="hidden shrink-0 text-xs font-normal text-muted-foreground md:block md:text-sm">
            Financement, Rentabilité & Ombrières Pro
          </span>
        </Link>

        {/* Desktop Navigation – MEP: Preuve, Expert, Avantages */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Navigation principale">
          <Link
            href="#preuve"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Preuve
          </Link>
          <Link
            href="#expert"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Expertise
          </Link>
          <Link
            href="#benefits"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Avantages
          </Link>
          <Button onClick={scrollToSimulator} size="sm">
            Lancer ma simulation
          </Button>
        </nav>

        {/* Mobile Menu Button – zone de touch 44px min */}
        <button
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted/80 active:bg-muted md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col py-2" aria-label="Menu mobile">
            <Link
              href="#preuve"
              className="px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Preuve
            </Link>
            <Link
              href="#expert"
              className="px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Expertise
            </Link>
            <Link
              href="#benefits"
              className="px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              Avantages
            </Link>
            <div className="px-4 py-3">
              <Button onClick={scrollToSimulator} size="sm" className="w-full">
                Lancer ma simulation
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
