import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MediaPartnersContent } from "@/components/media-partners-content"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

export const metadata = {
  title: "Partenaires Média | Programme d'affiliation solaire | Aegis Solaire",
  description:
    "Devenez Media Buyer affilié Aegis Solaire. Générez des revenus passifs en envoyant du trafic sur le marché solaire wallon ; les leads sont triés par l'équipe Aegis et par des algorithmes avancés avant qualification. 100 €/lead B2B qualifié, 25 €/lead B2C qualifié. Paiement hebdomadaire.",
  alternates: {
    canonical: `${baseUrl}/media-partners`,
  },
  robots: { index: true, follow: true },
}

export default function MediaPartnersPage() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <Header />
      <main className="min-w-0 flex-1">
        <MediaPartnersContent />
      </main>
      <Footer />
    </div>
  )
}
