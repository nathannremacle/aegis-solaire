import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Metadata } from "next"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.aegis-solaire.fr'

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité et protection des données personnelles d'Aegis Solaire. RGPD, durée de conservation, droits d'accès et de suppression.",
  alternates: { canonical: `${baseUrl}/politique-confidentialite` },
}

export default function PolitiqueConfidentialite() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background py-8 sm:py-12">
        <div className="mx-auto max-w-3xl min-w-0 px-4 sm:px-6 lg:px-8">
          <h1 className="mb-6 text-2xl font-bold text-foreground sm:mb-8 sm:text-3xl">
            Politique de Confidentialite
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="mb-8 text-muted-foreground">
              Derniere mise a jour : Mars 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                1. Responsable du traitement
              </h2>
              <p className="mt-4 text-muted-foreground">
                Aegis Solaire SAS est responsable du traitement de vos
                donnees personnelles collectees sur ce site.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                2. Donnees collectees
              </h2>
              <p className="mt-4 text-muted-foreground">
                Dans le cadre du simulateur ROI, nous collectons les donnees
                suivantes :
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>Nom et prenom</li>
                <li>Adresse email professionnelle</li>
                <li>Numero de telephone</li>
                <li>Fonction dans l'entreprise</li>
                <li>Nom de l'entreprise (optionnel)</li>
                <li>Caracteristiques du site (type de surface, superficie)</li>
                <li>Donnees de consommation energetique</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                3. Finalités du traitement
              </h2>
              <p className="mt-4 text-muted-foreground">
                Vos données sont collectées pour :
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>Calculer votre estimation de retour sur investissement</li>
                <li>Vous recontacter pour une étude personnalisée et un audit de faisabilité</li>
                <li>
                  Vous envoyer des informations commerciales et du <strong>lead nurturing</strong> (témoignages d'entreprises, échéances Loi LOM, actualités, invitations webinaires) si vous avez consenti
                </li>
                <li>Transmission aux installateurs partenaires pour une proposition commerciale</li>
                <li>Améliorer nos services</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                <strong>Qualité des données :</strong> les leads non qualifiés (fausses coordonnées, particuliers hors cible, projets trop petits) sont filtrés et rejetés. Seuls des prospects B2B qualifiés sont transmis à nos partenaires, ce qui garantit une base exploitable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                4. Base legale
              </h2>
              <p className="mt-4 text-muted-foreground">
                Le traitement de vos donnees repose sur :
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>
                  Votre consentement (formulaire de contact, newsletter)
                </li>
                <li>
                  L'execution de mesures precontractuelles (simulation ROI)
                </li>
                <li>Notre interet legitime (amelioration des services)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                5. Duree de conservation
              </h2>
              <p className="mt-4 text-muted-foreground">
                Vos donnees sont conservees pendant une duree maximale de{" "}
                <strong>3 ans</strong> a compter de votre derniere interaction
                avec nos services, conformement aux recommandations de la CNIL.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                6. Destinataires des donnees
              </h2>
              <p className="mt-4 text-muted-foreground">
                Vos donnees peuvent etre transmises a :
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>Nos equipes commerciales internes</li>
                <li>
                  Nos partenaires installateurs certifies (apres qualification)
                </li>
                <li>Nos sous-traitants techniques (hebergement, CRM)</li>
              </ul>
              <p className="mt-2 text-muted-foreground">
                Nous ne vendons jamais vos donnees a des tiers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                7. Vos droits
              </h2>
              <p className="mt-4 text-muted-foreground">
                Conformement au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
                <li>Droit d'acces a vos donnees</li>
                <li>Droit de rectification</li>
                <li>Droit a l'effacement ("droit a l'oubli")</li>
                <li>Droit a la limitation du traitement</li>
                <li>Droit a la portabilite</li>
                <li>Droit d'opposition</li>
                <li>Droit de retirer votre consentement</li>
              </ul>
              <p className="mt-4 text-muted-foreground">
                Pour exercer ces droits, contactez notre DPO à l'adresse :{" "}
                <a
                  href="mailto:dpo@aegis-solaire.fr"
                  className="text-primary hover:underline"
                >
                  dpo@aegis-solaire.fr
                </a>
              </p>
            </section>

            <section id="desinscription" className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                7.1. Droit d'opposition et désinscription
              </h2>
              <p className="mt-4 text-muted-foreground">
                Vous pouvez à tout moment vous opposer à la prospection commerciale ou demander la suppression de vos données. Un processus automatisé permet de traiter les demandes de désinscription sous <strong>24 à 48 heures</strong>. Envoyez votre demande à{" "}
                <a
                  href="mailto:dpo@aegis-solaire.fr"
                  className="text-primary hover:underline"
                >
                  dpo@aegis-solaire.fr
                </a>
                {" "}en précisant « Opposition » ou « Désinscription » et votre adresse email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-foreground">
                8. Sécurité
              </h2>
              <p className="mt-4 text-muted-foreground">
                Nous mettons en oeuvre des mesures techniques et
                organisationnelles appropriees pour proteger vos donnees contre
                tout acces non autorise, modification, divulgation ou
                destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">
                9. Réclamation
              </h2>
              <p className="mt-4 text-muted-foreground">
                Si vous estimez que vos droits ne sont pas respectes, vous
                pouvez introduire une reclamation aupres de la CNIL :{" "}
                <a
                  href="https://www.cnil.fr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  www.cnil.fr
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
