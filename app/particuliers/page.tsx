import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { B2CSimulator } from "@/components/b2c-simulator"
import { Shield, BatteryFull, TrendingUp, Sun, CheckCircle2, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Panneaux solaires résidentiels en Wallonie | Aegis Solaire",
  description: "Simulez gratuitement votre installation photovoltaïque résidentielle en Wallonie. Batterie domestique, primes habitation, conformité RESCERT & RGIE.",
}

export default function ParticuliersPage() {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-x-hidden">

        {/* ── HERO B2C ── */}
        <section className="relative overflow-hidden bg-[#001D3D] px-4 pb-8 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,184,0,0.12)_0%,transparent_50%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#001D3D] to-transparent" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-4 py-2 shadow-[0_0_15px_rgba(255,184,0,0.15)] backdrop-blur-md">
              <Sun className="h-4 w-4 shrink-0 text-accent drop-shadow-[0_0_8px_rgba(255,184,0,0.8)]" />
              <span className="text-sm font-medium tracking-wide text-white">
                La technologie industrielle au service de votre foyer
              </span>
            </div>

            {/* H1 */}
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              Devenez{" "}
              <span className="text-accent drop-shadow-[0_0_15px_rgba(255,184,0,0.3)]">autonome</span>
              <br className="hidden sm:block" />{" "}
              et bloquez l&apos;inflation.
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-neutral-300">
              Nos ingénieurs déploient chez vous des panneaux certifiés{" "}
              <strong className="font-semibold text-white">RESCERT</strong> et{" "}
              <strong className="font-semibold text-white">RGIE</strong>.
              Matériel Premium, primes habitation wallonnes, et autoconsommation maximisée avec une batterie de pointe.
            </p>

            {/* Quick trust stats */}
            <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-6 max-w-lg mx-auto">
              <div className="text-center">
                <p className="text-2xl font-bold text-accent sm:text-3xl">8-10</p>
                <p className="mt-1 text-xs font-medium text-neutral-400 sm:text-sm">ans ROI résidentiel</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent sm:text-3xl">25 ans</p>
                <p className="mt-1 text-xs font-medium text-neutral-400 sm:text-sm">de garanties</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent sm:text-3xl">70%</p>
                <p className="mt-1 text-xs font-medium text-neutral-400 sm:text-sm">autoconsommation</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SIMULATOR B2C ── */}
        <section className="relative bg-[#001D3D] px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <B2CSimulator />
        </section>

        {/* ── ARGUMENTS / AVANTAGES B2C ── */}
        <section id="arguments" className="relative bg-gradient-to-b from-[#001D3D] via-[#00152e] to-[#001D3D] py-24 sm:py-32">
          {/* Subtle ambient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,184,0,0.06)_0%,transparent_50%)]" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Pourquoi l&apos;approche <span className="text-accent">Aegis</span> en résidentiel ?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
                Des prestations de qualité industrielle, adaptées à votre habitation en Wallonie.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Card 1 */}
              <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(255,184,0,0.08)]">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <Shield className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-white">Garanties Industrielles</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  25 ans de garanties matériel et production. Conformité stricte aux exigences du Service Public de Wallonie (SPW).
                </p>
              </div>

              {/* Card 2 */}
              <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(255,184,0,0.08)]">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <BatteryFull className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-white">Autonomie Maximisée</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  Protection contre l&apos;abandon des compteurs qui tournent à l&apos;envers. Intégration fine des batteries domestiques.
                </p>
              </div>

              {/* Card 3 */}
              <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_8px_30px_rgba(255,184,0,0.08)]">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-white">Bouclier Tarifaire</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                  Figement immédiat de vos coûts face à l&apos;inflation historique des grilles tarifaires belges.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CHECKLIST WALLONNE ── */}
        <section className="bg-[#001D3D] py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
              Votre installation, conforme à 100%
            </h2>
            <div className="mt-12 space-y-4">
              {[
                "Certification RESCERT de votre installateur",
                "Conformité RGIE (réglementation électrique belge)",
                "Déclaration préalable urbanistique (DPU) gérée",
                "Raccordement GRD (Ores / Resa) pris en charge",
                "Éligibilité aux primes habitation Région Wallonne",
                "Compteur bidirectionnel et tarif prosumer optimisé",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-4 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-sm font-medium leading-relaxed text-neutral-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="relative overflow-hidden bg-[#001D3D] py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,184,0,0.08)_0%,transparent_60%)]" />
          <div className="relative z-10 mx-auto max-w-2xl text-center px-4">
            <Zap className="mx-auto mb-4 h-10 w-10 text-accent drop-shadow-[0_0_15px_rgba(255,184,0,0.5)]" />
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Prêt à devenir indépendant ?
            </h2>
            <p className="mt-4 text-neutral-400">
              Obtenez votre simulation personnalisée gratuite en moins de 2 minutes.
            </p>
            <Link
              href="#b2c-simulator"
              className="mt-8 inline-flex h-14 items-center gap-3 rounded-lg bg-accent px-8 text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.3)] transition-all hover:scale-[1.02] hover:bg-[#e6a600] hover:shadow-[0_0_35px_rgba(255,184,0,0.45)]"
            >
              Lancer ma simulation
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}
