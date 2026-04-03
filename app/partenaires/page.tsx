import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { Button } from "@/components/ui/button"
import { Shield, Users, FileCheck, ArrowDown } from "lucide-react"

export const metadata = {
  title: "Devenir Partenaire | Aegis Solaire",
  description:
    "Rejoignez le réseau d'installateurs Aegis Solaire en Wallonie. Chantiers photovoltaïques B2B qualifiés (toitures, parkings). Certification RESCERT Photovoltaïque requise.",
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

          <div className="relative z-10 mx-auto flex max-w-4xl min-w-0 flex-1 items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="mx-auto w-full text-center">
              <h1 className="text-balance text-2xl font-extrabold tracking-tight text-white min-[480px]:text-3xl sm:text-4xl lg:text-5xl">
                Accélérez votre croissance. Recevez des chantiers photovoltaïques B2B exclusifs.
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-pretty text-base leading-relaxed text-neutral-300 sm:text-lg lg:text-xl">
                Toitures &gt; 500 m², ombrières de parkings &gt; 1 500 m². Nous sourçons et qualifions les décideurs confrontés aux obligations PEB et à la rentabilité solaire en Wallonie. Vous signez les chantiers.
              </p>
              <div className="mt-10">
                <a href="#candidature">
                  <Button
                    size="lg"
                    className="h-14 w-full gap-2 bg-accent text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.3)] transition-all hover:scale-[1.02] hover:bg-[#e6a600] hover:shadow-[0_0_35px_rgba(255,184,0,0.45)] sm:w-auto sm:min-w-[260px]"
                  >
                    Postuler au réseau de partenaires
                    <ArrowDown className="h-4 w-4 sm:hidden" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Avantages — 3 colonnes */}
        <section className="border-t border-border bg-background py-16 sm:py-20 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Pourquoi rejoindre le réseau Aegis Solaire ?
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Leads 100% Exclusifs</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Chaque lead vous est vendu à un seul partenaire. Pas de concurrence sur les chantiers que nous vous transmettons.
                </p>
              </div>
              <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Qualification ultra-stricte</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Vérification des surfaces, factures et statuts des décideurs. Vous ne recevez que des projets sérieux et éligibles.
                </p>
              </div>
              <div className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm sm:col-span-2 lg:col-span-1">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Conformité RGPD</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Consentement explicite pour la mise en relation. Données traitées dans le respect de la réglementation.
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
            <div className="rounded-xl border border-border bg-card p-6 shadow-lg sm:p-8">
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                Postuler au réseau de partenaires
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Seuls les installateurs couverts par la certification RESCERT Photovoltaïque peuvent s&apos;inscrire. Tous les champs sont obligatoires.
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
