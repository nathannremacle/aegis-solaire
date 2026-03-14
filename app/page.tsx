import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Benefits } from "@/components/benefits"
import { Expert } from "@/components/expert"
import { Testimonials } from "@/components/testimonials"
import { ROISimulator } from "@/components/roi-simulator"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] -translate-x-[200%] rounded bg-primary px-3 py-2.5 text-sm text-primary-foreground transition-transform focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [margin-left:env(safe-area-inset-left)] [margin-top:env(safe-area-inset-top)]"
      >
        Aller au contenu principal
      </a>
      <Header />
      <main id="main-content" className="flex-1" role="main">
        <Hero />
        <Testimonials />
        <Expert />
        <Benefits />
        <ROISimulator />
      </main>
      <Footer />
    </div>
  )
}
