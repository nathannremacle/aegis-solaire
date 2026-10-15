import { ParticuliersHero } from "@/components/particuliers-hero"
import { Footer } from "@/components/footer"
import { B2CSimulator } from "@/components/b2c-simulator"
import { B2CTestimonials } from "@/components/b2c-testimonials"
import { MobileStickyCta } from "@/components/mobile-sticky-cta"
import {
  Shield,
  BatteryFull,
  TrendingUp,
  Sun,
  CheckCircle2,
  Zap,
  ArrowRight,
  Clock,
  Home,
  Building2,
} from "lucide-react"
import Link from "next/link"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

export const metadata = {
  title: "Panneaux solaires résidentiels en Wallonie | Aegis Solaire",
  description:
    "Simulez gratuitement votre installation photovoltaïque résidentielle en Wallonie. Batterie domestique, calcul d'autoconsommation, conformité RESCERT & RGIE.",
  alternates: {
    canonical: `${baseUrl}/particuliers`,
  },
}

const advantages = [
  {
    icon: Shield,
    title: "Garanties industrielles",
    text: "25 ans de garanties matériel et production. Conformité stricte aux exigences du Service Public de Wallonie (SPW).",
  },
  {
    icon: BatteryFull,
    title: "Autonomie maximisée",
    text: "Protection contre l\u2019abandon des compteurs qui tournent à l\u2019envers. Intégration fine des batteries domestiques.",
  },
  {
    icon: TrendingUp,
    title: "Bouclier tarifaire",
    text: "Figement immédiat de vos coûts face à l\u2019inflation historique des grilles tarifaires belges.",
  },
]

const checklist = [
  "Certification RESCERT de votre installateur",
  "Conformité RGIE (réglementation électrique belge)",
  "Déclaration préalable urbanistique (DPU) gérée",
  "Raccordement GRD (Ores / Resa) pris en charge",
  "Éligibilité aux primes habitation Région Wallonne",
  "Compteur bidirectionnel et tarif prosumer optimisé",
]

export default function ParticuliersPage() {
  return (
    <>
      <main className="flex-1 overflow-x-hidden">
        <ParticuliersHero />

        {/* ── SIMULATOR ── */}
        <section className="bg-background px-4 py-16 sm:px-6 sm:py-24 lg:px-8 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center sm:mb-10">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-accent sm:text-sm">
                Simulation gratuite
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Estimez vos économies en 2 minutes
              </h2>
              <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
                Quelques questions pour une estimation personnalisée — puis recevez votre dossier complet.
              </p>
            </div>
            <B2CSimulator />
          </div>
        </section>

        {/* ── AVANTAGES ── light section for contrast */}
        <section
          id="arguments"
          className="scroll-mt-24 bg-secondary py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div id="avantages" className="-top-24 relative" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <header className="mx-auto mb-12 max-w-2xl text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-accent sm:text-sm">
                Nos atouts
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                Pourquoi l&apos;approche{" "}
                <span className="text-accent">Aegis</span> en résidentiel ?
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                Des prestations de qualité industrielle, adaptées à votre
                habitation en Wallonie.
              </p>
            </header>

            <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
              {advantages.map((a) => (
                <div
                  key={a.title}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-accent/40 hover:shadow-md sm:p-8"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 transition-transform group-hover:scale-110">
                    <a.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {a.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {a.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHECKLIST WALLONNE (EXPERTISE & CONFORMITÉ) ── */}
        <section
          id="expertise"
          className="scroll-mt-24 bg-background py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div id="conformite" className="-top-24 relative" />
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <header className="mx-auto mb-10 max-w-2xl text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-accent sm:text-sm">
                Conformité &amp; Expertise
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Votre installation, conforme à 100 %
              </h2>
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
              {checklist.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm font-medium text-foreground sm:text-base">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PREUVE & TÉMOIGNAGES RÉSIDENTIELS ── */}
        <B2CTestimonials />

        {/* ── CTA FINAL ── */}
        <section className="relative overflow-hidden bg-[#001D3D] py-20 sm:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,184,0,0.08)_0%,transparent_60%)]" />
          <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
            <Zap className="mx-auto mb-5 h-10 w-10 text-accent drop-shadow-[0_0_15px_rgba(255,184,0,0.5)]" />
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Prêt à devenir indépendant ?
            </h2>
            <p className="mt-4 text-neutral-400 sm:text-lg">
              Obtenez votre simulation personnalisée gratuite en moins de 2
              minutes.
            </p>
            <Link
              href="#b2c-simulator"
              className="mt-8 inline-flex h-14 items-center gap-3 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-8 text-base font-bold text-[#001D3D] shadow-[0_4px_0_0_#b47e00,0_10px_20px_rgba(245,158,11,0.25)] transition-all duration-150 hover:from-amber-300 hover:to-amber-400 active:translate-y-1 active:shadow-[0_0_0_0_#b47e00]"
            >
              Lancer ma simulation
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
      <MobileStickyCta
        targetId="b2c-simulator"
        label="Simuler mes économies"
        sublabel="Résidentiel Wallonie • Gratuit en 2 min"
      />
    </>
  )
}
