"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X, Sun } from "lucide-react"

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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Sun className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">
              Aegis <span className="text-accent">Solaire</span>
            </span>
          </div>
          <span className="hidden text-xs font-normal text-muted-foreground sm:block sm:text-sm">
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

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
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
          <nav className="flex flex-col gap-4 p-4" aria-label="Menu mobile">
            <Link
              href="#preuve"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Preuve
            </Link>
            <Link
              href="#expert"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Expertise
            </Link>
            <Link
              href="#benefits"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Avantages
            </Link>
            <Button onClick={scrollToSimulator} size="sm" className="w-full">
              Lancer ma simulation
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
