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
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              +500 entreprises accompagnées
            </span>
          </div>

          {/* Headline – accroche ROIste + Loi LOM */}
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Transformez vos parkings et toitures en{" "}
            <span className="text-primary">centres de profit</span>. Mise en conformité Loi LOM garantie.
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Décret Tertiaire, ombrières &gt; 1 500 m², toitures &gt; 500 m² : calculez votre ROI en 2 minutes et recevez une étude personnalisée gratuite.
          </p>

          {/* CTA unique et contrasté */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={scrollToSimulator}
              className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
              aria-label="Lancer ma simulation de rentabilité"
            >
              Lancer ma simulation de rentabilité
              <ArrowRight className="h-4 w-4" />
            </Button>
            <a
              href="#expert"
              className="text-sm text-muted-foreground underline hover:text-foreground"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById("expert")?.scrollIntoView({ behavior: "smooth" })
              }}
            >
              Découvrir notre expertise
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-4">
              <TrendingUp className="h-8 w-8 text-accent" />
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground">7 ans</p>
                <p className="text-sm text-muted-foreground">ROI moyen</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-4">
              <Shield className="h-8 w-8 text-accent" />
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground">25 ans</p>
                <p className="text-sm text-muted-foreground">Garantie panneaux</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-4">
              <Zap className="h-8 w-8 text-accent" />
              <div className="text-left">
                <p className="text-2xl font-bold text-foreground">70%</p>
                <p className="text-sm text-muted-foreground">Autoconsommation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
