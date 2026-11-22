import Link from "next/link"
import { Footer } from "@/components/footer"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { MarketplaceLivePreview } from "@/components/marketplace-preview"
import { InstallerRoiCalculator } from "@/components/installer-roi-calculator"
import { PartnersHero } from "@/components/partners-hero"
import { AlertsAutopilotShowcase } from "@/components/partners/alerts-autopilot-showcase"
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
  TrendingUp,
  Star,
  XCircle,
  CreditCard,
  Camera,
  Smartphone,
  MapPin,
  Users2,
  Sparkles,
} from "lucide-react"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata = {
  title: "Devenir Partenaire Installateur RESCERT | Marketplace Photovoltaïque Wallonie",
  description:
    "Marketplace de chantiers solaires qualifiés en Wallonie : photos réelles, vue 3D du toit et téléphone vérifié par SMS (OTP). B2B 100 % exclusif, B2C Max 3 ou Exclusivité Totale (65 € HT), complément en euros sans crédit bloqué, alertes Auto-Pilot, packs jusqu'à -24 % et parrainage +3 crédits.",
  alternates: {
    canonical: `${baseUrl}/partenaires`,
  },
}

export default function PartenairesPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden font-sans bg-background text-foreground selection:bg-accent/15 selection:text-foreground">
      <main className="min-w-0 flex-1">

        {/* ─── 1. Hero Section B2B Institutionnelle (Unique H1 de la page) ─── */}
        <PartnersHero />

        {/* ─── 1.1 Anatomie d'un dossier vérifié (Ce que vous inspectez AVANT de payer) ─── */}
        <section className="border-b border-border py-14 md:py-20 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Transparence Avant Déblocage
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Tout ce que vous inspectez sur un chantier avant de payer 1 centime
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Finies les fiches aveugles des courtiers classiques : chaque projet publié sur la marketplace inclut ses preuves techniques et visuelles consultables gratuitement.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col gap-3 hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary border border-border text-accent">
                  <Camera className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Photos réelles + Vue 3D IA
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Consultez les photos du bâtiment et la reconstitution 3D aérienne pour juger pente, couverture (tuiles, ardoises, EPDM, bac acier) et ombrages avant d&apos;acheter.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col gap-3 hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary border border-border text-accent">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Triple vérification SMS OTP
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Numéro validé par code SMS (OTP) avec opérateur détecté, e-mail confirmé, adresse certifiée sur le référentiel officiel wallon SPW ICAR (ou BCE en B2B).
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col gap-3 hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary border border-border text-accent">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Carte radar 3 km &amp; Marge
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Visualisez la commune exacte dans un rayon anonymisé de <span className="font-mono tabular-nums">3 km</span>, la puissance kWc recommandée, la fourchette de devis et votre marge brute indicative.
                </p>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col gap-3 hover:border-accent/40 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary border border-border text-accent">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  CRM intégré &amp; Garantie 24 h
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Export vCard en <span className="font-mono tabular-nums">1</span> clic, suivi commercial de vos devis et recrédit garanti sous <span className="font-mono tabular-nums">24 h</span> ouvrées pour tout faux numéro ou prospect injoignable signalé sous <span className="font-mono tabular-nums">7 j</span>.
                </p>
              </div>
            </div>

            {/* Bannière Annuaire RESCert Inbound */}
            <div className="mt-8 rounded-2xl border border-accent/25 bg-accent/[0.04] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-accent/10 p-2 text-accent border border-accent/20 shrink-0">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground font-heading">
                    Votre entreprise est déjà certifiée RESCERT en Wallonie ou à Bruxelles ?
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Consultez les <span className="font-mono tabular-nums font-semibold text-foreground">783</span> installateurs recensés sur notre annuaire public et activez votre espace partenaire avec <span className="font-mono tabular-nums font-semibold text-foreground">3</span> crédits d&apos;essai offerts.
                  </p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="border-border hover:border-accent hover:text-accent font-mono text-xs font-semibold shrink-0">
                <Link href="/partenaires/annuaire">
                  Consulter l&apos;annuaire RESCERT
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ─── 2. Aperçu Interactif du Live Feed Marketplace (Exemples Réels Anonymisés + Drawer 3D) ─── */}
        <section
          id="apercu"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Aperçu Réel de la Marketplace
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Testez l&apos;inspection complète d&apos;un dossier (Photo, Vue 3D &amp; Radar)
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Basculez entre la photo réelle et la vue 3D directement sur chaque fiche, filtrez par province ou cliquez sur <strong className="text-foreground">Inspecter</strong> pour ouvrir le tiroir technique identique à votre portail.
              </p>
            </div>

            <MarketplaceLivePreview />
          </div>
        </section>

        {/* ─── 3. Choisissez votre niveau de concurrence (dont Exclusivité Totale B2C) ─── */}
        <section className="border-b border-border py-16 md:py-24 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Contrôle de la Concurrence
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Partagé à 3 max ou verrouillé rien que pour vous : vous décidez
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Un dossier résidentiel vous plaît particulièrement ? Verrouillez l&apos;Exclusivité Totale en <span className="font-mono tabular-nums">1</span> clic tant qu&apos;il est à <span className="font-mono tabular-nums">0/3</span> : il disparaît aussitôt pour tous vos concurrents.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Carte 1 : B2C Partagé */}
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 text-left shadow-xs flex flex-col justify-between gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 font-mono text-xs font-bold text-foreground border border-border">
                      <Home className="h-3.5 w-3.5 text-accent" />
                      B2C PARTAGÉ · MAX 3
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                      2 à 4 cr. (dès 19,50 € HT)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground font-heading">
                    Concurrence saine et transparente
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Maximum <span className="font-mono tabular-nums font-semibold text-foreground">3</span> installateurs RESCERT par dossier résidentiel. Vous voyez en temps réel le nombre exact de places restantes (<span className="font-mono tabular-nums">0/3</span>, <span className="font-mono tabular-nums">1/3</span>, <span className="font-mono tabular-nums">2/3</span>) avant d&apos;acheter.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border text-xs font-mono text-muted-foreground">
                  <span className="rounded-lg bg-secondary px-2.5 py-1 border border-border">Places visibles en direct</span>
                  <span className="rounded-lg bg-secondary px-2.5 py-1 border border-border">Taux de closing &gt; 35 %</span>
                </div>
              </div>

              {/* Carte 2 : EXCLUSIVITÉ TOTALE B2C ("Rien que pour vous") */}
              <div className="relative rounded-3xl border-2 border-accent bg-accent/[0.04] p-6 sm:p-7 text-left shadow-sm flex flex-col justify-between gap-5">
                <span className="absolute -top-3 right-6 rounded-full bg-accent text-accent-foreground px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                  0 Concurrent · Rien que pour vous
                </span>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-2.5 py-1 font-mono text-xs font-bold text-accent border border-accent/25">
                      <Sparkles className="h-3.5 w-3.5" />
                      EXCLUSIVITÉ TOTALE B2C
                    </span>
                    <span className="font-mono text-xs font-bold text-accent tabular-nums">
                      7 cr. (65,00 € HT)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground font-heading">
                    Rachetez un dossier particulier uniquement pour vous
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Disponible sur tout dossier à <span className="font-mono tabular-nums font-semibold text-foreground">0/3</span> : vous réservez les <span className="font-mono tabular-nums">3</span> créneaux d&apos;un coup, le dossier est retiré instantanément de la marketplace et le prospect reçoit un e-mail confirmant votre attribution prioritaire.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-4 border-t border-accent/20 text-xs font-mono text-foreground">
                  <span className="rounded-lg bg-card px-2.5 py-1 border border-accent/25">Retrait immédiat</span>
                  <span className="rounded-lg bg-card px-2.5 py-1 border border-accent/25">E-mail de confiance envoyé au client</span>
                </div>
              </div>

              {/* Carte 3 : B2B 100% Exclusif */}
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-7 text-left shadow-xs flex flex-col justify-between gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 font-mono text-xs font-bold text-primary-foreground">
                      <Building2 className="h-3.5 w-3.5" />
                      B2B · 100 % EXCLUSIF
                    </span>
                    <span className="font-mono text-xs font-bold text-accent tabular-nums">
                      6 à 12 cr. (59 à 118 € HT)
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground font-heading">
                    1 seul installateur par chantier tertiaire
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Toitures industrielles, PME, hangars agricoles et ombrières de parking (&gt; <span className="font-mono tabular-nums">30 kWc</span>). Dès l&apos;achat, la fiche est clôturée et vous négociez sans guerre des prix.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-4 border-t border-border text-xs font-mono text-muted-foreground">
                  <span className="rounded-lg bg-secondary px-2.5 py-1 border border-border">1:1 natif</span>
                  <span className="rounded-lg bg-secondary px-2.5 py-1 border border-border">TVA BCE vérifiée</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 4. Alertes Ultra-Personnalisées & Mode Auto-Pilot Plafonné ─── */}
        <section
          id="alertes"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Alertes sur Mesure &amp; Automatisation
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Paramétrez vos alertes par province, kWc, fréquence et Auto-Pilot
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Choisissez exactement ce que vous souhaitez recevoir — ou activez le mode Auto-Pilot plafonné pour sécuriser les meilleurs chantiers de votre secteur avant tout le monde.
              </p>
            </div>

            <AlertsAutopilotShowcase />
          </div>
        </section>

        {/* ─── 5. Matrice Comparative : Aegis Solaire vs Courtiers Traditionnels ─── */}
        <section
          id="comparatif"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Modèle de Distribution Éthique
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Pourquoi les installateurs agréés choisissent Aegis Solaire
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Conçu en rupture totale avec les plateformes de leads discount qui revendent les mêmes coordonnées sans vérification à huit concurrents.
              </p>
            </div>

            <div className="mt-12 overflow-x-auto rounded-3xl border border-border bg-card shadow-xs">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50 font-mono text-xs">
                    <th className="py-4 px-4 sm:px-6 font-semibold text-muted-foreground uppercase tracking-wider w-1/3">
                      Critères d&apos;exploitation
                    </th>
                    <th className="py-4 px-4 sm:px-6 font-bold text-accent uppercase tracking-wider w-1/3 bg-accent/[0.04] border-x border-accent/20">
                      <div className="flex items-center gap-1.5">
                        <BadgeCheck className="h-4 w-4 text-accent" />
                        <span>Aegis Solaire (Réseau Agréé)</span>
                      </div>
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
                          <span className="font-mono tabular-nums">100 %</span> Exclusif B2B · Max <span className="font-mono tabular-nums">3</span> B2C ou Exclusivité Totale (<span className="font-mono tabular-nums">65 € HT</span>)
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span><span className="font-mono tabular-nums">5</span> à <span className="font-mono tabular-nums">10</span> installateurs mis en concurrence sauvage</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-foreground">
                      Preuves techniques avant achat
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-accent/[0.02] border-x border-accent/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">
                          Photos réelles, vue 3D du toit, téléphone SMS (OTP), SPW ICAR &amp; carte radar <span className="font-mono tabular-nums">3 km</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Simple formulaire texte sans photo ni vérification SMS</span>
                      </div>
                    </td>
                  </tr>

                  <tr className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 sm:px-6 font-bold text-foreground">
                      Souplesse de paiement
                    </td>
                    <td className="py-4 px-4 sm:px-6 bg-accent/[0.02] border-x border-accent/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                        <span className="font-semibold text-foreground">
                          <span className="font-mono tabular-nums">0 €</span> d&apos;abonnement · À l&apos;unité, complément en € sur solde partiel ou packs jusqu&apos;à <span className="font-mono tabular-nums">-24 %</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Abonnements imposés de <span className="font-mono tabular-nums">300 € à 800 € / mois</span></span>
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
                          Réclamation sous <span className="font-mono tabular-nums">7 jours</span> ouvrés, traitement et recrédit sous <span className="font-mono tabular-nums">24 h</span> ouvrées
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Litiges fréquents, contestations bloquées</span>
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
                          Réservé aux installateurs certifiés RESCERT &amp; BCE vérifiée
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                        <span>Ouvert à des structures sans agrément photovoltaïque</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ─── 6. Simulateur de Rentabilité Métier (Interactive ROI) ─── */}
        <section
          id="simulateur-roi"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Modélisation Financière
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Simulateur de rentabilité : Anticipez votre carnet de commandes
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Découvrez la marge brute prévisionnelle générée chaque mois selon vos disponibilités de pose.
              </p>
            </div>

            <InstallerRoiCalculator />
          </div>
        </section>

        {/* ─── 7. Grille Tarifaire, Complément en €, Promotions Packs & Parrainage ─── */}
        <section
          id="tarifs"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Tarifs Transparents · Promotions &amp; Souplesse Totale
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                À l&apos;unité, en complément de crédits ou par packs jusqu&apos;à <span className="font-mono tabular-nums">-24 %</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Aucun abonnement mensuel imposé. À votre validation gratuite, vous recevez <strong className="text-foreground"><span className="font-mono tabular-nums">3</span> crédits d&apos;essai offerts</strong> (équivalent à <span className="font-mono tabular-nums">1</span> chantier résidentiel complet). Facture TVA <span className="font-mono tabular-nums">21 %</span> déductible transmise par e-mail.
              </p>
            </div>

            {/* Option 1 : Achat à l'unité & Complément en euros */}
            <div className="mb-10 max-w-5xl mx-auto rounded-3xl border-2 border-accent/40 bg-accent/[0.03] p-6 sm:p-8 shadow-xs flex flex-col gap-5">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent shrink-0">
                    <CreditCard className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-md border border-accent/20">
                        Option 1 · Paiement direct &amp; Complément en €
                      </span>
                      <span className="font-mono text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                        Bancontact · Payconiq · Visa/MC · KBC/Belfius
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground font-heading">
                      Zéro crédit bloqué : complétez vos crédits restants en euros
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                      Pas envie d&apos;acheter un pack complet ? Réglez chaque dossier à l&apos;unité par Bancontact. Et s&apos;il ne vous reste par exemple que <strong className="font-mono tabular-nums text-foreground">2 crédits</strong> sur un chantier à <strong className="font-mono tabular-nums text-foreground">3 crédits</strong>, la plateforme déduit automatiquement vos crédits et ne vous facture que le complément (soit <strong className="font-mono tabular-nums text-foreground">9,83 € HT</strong>).
                    </p>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-accent shrink-0 stroke-[2.5]" />
                        <span>Résidentiel B2C : <strong className="font-mono tabular-nums text-foreground">19,50 € à 39,00 € HT</strong> (ou Exclusivité <strong className="font-mono tabular-nums">65,00 € HT</strong>)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="h-4 w-4 text-accent shrink-0 stroke-[2.5]" />
                        <span>Tertiaire / PME B2B : <strong className="font-mono tabular-nums text-foreground">59,00 € à 118,00 € HT</strong> (<span className="font-mono tabular-nums">100 %</span> exclusif)</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:w-52">
                  <a href="#candidature" className="w-full">
                    <Button className="w-full rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer shadow-2xs">
                      Activer (+3 cr. offerts)
                    </Button>
                  </a>
                  <span className="text-[11px] text-center text-muted-foreground font-mono tabular-nums">
                    0 € / mois · Zéro engagement
                  </span>
                </div>
              </div>
            </div>

            {/* Option 2 : Promotions Packs de crédits */}
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Option 2 · Promotions Packs Dégressifs (Valables 12 mois)
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground font-heading mt-0.5">
                Réduisez votre coût par chantier jusqu&apos;à <span className="font-mono tabular-nums text-accent">-24 %</span> et débloquez en <span className="font-mono tabular-nums">1</span> clic
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Pack 12 */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-accent/40 transition-colors">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Pack Croissance (12 cr.)
                    </span>
                    <span className="rounded-md bg-[var(--aegis-availability-bg)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--aegis-availability-text)] tabular-nums">
                      Promo -8,5 %
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                      108,00 €
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-mono">HT</span>
                    <span className="block text-[11px] text-muted-foreground font-mono mt-0.5 tabular-nums">
                      130,68 € TTC · Économie 10,00 € HT
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Multiple exact de <span className="font-mono tabular-nums font-semibold text-foreground">2, 3, 4 et 6</span> : <span className="font-mono tabular-nums">4</span> dossiers B2C Standard, <span className="font-mono tabular-nums">6</span> Éco ou <span className="font-mono tabular-nums">2</span> B2B PME.
                  </p>
                  <ul className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span><strong className="font-mono tabular-nums">12 crédits</strong> (<span className="font-mono tabular-nums">9,00 € HT</span> / crédit)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span><span className="font-mono tabular-nums">+3</span> crédits d&apos;essai offerts à l&apos;activation</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span>Crédits utilisables en complément en €</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span>Valables <span className="font-mono tabular-nums">12 mois</span> · Zéro abonnement</span>
                    </li>
                  </ul>
                </div>
                <a href="#candidature">
                  <Button variant="outline" className="w-full rounded-xl text-xs font-semibold cursor-pointer">
                    Sélectionner 12 crédits
                  </Button>
                </a>
              </div>

              {/* Pack 24 */}
              <div className="bg-card border-2 border-accent rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5 relative">
                <div className="absolute -top-3 right-6 bg-accent text-accent-foreground px-3 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider shadow-2xs tabular-nums">
                  Recommandé · Promo -16 %
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider">
                      Pack Accélération (24 cr.)
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                      198,00 €
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-mono">HT</span>
                    <span className="block text-[11px] text-muted-foreground font-mono mt-0.5 tabular-nums">
                      239,58 € TTC · Économie 38,00 € HT
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Alimentez régulièrement <span className="font-mono tabular-nums font-semibold text-foreground">1</span> équipe de pose : <span className="font-mono tabular-nums">8</span> chantiers B2C Standard ou <span className="font-mono tabular-nums">3</span> B2C en Exclusivité Totale.
                  </p>
                  <ul className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-foreground font-medium">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span><strong className="font-mono tabular-nums">24 crédits</strong> (<span className="font-mono tabular-nums">8,25 € HT</span> / crédit)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span>Compatible Auto-Pilot &amp; Exclusivité B2C</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span>Complément automatique en € sur solde restant</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0 stroke-[3]" />
                      <span>Valables <span className="font-mono tabular-nums">12 mois</span> · Zéro abonnement</span>
                    </li>
                  </ul>
                </div>
                <a href="#candidature">
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl text-xs font-bold shadow-xs cursor-pointer">
                    Postuler &amp; activer 24 crédits
                  </Button>
                </a>
              </div>

              {/* Pack 60 */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-5 hover:border-accent/40 transition-colors">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Pack Régie (60 cr.)
                    </span>
                    <span className="rounded-md bg-[var(--aegis-availability-bg)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--aegis-availability-text)] tabular-nums">
                      Promo -24 %
                    </span>
                  </div>
                  <div>
                    <span className="text-3xl font-extrabold font-mono tabular-nums text-foreground">
                      450,00 €
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5 font-mono">HT</span>
                    <span className="block text-[11px] text-muted-foreground font-mono mt-0.5 tabular-nums">
                      544,50 € TTC · Économie 140,00 € HT
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tarif plancher pour équipes actives et Auto-Pilot : <span className="font-mono tabular-nums">20</span> chantiers B2C ou <span className="font-mono tabular-nums">5</span> Grands Comptes B2B.
                  </p>
                  <ul className="flex flex-col gap-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span><strong className="font-mono tabular-nums text-foreground">60 crédits</strong> (<span className="font-mono tabular-nums">7,50 € HT</span> / crédit)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Facturation conforme TVA <span className="font-mono tabular-nums">21 %</span> / Peppol</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Support prioritaire par e-mail</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>Valables <span className="font-mono tabular-nums">12 mois</span> · Zéro abonnement</span>
                    </li>
                  </ul>
                </div>
                <a href="#candidature">
                  <Button variant="outline" className="w-full rounded-xl text-xs font-semibold cursor-pointer">
                    Sélectionner 60 crédits
                  </Button>
                </a>
              </div>
            </div>

            {/* Encart Programme Parrainage RESCERT */}
            <div className="mt-10 max-w-5xl mx-auto rounded-3xl border border-border bg-card p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 rounded-2xl bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] flex items-center justify-center shrink-0">
                  <Users2 className="h-5 w-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
                      Programme Parrainage RESCERT
                    </span>
                    <span className="rounded-md bg-[var(--aegis-availability-bg)] text-[var(--aegis-availability-text)] px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums">
                      +3 crédits offerts chacun
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">
                    Recommandez un confrère installateur en Wallonie ou à Bruxelles
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    Dès que votre confrère RESCERT parrainé effectue son premier achat payant (à l&apos;unité ou par pack), vous recevez automatiquement <strong className="font-mono tabular-nums text-foreground">+3 crédits offerts</strong> sur votre compte — et lui aussi, sans limite de province ni plafond de parrainage.
                  </p>
                </div>
              </div>
              <a href="#candidature" className="shrink-0">
                <Button variant="outline" className="rounded-xl text-xs font-bold border-border hover:border-accent hover:text-accent cursor-pointer">
                  Obtenir mon lien parrainage
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </a>
            </div>

            {/* Box Rentabilité Métier Exemple */}
            <div className="mt-6 max-w-5xl mx-auto bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-secondary flex items-center justify-center text-primary shrink-0">
                <TrendingUp className="h-5 w-5 text-accent" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  Exemple concret d&apos;exploitation (Chantier B2B toiture PME)
                </span>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  Débloquez <span className="font-mono tabular-nums">1</span> dossier B2B toiture industrielle à <strong className="font-mono tabular-nums">9 crédits</strong> (soit <span className="font-mono tabular-nums font-semibold">88,50 € HT</span> à l&apos;unité). Signez un chantier de <span className="font-mono tabular-nums font-semibold">60 kWc</span> (~<span className="font-mono tabular-nums">54 000 € HT</span>). Votre marge brute moyenne réalisée dépasse <strong className="font-mono tabular-nums font-bold text-accent">9 000 € HT</strong>. Le retour sur investissement est immédiat dès le premier dossier transformé.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 8. Témoignages & Chiffres Clés ─── */}
        <section
          id="temoignages"
          className="scroll-mt-24 border-b border-border py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Retours du Terrain
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Ce que disent nos installateurs certifiés en Wallonie
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Des professionnels agréés RESCERT qui alimentent leurs équipes sans perte de temps commerciale.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-accent-solar">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    « La fin des leads vendus à <span className="font-mono tabular-nums">8</span> concurrents qui cassent les prix. En B2B comme en Exclusivité Totale B2C, on travaille sereinement sur des dossiers complets avec photos de la toiture. »
                  </p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground text-xs block font-heading">Laurent D.</span>
                    <span className="text-[11px] text-muted-foreground">Directeur Technique, Liège</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                    RESCERT Vérifié
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-accent-solar">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    « Voir la photo du bâtiment, la vue 3D et le numéro validé par SMS OTP change tout avant de décrocher son téléphone. On sait exactement où on met les pieds avant d&apos;appeler. »
                  </p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground text-xs block font-heading">Marc V.</span>
                    <span className="text-[11px] text-muted-foreground">Gérant, Namur</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                    RESCERT Vérifié
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1 text-accent-solar">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
                    « La réclamation sous <span className="font-mono tabular-nums">7 jours</span> ouvrés avec recrédit sous <span className="font-mono tabular-nums">24 h</span> ouvrées et le paiement à la carte sans abonnement rassurent vraiment la trésorerie. »
                  </p>
                </div>
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground text-xs block font-heading">Philippe T.</span>
                    <span className="text-[11px] text-muted-foreground">Fondateur, Brabant Wallon</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                    RESCERT Vérifié
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="rounded-2xl border border-border bg-card p-5">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                  +3 cr.
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Offerts à l&apos;activation</span>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-accent tabular-nums">
                  100 %
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Certifiés RESCERT Wallonie</span>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                  &lt; 24 h
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Arbitrage garantie contact</span>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                  0 €
                </span>
                <span className="text-xs text-muted-foreground block mt-1">Abonnement imposé</span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 9. Comment ça fonctionne (Timeline 3 étapes) ─── */}
        <section className="border-b border-border py-16 md:py-24 bg-background [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">Parcours Intégration</span>
              <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Comment rejoindre la marketplace en <span className="font-mono tabular-nums">3</span> étapes simples ?
              </h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="relative rounded-3xl border border-border bg-card p-6 shadow-xs hover:border-accent/30 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-mono font-bold text-primary-foreground shadow-2xs tabular-nums">
                  01
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">Candidature en ligne</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Remplissez le formulaire ci-dessous avec votre raison sociale, numéro BCE et référence d&apos;agrément RESCERT Photovoltaïque.
                </p>
              </div>

              <div className="relative rounded-3xl border border-border bg-card p-6 shadow-xs hover:border-accent/30 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-mono font-bold text-primary-foreground shadow-2xs tabular-nums">
                  02
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">Validation &amp; 3 crédits offerts</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Notre équipe contrôle votre agrément RESCERT sous <span className="font-mono tabular-nums font-semibold text-foreground">24 à 48 h</span> et crédite votre compte d&apos;accueil pour tester votre <span className="font-mono tabular-nums">1er</span> chantier.
                </p>
              </div>

              <div className="relative rounded-3xl border border-border bg-card p-6 shadow-xs hover:border-accent/30 transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-sm font-mono font-bold text-primary-foreground shadow-2xs tabular-nums">
                  03
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground font-heading">Live Feed, Alertes &amp; Déblocage</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  Configurez vos provinces, activez ou non l&apos;Auto-Pilot, inspectez photos et vue 3D, puis débloquez uniquement les projets qui vous intéressent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 10. Formulaire de Candidature Sécurisé ─── */}
        <section
          id="candidature"
          className="scroll-mt-24 py-16 md:py-24 bg-secondary/30 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        >
          <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(15,23,42,0.05)]">
              <InstallerRegistrationForm />

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

        {/* ─── 11. FAQ Spécifique Installateurs ─── */}
        <section className="border-t border-border py-16 md:py-20 bg-card [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 flex flex-col gap-2">
              <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
                Questions Fréquentes
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground font-heading">
                Questions fréquentes des installateurs photovoltaïques
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs sm:text-sm">
              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Comment fonctionne le complément en euros (zéro crédit bloqué) ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  S&apos;il ne vous reste par exemple que <strong className="font-mono tabular-nums text-foreground">2 crédits</strong> et que vous souhaitez un chantier à <strong className="font-mono tabular-nums text-foreground">3 crédits</strong>, vous n&apos;êtes plus obligé de racheter un pack complet : vos <span className="font-mono tabular-nums">2</span> crédits sont déduits et vous ne réglez que la différence (<strong className="font-mono tabular-nums text-foreground">9,83 € HT</strong>) par Bancontact ou Carte.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Puis-je acheter un dossier résidentiel rien que pour moi ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Oui. Tout dossier B2C qui affiche encore <span className="font-mono tabular-nums font-semibold text-foreground">0/3</span> places prises propose l&apos;option <strong className="text-foreground">Exclusivité Totale</strong> (<strong className="font-mono tabular-nums">7</strong> crédits ou <strong className="font-mono tabular-nums">65 € HT</strong>). Le chantier disparaît aussitôt pour tous vos concurrents et nous informons le particulier de votre attribution prioritaire.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Comment fonctionnent les alertes personnalisées &amp; l&apos;Auto-Pilot ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Depuis votre portail, vous filtrez vos alertes par province wallonne, segment (B2B/B2C), type de toiture, puissance minimale (<span className="font-mono tabular-nums">kWc</span>) et fréquence anti-spam. Vous pouvez aussi activer le mode Auto-Pilot avec un plafond strict de <span className="font-mono tabular-nums">1 à 20</span> dossiers sur <span className="font-mono tabular-nums">7</span> jours glissants.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Comment fonctionne le programme de parrainage RESCERT ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Chaque partenaire validé dispose d&apos;un lien d&apos;invitation personnel dans son portail. Lorsqu&apos;un confrère certifié RESCERT (toute province confondue) s&apos;inscrit via ce lien et réalise son <span className="font-mono tabular-nums">1er</span> achat payant, vous recevez tous les deux <strong className="font-mono tabular-nums text-foreground">+3 crédits offerts</strong> automatiquement.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Que se passe-t-il si un prospect est injoignable ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Si un numéro est non attribué ou déjà équipé, le signalement est immédiat. S&apos;il reste injoignable après <span className="font-mono tabular-nums">3</span> tentatives documentées sur au moins <span className="font-mono tabular-nums">24 h</span>, la réclamation s&apos;effectue sous <span className="font-mono tabular-nums">7 jours</span> ouvrés depuis votre tableau de bord, avec arbitrage et recrédit sous <span className="font-mono tabular-nums">24 h</span> ouvrées.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-secondary/40 border border-border flex flex-col gap-2">
                <h3 className="font-bold text-foreground font-heading">Y a-t-il un abonnement et quelle est la validité des crédits ?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  <strong className="font-mono tabular-nums text-foreground">0 €</strong> d&apos;abonnement mensuel. Les crédits achetés en pack sont valables <strong className="font-mono tabular-nums text-foreground">12 mois</strong> à compter de leur achat (Art. 4.3 des{" "}
                  <Link href="/cgv" className="font-semibold text-foreground underline underline-offset-4 hover:text-accent">
                    CGV
                  </Link>
                  ) et ne restent jamais bloqués grâce au complément en euros.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 12. Call to Action Final Haute Conversion ─── */}
        <section className="border-t border-border py-16 sm:py-20 bg-primary text-primary-foreground [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <span className="font-mono text-xs uppercase tracking-widest text-accent font-semibold">
              Accélérateur de Croissance Solaire
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-primary-foreground font-heading">
              Prêt à alimenter vos équipes de pose sans prospection à froid ?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-primary-foreground/80 leading-relaxed">
              Rejoignez les installateurs agréés RESCERT qui développent leur carnet de commandes en Wallonie en toute transparence. Activation gratuite avec <span className="font-mono tabular-nums font-semibold text-primary-foreground">3</span> crédits offerts.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
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
                  className="w-full sm:w-auto px-7 py-3.5 h-12 border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 font-semibold rounded-xl cursor-pointer backdrop-blur-md transition-colors"
                >
                  <Lock className="h-4 w-4 mr-2 text-accent" />
                  Accéder à mon espace partenaire
                </Button>
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}
