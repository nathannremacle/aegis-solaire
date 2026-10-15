import { Hero } from "@/components/hero"
import { Testimonials } from "@/components/testimonials"
import { ROISimulator } from "@/components/roi-simulator"
import { Expert } from "@/components/expert"
import { Benefits } from "@/components/benefits"
import { WebinairePromo } from "@/components/webinaire-promo"
import { FaqHomeTeaser } from "@/components/faq-home-teaser"
import { Footer } from "@/components/footer"
import { MobileStickyCta } from "@/components/mobile-sticky-cta"

export default function Home() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <main id="main-content" className="min-w-0 flex-1 [padding-bottom:env(safe-area-inset-bottom)]" role="main">
        {/* 1. Proposition de valeur institutionnelle */}
        <Hero />

        {/* 2. Preuve sociale immédiate (Liège 2 000 m², Brabant wallon 3 000 m², Hainaut 5 000 m²) */}
        <section id="preuve">
          <Testimonials />
        </section>

        {/* 3. Cœur de conversion : Simulateur ROI B2B placé haut dans le parcours */}
        <section id="simulateur">
          <ROISimulator />
        </section>

        {/* 4. Cadre réglementaire wallon (PACE 2030, PEB 2026, Easy'Green, Déduction 40%) */}
        <section id="expert">
          <Expert />
        </section>

        {/* 5. Avantages économiques (PPA, Tiers-investissement, RSE) */}
        <section id="benefits">
          <Benefits />
        </section>

        {/* 6. Filet de conversion secondaire (Lead nurturing) */}
        <WebinairePromo />

        {/* 7. FAQ */}
        <FaqHomeTeaser />
      </main>
      <Footer />

      {/* Barre d'action tactile flottante Mobile */}
      <MobileStickyCta
        targetId="simulator"
        label="Calculer le ROI de mon site"
        sublabel="Toitures & parkings > 500 m² • 2 min"
      />
    </div>
  )
}
