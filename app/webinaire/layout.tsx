const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

export const metadata = {
  title: "Masterclass Zéro CAPEX | Replay Webinaire",
  description:
    "Replay : rentabilité et rénovation énergétique sans investissement initial (Zéro CAPEX), tiers-investissement et PPA. Décryptage vidéo Aegis Solaire — B2B Wallonie.",
  alternates: {
    canonical: `${baseUrl}/webinaire`,
  },
}

export default function WebinaireLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
