import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { B2CSimulator } from "@/components/b2c-simulator"
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

export const metadata = {
  title: "Panneaux solaires résidentiels en Wallonie | Aegis Solaire",
  description:
    "Simulez gratuitement votre installation photovoltaïque résidentielle en Wallonie. Batterie domestique, primes habitation, conformité RESCERT & RGIE.",
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

const stats = [
  { value: "8-10 ans", label: "ROI résidentiel", icon: TrendingUp },
  { value: "25 ans", label: "Garantie matériel", icon: Shield },
  { value: "70 %", label: "Autoconsommation", icon: Zap },
  { value: "24/7", label: "Monitoring inclus", icon: Clock },
]

export default function ParticuliersPage() {
  return (
    <>
      <Header />
      <main className="flex-1 overflow-x-hidden">
        {/* ── HERO ── viewport-fit, dark with radial glow */}
        <section
          className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#001D3D] sm:min-h-[calc(100dvh-5rem)] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          style={{ viewTransitionName: "hero-section" }}
        >
          {/* Background image with fade mask */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
            style={{
              backgroundImage: "url('/hero-particuliers.png')",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,29,61,0.15)_0%,rgba(0,29,61,0.75)_100%)]" />

          <div className="relative z-10 mx-auto flex max-w-4xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-4 py-2 shadow-[0_0_15px_rgba(255,184,0,0.15)] backdrop-blur-md sm:mb-6">
                <Sun className="h-4 w-4 shrink-0 text-accent drop-shadow-[0_0_8px_rgba(255,184,0,0.8)]" />
                <span className="text-xs font-medium tracking-wide text-white sm:text-sm">
                  La technologie industrielle au service de votre foyer
                </span>
              </div>

              {/* H1 */}
              <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                Devenez{" "}
                <span className="text-accent drop-shadow-[0_0_15px_rgba(255,184,0,0.3)]">
                  autonome
                </span>
                <br className="hidden sm:block" /> et bloquez
                l&apos;inflation.
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-neutral-300 sm:mt-6 sm:text-lg md:text-xl">
                Nos ingénieurs déploient chez vous des panneaux certifiés{" "}
                <strong className="font-semibold text-white">RESCERT</strong>{" "}
                et{" "}
                <strong className="font-semibold text-white">RGIE</strong>.
                Matériel Premium, primes habitation wallonnes et
                autoconsommation maximisée avec une batterie de pointe.
              </p>

              {/* Dual CTAs */}
              <div className="mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
                <Link
                  href="#b2c-simulator"
                  className="group inline-flex h-13 items-center justify-center gap-2.5 rounded-lg bg-accent px-7 text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.3)] transition-all hover:scale-[1.02] hover:bg-[#e6a600] hover:shadow-[0_0_35px_rgba(255,184,0,0.45)] sm:h-14"
                >
                  <Home className="h-5 w-5 shrink-0" />
                  <span>Simuler mes économies</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/"
                  className="group inline-flex h-13 items-center justify-center gap-2.5 rounded-lg border-2 border-white/30 bg-white/10 px-7 text-base font-bold text-white backdrop-blur-lg transition-all hover:scale-[1.02] hover:border-accent/50 hover:bg-white/15 hover:shadow-[0_0_25px_rgba(255,184,0,0.2)] sm:h-14"
                >
                  <Building2 className="h-5 w-5 shrink-0 text-accent" />
                  <span>Entreprises &amp; Industrie</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Trust stats */}
              <div className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-4 sm:max-w-none sm:gap-4">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="group flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-md transition-all hover:border-accent/25 hover:bg-white/10 sm:px-4"
                  >
                    <s.icon className="h-5 w-5 text-accent opacity-80 transition-transform group-hover:scale-110 sm:h-6 sm:w-6" />
                    <p className="text-lg font-bold text-white sm:text-xl">
                      {s.value}
                    </p>
                    <p className="text-[11px] leading-tight text-neutral-400 sm:text-xs">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

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
          className="bg-secondary py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
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

        {/* ── CHECKLIST WALLONNE ── */}
        <section className="bg-background py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <header className="mx-auto mb-10 max-w-2xl text-center">
              <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-accent sm:text-sm">
                Conformité
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
