"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, Building2, Home, Calculator, ArrowUpRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

interface NavItem {
  label: string
  href: string
}

const B2B_NAV_ITEMS: NavItem[] = [
  { label: "Preuve", href: "/#preuve" },
  { label: "Expertise", href: "/#expert" },
  { label: "Avantages", href: "/#benefits" },
  { label: "Webinaire", href: "/webinaire" },
]

const B2C_NAV_ITEMS: NavItem[] = [
  { label: "Preuve", href: "/particuliers#preuve" },
  { label: "Expertise", href: "/particuliers#expertise" },
  { label: "Avantages", href: "/particuliers#arguments" },
  { label: "FAQ", href: "/faq-technique" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const [optimisticSegment, setOptimisticSegment] = useState<"b2b" | "b2c" | null>(null)

  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setOptimisticSegment(null)
  }

  const currentSegment = optimisticSegment ?? (pathname === "/particuliers" ? "b2c" : "b2b")
  const isB2C = currentSegment === "b2c"

  const navItems = isB2C ? B2C_NAV_ITEMS : B2B_NAV_ITEMS

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("/#") && pathname === "/") {
      e.preventDefault()
      const targetId = href.replace("/#", "")
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth" })
        window.history.pushState(null, "", href)
      }
    } else if (href.startsWith("/particuliers#") && pathname === "/particuliers") {
      e.preventDefault()
      const targetId = href.replace("/particuliers#", "")
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth" })
        window.history.pushState(null, "", href)
      }
    }
    setMobileMenuOpen(false)
  }

  const scrollToSimulator = () => {
    const targetId = isB2C ? "b2c-simulator" : "simulator"
    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    } else {
      window.location.href = isB2C ? "/particuliers#b2c-simulator" : "/#simulator"
    }
    setMobileMenuOpen(false)
  }

  return (
    <header
      className="sticky top-0 z-[100] w-full border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl"
      style={{ viewTransitionName: "site-header" }}
    >
      {/* Barre de switch mobile & tablette toujours visible */}
      <div className="flex md:hidden items-center justify-between bg-[#001D3D] px-3.5 py-1.5 text-xs text-white">
        <span className="text-[11px] font-medium text-neutral-300">
          Espace : <strong className="text-[#FFB800]">{isB2C ? "Particuliers" : "Industrie & Pro"}</strong>
        </span>
        <div className="flex items-center rounded-full bg-white/10 p-0.5 border border-white/15">
          <Link
            href="/"
            onClick={() => {
              if (!isB2C) return
              setOptimisticSegment("b2b")
            }}
            aria-current={!isB2C ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              !isB2C
                ? "bg-[#FFB800] text-[#001D3D] shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            <Building2 className="h-3 w-3" />
            Pro / B2B
          </Link>
          <Link
            href="/particuliers"
            onClick={() => {
              if (isB2C) return
              setOptimisticSegment("b2c")
            }}
            aria-current={isB2C ? "page" : undefined}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              isB2C
                ? "bg-[#FFB800] text-[#001D3D] shadow-xs"
                : "text-white/80 hover:text-white"
            }`}
          >
            <Home className="h-3 w-3" />
            Particuliers
          </Link>
        </div>
      </div>

      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:min-h-20 sm:py-4 sm:px-6 lg:px-8 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        {/* Left Zone: Logo + Segment Toggle */}
        <div className="flex items-center gap-4 lg:gap-8 shrink-0">
          <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3" aria-label="Aegis Solaire - Accueil">
            <div className="relative h-12 w-44 min-w-0 max-w-[45vw] shrink sm:h-14 sm:w-52 md:h-16 md:w-60">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain object-left"
                priority
                sizes="(max-width: 640px) 180px, 240px"
              />
            </div>
          </Link>

          {/* Segment Toggle – Desktop */}
          <div
            className="hidden md:flex h-11 items-center rounded-full border border-neutral-200/90 bg-neutral-100/90 p-1 shadow-inner backdrop-blur-sm"
            role="tablist"
            aria-label="Sélection univers"
            style={{ viewTransitionName: "segment-toggle" }}
          >
            <Link
              href="/"
              role="tab"
              aria-selected={!isB2C}
              onClick={() => {
                if (!isB2C) return
                setOptimisticSegment("b2b")
              }}
              className={`group relative flex h-full min-w-[138px] lg:min-w-[148px] items-center justify-center rounded-full px-3.5 lg:px-4 text-sm font-semibold transition-colors duration-200 ${
                !isB2C ? "text-white" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {!isB2C && (
                <motion.div
                  layoutId="segment-pill-desktop"
                  className="absolute inset-0 rounded-full bg-[#001D3D] shadow-[0_2px_8px_rgba(0,29,61,0.28),0_1px_2px_rgba(0,29,61,0.18)] border border-white/10"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  style={{ viewTransitionName: "segment-pill" }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5 select-none">
                <Building2
                  className={`h-4 w-4 shrink-0 transition-all duration-200 ${
                    !isB2C ? "text-[#FFB800] scale-105" : "text-neutral-400 group-hover:text-neutral-600"
                  }`}
                />
                <span>Industrie &amp; Pro</span>
              </span>
            </Link>
            <Link
              href="/particuliers"
              role="tab"
              aria-selected={isB2C}
              onClick={() => {
                if (isB2C) return
                setOptimisticSegment("b2c")
              }}
              className={`group relative flex h-full min-w-[138px] lg:min-w-[148px] items-center justify-center rounded-full px-3.5 lg:px-4 text-sm font-semibold transition-colors duration-200 ${
                isB2C ? "text-white" : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {isB2C && (
                <motion.div
                  layoutId="segment-pill-desktop"
                  className="absolute inset-0 rounded-full bg-[#001D3D] shadow-[0_2px_8px_rgba(0,29,61,0.28),0_1px_2px_rgba(0,29,61,0.18)] border border-white/10"
                  transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  style={{ viewTransitionName: "segment-pill" }}
                />
              )}
              <span className="relative z-10 flex items-center justify-center gap-1.5 select-none">
                <Home
                  className={`h-4 w-4 shrink-0 transition-all duration-200 ${
                    isB2C ? "text-[#FFB800] scale-105" : "text-neutral-400 group-hover:text-neutral-600"
                  }`}
                />
                <span>Particuliers</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Right Zone: Navigation Links + Stable CTA */}
        <div className="flex items-center justify-end gap-4 lg:gap-7 flex-1">
          <nav className="hidden items-center gap-1 lg:gap-2 md:flex" aria-label="Navigation principale">
            {navItems.map((item, index) => {
              const isFourth = index === 3
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:text-[#001D3D] hover:bg-neutral-100/70 rounded-lg ${
                    isFourth ? "min-w-[76px] text-center" : ""
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Unified CTA Button */}
          <div className="hidden md:block shrink-0">
            <Button
              onClick={scrollToSimulator}
              variant="accent"
              size="sm"
              className="h-10 min-w-[175px] gap-2 text-xs font-bold sm:text-sm"
            >
              <Calculator className="h-4 w-4" />
              <span>{isB2C ? "Simuler mes économies" : "Audit ROI gratuit"}</span>
              <ArrowUpRight className="hidden sm:inline h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-neutral-100 active:bg-neutral-200 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-neutral-800" />
            ) : (
              <Menu className="h-6 w-6 text-neutral-800" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-neutral-200 bg-white md:hidden shadow-lg"
          >
            {/* Mobile Segment Toggle */}
            <div className="flex justify-center px-4 pt-4 pb-3">
              <div className="flex h-11 w-full max-w-[320px] items-center rounded-full border border-neutral-200 bg-neutral-100 p-1 shadow-inner">
                <Link
                  href="/"
                  onClick={() => {
                    setOptimisticSegment("b2b")
                    setMobileMenuOpen(false)
                  }}
                  className={`group relative flex h-full flex-1 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    !isB2C ? "text-white" : "text-neutral-500"
                  }`}
                >
                  {!isB2C && (
                    <motion.div
                      layoutId="segment-pill-mobile"
                      className="absolute inset-0 rounded-full bg-[#001D3D] shadow-md border border-white/10"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <Building2 className={`h-4 w-4 ${!isB2C ? "text-[#FFB800]" : "text-neutral-400"}`} />
                    <span>Industrie &amp; Pro</span>
                  </span>
                </Link>
                <Link
                  href="/particuliers"
                  onClick={() => {
                    setOptimisticSegment("b2c")
                    setMobileMenuOpen(false)
                  }}
                  className={`group relative flex h-full flex-1 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isB2C ? "text-white" : "text-neutral-500"
                  }`}
                >
                  {isB2C && (
                    <motion.div
                      layoutId="segment-pill-mobile"
                      className="absolute inset-0 rounded-full bg-[#001D3D] shadow-md border border-white/10"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-1.5">
                    <Home className={`h-4 w-4 ${isB2C ? "text-[#FFB800]" : "text-neutral-400"}`} />
                    <span>Particuliers</span>
                  </span>
                </Link>
              </div>
            </div>

            <nav className="flex flex-col border-t border-neutral-100 py-2" aria-label="Menu mobile">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 active:bg-neutral-100"
                >
                  {item.label}
                </Link>
              ))}

              <div className="px-4 py-3 border-t border-neutral-100">
                <Button
                  onClick={scrollToSimulator}
                  variant="accent"
                  size="default"
                  className="w-full h-11 gap-2 font-bold"
                >
                  <Calculator className="h-4 w-4" />
                  <span>{isB2C ? "Simuler mes économies" : "Audit ROI gratuit"}</span>
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
