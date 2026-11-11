import { Metadata } from "next"
import { DevisLandingClient2 } from "./devis-landing-client-2"
import "./astryx.css"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Devis Panneaux Solaires Wallonie | Comparateur Officiel Meta Astryx",
  description:
    "Recevez jusqu'à 3 devis gratuits et sans engagement d'installateurs photovoltaïques agréés RESCERT en Wallonie. Interface optimisée avec le système de design Meta Astryx.",
  alternates: {
    canonical: `${baseUrl}/devis-panneaux-solaires-2`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function DevisPanneauxSolairesPage2() {
  return <DevisLandingClient2 />
}

