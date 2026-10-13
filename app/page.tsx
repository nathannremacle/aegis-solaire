import { Hero } from "@/components/hero"
import { Benefits } from "@/components/benefits"
import { Expert } from "@/components/expert"
import { Testimonials } from "@/components/testimonials"
import { WebinairePromo } from "@/components/webinaire-promo"
import { ROISimulator } from "@/components/roi-simulator"
import { FaqHomeTeaser } from "@/components/faq-home-teaser"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <main id="main-content" className="min-w-0 flex-1 [padding-bottom:env(safe-area-inset-bottom)]" role="main">
        <Hero />
        <Testimonials />
        <Expert />
        <WebinairePromo />
        <Benefits />
        <ROISimulator />
        <FaqHomeTeaser />
      </main>
      <Footer />
    </div>
  )
}
