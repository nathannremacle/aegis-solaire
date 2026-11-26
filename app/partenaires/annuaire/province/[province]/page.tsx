import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, Calculator, MapPin, ShieldCheck } from "lucide-react"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  getRescertInstallersByProvince,
  PROVINCE_SEO_META,
} from "@/lib/rescert-directory"

export const revalidate = 3600

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

export function generateStaticParams() {
  return Object.keys(PROVINCE_SEO_META).map((province) => ({ province }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ province: string }>
}) {
  const { province } = await params
  const meta = PROVINCE_SEO_META[province]
  if (!meta) return {}

  const count = getRescertInstallersByProvince(meta.key).length
  return {
    title: `${meta.title} (${count} entreprises) | Aegis Solaire`,
    description: `${meta.description} Consultez les ${count} installateurs photovoltaïques certifiés RESCert en ${meta.shortLabel}.`,
    alternates: {
      canonical: `${baseUrl}/partenaires/annuaire/province/${meta.key}`,
    },
  }
}

export default async function ProvinceDirectoryPage({
  params,
}: {
  params: Promise<{ province: string }>
}) {
  const { province } = await params
  const meta = PROVINCE_SEO_META[province]
  if (!meta) {
    notFound()
  }

  const installers = getRescertInstallersByProvince(meta.key)
  const otherProvinces = Object.values(PROVINCE_SEO_META).filter((p) => p.key !== meta.key)

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: meta.title,
    description: meta.description,
    numberOfItems: installers.length,
    itemListElement: installers.slice(0, 40).map((inst, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${baseUrl}/partenaires/annuaire/${inst.slug}`,
      name: inst.companyName,
    })),
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <section className="border-b border-border py-12 md:py-16 bg-card">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col gap-5">
            <Link
              href="/partenaires/annuaire"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground w-fit"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retour à l&apos;annuaire complet</span>
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/25 px-3 py-1 font-mono text-xs font-semibold text-accent w-fit">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>REGISTRE OFFICIEL RESCERT · {meta.shortLabel.toUpperCase()}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground font-heading">
              {meta.title}
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl leading-relaxed">
              Répertoire des{" "}
              <strong className="font-mono tabular-nums text-foreground">{installers.length}</strong>{" "}
              installateurs photovoltaïques certifiés RESCert basés en {meta.label} ({meta.mainCities.join(", ")}).
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {otherProvinces.map((p) => (
                <Link
                  key={p.key}
                  href={`/partenaires/annuaire/province/${p.key}`}
                  className="rounded-lg border border-border bg-secondary/60 hover:bg-secondary px-3 py-1.5 text-xs font-mono text-foreground transition-colors"
                >
                  {p.shortLabel}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
            <div className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  Installateurs en {meta.shortLabel}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  Recevez des chantiers vérifiés en {meta.shortLabel} (0 € abonnement) ou simulez la DPI 40 % B2B.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 shrink-0">
                <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-semibold gap-1.5">
                  <Link href="/partenaires/outils/calculateur-dpi-b2b">
                    <Calculator className="h-3.5 w-3.5 text-accent" />
                    <span>Calculateur DPI 40 %</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5">
                  <Link href="/partenaires#candidature">
                    <span>Rejoindre le réseau</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {installers.map((inst) => (
                <div
                  key={inst.id}
                  className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between gap-4 shadow-2xs hover:border-accent/40 transition-colors"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-bold text-accent border border-accent/20">
                        <BadgeCheck className="h-3 w-3" />
                        RESCERT PV
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                        {inst.postalCode}
                      </span>
                    </div>

                    <Link
                      href={`/partenaires/annuaire/${inst.slug}`}
                      className="font-heading text-base font-bold text-foreground hover:text-accent transition-colors line-clamp-1"
                    >
                      {inst.companyName}
                    </Link>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>
                        <span className="font-mono tabular-nums">{inst.postalCode}</span> {inst.city}
                      </span>
                    </p>

                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1 border-t border-border/60">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{inst.certifiedPerson}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button asChild variant="outline" size="sm" className="flex-1 text-xs rounded-xl">
                      <Link href={`/partenaires/annuaire/${inst.slug}`}>Voir la fiche</Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1 text-xs rounded-xl">
                      <Link href={`/partenaires?claim=${encodeURIComponent(inst.id)}#candidature`}>
                        Revendiquer
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
