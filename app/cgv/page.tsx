import { Metadata } from "next"
import { LegalPageShell } from "@/components/legal-page-shell"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description:
    "Conditions générales de vente d'Aegis Solaire. Marketplace de leads solaires, système de crédits, programme partenaires, engagements et cadre contractuel.",
  alternates: { canonical: `${baseUrl}/cgv` },
}

export default function CGV() {
  return (
    <LegalPageShell
      title="Conditions générales de vente"
      badge="Conditions commerciales"
      description="Cadre contractuel de la marketplace Aegis Solaire et des services associés."
    >
      <div className="prose prose-gray max-w-none">
        <p className="mb-8 text-sm text-muted-foreground">Dernière mise à jour : Avril 2026</p>

        {/* 1. Objet */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">1. Objet</h2>
          <p className="mt-4 text-muted-foreground">
            Les présentes conditions générales de vente (ci-après « CGV ») définissent les droits et
            obligations des parties dans le cadre de l&apos;utilisation de la plateforme{" "}
            <strong>Aegis Solaire</strong> (ci-après « la Plateforme »), exploitée par Nathan Remacle
            (ci-après « l&apos;Exploitant »).
          </p>
          <p className="mt-3 text-muted-foreground">
            La Plateforme met en relation des entreprises et particuliers à la recherche de solutions
            photovoltaïques (ci-après « les Prospects ») avec des installateurs certifiés (ci-après
            « les Partenaires Installateurs ») et des prestataires de génération de leads (ci-après
            « les Media Partners »).
          </p>
          <p className="mt-3 text-muted-foreground">
            Toute utilisation de la Plateforme implique l&apos;acceptation sans réserve des présentes CGV.
          </p>
        </section>

        {/* 2. Définitions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">2. Définitions</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong>Lead :</strong> demande qualifiée d&apos;un prospect (entreprise ou particulier)
              ayant complété le simulateur ROI et fourni ses coordonnées avec consentement explicite.
            </li>
            <li>
              <strong>Lead B2B :</strong> lead issu du segment professionnel (industriel, tertiaire,
              toitures &gt; 500 m², parkings &gt; 1 500 m²). Vendu en exclusivité à un seul Partenaire
              Installateur.
            </li>
            <li>
              <strong>Lead B2C :</strong> lead issu du segment résidentiel. Proposé à un maximum de
              trois (3) Partenaires Installateurs.
            </li>
            <li>
              <strong>Crédit :</strong> unité de valeur utilisée par les Partenaires Installateurs pour
              acquérir l&apos;accès aux données complètes d&apos;un lead. Le coût en crédits est indiqué
              sur la fiche de chaque lead avant achat.
            </li>
            <li>
              <strong>Partenaire Installateur :</strong> installateur photovoltaïque couvert par la
              certification RESCERT Photovoltaïque, ayant été approuvé après candidature et disposant
              d&apos;un compte sur la Plateforme.
            </li>
            <li>
              <strong>Media Partner :</strong> prestataire (agence, freelance ou régie publicitaire)
              générant du trafic qualifié vers la Plateforme en échange d&apos;une commission par lead
              validé.
            </li>
            <li>
              <strong>Dashboard :</strong> portail sécurisé accessible aux Partenaires Installateurs
              et aux Media Partners pour consulter leurs leads, crédits et statistiques.
            </li>
          </ul>
        </section>

        {/* 3. Accès à la Plateforme */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">3. Accès à la Plateforme</h2>

          <h3 className="mt-6 text-lg font-medium text-foreground">3.1. Partenaires Installateurs</h3>
          <p className="mt-3 text-muted-foreground">
            L&apos;accès à la marketplace est réservé aux installateurs couverts par la certification
            RESCERT Photovoltaïque. L&apos;inscription se fait via le formulaire de candidature sur la
            page « Devenir Partenaire ». L&apos;Exploitant se réserve le droit d&apos;accepter ou de
            refuser toute candidature, sans obligation de motiver sa décision.
          </p>
          <p className="mt-3 text-muted-foreground">
            L&apos;approbation d&apos;une candidature entraîne la création d&apos;un compte avec un
            solde initial de zéro (0) crédit. Le Partenaire Installateur est responsable de la
            confidentialité de ses identifiants de connexion.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">3.2. Media Partners</h3>
          <p className="mt-3 text-muted-foreground">
            L&apos;accès au programme d&apos;affiliation fait l&apos;objet d&apos;un accord préalable
            avec l&apos;Exploitant. Un code de tracking unique est attribué à chaque Media Partner pour
            le suivi des performances.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">3.3. Prospects</h3>
          <p className="mt-3 text-muted-foreground">
            L&apos;utilisation du simulateur ROI et la soumission de coordonnées sont gratuites pour les
            prospects. Aucun compte n&apos;est requis pour les prospects.
          </p>
        </section>

        {/* 4. Système de crédits */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">4. Système de crédits</h2>
          <p className="mt-4 text-muted-foreground">
            Les Partenaires Installateurs acquièrent des leads en dépensant des crédits. Le fonctionnement
            est le suivant :
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              Les crédits sont achetés par packs via le portail partenaire. Les prix des packs sont
              affichés sur la page « Crédits » du Dashboard.
            </li>
            <li>
              Le coût en crédits de chaque lead est indiqué sur sa fiche avant achat (à titre indicatif :
              environ 5 crédits pour un lead B2B exclusif, environ 2 crédits pour un lead B2C).
              L&apos;Exploitant se réserve le droit d&apos;ajuster ces montants en fonction de la
              qualité et des caractéristiques du lead.
            </li>
            <li>
              <strong>Les crédits achetés ne sont pas remboursables</strong>, sauf dans les cas prévus
              à l&apos;article 4.1 ci-dessous.
            </li>
            <li>
              Les crédits n&apos;ont pas de date d&apos;expiration et restent disponibles tant que le
              compte du Partenaire Installateur est actif.
            </li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-foreground">4.1. Leads non conformes</h3>
          <p className="mt-3 text-muted-foreground">
            Si un lead acheté s&apos;avère manifestement non conforme (fausses coordonnées, doublon avéré,
            prospect hors zone géographique), le Partenaire Installateur peut signaler le lead via son
            Dashboard ou par e-mail à{" "}
            <a href="mailto:cgv@aegissolaire.com" className="text-[#001D3D] font-medium hover:underline">
              cgv@aegissolaire.com
            </a>{" "}
            dans un délai de <strong>sept (7) jours ouvrés</strong> suivant l&apos;achat. Après vérification,
            l&apos;Exploitant pourra, à sa seule discrétion, créditer le montant correspondant sur le compte
            du Partenaire.
          </p>
        </section>

        {/* 5. Conditions d'achat des leads */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">5. Conditions d&apos;achat des leads</h2>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.1. Segment B2B (exclusivité)</h3>
          <p className="mt-3 text-muted-foreground">
            Chaque lead B2B est proposé à <strong>un seul</strong> Partenaire Installateur. Une fois acheté,
            le lead n&apos;est plus disponible pour d&apos;autres partenaires. Les données complètes du
            prospect (nom, prénom, téléphone, e-mail, numéro de TVA) sont débloquées immédiatement après
            l&apos;achat.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.2. Segment B2C (partagé)</h3>
          <p className="mt-3 text-muted-foreground">
            Chaque lead B2C est proposé à <strong>trois (3) Partenaires Installateurs maximum</strong>. Le
            nombre de places restantes est affiché sur la fiche du lead avant achat. Lorsque toutes les
            places sont prises, le lead est marqué comme épuisé.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.3. Informations avant achat</h3>
          <p className="mt-3 text-muted-foreground">
            Avant l&apos;achat, le Partenaire Installateur dispose d&apos;un aperçu anonymisé du lead
            comprenant : type de surface, superficie, province, facture électrique estimée, GRD et
            précisions éventuelles sur le projet. Les données nominatives (PII) ne sont débloquées
            qu&apos;après débit des crédits.
          </p>
        </section>

        {/* 6. Qualité des leads */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">6. Qualité des leads et engagements</h2>
          <p className="mt-4 text-muted-foreground">
            L&apos;Exploitant met en œuvre un processus de qualification combinant :
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong>Validation automatique :</strong> vérification du format des données, filtrage
              anti-abus (honeypot, rate limiting, délai minimum de soumission), scoring algorithmique.
            </li>
            <li>
              <strong>Revue manuelle :</strong> tri et priorisation par l&apos;équipe Aegis Solaire
              avant mise en vente sur la marketplace.
            </li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            <strong>Limitation de responsabilité :</strong> malgré ces mesures, l&apos;Exploitant ne
            garantit pas la conversion des leads en contrats d&apos;installation. Les leads représentent
            des <strong>opportunités commerciales qualifiées</strong>, et non des engagements de résultat.
            Le Partenaire Installateur reste seul responsable de son suivi commercial.
          </p>
        </section>

        {/* 7. Programme Media Partners */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">7. Programme Media Partners</h2>

          <h3 className="mt-6 text-lg font-medium text-foreground">7.1. Rémunération</h3>
          <p className="mt-3 text-muted-foreground">
            Les Media Partners perçoivent une commission pour chaque lead validé, dont le montant est
            défini lors de l&apos;accord initial (à titre indicatif : 100 € par lead B2B qualifié et
            25 € par lead B2C qualifié). Ces montants peuvent être révisés d&apos;un commun accord.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">7.2. Tracking et attribution</h3>
          <p className="mt-3 text-muted-foreground">
            L&apos;attribution des leads se fait via le paramètre d&apos;URL{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">?ref=CODE</code>{" "}
            fourni par l&apos;Exploitant. Le Media Partner est responsable de l&apos;intégration correcte
            de ce paramètre dans ses campagnes.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">7.3. Conditions de paiement</h3>
          <p className="mt-3 text-muted-foreground">
            Les commissions sont versées sur base hebdomadaire, après validation définitive du lead par
            l&apos;Exploitant. Le paiement intervient par virement bancaire. L&apos;Exploitant se réserve
            le droit de suspendre ou révoquer un Media Partner en cas de trafic frauduleux (bots, faux
            leads, incentivized traffic).
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">7.4. Accès aux données</h3>
          <p className="mt-3 text-muted-foreground">
            Les Media Partners n&apos;ont <strong>aucun accès</strong> aux données nominatives des
            prospects. Leur dashboard affiche exclusivement des statistiques agrégées (nombre de leads,
            statuts, commissions). Ce cloisonnement est conforme au RGPD.
          </p>
        </section>

        {/* 8. Protection des données */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">8. Protection des données (RGPD)</h2>
          <p className="mt-4 text-muted-foreground">
            L&apos;Exploitant agit en qualité de responsable du traitement des données personnelles
            collectées via la Plateforme. Le traitement est effectué conformément au Règlement Général
            sur la Protection des Données (UE) 2016/679 et à la législation belge applicable.
          </p>
          <p className="mt-3 text-muted-foreground">
            Les Partenaires Installateurs qui accèdent aux données nominatives des prospects
            s&apos;engagent à :
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-6 text-muted-foreground">
            <li>Utiliser ces données exclusivement aux fins de suivi commercial du projet photovoltaïque</li>
            <li>Ne pas revendre, céder ou partager ces données avec des tiers</li>
            <li>Respecter les droits des personnes concernées (accès, rectification, effacement)</li>
            <li>Supprimer les données dès la finalisation ou l&apos;abandon du projet</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            Pour plus de détails, consultez notre{" "}
            <a href="/politique-confidentialite" className="text-[#001D3D] font-medium hover:underline">
              Politique de confidentialité
            </a>.
          </p>
        </section>

        {/* 9. Propriété intellectuelle */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">9. Propriété intellectuelle</h2>
          <p className="mt-4 text-muted-foreground">
            L&apos;ensemble des éléments de la Plateforme (marque, logo, design, code source, algorithmes
            de scoring, contenus rédactionnels, simulateur ROI) est la propriété exclusive de
            l&apos;Exploitant et est protégé par le droit de la propriété intellectuelle.
          </p>
          <p className="mt-3 text-muted-foreground">
            Toute reproduction, modification ou utilisation non autorisée est strictement interdite.
          </p>
        </section>

        {/* 10. Responsabilité */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">10. Responsabilité</h2>
          <p className="mt-4 text-muted-foreground">
            L&apos;Exploitant agit en qualité d&apos;intermédiaire technique mettant en relation des
            prospects et des installateurs. À ce titre :
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              L&apos;Exploitant n&apos;est pas partie aux contrats conclus entre les prospects et les
              Partenaires Installateurs.
            </li>
            <li>
              L&apos;Exploitant ne saurait être tenu responsable de la qualité, du prix ou de
              l&apos;exécution des prestations d&apos;installation réalisées par les Partenaires.
            </li>
            <li>
              Le simulateur ROI fournit des estimations indicatives. Les résultats ne constituent en
              aucun cas un engagement contractuel.
            </li>
            <li>
              L&apos;Exploitant ne garantit pas la disponibilité permanente de la Plateforme et se
              réserve le droit d&apos;effectuer des maintenances sans préavis.
            </li>
            <li>
              En tout état de cause, la responsabilité de l&apos;Exploitant est limitée au montant
              des crédits achetés par le Partenaire concerné au cours des douze (12) derniers mois.
            </li>
          </ul>
        </section>

        {/* 11. Résiliation */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">11. Durée et résiliation</h2>
          <p className="mt-4 text-muted-foreground">
            L&apos;accès à la Plateforme est accordé pour une durée indéterminée.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>
              <strong>Par le Partenaire :</strong> le Partenaire Installateur ou le Media Partner peut
              résilier à tout moment en contactant l&apos;Exploitant. Les crédits non utilisés restent
              acquis mais ne sont pas remboursables.
            </li>
            <li>
              <strong>Par l&apos;Exploitant :</strong> l&apos;Exploitant peut suspendre ou résilier
              l&apos;accès d&apos;un Partenaire en cas de manquement aux présentes CGV, de perte de la
              certification RESCERT, de comportement frauduleux ou de toute autre raison légitime.
            </li>
          </ul>
        </section>

        {/* 12. Droit applicable */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">12. Droit applicable et litiges</h2>
          <p className="mt-4 text-muted-foreground">
            Les présentes CGV sont soumises au <strong>droit belge</strong>. En cas de litige, les parties
            s&apos;engagent à rechercher une solution amiable dans un délai de trente (30) jours. À défaut,
            les tribunaux de l&apos;arrondissement judiciaire compétent en Belgique seront seuls compétents.
          </p>
        </section>

        {/* 13. Modifications */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">13. Modifications des CGV</h2>
          <p className="mt-4 text-muted-foreground">
            L&apos;Exploitant se réserve le droit de modifier les présentes CGV à tout moment. Les
            Partenaires seront informés de toute modification substantielle par e-mail ou notification
            dans leur Dashboard. La poursuite de l&apos;utilisation de la Plateforme après notification
            vaut acceptation des nouvelles conditions.
          </p>
        </section>

        {/* 14. Contact */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">14. Contact</h2>
          <p className="mt-4 text-muted-foreground">
            Pour toute question relative aux présentes CGV :
          </p>
          <ul className="mt-3 list-none space-y-1 pl-0 text-muted-foreground">
            <li>
              <strong>E-mail :</strong>{" "}
              <a href="mailto:cgv@aegissolaire.com" className="text-[#001D3D] font-medium hover:underline">
                cgv@aegissolaire.com
              </a>
            </li>
            <li>
              <strong>Site :</strong>{" "}
              <a href="https://www.aegissolaire.com" className="text-[#001D3D] font-medium hover:underline">
                www.aegissolaire.com
              </a>
            </li>
          </ul>
        </section>
      </div>
    </LegalPageShell>
  )
}
