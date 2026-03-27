import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/StructuredData"
import { FaqTechniqueAccordion, FaqTechniqueHero } from "@/components/faq-technique-accordion"
import { FAQ_TECHNIQUE_ITEMS } from "@/lib/faq-technique-data"
import { ArrowLeft } from "lucide-react"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "FAQ technique — Certificats Verts, PEB, PACE 2030",
  description:
    "Réponses pour DAF et direction : CWaPE, SPW Énergie, PEB, PACE 2030, GRD (Ores, Resa), Corporate PPA et tiers-investissement — photovoltaïque B2B Wallonie.",
  alternates: { canonical: `${baseUrl}/faq-technique` },
}

export default function FaqTechniquePage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <Header />
      <main
        id="main-content"
        className="min-w-0 flex-1 bg-background [padding-bottom:env(safe-area-inset-bottom)]"
        role="main"
      >
        <div className="mx-auto max-w-4xl min-w-0 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <StructuredData includeOrganization={false} faq={FAQ_TECHNIQUE_ITEMS} />

          <nav className="mb-8" aria-label="Fil d'Ariane">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour à l&apos;accueil
            </Link>
          </nav>

          <FaqTechniqueHero className="mb-10 sm:mb-12" />

          <div className="rounded-2xl border border-border/80 bg-card/40 p-1 shadow-sm backdrop-blur-sm sm:p-2 md:p-3">
            <FaqTechniqueAccordion items={FAQ_TECHNIQUE_ITEMS} />
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-6 py-8 text-center sm:mt-16">
            <p className="max-w-lg text-sm text-muted-foreground sm:text-base">
              Besoin d&apos;une étude chiffrée sur votre site ? Lancez le simulateur — un expert vous recontacte sous 24 à 48 h.
            </p>
            <Link
              href="/#simulator"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
            >
              Simuler mon ROI
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
