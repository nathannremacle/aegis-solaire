import Link from "next/link"
import { Footer } from "@/components/footer"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { MarketplaceLivePreview } from "@/components/marketplace-preview"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  FileCheck2,
  Building2,
  Home,
  Coins,
  ArrowRight,
  Lock,
  CheckCircle2,
  Zap,
  MapPin,
  Clock,
  BadgeCheck,
} from "lucide-react"
import { HeroBg } from "@/components/hero-bg"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata = {
  title: "Devenir Partenaire Installateur RESCERT | Aegis Solaire Wallonie",
  description:
    "Marketplace de leads solaires qualifiés pour installateurs RESCERT en Wallonie. B2B exclusif (1 seul acheteur dès 5 crédits) et B2C comparatif (max 3 acheteurs dès 2 crédits). Zéro abonnement, déblocage aux crédits.",
  alternates: {
    canonical: `${baseUrl}/partenaires`,
  },
}

export default function PartenairesPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans">
      <main className="min-w-0 flex-1">
        {/* ─── Hero Section ─── */}
        <section
          className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#001D3D] sm:min-h-[calc(100dvh-5rem)] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          style={{ viewTransitionName: "hero-section" }}
        >
          <HeroBg heroKey="hero-partenaires" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,29,61,0.2)_0%,rgba(0,29,61,0.85)_100%)]" />

          <div className="relative z-10 mx-auto flex max-w-5xl min-w-0 flex-1 flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="mx-auto w-full text-center">
              {/* Badge supérieur */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent backdrop-blur-md shadow-sm">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>Réseau Officiel · Installateurs RESCERT Wallonie</span>
              </div>

              {/* Titre Principal */}
              <h1 className="mx-auto max-w-4xl text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.1] lg:text-6xl">
                Marketplace Solaire Qualifiée : <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                  B2B Exclusif &amp; B2C Comparatif
                </span>
              </h1>

              {/* Sous-titre */}
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-neutral-300 sm:mt-6 sm:text-lg">
                Alimentez votre carnet de chantiers en Wallonie sans démarchage à froid. Dossiers qualifiés techniquement avec surfaces utiles, factures réseau réelles et puissances kWc estimées.
              </p>

              {/* Indicateurs hero — Cartes Segment DA */}
              <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-3 sm:max-w-3xl sm:grid-cols-2 sm:gap-4">
                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-left shadow-lg backdrop-blur-md transition-all hover:border-accent/40 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300 border border-blue-400/30">
                      Segment B2B
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-300">Dès 5 crédits</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-white">Exclusivité totale — 1 seul installateur</p>
                  <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                    Entreprises, toitures industrielles, ombrières de parking, Corporate PPA. Aucune mise en concurrence interne.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-left shadow-lg backdrop-blur-md transition-all hover:border-accent/40 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                      Segment B2C
                    </span>
                    <span className="font-mono text-xs font-bold text-emerald-300">Dès 2 crédits</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-white">Maximum 3 installateurs par lead</p>
                  <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                    Résidentiel Wallonie avec compteur &amp; facture vérifiés. Places restantes visibles en temps réel dans votre portail.
                  </p>
                </div>
              </div>

              {/* Boutons d'Action Principaux */}
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <a href="#candidature" className="w-full sm:w-auto">
                  <button
                    type="button"
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 px-8 font-sans text-base font-extrabold text-slate-950 shadow-[0_4px_0_#b45309,0_10px_20px_rgba(245,158,11,0.3)] transition-all hover:from-amber-300 hover:to-amber-400 active:translate-y-1 active:shadow-[0_1px_0_#b45309] sm:min-w-[260px]"
                  >
                    Postuler au réseau (Gratuit)
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </a>
                <Link href="/partenaires/login" className="w-full sm:w-auto">
                  <button
                    type="button"
                    className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 font-sans text-sm font-bold text-white backdrop-blur-lg shadow-sm transition-all hover:bg-white/15 hover:border-accent/40 sm:w-auto"
                  >
                    <Lock className="h-4 w-4 text-accent" />
                    Déjà partenaire ? Se connecter
                  </button>
                </Link>
              </div>

              {/* Reassurance text */}
              <p className="mt-5 text-xs text-neutral-400">
                0 frais d&apos;inscription · Aucun abonnement mensuel imposé · Validation sous 48h
              </p>
            </div>
          </div>
        </section>

        {/* ─── Modalités & Piliers ─── */}
        <section
          id="pourquoi"
          className="scroll-mt-24 border-t border-slate-200 bg-white py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="rounded-full bg-[#001D3D]/5 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#001D3D]">
                Garanties Partenaires
              </span>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#001D3D] sm:text-4xl">
                Une marketplace équitable, conçue pour votre rentabilité
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                Nous refusons la revente massive de coordonnées à dix installateurs concurrents. Chaque lead Aegis Solaire respecte des quotas rigoureux.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:bg-white hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">B2B Exclusif (1 seul acheteur)</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Sur le segment professionnel, le lead n&apos;est attribué qu&apos;à une seule entreprise. Vous échangez en direct sans cannibalisation de devis.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:bg-white hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Home className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">B2C Transparent (Max 3 places)</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  En résidentiel, 3 installateurs maximum peuvent acquérir la fiche. Les places restantes sont affichées en direct avant chaque achat.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:bg-white hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">Packs de crédits sans engagement</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Rechargez votre solde sur facture officielle INIT42 par virement bancaire avec TVA déductible à 21%. Vos crédits n&apos;expirent pas.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:bg-white hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-800">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">100% Qualité &amp; RGPD</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  Filtrage strict anti-spam (honeypot), vérification des numéros BCE / RESCERT actifs, et consentement explicite du prospect.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Aperçu Interactif du Live Feed ─── */}
        <section
          id="apercu"
          className="scroll-mt-24 border-t border-slate-200 bg-slate-50/70 py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
            <MarketplaceLivePreview />
          </div>
        </section>

        {/* ─── Comment ça fonctionne (Timeline) ─── */}
        <section className="border-t border-slate-200 bg-white py-16 sm:py-20 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-5xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Parcours simple</span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#001D3D] sm:text-3xl">
                Comment rejoindre la marketplace en 3 étapes ?
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#001D3D] text-sm font-extrabold text-amber-400">
                  1
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">Candidature en ligne</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Remplissez le formulaire ci-dessous avec votre raison sociale, numéro BCE et référence d&apos;agrément RESCERT Photovoltaïque.
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#001D3D] text-sm font-extrabold text-amber-400">
                  2
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">Revue &amp; Accès Portant</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Notre équipe contrôle vos pièces sous 48h et vous envoie vos identifiants pour vous connecter au portail sécurisé.
                </p>
              </div>

              <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#001D3D] text-sm font-extrabold text-amber-400">
                  3
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">Live Feed &amp; Déblocage</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Consultez les dossiers disponibles dans vos provinces (Liège, Hainaut, Namur...) et débloquez instantanément les contacts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Formulaire de Candidature ─── */}
        <section
          id="candidature"
          className="scroll-mt-24 border-t border-slate-200 bg-white py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-xl sm:p-10">
              <div className="border-b border-slate-200 pb-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#001D3D]">
                  <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  Inscription Installateur Partenaire
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#001D3D] sm:text-3xl">
                  Postuler au réseau Aegis Solaire
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
                  Seuls les installateurs couverts par une certification RESCERT Photovoltaïque en cours de validité sont éligibles.
                </p>
              </div>

              <div className="mt-8">
                <InstallerRegistrationForm />
              </div>

              <div className="mt-8 border-t border-slate-200 pt-6 text-center">
                <p className="text-xs text-slate-500">
                  Vous possédez déjà un compte installateur actif ?{" "}
                  <Link href="/partenaires/login" className="font-bold text-[#001D3D] underline underline-offset-4 hover:text-accent">
                    Connectez-vous à la marketplace
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
