import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Metadata } from "next"
import { FileText, Wallet, Video, Clock } from "lucide-react"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Ressources",
  description:
    "Études de cas, subventions & financement, webinaires Loi LOM. Ressources Aegis Solaire pour votre projet photovoltaïque B2B.",
  alternates: { canonical: `${baseUrl}/ressources` },
}

const resources = [
  {
    id: "etudes-de-cas",
    icon: FileText,
    title: "Études de cas chiffrées",
    description:
      "Résultats concrets : entrepôts, parkings, sites industriels. ROI, économies annuelles et mise en conformité Loi LOM.",
    href: "/#preuve",
    available: true,
  },
  {
    id: "subventions",
    icon: Wallet,
    title: "Subventions & financement",
    description:
      "PPA, tiers-investissement, aides publiques et stockage batterie. Notre expertise sur le financement de votre projet.",
    href: "/#expert",
    available: true,
  },
  {
    id: "webinaires",
    icon: Video,
    title: "Webinaires Loi LOM",
    description:
      "Replay : Masterclass Zéro CAPEX — financer 100% de vos installations photovoltaïques grâce au Tiers-Investissement. Accédez au décryptage vidéo exclusif.",
    href: "/webinaire",
    available: true,
  },
]

export default function RessourcesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-2 text-2xl font-bold text-foreground sm:mb-3 sm:text-3xl">
            Ressources
          </h1>
          <p className="mb-10 text-muted-foreground sm:mb-12">
            Études de cas, financement et webinaires pour accompagner votre
            projet photovoltaïque B2B.
          </p>

          <ul className="space-y-6 sm:space-y-8">
            {resources.map((resource) => {
              const Icon = resource.icon
              return (
                <li
                  key={resource.id}
                  id={resource.id}
                  className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md sm:p-8"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Icon className="h-6 w-6 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                          {resource.title}
                        </h2>
                        {!resource.available && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                            <Clock className="h-3.5 w-3.5" />
                            Bientôt disponible
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                        {resource.description}
                      </p>
                      {resource.available && resource.href && (
                        <Link
                          href={resource.href}
                          className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
                        >
                          Voir la ressource →
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  )
}
