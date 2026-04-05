import { Metadata } from "next"
import { LegalPageShell } from "@/components/legal-page-shell"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente d'Aegis Solaire. Services, tarification, engagements et contact.",
  alternates: { canonical: `${baseUrl}/cgv` },
}

export default function CGV() {
  return (
    <LegalPageShell
      title="Conditions générales de vente"
      badge="Conditions commerciales"
      description="Cadre contractuel des services Aegis Solaire auprès des clients professionnels."
    >
      <div className="prose prose-gray max-w-none">
        <p className="mb-8 text-sm text-muted-foreground">Dernière mise à jour : Mars 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">1. Objet</h2>
          <p className="mt-4 text-muted-foreground">
            Les présentes conditions générales de vente (CGV) régissent les relations contractuelles entre
            Aegis Solaire et ses clients professionnels dans le cadre de la mise en relation avec des
            installateurs photovoltaïques certifiés.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">2. Services proposés</h2>
          <p className="mt-4 text-muted-foreground">Aegis Solaire propose les services suivants :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Simulation de retour sur investissement photovoltaïque</li>
            <li>Mise en relation avec des installateurs certifiés RESCERT Photovoltaïque</li>
            <li>Accompagnement dans le montage du dossier de financement</li>
            <li>Suivi de projet jusqu&apos;à la mise en service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">3. Simulateur ROI</h2>
          <p className="mt-4 text-muted-foreground">
            Le simulateur de retour sur investissement est fourni à titre indicatif. Les résultats sont
            basés sur des estimations et ne constituent pas un engagement contractuel. Une étude détaillée
            sera réalisée par nos experts pour vous fournir une estimation précise.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">4. Tarification</h2>
          <p className="mt-4 text-muted-foreground">
            La simulation ROI et la mise en relation initiale sont gratuites pour le client. Les tarifs des
            installations photovoltaïques seront communiqués par les installateurs partenaires lors de
            l&apos;étude détaillée.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">5. Engagements d&apos;Aegis Solaire</h2>
          <p className="mt-4 text-muted-foreground">Aegis Solaire s&apos;engage à :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Proposer uniquement des installateurs couverts par la certification RESCERT Photovoltaïque</li>
            <li>Recontacter le client sous 48 h ouvrées</li>
            <li>Garantir la confidentialité des informations communiquées</li>
            <li>Fournir un accompagnement gratuit et sans engagement</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">6. Responsabilité</h2>
          <p className="mt-4 text-muted-foreground">
            Aegis Solaire agit en qualité d&apos;intermédiaire et ne saurait être tenu responsable des
            prestations réalisées par les installateurs partenaires. Les contrats d&apos;installation sont
            conclus directement entre le client et l&apos;installateur choisi.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">7. Droit applicable</h2>
          <p className="mt-4 text-muted-foreground">
            Les présentes CGV sont soumises au droit belge. En cas de litige, les tribunaux compétents seront
            seuls compétents.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
          <p className="mt-4 text-muted-foreground">
            Pour toute question relative aux présentes CGV, contactez-nous à l&apos;adresse :{" "}
            <a href="mailto:contact@aegissolaire.com" className="text-[#001D3D] font-medium hover:underline">
              contact@aegissolaire.com
            </a>
          </p>
        </section>
      </div>
    </LegalPageShell>
  )
}
