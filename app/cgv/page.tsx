import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegissolaire.com'

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "Conditions générales de vente d'Aegis Solaire. Services, tarification, engagements et contact.",
  alternates: { canonical: `${baseUrl}/cgv` },
}

export default function CGV() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 sm:py-12">
        <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-bold text-foreground sm:mb-8 sm:text-3xl">
            Conditions générales de vente
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="mb-8 text-muted-foreground">
              Dernière mise à jour : Mars 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                1. Objet
              </h2>
              <p className="mt-4 text-muted-foreground">
                Les présentes conditions générales de vente (CGV) regissent les
                relations contractuelles entre Aegis Solaire et ses
                clients professionnels dans le cadre de la mise en relation avec
                des installateurs photovoltaïques certifiés.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                2. Services proposés
              </h2>
              <p className="mt-4 text-muted-foreground">
                Aegis Solaire propose les services suivants :
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>Simulation de retour sur investissement photovoltaïque</li>
                <li>Mise en relation avec des installateurs certifiés RESCERT Photovoltaïque</li>
                <li>Accompagnement dans le montage du dossier de financement</li>
                <li>Suivi de projet jusqu'à la mise en service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                3. Simulateur ROI
              </h2>
              <p className="mt-4 text-muted-foreground">
                Le simulateur de retour sur investissement est fourni à titre
                indicatif. Les résultats sont basés sur des estimations et ne
                constituent pas un engagement contractuel. Une etude detaillee
                sera réalisée par nos experts pour vous fournir une estimation
                précise.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                4. Tarification
              </h2>
              <p className="mt-4 text-muted-foreground">
                La simulation ROI et la mise en relation initiale sont gratuites
                pour le client. Les tarifs des installations photovoltaïques
                seront communiqués par les installateurs partenaires lors de
                l'étude détaillée.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                5. Engagements d'Aegis Solaire
              </h2>
              <p className="mt-4 text-muted-foreground">
                Aegis Solaire s'engage à :
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>
                  Proposer uniquement des installateurs couverts par la certification RESCERT Photovoltaïque
                </li>
                <li>Recontacter le client sous 48 h ouvrées</li>
                <li>
                  Garantir la confidentialite des informations communiquees
                </li>
                <li>Fournir un accompagnement gratuit et sans engagement</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                6. Responsabilite
              </h2>
              <p className="mt-4 text-muted-foreground">
                Aegis Solaire agit en qualité d'intermédiaire et ne saurait
                être tenu responsable des prestations réalisées par les
                installateurs partenaires. Les contrats d'installation sont
                conclus directement entre le client et l'installateur choisi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                7. Droit applicable
              </h2>
              <p className="mt-4 text-muted-foreground">
                Les présentes CGV sont soumises au droit belge. En cas de
                litige, les tribunaux compétents seront seuls compétents.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                8. Contact
              </h2>
              <p className="mt-4 text-muted-foreground">
                Pour toute question relative aux présentes CGV, contactez-nous à
                l'adresse :{" "}
                <a
                  href="mailto:contact@aegissolaire.com"
                  className="text-primary hover:underline"
                >
                  contact@aegissolaire.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
