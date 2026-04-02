"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { motion } from "framer-motion"
import { usePathname } from "next/navigation"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const isB2C = pathname === "/particuliers"

  const scrollToSimulator = () => {
    const el = isB2C
      ? document.getElementById("b2c-simulator")
      : document.getElementById("simulator")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
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
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:min-h-20 sm:py-4 sm:px-6 lg:px-8 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        {/* Left Side: Logo + Toggle */}
        <div className="flex flex-1 items-center justify-start gap-8 lg:gap-12">
          <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
            <div className="relative h-12 w-48 min-w-0 max-w-[45vw] shrink sm:h-16 sm:w-60 sm:max-w-none md:h-20 md:w-72">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain object-left"
                priority
                sizes="(max-width: 640px) 240px, 320px"
              />
            </div>
          </Link>

          {/* Segment Toggle – Desktop (Left Aligned for Space) */}
          <div
            className="hidden md:flex h-11 items-center rounded-full border border-neutral-200 bg-neutral-100 p-1 shadow-sm"
            style={{ viewTransitionName: "segment-toggle" }}
          >
            <Link
              href="/"
              className={`relative flex h-full min-w-[140px] items-center justify-center rounded-full px-5 text-sm font-semibold transition-all duration-300 ${
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
              <span className="relative z-10 text-center">Industrie & Pro</span>
            </Link>
            <Link
              href="/particuliers"
              className={`relative flex h-full min-w-[140px] items-center justify-center rounded-full px-5 text-sm font-semibold transition-all duration-300 ${
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
              <span className="relative z-10 text-center">Particuliers</span>
            </Link>
          </div>
        </div>

        {/* Right Side: Navigation */}
        <div className="flex flex-1 justify-end">
          <nav className="hidden items-center gap-5 md:flex" aria-label="Navigation principale">
            {!isB2C ? (
              <>
                <Link href="/#preuve" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#001D3D]">
                  Preuve
                </Link>
                <Link href="/#expert" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#001D3D]">
                  Expertise
                </Link>
                <Link href="/#benefits" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#001D3D]">
                  Avantages
                </Link>
                <Link href="/webinaire" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#001D3D]">
                  Webinaire
                </Link>
              </>
            ) : (
              <>
                <Link href="/particuliers#b2c-simulator" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#001D3D]">
                  Simulateur
                </Link>
                <Link href="/particuliers#arguments" className="text-sm font-medium text-neutral-600 transition-colors hover:text-[#001D3D]">
                  Avantages
                </Link>
              </>
            )}
            <Button
              onClick={scrollToSimulator}
              size="sm"
              className="bg-[#001D3D] font-bold text-white shadow-md hover:bg-[#00152e] transition-all"
            >
              {isB2C ? "Mon estimation gratuite" : "Lancer ma simulation"}
            </Button>
          </nav>

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
      {mobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-white md:hidden">
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
                <span className="relative z-10">Pro & Industrie</span>
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
            {!isB2C ? (
              <>
                <Link href="/#preuve" className="px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  Preuve
                </Link>
                <Link href="/#expert" className="px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  Expertise
                </Link>
                <Link href="/#benefits" className="px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  Avantages
                </Link>
                <Link href="/webinaire" className="px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  Webinaire
                </Link>
              </>
            ) : (
              <>
                <Link href="/particuliers#b2c-simulator" className="px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  Simulateur
                </Link>
                <Link href="/particuliers#arguments" className="px-5 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900" onClick={() => setMobileMenuOpen(false)}>
                  Avantages
                </Link>
              </>
            )}
            <div className="px-4 py-3">
              <Button onClick={scrollToSimulator} size="sm" className="w-full bg-[#001D3D] font-bold text-white hover:bg-[#00152e]">
                {isB2C ? "Mon estimation gratuite" : "Lancer ma simulation"}
              </Button>
            </div>
          </nav>
        </div>
      )}
    </motion.header>
  )
}
