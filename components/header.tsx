"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
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
  const isB2C = pathname === "/particuliers"

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
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-[100] w-full border-b border-neutral-200 bg-white/95 shadow-sm backdrop-blur-xl"
    >
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
            className="hidden md:flex h-11 items-center rounded-full border border-neutral-200/90 bg-neutral-100 p-1 shadow-inner"
            role="tablist"
            aria-label="Sélection univers"
            style={{ viewTransitionName: "segment-toggle" }}
          >
            <Link
              href="/"
              role="tab"
              aria-selected={!isB2C}
              className={`relative flex h-full min-w-[130px] lg:min-w-[140px] items-center justify-center rounded-full px-4 lg:px-5 text-sm font-semibold transition-colors duration-200 ${
                !isB2C ? "text-white" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {!isB2C && (
                <motion.div
                  layoutId="segment-pill-desktop"
                  className="absolute inset-0 rounded-full bg-[#001D3D] shadow-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 text-center select-none">Industrie &amp; Pro</span>
            </Link>
            <Link
              href="/particuliers"
              role="tab"
              aria-selected={isB2C}
              className={`relative flex h-full min-w-[130px] lg:min-w-[140px] items-center justify-center rounded-full px-4 lg:px-5 text-sm font-semibold transition-colors duration-200 ${
                isB2C ? "text-white" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {isB2C && (
                <motion.div
                  layoutId="segment-pill-desktop"
                  className="absolute inset-0 rounded-full bg-[#001D3D] shadow-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 text-center select-none">Particuliers</span>
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
              size="sm"
              className="h-10 min-w-[175px] bg-[#001D3D] font-bold text-sm text-white shadow-md hover:bg-[#00152e] hover:shadow-lg transition-all active:scale-[0.98]"
            >
              Lancer ma simulation
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
              <div className="flex h-11 w-full max-w-[320px] items-center rounded-full border border-neutral-200 bg-neutral-100 p-1">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`relative flex h-full flex-1 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    !isB2C ? "text-white" : "text-neutral-500"
                  }`}
                >
                  {!isB2C && (
                    <motion.div
                      layoutId="segment-pill-mobile"
                      className="absolute inset-0 rounded-full bg-[#001D3D]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Industrie &amp; Pro</span>
                </Link>
                <Link
                  href="/particuliers"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`relative flex h-full flex-1 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    isB2C ? "text-white" : "text-neutral-500"
                  }`}
                >
                  {isB2C && (
                    <motion.div
                      layoutId="segment-pill-mobile"
                      className="absolute inset-0 rounded-full bg-[#001D3D]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Particuliers</span>
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
                  size="default"
                  className="w-full h-11 bg-[#001D3D] font-bold text-white hover:bg-[#00152e] shadow-md"
                >
                  Lancer ma simulation
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
