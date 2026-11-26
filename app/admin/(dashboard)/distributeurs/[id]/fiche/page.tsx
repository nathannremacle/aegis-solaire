import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BadgeCheck, Building2, CheckCircle2, Coins, ShieldCheck } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/admin"
import { resolveDistributorLogoPath } from "@/lib/distributor-partners"
import { PrintButton } from "@/components/admin/print-fiche-button"

export const dynamic = "force-dynamic"

export default async function DistributorPitchSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createServiceRoleClient()
  const { data: dist } = await supabase
    .from("distributor_partners")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!dist) {
    notFound()
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")
  const cobrandedUrl = `${baseUrl}/partenaires/distributeurs/${dist.slug}`
  const distributorLogo = resolveDistributorLogoPath(dist.slug)

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/admin/distributeurs"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour aux distributeurs</span>
        </Link>
        <PrintButton />
      </div>

      {/* Fiche A4 1 Page Win-Win */}
      <article className="rounded-3xl border border-border bg-card p-8 sm:p-10 flex flex-col gap-6 shadow-xs print:border-0 print:shadow-none print:p-2">
        <header className="border-b border-border pb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3 pb-1">
              <img src="/logo.png" alt="Aegis Solaire" className="h-7 w-auto object-contain" />
              <span className="font-mono text-sm text-muted-foreground">×</span>
              {distributorLogo ? (
                <img
                  src={distributorLogo}
                  alt={dist.company_name}
                  className="h-7 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <span className="font-heading text-base font-extrabold text-foreground">
                  {dist.company_name}
                </span>
              )}
            </div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              Accord de Partenariat Win-Win · Wallonie &amp; Bruxelles
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
              {dist.company_name} × Aegis Solaire
            </h1>
            <p className="text-sm text-muted-foreground">
              Programme « Alliés Distributeurs PV » — Développement du carnet de chantiers de vos clients installateurs RESCERT
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-right font-mono">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
              Code Partenaire
            </span>
            <span className="text-sm font-extrabold text-foreground">{dist.referral_code}</span>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-secondary/30 p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <Building2 className="h-4 w-4 text-accent" />
              <span>Pourquoi c&apos;est gagnant pour {dist.company_name}</span>
            </div>
            <ul className="text-xs sm:text-sm text-muted-foreground flex flex-col gap-1.5">
              <li>• Vos clients installateurs signent davantage de projets en Wallonie.</li>
              <li>• Chaque chantier signé génère de nouvelles commandes matériel chez vous (panneaux, onduleurs, batteries, structures).</li>
              <li>• <strong className="text-foreground">0 € de coût, 0 gestion administrative</strong> : Aegis Solaire opère tout l&apos;outil.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-secondary/30 p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <Coins className="h-4 w-4 text-accent" />
              <span>Avantage exclusif pour vos installateurs clients</span>
            </div>
            <ul className="text-xs sm:text-sm text-muted-foreground flex flex-col gap-1.5">
              <li>
                • <strong className="font-mono tabular-nums text-foreground">+{dist.reward_credits_referred} crédits offerts</strong> automatiquement dès leur <span className="font-mono tabular-nums">1er</span> achat payant.
              </li>
              <li>• <strong className="font-mono tabular-nums text-foreground">0 €</strong> d&apos;abonnement mensuel, paiement à l&apos;acte possible via Bancontact.</li>
              <li>• Accès au Générateur de Note Financière DPI <span className="font-mono tabular-nums">40 %</span> B2B en marque blanche.</li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span>Nos 4 garanties de qualité technique pour vos meilleurs poseurs</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>Numéro de téléphone validé par code SMS (OTP) + e-mail et adresse SPW ICAR vérifiés.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>Photos réelles du bâtiment + vue 3D aérienne consultables gratuitement avant tout paiement.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>Concurrence strictement plafonnée : max 3 en B2C (ou exclusif), max 2 en B2B (ou exclusif).</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>Garantie injoignabilité 7 jours ouvrés avec recrédit sous 24 h ouvrées.</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <BadgeCheck className="h-4 w-4 text-accent" />
            <span>Lien d&apos;accès co-brandé prêt à diffuser à vos clients RESCERT</span>
          </div>
          <p className="font-mono text-xs sm:text-sm font-bold text-foreground break-all">
            {cobrandedUrl}
          </p>
          <p className="text-xs text-muted-foreground">
            À partager par e-mail, newsletter clients ou au comptoir via vos représentants technico-commerciaux.
          </p>
        </section>

        <footer className="border-t border-border pt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>La Direction des Partenariats Aegis Solaire · contact@aegissolaire.com</span>
          <span>Plateforme éditée par INIT42 (Nathan Remacle) · BCE BE 1039.899.980 · Liège, Belgique</span>
        </footer>
      </article>
    </div>
  )
}
