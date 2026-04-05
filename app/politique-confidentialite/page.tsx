import { Metadata } from "next"
import { LegalPageShell } from "@/components/legal-page-shell"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité Aegis Solaire (Belgique). RGPD, APD, durée de conservation, droits d'accès et réclamation.",
  alternates: { canonical: `${baseUrl}/politique-confidentialite` },
}

export default function PolitiqueConfidentialite() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      badge="RGPD & protection des données"
      description="Traitement des données personnelles, droits des personnes concernées et contact DPO."
    >
      <div className="prose prose-gray max-w-none">
        <p className="mb-8 text-sm text-muted-foreground">Dernière mise à jour : Mars 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">1. Responsable du traitement</h2>
          <p className="mt-4 text-muted-foreground">
            Aegis Solaire est responsable du traitement de vos données personnelles collectées sur ce site.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">2. Données collectées</h2>
          <p className="mt-4 text-muted-foreground">
            Dans le cadre du simulateur ROI, nous collectons les données suivantes :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Nom et prénom</li>
            <li>Adresse e-mail</li>
            <li>Numéro de téléphone</li>
            <li>Fonction dans l&apos;entreprise</li>
            <li>Nom de l&apos;entreprise (optionnel)</li>
            <li>Caractéristiques du site (type de surface, superficie)</li>
            <li>Données de consommation énergétique</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">3. Finalités du traitement</h2>
          <p className="mt-4 text-muted-foreground">Vos données sont collectées pour :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Calculer votre estimation de retour sur investissement</li>
            <li>Vous recontacter pour une étude personnalisée et un audit de faisabilité</li>
            <li>
              Vous envoyer des informations commerciales et du <strong>lead nurturing</strong> (témoignages
              d&apos;entreprises, actualités réglementaires Wallonie / PEB, invitations webinaires) si vous avez
              consenti
            </li>
            <li>Transmission aux installateurs partenaires pour une proposition commerciale</li>
            <li>Améliorer nos services</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            <strong>Qualité des données :</strong> les leads non qualifiés (fausses coordonnées, particuliers
            hors cible, projets trop petits) sont filtrés et rejetés. Seuls des prospects B2B qualifiés sont
            transmis à nos partenaires, ce qui garantit une base exploitable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">4. Base légale</h2>
          <p className="mt-4 text-muted-foreground">Le traitement de vos données repose sur :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Votre consentement (formulaire de contact, newsletter)</li>
            <li>L&apos;exécution de mesures précontractuelles (simulation ROI)</li>
            <li>Notre intérêt légitime (amélioration des services)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">5. Durée de conservation</h2>
          <p className="mt-4 text-muted-foreground">
            Vos données sont conservées pendant une durée maximale de <strong>3 ans</strong> à compter de votre
            dernière interaction avec nos services, dans le respect des bonnes pratiques RGPD et des lignes
            directrices de l&apos;APD (Belgique).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">6. Destinataires des données</h2>
          <p className="mt-4 text-muted-foreground">Vos données peuvent être transmises à :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Nos équipes commerciales internes</li>
            <li>Nos partenaires installateurs certifiés (après qualification)</li>
            <li>Nos sous-traitants techniques (hébergement, CRM)</li>
          </ul>
          <p className="mt-2 text-muted-foreground">Nous ne vendons jamais vos données à des tiers.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">7. Vos droits</h2>
          <p className="mt-4 text-muted-foreground">Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Droit d&apos;accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;)</li>
            <li>Droit à la limitation du traitement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d&apos;opposition</li>
            <li>Droit de retirer votre consentement</li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Pour exercer ces droits, contactez notre DPO à l&apos;adresse :{" "}
            <a href="mailto:dpo@aegissolaire.com" className="text-[#001D3D] font-medium hover:underline">
              dpo@aegissolaire.com
            </a>
          </p>
        </section>

        <section id="desinscription" className="mb-8 scroll-mt-24">
          <h2 className="text-xl font-semibold text-foreground">7.1. Droit d&apos;opposition et désinscription</h2>
          <p className="mt-4 text-muted-foreground">
            Vous pouvez à tout moment vous opposer à la prospection commerciale ou demander la suppression de
            vos données. Un processus automatisé permet de traiter les demandes de désinscription sous{" "}
            <strong>24 à 48 heures</strong>. Envoyez votre demande à{" "}
            <a href="mailto:dpo@aegissolaire.com" className="text-[#001D3D] font-medium hover:underline">
              dpo@aegissolaire.com
            </a>{" "}
            en précisant « Opposition » ou « Désinscription » et votre adresse e-mail.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">8. Sécurité</h2>
          <p className="mt-4 text-muted-foreground">
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos
            données contre tout accès non autorisé, modification, divulgation ou destruction.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">9. Réclamation</h2>
          <p className="mt-4 text-muted-foreground">
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation
            auprès de l&apos;APD (Autorité de protection des données) :{" "}
            <a
              href="https://www.autoriteprotectiondonnees.be"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#001D3D] font-medium hover:underline"
            >
              www.autoriteprotectiondonnees.be
            </a>
          </p>
        </section>
      </div>
    </LegalPageShell>
  )
}
