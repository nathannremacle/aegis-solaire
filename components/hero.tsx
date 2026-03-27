"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react"

export function Hero() {
  const scrollToSimulator = () => {
    const element = document.getElementById("simulator")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section
      className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-x-hidden bg-[url('/hero-background.png')] bg-cover bg-center bg-no-repeat sm:min-h-[calc(100dvh-5rem)] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/70 to-primary/95" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-1 items-center min-w-0 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-3 flex flex-wrap justify-center gap-2 sm:mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 sm:px-4">
              <Zap className="h-4 w-4 shrink-0 text-accent" />
              <span className="text-xs font-medium text-neutral-50 sm:text-sm">
                +500 entreprises accompagnées
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-balance text-2xl font-bold tracking-tight text-white min-[480px]:text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
            Transformez vos parkings et toitures industrielles en{" "}
            <span className="text-accent">centres de profit</span>.
          </h1>

          {/* Subheadline */}
          <p className="mt-3 text-pretty text-sm leading-relaxed text-neutral-200 sm:mt-5 sm:text-lg md:text-xl">
            Anticipez les objectifs du Plan PACE 2030 et optimisez votre performance PEB. Estimez votre ROI en 2 minutes et découvrez comment financer votre projet grâce aux Certificats Verts (CWaPE), au Tiers-investissement ou au Prêt Easy&apos;Green.
          </p>

          {/* CTA */}
          <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <Button
              size="lg"
              onClick={scrollToSimulator}
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto sm:min-w-[200px]"
              aria-label="Lancer ma simulation de rentabilité"
            >
              <span className="truncate">Lancer ma simulation de rentabilité</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>
            <a
              href="#expert"
              className="py-1 text-center text-sm text-neutral-300 underline hover:text-white sm:py-0"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById("expert")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              Découvrir notre expertise
            </a>
          </div>

          {/* Trust indicators — always 3 cols */}
          <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-5">
            <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:gap-3 sm:px-4 sm:py-4">
              <TrendingUp className="h-6 w-6 text-accent sm:h-8 sm:w-8" />
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-white sm:text-2xl">7 ans</p>
                <p className="text-[11px] leading-tight text-neutral-300 sm:text-sm">ROI moyen</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:gap-3 sm:px-4 sm:py-4">
              <Shield className="h-6 w-6 text-accent sm:h-8 sm:w-8" />
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-white sm:text-2xl">25 ans</p>
                <p className="text-[11px] leading-tight text-neutral-300 sm:text-sm">Garantie panneaux</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:gap-3 sm:px-4 sm:py-4">
              <Zap className="h-6 w-6 text-accent sm:h-8 sm:w-8" />
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-white sm:text-2xl">70%</p>
                <p className="text-[11px] leading-tight text-neutral-300 sm:text-sm">Autoconsommation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
