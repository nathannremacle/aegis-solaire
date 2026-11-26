import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  Camera,
  CheckCircle2,
  Coins,
  Lock,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import {
  resolveDistributorByCodeOrSlug,
  resolveDistributorLogoPath,
} from "@/lib/distributor-partners"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServiceRoleClient()
  const dist = await resolveDistributorByCodeOrSlug(supabase, slug)
  if (!dist) return {}

  return {
    title: `${dist.company_name} × Aegis Solaire — Programme Partenaire Installateurs RESCERT (+${dist.reward_credits_referred} Crédits)`,
    description: `Accès privilégié réservé aux installateurs photovoltaïques clients de ${dist.company_name} : inscription gratuite (0 € abonnement) et +${dist.reward_credits_referred} crédits offerts dès votre 1er achat payant.`,
  }
}

export default async function DistributorCobrandedLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createServiceRoleClient()
  const dist = await resolveDistributorByCodeOrSlug(supabase, slug)

  if (!dist || dist.status !== "active") {
    notFound()
  }

  const distributorLogo = resolveDistributorLogoPath(dist.slug)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans selection:bg-accent/15 selection:text-foreground">
      {/* ─── Barre d'en-tête institutionnelle co-brandée ─── */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <Link href="/partenaires" className="shrink-0 flex items-center" aria-label="Aegis Solaire">
              <img
                src="/logo.png"
                alt="Aegis Solaire"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </Link>

            <span className="text-muted-foreground/60 font-mono text-sm select-none" aria-hidden="true">
              ×
            </span>

            {distributorLogo ? (
              <div className="flex items-center rounded-lg border border-border/80 bg-background px-2.5 py-1.5 shrink-0">
                <img
                  src={distributorLogo}
                  alt={`Logo officiel ${dist.company_name}`}
                  className="h-5 sm:h-6 w-auto max-w-[140px] sm:max-w-[180px] object-contain"
                />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1 font-heading text-xs sm:text-sm font-bold text-foreground truncate">
                <Building2 className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="truncate">{dist.company_name}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-3 py-1 font-mono text-[11px] font-semibold text-foreground tabular-nums">
              <BadgeCheck className="h-3.5 w-3.5 text-accent shrink-0" />
              <span>Code {dist.referral_code}</span>
            </span>

            <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5 shadow-2xs">
              <a href="#candidature">
                <span>
                  Activer <span className="font-mono tabular-nums">+{dist.reward_credits_referred}</span> cr.
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ─── 1. Hero Exécutif Split 12 colonnes (Trust & Authority + Conversion) ─── */}
        <section className="relative border-b border-border bg-card py-12 sm:py-16 lg:py-20 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Colonne gauche (7 cols) : Lockup co-brandé + H1 + KPIs */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* Lockup Partenariat Officiel */}
                <div className="inline-flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-2.5 w-fit">
                  {distributorLogo ? (
                    <img
                      src={distributorLogo}
                      alt={dist.company_name}
                      className="h-6 sm:h-7 w-auto max-w-[160px] object-contain"
                    />
                  ) : (
                    <span className="font-heading text-sm font-extrabold text-foreground">
                      {dist.company_name}
                    </span>
                  )}
                  <span className="h-4 w-px bg-border" aria-hidden="true" />
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                    Accès Privilégié Clients RESCERT
                  </span>
                </div>

                {/* H1 unique de la page */}
                <div className="flex flex-col gap-3">
                  <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-foreground font-heading leading-[1.12]">
                    Chantiers solaires vérifiés en Wallonie pour les installateurs{" "}
                    <span className="text-primary">{dist.company_name}</span>
                  </h1>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                    En tant que professionnel certifié RESCERT client de{" "}
                    <strong className="text-foreground">{dist.company_name}</strong>, activez votre accès à la marketplace Aegis Solaire sans aucun abonnement mensuel et bénéficiez de{" "}
                    <strong className="font-mono tabular-nums text-foreground">
                      +{dist.reward_credits_referred} crédits offerts
                    </strong>{" "}
                    dès votre <span className="font-mono tabular-nums">1er</span> achat payant.
                  </p>
                </div>

                {/* CTA principaux */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="h-12 px-6 rounded-xl text-sm font-bold gap-2 shadow-xs">
                    <a href="#candidature">
                      <span>Activer mon accès partenaire gratuit</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 px-5 rounded-xl text-xs sm:text-sm font-semibold gap-2 border-border bg-background hover:bg-secondary"
                  >
                    <Link href="/partenaires/outils/calculateur-dpi-b2b">
                      <Calculator className="h-4 w-4 text-accent" />
                      <span>Outil gratuit DPI 40 % B2B</span>
                    </Link>
                  </Button>
                </div>

                {/* Bandeau 4 KPI chiffrés (font-mono tabular-nums) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="rounded-2xl border border-border bg-background p-3.5 flex flex-col gap-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                      0 €
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Abonnement mensuel
                    </span>
                  </div>
                  <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-3.5 flex flex-col gap-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-extrabold text-accent tabular-nums">
                      +{dist.reward_credits_referred} cr.
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Offerts au 1er achat
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3.5 flex flex-col gap-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                      Max 3
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Poseurs B2C (2 max B2B)
                    </span>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3.5 flex flex-col gap-0.5">
                    <span className="font-mono text-xl sm:text-2xl font-extrabold text-foreground tabular-nums">
                      &lt; 24 h
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      Recrédit garantie contact
                    </span>
                  </div>
                </div>
              </div>

              {/* Colonne droite (5 cols) : Carte exécutive « Ce que vous inspectez avant de payer » */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-border bg-background p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)] flex flex-col gap-5">
                  <div className="flex items-center justify-between gap-2 border-b border-border pb-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-accent">
                        Avantage Réseau {dist.company_name}
                      </span>
                      <h2 className="text-base sm:text-lg font-bold text-foreground font-heading">
                        Chaque dossier vérifié avant déblocage
                      </h2>
                    </div>
                    <span className="rounded-lg border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] font-bold text-foreground tabular-nums shrink-0">
                      {dist.referral_code}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-accent">
                        <Camera className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          Photos réelles + Vue 3D aérienne du toit
                        </span>
                        <span className="text-xs text-muted-foreground leading-snug">
                          Jugez couverture, pente et ombrages gratuitement avant de payer 1 centime.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-accent">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          Triple contrôle SMS OTP + Adresse SPW ICAR
                        </span>
                        <span className="text-xs text-muted-foreground leading-snug">
                          Numéro validé par code SMS, e-mail confirmé et localisation exacte vérifiée.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-accent">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          Alertes e-mail &amp; SMS sur vos provinces exactes
                        </span>
                        <span className="text-xs text-muted-foreground leading-snug">
                          Filtre par province, segment B2B/B2C et puissance kWc — désactivable en 1 clic.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-accent">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs sm:text-sm font-bold text-foreground">
                          Note Financière DPI 40 % PDF en marque blanche
                        </span>
                        <span className="text-xs text-muted-foreground leading-snug">
                          Incluse gratuitement pour accélérer vos signatures de devis PME / B2B.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 flex items-center gap-3 text-xs">
                    <Coins className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-foreground leading-snug">
                      <strong className="font-mono tabular-nums">+{dist.reward_credits_referred} crédits bonus</strong>{" "}
                      crédités automatiquement sur votre compte dès votre <span className="font-mono tabular-nums">1er</span> achat payant (Bancontact, carte ou pack).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 2. Bandeau de caution réglementaire wallonne ─── */}
        <section className="border-b border-border bg-secondary/35 py-6">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Réseau exclusivement réservé aux installateurs agréés en Belgique
            </span>
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
              <img
                src="/logos/rescert.png"
                alt="Certification RESCERT"
                className="h-7 w-auto object-contain opacity-85"
              />
              <img
                src="/logos/cwape.png"
                alt="CWaPE Wallonie"
                className="h-7 w-auto object-contain opacity-85"
              />
              <img
                src="/logos/spw-energie.png"
                alt="SPW Énergie"
                className="h-7 w-auto object-contain opacity-85"
              />
            </div>
          </div>
        </section>

        {/* ─── 3. Parcours d'activation en 3 étapes ─── */}
        <section className="border-b border-border py-14 md:py-20 bg-background">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col gap-10">
            <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Activation rapide · 0 € fixe
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Activez votre accès partenaire {dist.company_name} en{" "}
                <span className="font-mono tabular-nums">3</span> étapes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 shadow-2xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono text-sm font-bold tabular-nums">
                  01
                </span>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Inscription en <span className="font-mono tabular-nums">2</span> minutes
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Complétez le formulaire ci-dessous avec votre numéro BCE et votre agrément RESCERT PV. Votre code <strong className="font-mono text-foreground">{dist.referral_code}</strong> est déjà pré-appliqué.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 shadow-2xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono text-sm font-bold tabular-nums">
                  02
                </span>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Contrôle RESCERT sous <span className="font-mono tabular-nums">24–48 h</span>
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Notre cellule vérifie votre agrément, active votre portail partenaire et vous permet de paramétrer vos provinces, votre seuil kWc et vos alertes e-mail/SMS.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 shadow-2xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono text-sm font-bold tabular-nums">
                  03
                </span>
                <h3 className="text-base font-bold text-foreground font-heading">
                  <span className="font-mono tabular-nums">+{dist.reward_credits_referred}</span> crédits crédités au 1er achat
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Dès votre premier déblocage de chantier ou pack de crédits (facture pro TVA <span className="font-mono tabular-nums">21 %</span>), vos{" "}
                  <span className="font-mono tabular-nums font-semibold text-foreground">+{dist.reward_credits_referred}</span> crédits partenaires s&apos;ajoutent automatiquement.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. Formulaire de candidature + Colonne de réassurance sticky ─── */}
        <section id="candidature" className="scroll-mt-24 py-14 md:py-20 bg-secondary/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Colonne gauche sticky (4 cols) */}
              <aside className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-4">
                <div className="rounded-3xl border border-border bg-card p-6 flex flex-col gap-4 shadow-2xs">
                  <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
                    {distributorLogo ? (
                      <img
                        src={distributorLogo}
                        alt={dist.company_name}
                        className="h-6 w-auto max-w-[150px] object-contain"
                      />
                    ) : (
                      <span className="font-heading text-sm font-bold text-foreground">
                        {dist.company_name}
                      </span>
                    )}
                    <span className="rounded-md bg-accent/10 border border-accent/25 px-2 py-0.5 font-mono text-[10.5px] font-bold text-accent tabular-nums">
                      +{dist.reward_credits_referred} cr.
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">Zéro engagement :</strong> achetez à l&apos;unité par Bancontact ou en pack sans abonnement.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">Facturation belge conforme :</strong> facture pro TVA <span className="font-mono tabular-nums">21 %</span> / Peppol émise automatiquement.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">Garantie contact <span className="font-mono tabular-nums">7 j.</span> :</strong> faux numéro ou prospect injoignable recrédité sous <span className="font-mono tabular-nums">24 h</span> ouvrées.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">Support dédié :</strong>{" "}
                        <a href="mailto:contact@aegissolaire.com" className="underline text-foreground">
                          contact@aegissolaire.com
                        </a>
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Déjà partenaire ?</span>
                    <Link
                      href="/partenaires/login"
                      className="inline-flex items-center gap-1 font-bold text-foreground hover:text-accent"
                    >
                      <Lock className="h-3.5 w-3.5 text-accent" />
                      <span>Connexion</span>
                    </Link>
                  </div>
                </div>
              </aside>

              {/* Colonne droite (8 cols) : Formulaire */}
              <div className="lg:col-span-8">
                <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)]">
                  <InstallerRegistrationForm
                    initialDistributorCode={dist.referral_code}
                    distributorName={dist.company_name}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
