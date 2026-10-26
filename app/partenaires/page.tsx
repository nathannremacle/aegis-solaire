import Link from "next/link"
import { Footer } from "@/components/footer"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { MarketplaceLivePreview } from "@/components/marketplace-preview"
import { InstallerRoiCalculator } from "@/components/installer-roi-calculator"
import { HeroBg } from "@/components/hero-bg"
import { Button } from "@/components/ui/button"
import {
  ShieldCheck,
  Building2,
  Home,
  Coins,
  ArrowRight,
  Lock,
  BadgeCheck,
  CheckCircle2,
  Check,
  Zap,
  TrendingUp,
  FileText,
  BadgeEuro,
  Award,
  Clock,
  Sparkles,
  HelpCircle,
  XCircle,
  Scale,
  Star,
  Users,
  CheckCheck,
  MapPin,
  AlertCircle,
  Calculator,
} from "lucide-react"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata = {
  title: "Devenir Partenaire Installateur RESCERT | Marketplace Photovoltaïque Wallonie",
  description:
    "Marketplace de chantiers solaires qualifiés pour installateurs certifiés RESCERT en Wallonie. B2B exclusif (1 seul acheteur dès 8 crédits) et B2C transparent (max 3 installateurs dès 2 crédits). Zéro abonnement, déblocage direct aux crédits.",
  alternates: {
    canonical: `${baseUrl}/partenaires`,
  },
}

export default function PartenairesPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans bg-background text-foreground selection:bg-accent/15 selection:text-foreground">
      <main className="min-w-0 flex-1">
        
        {/* ─── 1. Hero Section B2B Institutional with Background Image ─── */}
        <section
          className="relative flex min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] flex-col justify-center overflow-hidden bg-primary py-16 sm:py-20 lg:py-24 border-b border-border [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          style={{ viewTransitionName: "hero-section" }}
        >
          {/* Progressive Blur-Up Background Image */}
          <HeroBg
            heroKey="hero-partenaires"
            className="opacity-70"
            maskGradient="linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 65%, rgba(0,0,0,0.2) 100%)"
          />
          <div
            className="pointer-events-none select-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(11,21,40,0.35)_0%,rgba(11,21,40,0.92)_100%)]"
            aria-hidden
          />

          <div className="relative z-10 mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              
              {/* Badge supérieur institutionnel */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-mono font-semibold text-white shadow-xs backdrop-blur-md">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span>RÉSEAU OFFICIEL · INSTALLATEURS CERTIFIÉS RESCERT WALLONIE</span>
              </div>

              {/* Titre Principal Unique */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12] font-heading drop-shadow-sm">
                La Marketplace Photovoltaïque <br className="hidden sm:inline" />
                des Professionnels en Wallonie
              </h1>

              {/* Sous-titre institutionnel */}
              <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-200">
                Accédez à un flux continu de chantiers qualifiés sans démarchage à froid. B2B exclusif (<span className="font-mono tabular-nums font-semibold text-white">1 seul</span> acheteur dès <span className="font-mono tabular-nums font-semibold text-white">8 crédits</span>) et B2C transparent (<span className="font-mono tabular-nums font-semibold text-white">max 3</span> installateurs dès <span className="font-mono tabular-nums font-semibold text-white">2 crédits</span>). Zéro abonnement mensuel forcé, déblocage direct aux crédits.
              </p>

              {/* Live Ticker Metrics Wallonie */}
              <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-2.5 px-5 rounded-2xl bg-white/[0.08] border border-white/15 text-xs font-mono text-slate-200 backdrop-blur-md shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent-solar animate-pulse" />
                  <span className="text-slate-300">Activité du jour :</span>
                </div>
                <div className="flex items-center gap-1">
                  <strong className="text-white tabular-nums">28 chantiers</strong>
                  <span className="text-slate-300">ouverts</span>
                </div>
                <div className="hidden sm:inline text-white/20">|</div>
                <div className="flex items-center gap-1">
                  <strong className="text-white tabular-nums">524 kWc</strong>
                  <span className="text-slate-300">de puissance</span>
                </div>
                <div className="hidden sm:inline text-white/20">|</div>
                <div className="flex items-center gap-1">
                  <strong className="text-accent-solar font-mono tabular-nums font-bold">~840 000 €</strong>
                  <span className="text-slate-300">de travaux</span>
                </div>
                <div className="hidden md:inline text-white/20">|</div>
                <div className="hidden md:flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-accent-solar" />
                  <span className="text-slate-300">Audit toiture &amp; TVA vérifiés</span>
                </div>
              </div>

              {/* Indicateurs hero — Cartes Segment Bento Glassmorphism */}
              <div className="mx-auto mt-8 grid w-full max-w-md grid-cols-1 gap-4 sm:max-w-3xl sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 text-left shadow-lg backdrop-blur-md hover:border-accent-solar/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-accent-solar/20 px-2.5 py-1 font-mono text-xs font-bold text-accent-solar border border-accent-solar/30">
                      SEGMENT B2B
                    </span>
                    <span className="font-mono text-xs font-bold text-accent-solar tabular-nums">Dès 8 crédits (~95,84 € HT)</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-white font-heading">Exclusivité totale — 1 seul installateur</h3>
                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                    PME, toitures industrielles, hangars agricoles, ombrières de parking, Corporate PPA. Aucune mise en concurrence interne après déblocage.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-6 text-left shadow-lg backdrop-blur-md hover:border-white/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-white/15 px-2.5 py-1 font-mono text-xs font-bold text-white border border-white/20">
                      SEGMENT B2C
                    </span>
                    <span className="font-mono text-xs font-bold text-accent-solar tabular-nums">Dès 2 crédits (~23,96 € HT)</span>
                  </div>
                  <h3 className="mt-3 text-base font-bold text-white font-heading">Maximum 3 installateurs par dossier</h3>
                  <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                    Résidentiel Wallonie avec compteur &amp; facture vérifiés. Places restantes visibles en temps réel dans votre portail.
                  </p>
                </div>
              </div>

              {/* Actions Principales Hero */}
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <a href="#candidature" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-7 py-3.5 h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold rounded-xl shadow-md cursor-pointer transition-transform hover:scale-[1.01]"
                  >
                    Postuler au réseau RESCERT (Gratuit)
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </a>
                <Link href="/partenaires/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-7 py-3.5 h-12 border-white/25 bg-white/10 text-white hover:bg-white/20 font-semibold rounded-xl cursor-pointer backdrop-blur-md transition-colors"
                  >
                    <Lock className="h-4 w-4 mr-2 text-accent" />
                    Accès Partenaire (Se connecter)
                  </Button>
                </Link>
              </div>

              {/* Réassurance sous CTA */}
              <p className="mt-4 text-xs font-mono text-slate-300">
                <span className="tabular-nums font-semibold text-white">0 €</span> de frais d&apos;inscription · Zéro abonnement imposé · Audit sous <span className="tabular-nums font-semibold text-white">48 h</span>
              </p>
            </div>
          </div>
        </section>

        {/* ─── 2. Aperçu Interactif du Live Feed Marketplace ─── */}
        <section
          id="apercu"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Flux de Chantiers en Direct
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Explorez le flux de chantiers en temps réel
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Filtrez par segment, province ou puissance. Testez l&apos;inspection d&apos;un dossier ou simulez un déblocage de contact immédiat.
              </p>
            </div>

            <MarketplaceLivePreview />
          </div>
        </section>

        {/* ─── 3. Matrice Comparative : Aegis Solaire vs Courtiers Traditionnels ─── */}
        <section
          id="comparatif"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Modèle de Distribution Éthique
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Pourquoi les installateurs agréés choisissent Aegis Solaire
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Nous avons conçu notre marketplace en rupture totale avec les plateformes de leads discount qui revendent les mêmes coordonnées à dix installateurs.
              </p>
            </div>

            {/* Tableau comparatif stylisé Fintech */}
            <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 font-mono text-xs">
                    <th className="py-4 px-4 sm:px-6 font-semibold text-muted-foreground uppercase tracking-wider w-1/3">
                      Critères d&apos;exploitation
                    </th>
                    <th className="py-4 px-4 sm:px-6 font-bold text-accent uppercase tracking-wider w-1/3 bg-accent/[0.04] border-x border-accent/20">
                      Aegis Solaire (Réseau Agréé)
                    </th>
                    <th className="py-4 px-4 sm:px-6 font-semibold text-muted-foreground uppercase tracking-wider w-1/3">
                      Plateformes traditionnelles (Bobex, TrustUp...)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-foreground">
                      Concurrence sur le lead
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-accent/[0.02] border-x border-accent/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">
                          100% Exclusif en B2B (1 seul acheteur) · Max 3 en B2C
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>5 à 10 installateurs mis en concurrence sauvage</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-foreground">
                      Modèle économique
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-accent/[0.02] border-x border-accent/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">
                          Packs de crédits à la demande · Zéro abonnement forcé
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Abonnements mensuels imposés de 300 € à 800 € / mois</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-foreground">
                      Qualification technique
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-accent/[0.02] border-x border-accent/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">
                          Toiture, m², facture annuelle, compteur ORES/RESA vérifié
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Simple formulaire sommaire sans vérification technique</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-foreground">
                      Garantie contact injoignable
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-accent/[0.02] border-x border-accent/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">
                          Recrédit direct sous 7 jours sans discussion
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Litiges fréquents, délais de contestation arbitraires</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-foreground">
                      Exigence professionnelle
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-accent/[0.02] border-x border-accent/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">
                          Réservé aux certifiés RESCERT Wallonie en ordre de BCE
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Ouvert à n&apos;importe quelle structure sans agrément</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 4 Piliers Bento Cards */}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary border border-border shadow-2xs">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">B2B Exclusif (1 seul acheteur)</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Sur le segment professionnel, le lead n&apos;est attribué qu&apos;à une seule entreprise. Vous échangez en direct sans cannibalisation de devis.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary border border-border shadow-2xs">
                  <Home className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">B2C Transparent (Max 3 places)</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  En résidentiel, <span className="font-mono tabular-nums font-semibold text-foreground">3</span> installateurs maximum peuvent acquérir la fiche. Les places restantes sont affichées en direct.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary border border-border shadow-2xs">
                  <Coins className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">Packs de crédits sans engagement</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Rechargez votre solde sur facture officielle INIT42 avec TVA déductible à <span className="font-mono tabular-nums font-semibold text-foreground">21 %</span>. Vos crédits n&apos;expirent pas.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary border border-border shadow-2xs">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">100% Qualité &amp; Remplacement</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Filtrage strict anti-spam, agréments RESCERT vérifiés et engagement de remplacement immédiat si le contact est injoignable.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. Simulateur de Rentabilité Métier (Interactive ROI) ─── */}
        <section
          id="simulateur-roi"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Modélisation Financière
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Simulateur de rentabilité : Anticipez votre carnet de commandes
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Découvrez combien de marge brute générer chaque mois selon vos disponibilités de pose.
              </p>
            </div>

            <InstallerRoiCalculator />
          </div>
        </section>

        {/* ─── 5. Grille Tarifaire des Packs de Crédits (Transparence Totale) ─── */}
        <section
          id="tarifs"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Transparence Économique
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Packs de crédits déductibles : zéro abonnement, rechargez selon vos besoins
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Débloquez les chantiers uniquement quand votre carnet de commandes a de la place. Factures officielles belges avec TVA 21 % déductible.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {/* Pack 1 */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-accent/40 transition-colors">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Pack Découverte
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                      119,80 €
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-mono">HT</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Idéal pour tester le réseau et acquérir jusqu&apos;à <span className="font-mono tabular-nums font-semibold text-foreground">5 chantiers</span> résidentiels B2C.
                  </p>
                  <ul className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span><strong className="font-mono tabular-nums">10 crédits</strong> (~11,98 € / crédit)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Accès complet au portail Wallonie</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Crédits sans date de péremption</span>
                    </li>
                  </ul>
                </div>
                <a href="#candidature">
                  <Button variant="outline" className="w-full rounded-xl text-xs font-semibold cursor-pointer">
                    Sélectionner ce pack
                  </Button>
                </a>
              </div>

              {/* Pack 2 (Recommandé - Croissance) */}
              <div className="bg-card border-2 border-accent rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 relative">
                <div className="absolute -top-3 right-6 bg-accent text-accent-foreground px-3 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                  Le Plus Populaire
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                      Pack Croissance
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                      274,50 €
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-mono">HT</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le pack de référence pour alimenter régulièrement <span className="font-mono tabular-nums font-semibold text-foreground">1 à 2 équipes</span> de pose.
                  </p>
                  <ul className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span><strong className="font-mono tabular-nums">25 crédits</strong> (~10,98 € / cr., -8% remise)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span>Éligible B2B exclusif &amp; B2C</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span>Alertes chantiers par email</span>
                    </li>
                  </ul>
                </div>
                <a href="#candidature">
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl text-xs font-bold shadow-xs cursor-pointer">
                    Postuler &amp; activer ce pack
                  </Button>
                </a>
              </div>

              {/* Pack 3 (Entreprise) */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-accent/40 transition-colors">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Pack Entreprise
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                      499,00 €
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-mono">HT</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pour les installateurs cherchant des chantiers tertiaires et toitures d&apos;envergure.
                  </p>
                  <ul className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span><strong className="font-mono tabular-nums">50 crédits</strong> (~9,98 € / cr., -17% remise)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Priorité sur toitures &gt; 100 kWc</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Support par gestionnaire dédié</span>
                    </li>
                  </ul>
                </div>
                <a href="#candidature">
                  <Button variant="outline" className="w-full rounded-xl text-xs font-semibold cursor-pointer">
                    Sélectionner ce pack
                  </Button>
                </a>
              </div>

              {/* Pack 4 (Grands Projets B2B) */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-accent/40 transition-colors">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Grands Projets B2B
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                      890,00 €
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-mono">HT</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pour les entreprises photovoltaïques régionales à forte capacité de déploiement.
                  </p>
                  <ul className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span><strong className="font-mono tabular-nums">100 crédits</strong> (~8,90 € / cr., -26% remise)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Exclusivité sur mégaprojets tertiaires</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Ligne directe avec l&apos;ingénieur d&apos;audit</span>
                    </li>
                  </ul>
                </div>
                <a href="#candidature">
                  <Button variant="outline" className="w-full rounded-xl text-xs font-semibold cursor-pointer">
                    Sélectionner ce pack
                  </Button>
                </a>
              </div>
            </div>

            {/* Box Rentabilité Métier Exemple */}
            <div className="mt-10 max-w-4xl mx-auto bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  Exemple concret d&apos;exploitation (Chantier B2B toiture PME)
                </span>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  Débloquez 1 dossier B2B toiture industrielle à <strong className="font-mono tabular-nums">8 crédits</strong> (soit <span className="font-mono tabular-nums font-semibold">95,84 € HT</span>). Signez un chantier de <span className="font-mono tabular-nums font-semibold">60 kWc</span> (~54 000 € HT). Votre marge brute moyenne réalisée dépasse <strong className="font-mono tabular-nums font-bold text-accent">9 000 € HT</strong>. Le retour sur investissement est immédiat dès le premier dossier transformé.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 6. Témoignages & Avis d'Installateurs Certifiés ─── */}
        <section
          id="temoignages"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Retours du Terrain
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Ce que disent nos installateurs certifiés en Wallonie
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Des professionnels agréés RESCERT qui alimentent leurs équipes sans perte de temps commerciale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Témoignage 1 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-accent-solar">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    « La fin des leads vendus à 8 concurrents qui cassent les prix. En B2B, l&apos;exclusivité totale nous a permis de signer une toiture industrielle de 180 kWc en 3 semaines sans guerre commerciale. »
                  </p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground text-xs block font-heading">Laurent D.</span>
                    <span className="text-[11px] text-muted-foreground">Directeur Technique, SRL SolTech Liège</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                    RESCERT #PV-4821
                  </span>
                </div>
              </div>

              {/* Témoignage 2 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-accent-solar">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    « Les fiches d&apos;audit sont précises : facture annuelle ORES, orientation, revêtement de toiture. On sait exactement où on met les pieds avant d&apos;appeler. Notre taux de signature dépasse 35 %. »
                  </p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground text-xs block font-heading">Marc V.</span>
                    <span className="text-[11px] text-muted-foreground">Gérant, Namur Énergie SRL</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                    RESCERT #PV-3912
                  </span>
                </div>
              </div>

              {/* Témoignage 3 */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-accent-solar">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    « Le remplacement automatique des prospects injoignables sous 7 jours est une vraie garantie de sérénité. Zéro mauvaise surprise sur notre solde de crédits, le service client répond en 2 heures. »
                  </p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground text-xs block font-heading">Philippe T.</span>
                    <span className="text-[11px] text-muted-foreground">Fondateur, Brabant Solaire SA</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                    RESCERT #PV-5104
                  </span>
                </div>
              </div>
            </div>

            {/* Chiffres clés de confiance */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                  94 %
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Satisfaction installateurs</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-accent tabular-nums">
                  100 %
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Certifiés RESCERT Wallonie</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                  &lt; 48 h
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Délai d&apos;audit &amp; activation</span>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                  0 €
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Abonnement imposé</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 7. Comment ça fonctionne (Timeline 3 étapes) ─── */}
        <section className="border-b border-border py-16 md:py-24 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">Parcours Intégration</span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Comment rejoindre la marketplace en 3 étapes simples ?
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-accent/30 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-mono font-bold text-primary-foreground shadow-2xs">
                  01
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">Candidature en ligne</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Remplissez le formulaire ci-dessous avec votre raison sociale, numéro BCE et référence d&apos;agrément RESCERT Photovoltaïque.
                </p>
              </div>

              <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-accent/30 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-mono font-bold text-primary-foreground shadow-2xs">
                  02
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">Revue &amp; Accès Portail</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Notre équipe contrôle vos pièces sous <span className="font-mono tabular-nums font-semibold text-foreground">48 h</span> et vous transmet vos identifiants pour accéder au portail sécurisé.
                </p>
              </div>

              <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-accent/30 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-mono font-bold text-primary-foreground shadow-2xs">
                  03
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">Live Feed &amp; Déblocage</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Consultez les dossiers disponibles dans vos provinces (Liège, Hainaut, Namur...) et débloquez instantanément les coordonnées complètes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 8. Formulaire de Candidature Sécurisé ─── */}
        <section
          id="candidature"
          className="scroll-mt-24 py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)]">
              <div className="border-b border-border pb-6 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 text-xs font-mono font-semibold text-primary">
                  <BadgeCheck className="h-4 w-4 text-accent" />
                  <span>INSCRIPTION INSTALLATEUR PARTENAIRE</span>
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                  Postuler au réseau d&apos;installateurs Aegis Solaire
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                  Seuls les installateurs couverts par une certification RESCERT Photovoltaïque en cours de validité en Wallonie sont éligibles.
                </p>
              </div>

              <div className="mt-8">
                <InstallerRegistrationForm />
              </div>

              <div className="mt-8 border-t border-border pt-6 text-center">
                <p className="text-xs text-muted-foreground">
                  Vous possédez déjà un compte installateur actif ?{" "}
                  <Link href="/partenaires/login" className="font-bold text-accent underline underline-offset-4 hover:text-accent/80">
                    Connectez-vous à la marketplace
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 9. FAQ Spécifique Installateurs ─── */}
        <section className="border-t border-border py-16 md:py-20 bg-card [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Questions Fréquentes
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
                Questions fréquentes des installateurs photovoltaïques
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Comment fonctionne la facturation des crédits ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Chaque recharge donne lieu à une facture fiscale belge conforme émise par INIT42 SRL avec TVA à 21 % déductible. Vous recevez le PDF immédiatement par email dès la confirmation du paiement.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Que se passe-t-il si un prospect est injoignable ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Si un numéro est erroné ou si le prospect ne répond jamais après 3 tentatives sous 7 jours, vous signalez le lead dans votre tableau de bord et nos équipes vous le recréditent sans discussion.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Y a-t-il une exclusivité géographique ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Vous définissez vos provinces d&apos;intervention (Liège, Namur, Hainaut, Brabant Wallon, Luxembourg) et ne voyez que les chantiers situés dans votre rayon d&apos;action opérationnel.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Mes crédits ont-ils une date limite ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Non. Vos crédits acquis restent valables sans limitation de durée. Vous pouvez les consommer en une semaine ou sur plusieurs mois selon votre carnet de commandes.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Aegis Solaire prend-il une commission sur les chantiers ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Non, absolument aucune. Vous payez uniquement le coût forfaitaire de déblocage en crédits. 100 % de la marge et du chiffre d&apos;affaires générés vous reviennent.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Pourquoi la certification RESCERT est-elle obligatoire ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Pour garantir la confiance des propriétaires wallons et le respect des normes CWaPE / RGIE. Seuls les professionnels agréés peuvent garantir la conformité des installations.
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
