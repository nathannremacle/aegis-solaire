import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site Aegis Solaire. Éditeur, hébergeur, propriété intellectuelle et données personnelles.",
  alternates: { canonical: `${baseUrl}/mentions-legales` },
}

export default function MentionsLegales() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 sm:py-12">
        <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-bold text-foreground sm:mb-8 sm:text-3xl">
            Mentions légales
          </h1>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                1. Éditeur du site
              </h2>
              <p className="mt-4 text-muted-foreground">
                Aegis Solaire – Plateforme en ligne dédiée aux projets photovoltaïques B2B en Wallonie et en Belgique.
                <br />
                Contact : contact@aegissolaire.com
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                2. Hébergement
              </h2>
              <p className="mt-4 text-muted-foreground">
                Vercel Inc.
                <br />
                340 S Lemon Ave #4133
                <br />
                Walnut, CA 91789, USA
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                3. Propriété intellectuelle
              </h2>
              <p className="mt-4 text-muted-foreground">
                L'ensemble du contenu de ce site (textes, images, vidéos, etc.)
                est protégé par le droit d'auteur. Toute reproduction, même
                partielle, est interdite sans autorisation préalable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                4. Données personnelles
              </h2>
              <p className="mt-4 text-muted-foreground">
                Conformément au RGPD et au droit belge en matière de protection des données, vous
                disposez d'un droit d'accès, de rectification et de suppression
                de vos données. Pour exercer ces droits, contactez-nous à
                l'adresse : dpo@aegissolaire.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                5. Cookies
              </h2>
              <p className="mt-4 text-muted-foreground">
                Ce site utilise des cookies techniques nécessaires à son bon
                fonctionnement. Pour plus d'informations, consultez notre
                politique de confidentialité.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
