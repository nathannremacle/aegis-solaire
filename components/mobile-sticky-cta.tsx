"use client"

import * as React from "react"
import { Calculator, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MobileStickyCtaProps {
  targetId?: string
  label?: string
  sublabel?: string
}

export function MobileStickyCta({
  targetId = "simulator",
  label = "Simuler mes économies",
  sublabel = "Gratuit • Résultat immédiat en 2 min",
}: MobileStickyCtaProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isSimulatorInView, setIsSimulatorInView] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      // Apparaît après 320px de scroll (sous le Hero)
      setIsVisible(window.scrollY > 320)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    // Observe both potential IDs (targetId and fallback simulator)
    const targetEl = document.getElementById(targetId) || document.getElementById("simulator") || document.getElementById("b2c-simulator")
    let observer: IntersectionObserver | null = null

    if (targetEl) {
      observer = new IntersectionObserver(
        ([entry]) => {
          setIsSimulatorInView(entry.isIntersecting)
        },
        { threshold: 0.15 }
      )
      observer.observe(targetEl)
    }

    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (observer) observer.disconnect()
    }
  }, [targetId])

  const scrollToTarget = () => {
    const el = document.getElementById(targetId) || document.getElementById("simulator") || document.getElementById("b2c-simulator")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const showBar = isVisible && !isSimulatorInView

  return (
    <div
      aria-hidden={!showBar}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/15 bg-[#001D3D]/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-lg transition-all duration-300 md:hidden",
        showBar
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      )}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-white">{label}</p>
          <p className="truncate text-[11px] text-neutral-300">{sublabel}</p>
        </div>
        <Button
          type="button"
          variant="accent"
          size="default"
          onClick={scrollToTarget}
          className="shrink-0 px-4 text-xs font-bold"
        >
          <Calculator className="h-4 w-4" />
          <span>Démarrer</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
