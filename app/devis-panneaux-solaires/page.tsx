import { Metadata } from "next"
import { DevisLandingClient } from "./devis-landing-client"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Devis Panneaux Solaires Wallonie | Comparez jusqu'à 3 installateurs certifiés RESCERT",
  description:
    "Recevez jusqu'à 3 devis comparatifs gratuits de professionnels photovoltaïques certifiés RESCERT en Wallonie. Sans engagement, étude personnalisée et économies garanties.",
  alternates: {
    canonical: `${baseUrl}/devis-panneaux-solaires`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function DevisPanneauxSolairesPage() {
  return <DevisLandingClient />
}
