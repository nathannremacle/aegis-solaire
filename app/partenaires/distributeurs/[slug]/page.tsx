import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BadgeCheck, Building2, CheckCircle2, ShieldCheck } from "lucide-react"
import { Footer } from "@/components/footer"
import { InstallerRegistrationForm } from "@/components/installer-registration-form"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { resolveDistributorByCodeOrSlug } from "@/lib/distributor-partners"

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
    title: `Programme Partenaire ${dist.company_name} × Aegis Solaire | +3 Crédits Offerts`,
    description: `Accès privilégié réservé aux installateurs clients de ${dist.company_name} : inscrivez votre entreprise RESCERT gratuitement (0 € abonnement) et recevez +${dist.reward_credits_referred} crédits offerts dès votre 1er achat payant.`,
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <main className="flex-1">
        <section className="border-b border-border py-12 md:py-16 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col gap-5">
            <Link
              href="/partenaires/distributeurs"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground w-fit"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Programme Alliés Distributeurs</span>
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/25 px-3 py-1 font-mono text-xs font-semibold text-accent w-fit">
              <Building2 className="h-3.5 w-3.5" />
              <span>PARTENAIRE DISTRIBUTEUR · {dist.company_name.toUpperCase()}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-heading">
              {dist.company_name} × Aegis Solaire :{" "}
              <span className="font-mono tabular-nums text-accent">
                +{dist.reward_credits_referred}
              </span>{" "}
              crédits offerts
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              En tant qu&apos;installateur certifié RESCERT client de{" "}
              <strong className="text-foreground">{dist.company_name}</strong>, activez votre accès gratuit à la marketplace Aegis Solaire (<span className="font-mono tabular-nums">0 €</span> d&apos;abonnement mensuel) et recevez{" "}
              <strong className="font-mono tabular-nums text-foreground">
                +{dist.reward_credits_referred} crédits offerts
              </strong>{" "}
              dès votre <span className="font-mono tabular-nums">1er</span> achat payant.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs sm:text-sm">
              <div className="rounded-xl border border-border bg-secondary/40 p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>Téléphone vérifié par SMS (OTP) + photo &amp; vue 3D du toit avant paiement</span>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-3.5 flex items-start gap-2.5">
                <BadgeCheck className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>B2C plafonné à 3 max (ou exclusif) · B2B tertiaire 100 % exclusif</span>
              </div>
              <div className="rounded-xl border border-border bg-secondary/40 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>Garantie injoignabilité 7 j. avec recrédit sous 24 h ouvrées</span>
              </div>
            </div>
          </div>
        </section>

        <section id="candidature" className="py-12 md:py-16 bg-secondary/30">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xs">
              <InstallerRegistrationForm
                initialDistributorCode={dist.referral_code}
                distributorName={dist.company_name}
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
