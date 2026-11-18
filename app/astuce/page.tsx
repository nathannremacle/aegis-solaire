import type { Metadata } from "next"
import { DevisLandingClient } from "@/app/devis-panneaux-solaires/devis-landing-client"

const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com").replace(/\/$/, "")

const pageTitle = "L'astuce solaire en Wallonie (-18 % sur vos devis RESCERT)"
const pageDescription =
  "L'astuce entre propriétaires : mettez jusqu'à 3 installateurs certifiés RESCERT en concurrence sur un cahier des charges Tier-1 identique pour obtenir le meilleur prix, sans compromis qualité et 100 % gratuit."

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: {
    canonical: `${baseUrl}/astuce`,
  },
  openGraph: {
    type: "website",
    locale: "fr_BE",
    url: `${baseUrl}/astuce`,
    siteName: "Aegis Solaire",
    title: pageTitle,
    description: pageDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function AstucePage() {
  return <DevisLandingClient initialHookKey="ASTUCE_PROPRIETAIRE" />
}
