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

          <div className="mt-12 flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top,rgba(0,29,61,0.5)_0%,rgba(0,10,25,0.8)_100%)] px-8 py-10 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md sm:mt-16 sm:px-12 sm:py-14">
            <p className="max-w-xl text-base font-medium leading-relaxed text-neutral-300 sm:text-lg">
              Besoin d&apos;une modélisation financière et technique sur votre site ? Lancez le simulateur — un expert vous recontacte sous 24 à 48 h avec un dossier complet.
            </p>
            <Link
              href="/#simulator"
              className="inline-flex items-center justify-center rounded-xl bg-accent px-8 py-4 text-base font-bold text-black shadow-[0_0_20px_rgba(255,184,0,0.3)] transition-all hover:scale-105 hover:bg-accent/90"
            >
              Simuler la rentabilité de mon site
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
