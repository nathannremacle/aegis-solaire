import type { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Webinaire Solaire Zéro CAPEX Wallonie | Modèles PPA & Tiers-Investissement | Aegis Solaire",
  description:
    "Accédez au replay du webinaire d'ingénierie financière pour entreprises wallonnes : décret PACE 2030, obligations PEB, Certificats Verts CWaPE et modèle Zéro CAPEX.",
  alternates: {
    canonical: `${baseUrl}/webinaire`,
  },
}

export default function WebinaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
