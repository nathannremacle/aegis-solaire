import Link from "next/link"
import { ArrowRight, Building2, CheckCircle2, Coins, Mail, ShieldCheck, TrendingUp } from "lucide-react"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

export const metadata = {
  title: "Programme Alliés Distributeurs & Grossistes Photovoltaïques | Aegis Solaire",
  description:
    "Partenariat gagnant-gagnant pour grossistes et distributeurs solaires en Belgique : offrez +3 crédits à vos installateurs clients RESCERT et augmentez leurs commandes de matériel.",
  alternates: {
    canonical: `${baseUrl}/partenaires/distributeurs`,
  },
}

export default function DistributeursProgrammePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <main className="flex-1">
        <section className="border-b border-border py-14 md:py-20 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/25 px-3 py-1 font-mono text-xs font-semibold text-accent w-fit">
              <Building2 className="h-3.5 w-3.5" />
              <span>ALLIÉS DISTRIBUTEURS &amp; GROSSISTES PV · BELGIQUE</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-heading">
              Alimentez le carnet de commandes de vos installateurs RESCERT
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              Plus vos clients installateurs signent de chantiers photovoltaïques vérifiés en Wallonie et à Bruxelles, plus ils commandent de panneaux, onduleurs et batteries chez vous. Aegis Solaire met en place un programme <strong className="text-foreground">100 % gratuit</strong> et co-brandé pour vos comptoirs et forces de vente.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="rounded-xl text-xs sm:text-sm font-bold gap-2">
                <a href="mailto:contact@aegissolaire.com?subject=Partenariat%20Alli%C3%A9%20Distributeur%20PV">
                  <Mail className="h-4 w-4" />
                  <span>Activer un partenariat distributeur</span>
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl text-xs sm:text-sm font-semibold gap-2">
                <Link href="/partenaires">
                  <span>Découvrir la Marketplace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Coins className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground font-heading">
                <span className="font-mono tabular-nums">+3</span> crédits offerts à vos clients
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Chaque installateur RESCERT qui rejoint Aegis Solaire via votre lien co-brandé reçoit automatiquement <span className="font-mono tabular-nums font-semibold text-foreground">+3</span> crédits bonus dès son <span className="font-mono tabular-nums">1er</span> achat payant (<span className="font-mono tabular-nums">0 €</span> d&apos;abonnement).
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground font-heading">
                Zéro concurrence sauvage
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Téléphone vérifié par code SMS (OTP), photos et vue <span className="font-mono tabular-nums">3D</span> du toit, plafond strict de <span className="font-mono tabular-nums">3</span> installateurs en résidentiel et <span className="font-mono tabular-nums">2</span> maximum en B2B tertiaire (ou exclusif).
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 shadow-2xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold text-foreground font-heading">
                Page co-brandée &amp; suivi clé-en-main
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nous déployons votre page dédiée à vos couleurs avec code partenaire unique, outils B2B gratuits (Note CFO DPI <span className="font-mono tabular-nums">40 %</span>) et suivi trimestriel des chantiers débloqués.
              </p>
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-10">
            <div className="rounded-2xl border border-border bg-secondary/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-foreground">
                    Direction des Partenariats Aegis Solaire
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Écrivez-nous à <strong className="font-mono text-foreground">contact@aegissolaire.com</strong> pour obtenir votre lien distributeur et votre fiche partenariat en <span className="font-mono tabular-nums">24 h</span>.
                  </span>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold shrink-0">
                <a href="mailto:contact@aegissolaire.com?subject=Demande%20Partenariat%20Grossiste%20Aegis%20Solaire">
                  Contacter l&apos;équipe
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
