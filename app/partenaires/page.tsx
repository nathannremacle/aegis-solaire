import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { Button } from "@/components/ui/button"
import { Shield, Users, FileCheck, ArrowDown } from "lucide-react"

export const metadata = {
  title: "Devenir Partenaire | Aegis Solaire",
  description:
    "Rejoignez le réseau d'installateurs Aegis Solaire. Recevez des chantiers photovoltaïques B2B exclusifs (toitures > 500 m², ombrières > 1 500 m²). Certifications RGE et QualiPV requises.",
}

export default function PartenairesPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <Header />
      <main className="min-w-0 flex-1">
        {/* Hero */}
        <section className="relative overflow-x-hidden bg-primary py-16 sm:py-24 lg:py-32 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="absolute inset-0 -z-10">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
          </div>
          <div className="mx-auto max-w-4xl min-w-0 px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-balance text-2xl font-bold tracking-tight text-primary-foreground min-[480px]:text-3xl sm:text-4xl lg:text-5xl">
              Accélérez votre croissance. Recevez des chantiers photovoltaïques B2B exclusifs.
            </h1>
            <p className="mt-6 text-pretty text-base leading-relaxed text-primary-foreground/90 sm:text-lg lg:text-xl">
              Toitures &gt; 500 m², Ombrières de parkings &gt; 1 500 m². Nous sourçons et qualifions les décideurs soumis au Décret Tertiaire. Vous signez les chantiers.
            </p>
            <div className="mt-10">
              <a href="#candidature">
                <Button
                  size="lg"
                  className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto sm:min-w-[260px]"
                >
                  Postuler au réseau de partenaires
                  <ArrowDown className="h-4 w-4 sm:hidden" />
                </Button>
              </a>
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
                Seuls les installateurs certifiés RGE et QualiPV peuvent s'inscrire. Tous les champs sont obligatoires.
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
