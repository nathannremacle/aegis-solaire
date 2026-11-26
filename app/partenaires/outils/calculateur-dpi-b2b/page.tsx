import Link from "next/link"
import { ArrowLeft, Calculator } from "lucide-react"
import { Footer } from "@/components/footer"
import { getPartner } from "@/lib/partner-auth"
import { DpiCalculatorClient } from "@/components/partners/dpi-calculator-client"

export const dynamic = "force-dynamic"

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

export const metadata = {
  title: "Calculateur DPI 40 % & Note Financière B2B Wallonie 2026 | Aegis Solaire",
  description:
    "Simulez gratuitement la Déduction Fiscale pour Investissement majorée à 40 % (DPI), le bouclier ISoc, le temps de retour net et l'éligibilité Easy'Green pour vos devis photovoltaïques B2B en Wallonie.",
  alternates: {
    canonical: `${baseUrl}/partenaires/outils/calculateur-dpi-b2b`,
  },
}

export default async function CalculateurDpiB2BPage() {
  let partnerCompanyName: string | null = null
  try {
    const partner = await getPartner()
    if (partner?.company_name) {
      partnerCompanyName = partner.company_name
    }
  } catch {
    partnerCompanyName = null
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <main className="flex-1">
        <section className="border-b border-border py-12 md:py-16 bg-card print:hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col gap-4">
            <Link
              href="/partenaires"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground w-fit"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Espace Partenaires RESCERT</span>
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/25 px-3 py-1 font-mono text-xs font-semibold text-accent w-fit">
              <Calculator className="h-3.5 w-3.5" />
              <span>OUTIL GRATUIT INSTALLATEURS B2B · WALLONIE 2026</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-heading">
              Calculateur DPI <span className="font-mono tabular-nums">40 %</span> &amp; Note Financière CFO
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              Chiffrez en <span className="font-mono tabular-nums">30</span> secondes l&apos;économie fiscale ISoc, le CAPEX net après DPI majorée à{" "}
              <span className="font-mono tabular-nums">40 %</span> et la durée d&apos;amortissement réelle à joindre à vos devis PME et industriels.
            </p>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <DpiCalculatorClient
              isAuthenticatedPartner={Boolean(partnerCompanyName)}
              partnerCompanyName={partnerCompanyName}
            />
          </div>
        </section>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  )
}
