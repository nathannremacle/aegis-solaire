import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import {
  getAllRescertInstallers,
  getNearbyRescertInstallers,
  getPartnerVerificationStatusForInstaller,
  getRescertInstallerBySlug,
} from "@/lib/rescert-directory"

export const revalidate = 3600

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

export function generateStaticParams() {
  return getAllRescertInstallers().map((inst) => ({ slug: inst.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const installer = getRescertInstallerBySlug(slug)
  if (!installer) return {}

  return {
    title: `${installer.companyName} — Installateur Photovoltaïque RESCert à ${installer.city} (${installer.postalCode}) | Aegis Solaire`,
    description: `Fiche officielle RESCert Photovoltaïque de ${installer.companyName} à ${installer.postalCode} ${installer.city} (${installer.provinceLabel}). Titulaire agréé : ${installer.certifiedPerson}.`,
    alternates: {
      canonical: `${baseUrl}/partenaires/annuaire/${installer.slug}`,
    },
  }
}

export default async function RescertInstallerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const installer = getRescertInstallerBySlug(slug)
  if (!installer) {
    notFound()
  }

  const verification = await getPartnerVerificationStatusForInstaller(installer)
  const nearbyInstallers = getNearbyRescertInstallers(installer, 6)
  const claimHref = `/partenaires?claim=${encodeURIComponent(installer.id)}#candidature`

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: installer.companyName,
    description: `Installateur photovoltaïque certifié RESCert à ${installer.city} (${installer.provinceLabel}).`,
    address: {
      "@type": "PostalAddress",
      addressLocality: installer.city,
      postalCode: installer.postalCode,
      addressRegion: installer.provinceLabel,
      addressCountry: "BE",
    },
    areaServed: installer.provinceLabel,
    url: `${baseUrl}/partenaires/annuaire/${installer.slug}`,
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground font-sans">
      <main className="flex-1">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <section className="border-b border-border py-12 md:py-16 bg-card">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-muted-foreground">
              <Link
                href="/partenaires/annuaire"
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Annuaire RESCert</span>
              </Link>
              <span>/</span>
              <Link
                href={`/partenaires/annuaire/province/${installer.provinceKey}`}
                className="hover:text-foreground"
              >
                {installer.provinceLabel}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/25 px-3 py-1 font-mono text-xs font-bold text-accent">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>AGRÉMENT RESCERT PHOTOVOLTAÏQUE</span>
              </span>

              {verification.isVerifiedPartner && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--aegis-availability-bg)] border border-[var(--aegis-availability-text)]/30 px-3 py-1 font-mono text-xs font-bold text-[var(--aegis-availability-text)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>PARTENAIRE VÉRIFIÉ AEGIS SOLAIRE</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-heading">
              {installer.companyName}
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-accent shrink-0" />
                <span>
                  <span className="font-mono tabular-nums font-semibold text-foreground">
                    {installer.postalCode}
                  </span>{" "}
                  {installer.city} ({installer.provinceLabel})
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-accent shrink-0" />
                <span>Titulaire certifié : {installer.certifiedPerson}</span>
              </span>
            </p>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 flex flex-col gap-5 shadow-2xs">
                <h2 className="text-lg sm:text-xl font-bold text-foreground font-heading">
                  Informations techniques &amp; certification
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="rounded-xl border border-border bg-secondary/40 p-4 flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Entreprise
                    </span>
                    <span className="font-bold text-foreground">{installer.companyName}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-4 flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Titulaire RESCert
                    </span>
                    <span className="font-bold text-foreground">{installer.certifiedPerson}</span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-4 flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Localité d&apos;implantation
                    </span>
                    <span className="font-bold text-foreground">
                      <span className="font-mono tabular-nums">{installer.postalCode}</span>{" "}
                      {installer.city}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/40 p-4 flex flex-col gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Catégorie officielle
                    </span>
                    <span className="font-bold text-foreground">{installer.category}</span>
                  </div>
                </div>

                {verification.isVerifiedPartner ? (
                  <div className="rounded-2xl border border-[var(--aegis-availability-text)]/30 bg-[var(--aegis-availability-bg)]/50 p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--aegis-availability-text)]">
                      <BadgeCheck className="h-5 w-5 shrink-0" />
                      <span>Entreprise active sur le réseau partenaire Aegis Solaire</span>
                    </div>
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                      Cette entreprise a complété la validation de son compte partenaire RESCERT et peut récupérer son badge officiel vérifié directement dans son portail.
                    </p>
                    <div className="pt-1">
                      <img
                        src={`/api/badges/rescert/${encodeURIComponent(installer.slug)}`}
                        alt={`Badge officiel ${installer.companyName} — Partenaire RESCERT Aegis Solaire`}
                        width={280}
                        height={72}
                        className="rounded-xl border border-border bg-card"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-5 sm:p-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                        Fiche entreprise non encore revendiquée
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-foreground font-heading">
                        Vous dirigez {installer.companyName} ? Revendiquez gratuitement cette fiche
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Activez votre espace partenaire en <span className="font-mono tabular-nums">2</span> min (<span className="font-mono tabular-nums">0 €</span> d&apos;abonnement) : recevez nos dossiers solaires vérifiés en {installer.provinceLabel}, accédez au générateur de Note CFO DPI <span className="font-mono tabular-nums">40 %</span> et affichez le badge officiel RESCERT vérifié sur votre site web.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button asChild className="rounded-xl text-xs sm:text-sm font-bold gap-2">
                        <Link href={claimHref}>
                          <span>Revendiquer cette fiche gratuitement</span>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-xl text-xs font-semibold gap-2">
                        <Link href="/partenaires/outils/calculateur-dpi-b2b">
                          <Calculator className="h-4 w-4 text-accent" />
                          <span>Outil gratuit DPI 40 %</span>
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <aside className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4 h-fit shadow-2xs">
                <h2 className="text-base font-bold text-foreground font-heading">
                  Vous êtes propriétaire ou PME à {installer.city} ?
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aegis Solaire met en concurrence jusqu&apos;à <span className="font-mono tabular-nums font-semibold text-foreground">3</span> installateurs certifiés RESCERT de {installer.provinceLabel} sur un cahier des charges Tier-1 strict pour vous obtenir le meilleur prix, sans aucun compromis sur la qualité.
                </p>
                <Button asChild variant="default" className="w-full rounded-xl text-xs font-bold">
                  <Link href="/devis-panneaux-solaires">
                    Comparer des devis RESCERT (Gratuit)
                  </Link>
                </Button>
                <div className="border-t border-border pt-4 flex flex-col gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Pour les installateurs en {installer.provinceLabel} :
                  </span>
                  <Link
                    href={`/partenaires/annuaire/province/${installer.provinceKey}`}
                    className="text-accent hover:underline font-medium"
                  >
                    Voir tous les certifiés en {installer.provinceLabel} &rarr;
                  </Link>
                </div>
              </aside>
            </div>

            {nearbyInstallers.length > 0 && (
              <div className="flex flex-col gap-4 pt-4 border-t border-border">
                <h2 className="text-lg font-bold text-foreground font-heading">
                  Autres installateurs RESCert en {installer.provinceLabel}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearbyInstallers.map((peer) => (
                    <Link
                      key={peer.id}
                      href={`/partenaires/annuaire/${peer.slug}`}
                      className="rounded-2xl border border-border bg-card p-4 hover:border-accent/40 transition-colors flex flex-col gap-1.5"
                    >
                      <span className="font-bold text-sm text-foreground line-clamp-1">
                        {peer.companyName}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span>
                          <span className="font-mono tabular-nums">{peer.postalCode}</span> {peer.city}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
