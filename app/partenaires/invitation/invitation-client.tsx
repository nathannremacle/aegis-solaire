"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ShieldCheck,
  CheckCircle2,
  Wrench,
  UserCheck,
  Coins,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  XCircle,
} from "lucide-react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { MarketplaceLivePreview } from "@/components/marketplace-preview"

const InstallerVipInvitationForm = dynamic(
  () =>
    import("@/components/installer-vip-invitation-form").then(
      (m) => m.InstallerVipInvitationForm
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-card p-6 sm:p-10 shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)] min-h-[420px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground font-mono text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Chargement du formulaire sécurisé...</span>
        </div>
      </div>
    ),
  }
)

interface InvitationClientProps {
  initialNom?: string
  initialCie?: string
  initialInviter?: string
}

export function InvitationClient({
  initialNom = "",
  initialCie = "",
  initialInviter = "Fabrice Remacle",
}: InvitationClientProps) {
  const searchParams = useSearchParams()
  const rawNom = searchParams.get("nom") || searchParams.get("name") || initialNom
  const rawCie = searchParams.get("cie") || searchParams.get("company") || initialCie
  const inviter = searchParams.get("par") || initialInviter
  const rawCredits = searchParams.get("credits")
  const freeCredits = rawCredits ? Number(rawCredits) : 0

  // Nettoyage et capitalisation
  const nom = rawNom ? rawNom.charAt(0).toUpperCase() + rawNom.slice(1).trim() : ""
  const cie = rawCie ? rawCie.trim() : ""

  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans bg-background text-foreground">
      {/* ─── Top Brand Bar (Swiss Editorial) ─── */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center" aria-label="Aegis Solaire - Accueil">
            <div className="relative h-9 w-36 sm:h-10 sm:w-44 shrink">
              <Image
                src="/logo.png"
                alt="Aegis Solaire"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-mono text-xs text-muted-foreground">
              Déjà membre agréé ?
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="rounded-md border-border font-mono text-xs font-medium"
            >
              <Link href="/partenaires/login">
                Se connecter
              </Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-mono text-xs font-medium shadow-xs"
            >
              <a href="#activer">
                Activer l'invitation
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="min-w-0 flex-1">
        {/* ─── Hero Section (Swiss Editorial Light & Trust) ─── */}
        <section className="border-b border-border bg-background py-14 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              {/* Badge Invitation Personnelle */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-primary/[0.06] border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest font-medium mb-6">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                <span>Invitation Privée · Parrainage {inviter.toUpperCase()}</span>
              </div>

              {/* UN SEUL H1 DANS LE DOM */}
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl leading-[1.12] font-semibold tracking-tight text-foreground">
                {nom ? (
                  <>
                    <span className="text-primary">{nom}</span>, accédez au réseau d'installateurs photovoltaïques Aegis Solaire en Wallonie
                  </>
                ) : (
                  <>Accédez au réseau d'installateurs photovoltaïques Aegis Solaire en Wallonie</>
                )}
              </h1>

              {cie && (
                <p className="mt-3 font-mono text-sm sm:text-base text-muted-foreground">
                  Sélection de chantiers qualifiés pour les équipes techniques de <strong className="text-foreground font-semibold">{cie}</strong>.
                </p>
              )}

              {/* Sous-titre institutionnel */}
              <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed font-sans max-w-3xl">
                Aegis Solaire est l'organe de sélection technique wallon : chaque projet fait l'objet d'un audit préalable rigoureux (compteur bidirectionnel, cadastre toiture, solvabilité) avant toute mise à disposition sur la plateforme.
              </p>

              {/* Triple métrique institutionnelle (Swiss Grid) */}
              <div className="mt-8 grid grid-cols-1 divide-y sm:divide-y-0 sm:divide-x divide-border border border-border bg-card rounded-md sm:grid-cols-3">
                <div className="p-4 sm:p-5 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Audit Humain</span>
                  </div>
                  <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-foreground mt-1">
                    100 %
                  </p>
                  <p className="text-xs text-muted-foreground font-sans">
                    Dossiers vérifiés par téléphone et cadastre solaire avant publication.
                  </p>
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Concurrence Plafonnée</span>
                  </div>
                  <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-foreground mt-1">
                    1:1 B2B / Max 3 B2C
                  </p>
                  <p className="text-xs text-muted-foreground font-sans">
                    Exclusivité totale en tertiaire et maximum <span className="font-mono tabular-nums">3</span> installateurs en résidentiel.
                  </p>
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-accent shrink-0" />
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Support Chantier</span>
                  </div>
                  <p className="font-mono text-xl sm:text-2xl font-semibold tabular-nums text-foreground mt-1">
                    &gt; 50 kWc
                  </p>
                  <p className="text-xs text-muted-foreground font-sans">
                    Appui technique et dimensionnement disponibles à la demande sur dossiers tertiaires.
                  </p>
                </div>
              </div>

              {/* CTAs Hero */}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  asChild
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3 font-mono text-xs font-semibold shadow-xs"
                >
                  <a href="#activer">
                    Activer mon accès installateur
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="rounded-md border-border font-mono text-xs font-medium hover:bg-secondary"
                >
                  <a href="#marketplace-preview">
                    Consulter la marketplace en direct
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Mot de Fabrice Remacle (Lettre Ouverte Confraternelle) ─── */}
        <section className="py-16 md:py-24 border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-medium block mb-2">
                ENGAGEMENT TECHNIQUE &amp; CONFRATERNEL
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Une approche exigeante, centrée sur la rentabilité des installateurs
              </h2>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 sm:p-10 shadow-[0_2px_12px_-4px_rgba(17,24,21,0.06)]">
              <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                {/* Monogramme / Badge Fabrice */}
                <div className="flex flex-col items-center md:items-start shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-md bg-primary text-primary-foreground font-heading font-bold text-xl border border-primary/20">
                    FR
                  </div>
                  <div className="mt-3 text-center md:text-left">
                    <div className="font-heading font-semibold text-sm text-foreground">Fabrice Remacle</div>
                    <div className="text-xs text-muted-foreground font-sans">Conseiller Technique &amp; Formateur RESCERT</div>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-sm bg-primary/[0.06] border border-primary/20 px-2 py-0.5 font-mono text-[11px] text-primary">
                      <span>25 ans d'expertise terrain en Wallonie</span>
                    </div>
                  </div>
                </div>

                {/* Message éditorial */}
                <div className="flex flex-col gap-4 text-sm sm:text-base text-foreground/90 leading-relaxed font-sans border-t md:border-t-0 md:border-l border-border pt-6 md:pt-0 md:pl-8">
                  <p>
                    {nom ? (
                      <>
                        « Bonjour <strong className="text-foreground">{nom}</strong>. Après plus de <span className="font-mono tabular-nums font-semibold">25 ans</span> d'expérience dans le secteur photovoltaïque en Wallonie, je mesure l'importance pour une entreprise d'installation de travailler sur des dossiers fiables, techniquement préparés et sans dispersion commerciale excessive.
                      </>
                    ) : (
                      <>
                        « Chers confrères installateurs. Avec plus de <span className="font-mono tabular-nums font-semibold">25 ans</span> d'expérience sur le terrain photovoltaïque en Wallonie, nous savons à quel point la qualification préalable et le respect des marges sont essentiels à la pérennité de nos entreprises.
                      </>
                    )}
                  </p>
                  <p>
                    Avec l'équipe d'<strong>Aegis Solaire</strong>, nous avons conçu une plateforme professionnelle répondant à des standards d'ingénierie stricts :
                  </p>
                  <ul className="flex flex-col gap-2.5 my-1 pl-4 border-l-2 border-primary/30">
                    <li className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-primary font-semibold tabular-nums">01.</span>
                      <span><strong>Qualification systématique préalable :</strong> chaque dossier fait l'objet d'une vérification humaine par téléphone (propriétaire confirmé, adéquation toiture, type de compteur, consommation réelle).</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-primary font-semibold tabular-nums">02.</span>
                      <span><strong>Attribution ciblée :</strong> exclusivité totale en B2B (<span className="font-mono tabular-nums">1:1</span>) pour vous permettre d'étudier et négocier sereinement chaque dossier d'envergure, et maximum <span className="font-mono tabular-nums">3</span> installateurs qualifiés en B2C.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-primary font-semibold tabular-nums">03.</span>
                      <span><strong>Modèle sans engagement :</strong> aucun abonnement fixe obligatoire. Vous gérez vos acquisitions au rythme de vos plannings de pose, grâce à un système de crédits sans date d'expiration.</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <span className="font-mono text-primary font-semibold tabular-nums">04.</span>
                      <span><strong>Soutien technique à la demande :</strong> sur les chantiers industriels et tertiaires complexes (&gt; <span className="font-mono tabular-nums">50 kWc</span>), une assistance au dimensionnement et un accompagnement technique peuvent être sollicités selon vos besoins.</span>
                    </li>
                  </ul>
                  <p>
                    Cette invitation privée vous permet d'activer votre accès partenaire sans frais d'entrée. Complétez votre profil pour découvrir les projets disponibles sur vos zones d'intervention. »
                  </p>

                  <div className="mt-2 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>Fabrice Remacle · Conseil Technique Partenaires</span>
                    <span>Wallonie</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Comparatif : Charte Aegis Solaire vs Marché ─── */}
        <section className="py-16 md:py-24 border-b border-border bg-background">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-medium block mb-2">
                CADRE MÉTIER &amp; ENGAGEMENTS
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Une sélection technique rigoureuse pour sécuriser votre temps commercial
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
                Tableau comparatif entre les pratiques courantes de diffusion de contacts et le cahier des charges Aegis Solaire.
              </p>
            </div>

            {/* Tableau Financier Comparatif */}
            <div className="overflow-x-auto rounded-md border border-border bg-card shadow-2xs">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="p-4 sm:p-5 font-semibold text-foreground">Critère opérationnel</th>
                    <th className="p-4 sm:p-5 font-semibold text-muted-foreground">Pratiques courantes du marché</th>
                    <th className="p-4 sm:p-5 font-semibold text-primary bg-primary/[0.04]">Charte Partenaire Aegis Solaire</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Attribution par dossier</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">
                      Mise en concurrence élargie (<span className="font-mono tabular-nums">5</span> à <span className="font-mono tabular-nums">6</span> entreprises sur le même contact)
                    </td>
                    <td className="p-4 sm:p-5 font-medium text-foreground bg-primary/[0.02]">
                      <strong className="text-primary font-mono tabular-nums font-semibold">1 seul installateur en B2B</strong> (100% exclusif) · Max <span className="font-mono tabular-nums font-semibold">3</span> en B2C
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Qualification préalable</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Transmission de formulaires web sans contrôle téléphonique préalable</td>
                    <td className="p-4 sm:p-5 font-medium text-foreground bg-primary/[0.02]">
                      <strong className="text-primary">Audit téléphonique systématique</strong> : cadastre toiture, type de compteur et puissance estimée
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Modalités contractuelles</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Abonnements récurrents obligatoires ou forfaits mensuels fixes</td>
                    <td className="p-4 sm:p-5 font-medium text-foreground bg-primary/[0.02]">
                      <strong className="text-primary font-mono tabular-nums font-semibold">0 €</strong> d'abonnement · Achat à l'acte aux crédits, sans date d'expiration
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Garantie contact non joignable</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Conditions de réclamation restrictives et délais de traitement longs</td>
                    <td className="p-4 sm:p-5 font-medium text-foreground bg-primary/[0.02]">
                      Recrédit automatique sous <span className="font-mono tabular-nums font-semibold text-primary">24 h</span> sur simple notification
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 sm:p-5 font-medium text-foreground">Assistance technique tertiaire</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">Aucun accompagnement d'ingénierie terrain</td>
                    <td className="p-4 sm:p-5 font-medium text-foreground bg-primary/[0.02]">
                      Appui d'ingénierie et expertise sur dossiers &gt; <span className="font-mono tabular-nums">50 kWc</span> disponibles <strong className="text-primary font-medium">à la demande</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4 Piliers en grille fine */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/[0.06] border border-primary/20 text-primary mb-3">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground">1. Audit Humain Systématique</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-sans">
                  Chaque dossier est qualifié par un échange téléphonique approfondi avant mise en ligne.
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/[0.06] border border-primary/20 text-primary mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground">2. Respect des Marges</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-sans">
                  Exclusivité totale en B2B et maximum <span className="font-mono tabular-nums">3</span> en B2C pour des négociations saines.
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/[0.06] border border-primary/20 text-primary mb-3">
                  <Wrench className="h-5 w-5 text-accent" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground">3. Support à la Demande</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-sans">
                  Assistance technique et appui au dimensionnement mobilisables sur vos projets tertiaires complexes.
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/[0.06] border border-primary/20 text-primary mb-3">
                  <Coins className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-sm font-semibold text-foreground">4. Flexibilité Totale</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed font-sans">
                  Zéro abonnement forcé. Vous débloquez vos opportunités selon la disponibilité de vos équipes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Aperçu Live de la Marketplace ─── */}
        <section id="marketplace-preview" className="py-16 md:py-24 border-b border-border bg-secondary/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-10">
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-medium block mb-2">
                ESPACE INSTALLATEUR
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Aperçu interactif du flux de projets en Wallonie
              </h2>
              <p className="mt-2 text-sm text-muted-foreground font-sans">
                Consultez le teaser des opportunités en temps réel, visualisez les métriques cadastrales et simulez le déblocage des coordonnées.
              </p>
            </div>

            {/* Live Preview Component (Swiss Editorial) */}
            <MarketplaceLivePreview />

            <div className="mt-8 flex justify-center">
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-mono text-xs font-semibold px-6 py-3 shadow-xs"
              >
                <a href="#activer">
                  Activer mon compte pour débloquer ces opportunités
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Formulaire d'Inscription VIP ─── */}
        <section id="activer" className="py-16 md:py-24 bg-background">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="font-mono text-xs uppercase tracking-widest text-primary font-medium block mb-2">
                ENRÔLEMENT RAPIDE · ENTRÉE PRIVILÉGIÉE
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
                {nom ? `${nom}, activez votre accès installateur partenaire` : "Activez votre accès installateur partenaire"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground font-sans max-w-lg mx-auto">
                Complétez votre fiche professionnelle en moins de <span className="font-mono tabular-nums">2</span> minutes. Notre équipe technique validera vos accès sous <span className="font-mono tabular-nums">24 h</span> ouvrées.
              </p>

              {freeCredits > 0 && (
                <div className="mt-5 mx-auto max-w-xl rounded-lg border border-accent/30 bg-accent/10 p-3.5 text-center text-xs font-semibold text-accent flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-accent" />
                  <span>
                    <strong>Avantage Réseau Fabrice Remacle :</strong>{" "}
                    <span className="font-mono font-bold tabular-nums">{freeCredits} crédits d&apos;accueil</span> offerts sur votre compte pour tester et débloquer votre premier chantier sans engagement.
                  </span>
                </div>
              )}
            </div>

            <InstallerVipInvitationForm
              initialFirstName={nom}
              initialCompanyName={cie}
              inviterName={`${inviter}${freeCredits > 0 ? ` (${freeCredits} crédits offerts)` : ""}`}
            />

            <div className="mt-8 text-center font-mono text-xs text-muted-foreground flex flex-col gap-1.5">
              <p>Aegis Solaire est exploitée par INIT42 (BCE <span className="tabular-nums">1039.899.980</span> · TVA BE <span className="tabular-nums">1039.899.980</span> · Liège).</p>
              <p>
                Une question sur la plateforme ? Écrivez à{" "}
                <a href="mailto:contact@aegissolaire.com" className="underline font-semibold text-foreground hover:text-primary">
                  contact@aegissolaire.com
                </a>
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
