import { Metadata } from "next"
import { DevisLandingClient } from "./devis-landing-client"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Devis Panneaux Solaires Wallonie | Comparez jusqu'à 4 Devis RESCERT",
  description:
    "Recevez jusqu'à 4 devis gratuits et sans engagement d'installateurs photovoltaïques agréés RESCERT en Wallonie. Comparez les offres locales et économisez sur votre facture.",
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
