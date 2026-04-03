import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { MediaPartnersContent } from "@/components/media-partners-content"

export const metadata = {
  title: "Partenaires Média | Programme d'affiliation solaire | Aegis Solaire",
  description:
    "Devenez Media Buyer affilié Aegis Solaire. Générez des revenus passifs en envoyant du trafic qualifié sur le marché solaire wallon. 100 €/lead B2B, 25 €/lead B2C. Paiement hebdomadaire.",
  robots: { index: false, follow: false },
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
