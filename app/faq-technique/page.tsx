import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/StructuredData"
import { InstitutionalHero } from "@/components/institutional-hero"
import { FaqTechniqueAccordion } from "@/components/faq-technique-accordion"
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
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] -translate-x-[200%] rounded bg-primary px-3 py-2.5 text-sm text-primary-foreground transition-transform focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [margin-left:env(safe-area-inset-left)] [margin-top:env(safe-area-inset-top)]"
      >
        Aller au contenu principal
      </a>
      <Header />
      <InstitutionalHero
        badge="Référence réglementaire"
        title="FAQ technique — PPA, PEB & Wallonie"
        subtitle="L'essentiel pour les directions administratives et financières : Certificats Verts, Plan PACE 2030 et montages tiers-investisseur."
        compact={false}
      />
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
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[#001D3D]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Retour à l&apos;accueil
            </Link>
          </nav>

          <div className="rounded-2xl border border-border bg-card p-1 shadow-sm sm:p-2 md:p-3">
            <FaqTechniqueAccordion items={FAQ_TECHNIQUE_ITEMS} />
          </div>

          <div className="mt-12 rounded-2xl border border-border bg-secondary/60 px-8 py-10 text-center shadow-sm sm:mt-16 sm:px-12 sm:py-14">
            <p className="mx-auto max-w-xl text-base font-medium leading-relaxed text-foreground sm:text-lg">
              Besoin d&apos;une modélisation financière et technique sur votre site ? Lancez le simulateur — un expert vous recontacte sous 24 à 48 h avec un dossier complet.
            </p>
            <Link
              href="/#simulator"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#001D3D] px-8 py-4 text-base font-bold text-white shadow-md transition-all hover:bg-[#00152e] hover:shadow-lg"
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
