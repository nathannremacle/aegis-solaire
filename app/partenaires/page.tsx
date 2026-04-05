import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { Button } from "@/components/ui/button"
import { Shield, FileCheck, ArrowDown, Building2, Home } from "lucide-react"

export const metadata = {
  title: "Devenir Partenaire | Aegis Solaire",
  description:
    "Installateurs RESCERT en Wallonie : marketplace B2B (lead vendu à un seul partenaire) et B2C (jusqu'à 3 acheteurs par lead). Tri équipe Aegis + algorithmes. Crédits indicatifs 5 (B2B) / 2 (B2C).",
}

export default function PartenairesPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <Header />
      <main className="min-w-0 flex-1">
        {/* Hero — même config que particuliers / page d'accueil (viewport-fit, image + masque + radial) */}
        <section
          className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#001D3D] sm:min-h-[calc(100dvh-5rem)] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          style={{ viewTransitionName: "hero-section" }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
            style={{
              backgroundImage: "url('/hero-partenaires.png')",
              maskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,29,61,0.15)_0%,rgba(0,29,61,0.75)_100%)]" />

          <div className="relative z-10 mx-auto flex max-w-4xl min-w-0 flex-1 flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto w-full text-center">
              <p className="mb-4 inline-flex items-center rounded-full border border-accent/30 bg-white/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent backdrop-blur-md sm:text-xs">
                Installateurs RESCERT · Wallonie
              </p>
              <h1 className="mx-auto max-w-4xl text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.08] lg:text-6xl">
                Marketplace solaire B2B &amp; B2C
              </h1>
              <p className="mx-auto mt-5 max-w-md text-pretty text-base leading-relaxed text-neutral-300 sm:mt-6 sm:max-w-lg sm:text-lg">
                Leads qualifiés : revue par l&apos;équipe Aegis et algorithmes. Modalités par segment ci-dessous.
              </p>

              {/* Indicateurs hero — DA §4.2 trust glass */}
              <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:max-w-2xl sm:grid-cols-2 sm:gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left shadow-sm backdrop-blur-md transition-colors hover:border-accent/30 sm:px-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">B2B</span>
                  <p className="mt-1 text-sm font-semibold text-white">Exclusif — 1 acheteur par lead</p>
                  <p className="mt-0.5 text-xs text-neutral-400">Dès 5 cr. · montant sur la fiche si différent</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left shadow-sm backdrop-blur-md transition-colors hover:border-accent/30 sm:px-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">B2C</span>
                  <p className="mt-1 text-sm font-semibold text-white">Jusqu&apos;à 3 installateurs par lead</p>
                  <p className="mt-0.5 text-xs text-neutral-400">Dès 2 cr. · places visibles dans le portail</p>
                </div>
              </div>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <a href="#candidature" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="h-14 w-full gap-2 bg-accent text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.3)] transition-all hover:scale-[1.02] hover:bg-[#e6a600] hover:shadow-[0_0_35px_rgba(255,184,0,0.45)] sm:min-w-[260px]"
                  >
                    Postuler au réseau
                    <ArrowDown className="h-4 w-4 sm:hidden" />
                  </Button>
                </a>
                <a
                  href="#pourquoi"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-lg transition-all hover:border-accent/40 hover:bg-white/15 sm:h-14 sm:w-auto"
                >
                  Voir les modalités
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Avantages — grille DA §4.3 : cartes rounded-2xl, hover bordure accent */}
        <section
          id="pourquoi"
          className="scroll-mt-24 border-t border-border bg-background py-14 sm:py-20 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold tracking-tight text-[#001D3D] sm:text-3xl">
              Modalités marketplace
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground">
              B2B et B2C : mêmes exigences de qualité, règles d&apos;accès différentes.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:gap-6">
              <div className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-md sm:p-7">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                    <Building2 className="h-6 w-6 text-primary" aria-hidden />
                  </div>
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    B2B
                  </span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-[#001D3D]">B2B — exclusivité</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <strong className="font-semibold text-foreground">Un seul acheteur</strong> par dossier (pro, PEB, grandes toitures,
                  ombrières). En principe <strong className="font-semibold text-foreground">5 crédits</strong> — valeur affichée sur la fiche.
                </p>
              </div>
              <div className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-md sm:p-7">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 ring-1 ring-emerald-100">
                    <Home className="h-6 w-6 text-emerald-700" aria-hidden />
                  </div>
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    B2C
                  </span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-[#001D3D]">B2C — places limitées</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <strong className="font-semibold text-foreground">Jusqu&apos;à trois acheteurs</strong> par lead (résidentiel Wallonie).
                  Places restantes visibles avant achat. En principe <strong className="font-semibold text-foreground">2 crédits</strong> par
                  fiche.
                </p>
              </div>
              <div className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-md sm:p-7">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                  <FileCheck className="h-6 w-6 text-accent" aria-hidden />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-[#001D3D]">Qualification renforcée</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Surfaces, factures et profils vérifiés. Revue <strong className="font-semibold text-foreground">équipe Aegis</strong> et{" "}
                  <strong className="font-semibold text-foreground">algorithmes</strong> avant mise en vente.
                </p>
              </div>
              <div className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-md sm:p-7">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/10">
                  <Shield className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <h3 className="text-lg font-bold tracking-tight text-[#001D3D]">Conformité RGPD</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Consentement explicite pour la mise en relation. Données traitées dans le respect de la réglementation belge et européenne.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Formulaire de candidature */}
        <section
          id="candidature"
          className="scroll-mt-24 border-t border-border bg-secondary py-16 sm:py-20 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-2xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
              <h2 className="text-xl font-bold tracking-tight text-[#001D3D] sm:text-2xl">
                Postuler au réseau de partenaires
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Seuls les installateurs couverts par la certification RESCERT Photovoltaïque peuvent accéder à la marketplace B2B et B2C.
                Tous les champs sont obligatoires.
              </p>
              <div className="mt-8">
                <InstallerRegistrationForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
