import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegis-solaire.fr'

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
            Mentions Legales
          </h1>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                1. Editeur du site
              </h2>
              <p className="mt-4 text-muted-foreground">
                Aegis Solaire SAS
                <br />
                Capital social : 50 000 EUR
                <br />
                Siege social : 123 Avenue de l'Energie, 75001 Paris
                <br />
                RCS Paris : 123 456 789
                <br />
                N° TVA Intracommunautaire : FR12345678901
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                2. Directeur de la publication
              </h2>
              <p className="mt-4 text-muted-foreground">
                M. Jean Dupont, President
                <br />
                Email : contact@aegis-solaire.fr
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                3. Hebergement
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
                4. Propriete intellectuelle
              </h2>
              <p className="mt-4 text-muted-foreground">
                L'ensemble du contenu de ce site (textes, images, videos, etc.)
                est protege par le droit d'auteur. Toute reproduction, meme
                partielle, est interdite sans autorisation prealable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                5. Donnees personnelles
              </h2>
              <p className="mt-4 text-muted-foreground">
                Conformement au RGPD et a la loi Informatique et Libertes, vous
                disposez d'un droit d'acces, de rectification et de suppression
                de vos donnees. Pour exercer ces droits, contactez-nous a
                l'adresse : dpo@aegis-solaire.fr
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                6. Cookies
              </h2>
              <p className="mt-4 text-muted-foreground">
                Ce site utilise des cookies techniques necessaires a son bon
                fonctionnement. Pour plus d'informations, consultez notre
                politique de confidentialite.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
