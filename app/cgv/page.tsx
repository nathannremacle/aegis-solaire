import { Metadata } from "next"
import { LegalPageShell } from "@/components/legal-page-shell"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Conditions générales de vente & d'utilisation (CGV / CGU) | Aegis Solaire",
  description:
    "Conditions générales de vente et d'utilisation de la plateforme Aegis Solaire. Règles des crédits, politique stricte de garantie des leads, conditions de suspension et cadre juridique.",
  alternates: { canonical: `${baseUrl}/cgv` },
}

export default function CGV() {
  return (
    <LegalPageShell
      title="Conditions générales de vente & d'utilisation"
      badge="Cadre contractuel B2B"
      description="Réglementation contractuelle de la marketplace Aegis Solaire, des crédits, de la garantie lead et des conditions d'exploitation du service."
    >
      <div className="prose prose-gray max-w-none text-muted-foreground">
        <p className="mb-8 text-sm font-mono text-muted-foreground">
          Dernière révision contractuelle : Novembre 2026 — Applicable de plein droit à tout utilisateur et partenaire
        </p>

        {/* AVERTISSEMENT PRÉALABLE */}
        <div className="mb-8 rounded-xl border border-border bg-muted/40 p-5 text-sm">
          <p className="font-semibold text-foreground">AVERTISSEMENT CONTRACTUEL PRÉALABLE (RELATIONS STRICTEMENT PROFESSIONNELLES - B2B)</p>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            L&apos;accès à la marketplace de leads, aux dashboards et aux services de la plateforme Aegis Solaire est strictement réservé à des professionnels agissant dans le cadre de leur activité commerciale, industrielle ou artisanale. Les présentes conditions régissent des relations B2B exclusives soumises au Code de droit économique belge. En conséquence, les dispositions protectrices du droit de la consommation, notamment le droit légal de rétractation (article VI.47 et suivants du CDE), sont expressément inapplicables aux commandes de crédits et aux acquisitions de leads.
          </p>
        </div>

        {/* 1. Identification de l'Exploitant & Objet */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">1. Identification de l&apos;Exploitant & Objet</h2>
          <p className="mt-4 leading-relaxed">
            Les présentes Conditions Générales de Vente et d&apos;Utilisation (ci-après « CGV / CGU » ou « les Conditions ») constituent le contrat régissant l&apos;ensemble des relations entre :
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              D&apos;une part, l&apos;entreprise individuelle <strong className="text-foreground">INIT42</strong> (Personne physique Nathan Remacle), établie en Belgique, immatriculée à la Banque-Carrefour des Entreprises sous le numéro <strong className="font-mono tabular-nums text-foreground">1039.899.980</strong>, assujettie à la TVA sous le numéro <strong className="font-mono tabular-nums text-foreground">BE 1039.899.980</strong> (ci-après désignée « <strong className="text-foreground">l&apos;Exploitant</strong> » ou « <strong className="text-foreground">Aegis Solaire</strong> »), éditant et exploitant la plateforme accessible à l&apos;adresse <strong className="text-foreground">www.aegissolaire.com</strong> (ci-après « <strong className="text-foreground">la Plateforme</strong> ») ;
            </li>
            <li>
              Et d&apos;autre part, tout professionnel (installateur certifié RESCERT, professionnel de l&apos;énergie, régie publicitaire, agence, apporteur d&apos;affaires ou partenaire média) créant un compte, rechargeant des crédits ou accédant aux services de la Plateforme (ci-après désigné « <strong className="text-foreground">le Partenaire</strong> » ou « <strong className="text-foreground">l&apos;Utilisateur</strong> »).
            </li>
          </ul>
          <p className="mt-3 leading-relaxed">
            La Plateforme a pour objet exclusif la qualification technique de projets photovoltaïques, l&apos;estimation automatisée de rentabilité et la mise en relation entre des porteurs de projets (ci-après « les Prospects ») et des installateurs professionnels partenaires.
          </p>
          <p className="mt-3 leading-relaxed">
            Toute création de compte, acquisition de crédits, soumission de candidature ou utilisation des outils de la Plateforme emporte adhésion pleine, entière, expresse et sans réserve aux présentes Conditions, à l&apos;exclusion formelle de toutes autres conditions générales d&apos;achat ou documents émanant du Partenaire.
          </p>
        </section>

        {/* 2. Définitions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">2. Définitions contractuelles</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Lead :</strong> Fiche d&apos;information technique et déclarative relative à un projet d&apos;installation photovoltaïque ou de transition énergétique en Wallonie ou en Belgique, renseignée par un Prospect via les formulaires ou le simulateur ROI de la Plateforme, comprenant des coordonnées de contact et des paramètres techniques déclaratifs.
            </li>
            <li>
              <strong className="text-foreground">Lead B2B :</strong> Dossier issu du segment professionnel (bâtiments tertiaires, industriels, toitures &gt; 500 m², ombrières de parking &gt; 1 500 m²). Vendu sous licence d&apos;exploitation exclusive à un (1) seul Partenaire Installateur.
            </li>
            <li>
              <strong className="text-foreground">Lead B2C :</strong> Dossier issu du segment résidentiel particulier. Mis à disposition d&apos;un maximum de trois (3) Partenaires Installateurs distincts afin de permettre au particulier de comparer plusieurs offres techniques.
            </li>
            <li>
              <strong className="text-foreground">Crédit :</strong> Unité de compte numérique interne et virtuelle, propre à l&apos;écosystème de la Plateforme, permettant au Partenaire Installateur de débloquer l&apos;accès aux coordonnées nominatives d&apos;un Lead. Le Crédit ne constitue en aucun cas une monnaie, un actif financier, un instrument de paiement ou un dépôt bancaire.
            </li>
            <li>
              <strong className="text-foreground">Partenaire Installateur :</strong> Entreprise professionnelle de pose et d&apos;ingénierie photovoltaïque dûment enregistrée, couverte par la certification RESCERT ou équivalent, admise sur la Plateforme par l&apos;Exploitant.
            </li>
            <li>
              <strong className="text-foreground">Dashboard :</strong> Espace numérique privé et sécurisé accessible via identifiants par le Partenaire pour visualiser les dossiers, gérer son solde de crédits et suivre ses commandes.
            </li>
            <li>
              <strong className="text-foreground">Shutdown :</strong> Décision unilatérale et discrétionnaire prise par l&apos;Exploitant d&apos;interrompre temporairement, de suspendre, de modifier, ou d&apos;arrêter définitivement l&apos;exploitation de la Plateforme, des services associés ou de la marketplace.
            </li>
          </ul>
        </section>

        {/* 3. Accès, Agrément & Contrôle des Comptes */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">3. Accès au service, Agrément & Contrôle discrétionnaire</h2>
          <p className="mt-4 leading-relaxed">
            L&apos;accès à la marketplace d&apos;Aegis Solaire est un privilège d&apos;accès accordé à titre précaire et révocable par l&apos;Exploitant. L&apos;inscription nécessite le dépôt d&apos;une candidature complète et la justification des habilitations techniques requises (RESCERT, assurance responsabilité civile professionnelle décennale en cours de validité).
          </p>
          <p className="mt-3 leading-relaxed">
            L&apos;Exploitant conserve la faculté absolue, discrétionnaire et souveraine d&apos;accepter, d&apos;ajourner ou de refuser toute demande d&apos;inscription, sans avoir à motiver sa décision ni à verser une quelconque indemnité.
          </p>
          <p className="mt-3 leading-relaxed">
            Chaque Partenaire est seul et unique responsable de la confidentialité et de la sécurité de ses identifiants d&apos;accès. Toute opération effectuée depuis l&apos;espace d&apos;un Partenaire (achat de crédits, déblocage de lead, contestation) est réputée irréfragablement accomplie par le représentant habilité dudit Partenaire et engage pleinement sa responsabilité financière.
          </p>
        </section>

        {/* 4. Système de Crédits : Nature Juridique, Absence Totale de Remboursement Monétaire & Forclusion */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">4. Système de crédits : Nature juridique, absence de droit de rétractation et péremption</h2>
          <p className="mt-4 leading-relaxed">
            Pour acquérir des Leads sur la marketplace, le Partenaire peut débloquer les chantiers à l&apos;unité directement en euros ou préfinancer un solde de Crédits selon les modalités tarifaires suivantes :
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Valeur faciale contractuelle :</strong> Un (1) Crédit équivaut à <strong className="font-mono tabular-nums text-foreground">9,83 € HTVA</strong> (calculé sur la base de 29,50 € HTVA pour 3 crédits).
            </li>
            <li>
              <strong className="text-foreground">Packs de recharges :</strong> Les Crédits sont acquis sous forme de packs (10 crédits pour <span className="font-mono tabular-nums">98,33 € HTVA</span> / <span className="font-mono tabular-nums">118,98 € TTC</span> ; 20 crédits pour <span className="font-mono tabular-nums">196,67 € HTVA</span> / <span className="font-mono tabular-nums">237,97 € TTC</span> ; 50 crédits pour <span className="font-mono tabular-nums">491,67 € HTVA</span> / <span className="font-mono tabular-nums">594,92 € TTC</span>). La TVA belge au taux légal de <span className="font-mono tabular-nums">21 %</span> s&apos;applique à toute transaction facturée à un assujetti établi en Belgique.
            </li>
            <li>
              <strong className="text-foreground">Achat direct à l&apos;unité en euros :</strong> Le Partenaire a également la faculté d&apos;acquérir chaque Lead à l&apos;unité sans souscrire de pack préalable, par règlement immédiat en euros via Bancontact ou carte bancaire (<strong className="font-mono tabular-nums text-foreground">29,50 € HTVA</strong> pour un Lead B2C, <strong className="font-mono tabular-nums text-foreground">88,50 € HTVA</strong> pour un Lead B2B exclusif).
            </li>
            <li>
              <strong className="text-foreground">Modalités de règlement :</strong> Les règlements sont effectués par carte bancaire / Bancontact via le prestataire de paiement sécurisé agréé Mollie, ou par virement bancaire sur le compte professionnel de l&apos;Exploitant (IBAN : <strong className="font-mono tabular-nums text-foreground">BE84 0020 3534 7259</strong>, BIC : <strong className="font-mono text-foreground">GEBABEBB</strong>, titulaire : <strong className="text-foreground">INIT42</strong>). En cas de virement, les crédits ne sont crédités sur le Dashboard qu&apos;après encaissement effectif et rapprochement bancaire.
            </li>
            <li>
              <strong className="text-foreground">Coût unitaire d&apos;acquisition d&apos;un lead :</strong>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li><strong className="text-foreground">Lead B2C (résidentiel) :</strong> 3 crédits (ou <span className="font-mono tabular-nums">29,50 € HTVA</span> à l&apos;unité) par Partenaire acheteur, dans la limite stricte de 3 acheteurs.</li>
                <li><strong className="text-foreground">Lead B2B (professionnel / industriel) :</strong> 9 crédits (ou <span className="font-mono tabular-nums">88,50 € HTVA</span> à l&apos;unité), réservé en exclusivité absolue à un acheteur unique.</li>
              </ul>
            </li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-foreground">4.1. Nature juridique stricte des Crédits (Absence de monnaie fiduciaire)</h3>
          <p className="mt-3 leading-relaxed">
            Les Crédits sont des droits d&apos;accès numériques d&apos;usage interne, non négociables, non transférables d&apos;un compte à un autre, et strictement dépourvus de cours légal. Les Crédits ne constituent ni une monnaie électronique au sens des articles du Code de droit économique belge (Livre VII) et de la directive DSP2, ni un instrument de paiement, ni un dépôt de fonds remboursable. Les soldes de Crédits ne portent aucun intérêt, ne peuvent faire l&apos;objet d&apos;aucun gage, nantissement ou cession, et ne sont échangeables contre aucune devise monétaire légale.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">4.2. Ventes fermes, définitives et irrévocables (Non-remboursabilité absolue en numéraire)</h3>
          <p className="mt-3 leading-relaxed">
            <strong className="text-foreground">TOUT ACHAT DE CRÉDITS EST FERME, DÉFINITIF ET NON REMBOURSABLE.</strong> Les sommes versées pour l&apos;achat de recharges de Crédits sont définitivement acquises à l&apos;Exploitant dès encaissement. En aucun cas, quelle qu&apos;en soit la cause (changement d&apos;activité du Partenaire, réorganisation interne, mécontentement, manque de disponibilité commerciale, départ à la retraite, liquidation ou cessation d&apos;activité), un Partenaire ne pourra prétendre au rachat, à la restitution ou au remboursement en numéraire, espèces ou virement bancaire des Crédits figurant à son solde.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">4.3. Durée de validité, inactivité et péremption de plein droit</h3>
          <p className="mt-3 leading-relaxed">
            Les Crédits achetés ont une durée de validité maximale de <strong className="font-mono tabular-nums text-foreground">douze (12) mois</strong> à compter de leur date d&apos;achat. En outre, en cas d&apos;inactivité continue d&apos;un compte Partenaire pendant une période de <strong className="font-mono tabular-nums text-foreground">six (6) mois consécutifs</strong> (absence totale de déblocage de lead ou d&apos;achat de recharge), le solde de Crédits associé est automatiquement frappé de péremption et désactivé de plein droit, sans formalité, sans mise en demeure préalable et sans droit à indemnité d&apos;aucune sorte.
          </p>
        </section>

        {/* 5. Politique Draconienne de Garantie Lead, Litiges & Forclusion */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">5. Conditions d&apos;achat des leads & Politique stricte de garantie (« Lead Refund »)</h2>
          
          <h3 className="mt-6 text-lg font-medium text-foreground">5.1. Déblocage instantané et intangibilité de la commande</h3>
          <p className="mt-3 leading-relaxed">
            Dès lors que le Partenaire clique sur le bouton de déblocage d&apos;un Lead, le débit des Crédits s&apos;opère de manière instantanée et irréversible, et l&apos;ensemble des données nominatives du Prospect (nom, prénom, numéro de téléphone, adresse e-mail, localisation et descriptif technique) est immédiatement affiché et mis à disposition dans son Dashboard.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.2. Conditions cumulatives strictes de recevabilité d&apos;une contestation de Lead</h3>
          <p className="mt-3 leading-relaxed">
            Afin de préserver l&apos;intégrité de la marketplace et d&apos;empêcher toute manœuvre opportuniste d&apos;appropriation frauduleuse des coordonnées des Prospects, une contestation de Lead n&apos;est recevable que sous réserve de satisfaire cumulativement aux conditions impératives suivantes :
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Délai forclos de sept (7) jours ouvrés :</strong> La réclamation doit obligatoirement être soumise par voie électronique via le module dédié du Dashboard ou par e-mail motivé à <a href="mailto:cgv@aegissolaire.com" className="text-primary font-medium hover:underline">cgv@aegissolaire.com</a> dans un délai strict et impératif de <strong className="font-mono tabular-nums text-foreground">sept (7) jours ouvrés</strong> suivant l&apos;achat du Lead. Tout signalement intervenant au-delà de ce délai de 7 jours ouvrés est frappé de forclusion absolue et sera rejeté de plein droit sans examen.
            </li>
            <li>
              <strong className="text-foreground">Diligence commerciale minimale documentée :</strong> Le Partenaire doit prouver avoir tenté de joindre le Prospect au moins deux (2) fois par téléphone dans les premières 48 heures suivant l&apos;acquisition du dossier, avec un intervalle d&apos;au moins quatre (4) heures entre les appels (capture d&apos;écran horodatée du journal d&apos;appels du standard ou du téléphone d&apos;entreprise faisant foi).
            </li>
            <li>
              <strong className="text-foreground">Exclusivité des motifs admissibles (Art. 5.3) :</strong> La réclamation doit reposer exclusivement sur l&apos;un des motifs limitativement énoncés à l&apos;article 5.3 ci-dessous, à l&apos;exclusion de tout autre motif.
            </li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.3. Motifs exhaustifs admissibles au titre de la garantie Lead</h3>
          <p className="mt-3 leading-relaxed">
            Seules les trois (3) situations objectives suivantes peuvent donner lieu à l&apos;attribution d&apos;un recrédit de compensation après validation par la Cellule Technique d&apos;Aegis Solaire :
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Numéro technique non attribué ou inexistant :</strong> Le numéro de téléphone fourni par le Prospect est formellement non attribué, non en service ou invalide au niveau du réseau de télécommunication belge (message d&apos;erreur standard d&apos;opérateur télécom : « ce numéro n&apos;est pas attribué »). La preuve doit être fournie par le Partenaire (enregistrement court ou journal d&apos;appel probant).
            </li>
            <li>
              <strong className="text-foreground">Doublon strict interne à la Plateforme :</strong> Le Lead délivré comporte la même identité, le même numéro de téléphone et la même adresse postale qu&apos;un Lead déjà acheté par le même Partenaire sur la Plateforme au cours des <span className="font-mono tabular-nums">trente (30) jours calendaires</span> précédents.
            </li>
            <li>
              <strong className="text-foreground">Projet situé hors territoire géographique contractuel :</strong> L&apos;adresse du projet renseignée est située hors de Belgique ou hors des zones territoriales expressément couvertes par le service.
            </li>
          </ol>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.4. Motifs formellement inopérants et rejets automatiques (Absence de garantie commerciale)</h3>
          <p className="mt-3 leading-relaxed">
            <strong className="text-foreground">AUCUNE DEMANDE DE REMPLACEMENT OU DE RECRÉDIT NE SERA ACCEPTÉE DANS LES CAS SUIVANTS (LISTE NON LIMITATIVE) :</strong>
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6">
            <li>Le Prospect ne décroche pas, filtre ses appels, bascule sur messagerie vocale ou demande à être rappelé plus tard ;</li>
            <li>Le Prospect a changé d&apos;avis, renonce temporairement ou définitivement à son projet pour des convenances personnelles, familiales ou financières ;</li>
            <li>Le Prospect a déjà signé un bon de commande avec un autre prestataire ou installateur concurrent ;</li>
            <li>Le Prospect refuse de communiquer avec le commercial du Partenaire, refuse de fixer un rendez-vous ou n&apos;apprécie pas le contact commercial ;</li>
            <li>Le Prospect conteste ou refuse la proposition tarifaire, le dimensionnement ou le devis transmis par le Partenaire ;</li>
            <li>Le Prospect s&apos;avère être locataire, usufruitier ou en indivision sans l&apos;accord des co-décisionnaires, ou ne dispose pas du pouvoir de décision final (les informations techniques étant fournies de bonne foi par le Prospect sous sa seule responsabilité déclarative) ;</li>
            <li>La toiture ou le bâtiment présente des contraintes techniques imprévues (présence d&apos;amiante, toiture en ardoises naturelles friables, charpente dégradée, impossibilité d&apos;ancrage, armoire électrique obsolète nécessitant mise en conformité RGIE, puissance réseau insuffisante ou refus du GRD / ORES / RESA) ;</li>
            <li>Le Partenaire n&apos;a pas contacté le Prospect dans un délai de 48 heures ouvrées suivant l&apos;achat du Lead, entraînant la déperdition de l&apos;intérêt du prospect par la faute exclusive du Partenaire.</li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.5. Modalité unique de compensation : Recrédit interne exclusif (Zéro remboursement en numéraire)</h3>
          <p className="mt-3 leading-relaxed">
            Dans l&apos;hypothèse où une réclamation remplit l&apos;ensemble des conditions de recevabilité et est expressément validée par la Cellule Technique d&apos;Aegis Solaire, la seule et unique mesure réparatoire consentie consiste en un <strong className="text-foreground">recrédit du nombre exact de Crédits virtuels consommés sur le Lead litigieux</strong> directement sur le compte du Partenaire, sous 24 à 48 heures ouvrées.
          </p>
          <p className="mt-3 leading-relaxed">
            <strong className="text-foreground">EN AUCUN CAS L&apos;EXPLOITANT NE PROCÈDERA À UN REMBOURSEMENT EN MONNAIE RÉELLE, ESPÈCES, VIREMENT BANCAIRE OU RECRÉDIT DE CARTE.</strong> Le Partenaire renonce de manière expresse, préalable et irrévocable à exiger un remboursement monétaire ou une déduction de facture pour tout litige relatif à un Lead.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">5.6. Seuil de fair-play commercial & Clause anti-abus de réclamation</h3>
          <p className="mt-3 leading-relaxed">
            Aegis Solaire applique une surveillance algorithmique et humaine des ratios de réclamation. Tout Partenaire dont le taux de contestation dépasse <strong className="font-mono tabular-nums text-foreground">huit pour cent (8 %)</strong> de l&apos;ensemble des Leads achetés sur une période glissante de 30 jours, ou qui soumet des réclamations manifestement infondées ou de mauvaise foi, pourra voir :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>La faculté de déclarer des litiges suspendue unilatéralement et temporairement ou définitivement sur son compte ;</li>
            <li>L&apos;application d&apos;une indemnité forfaitaire de traitement administratif de <strong className="font-mono tabular-nums text-foreground">15,00 € HTVA</strong> par contestation injustifiée soumise ;</li>
            <li>La clôture immédiate de son compte pour déloyauté contractuelle, sans préavis ni indemnité.</li>
          </ul>
        </section>

        {/* 6. Engagements de l'Installateur & Démarchage Responsable */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">6. Engagements de l&apos;Installateur & Déontologie commerciale</h2>
          <p className="mt-4 leading-relaxed">
            Tout Partenaire Installateur accédant aux données des Prospects s&apos;engage formellement et sous sa seule responsabilité à :
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6">
            <li>Contacter le Prospect avec courtoisie, professionnalisme et transparence, dans un délai maximum de quarante-huit (48) heures suivant l&apos;achat ;</li>
            <li>Maintenir à jour l&apos;ensemble de ses certifications professionnelles (agrément RESCERT Photovoltaïque, attestation d&apos;assurance RC exploitation et décennale belge en cours) ;</li>
            <li>S&apos;interdire toute méthode de vente agressive ou trompeuse interdite par le Code de droit économique belge (Livre VI) ;</li>
            <li>Garantir la stricte confidentialité des données personnelles reçues et s&apos;interdire formellement de les rétrocéder, revendre ou céder à tout tiers, sous-traitant ou courtier sous peine de poursuites civiles et pénales immédiates ;</li>
            <li>Supprimer sans délai les coordonnées du Prospect de ses fichiers en cas de refus d&apos;achat ou sur simple demande d&apos;exercice des droits RGPD du Prospect.</li>
          </ul>
        </section>

        {/* 7. Programme Media Partners & Affiliation */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">7. Programme Media Partners & Rémunération d&apos;apport de trafic</h2>
          <p className="mt-4 leading-relaxed">
            Les partenaires médias et régies générant du trafic qualifié via leur code de tracking exclusif (<code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">?ref=CODE</code>) perçoivent des commissions forfaitaires par Lead vérifié et validé par l&apos;Exploitant : <strong className="font-mono tabular-nums text-foreground">30,00 € HTVA</strong> par Lead B2B validé et <strong className="font-mono tabular-nums text-foreground">10,00 € HTVA</strong> par Lead B2C validé.
          </p>
          <p className="mt-3 leading-relaxed">
            Les commissions sont versées mensuellement à terme échu sur facture conforme. Tout trafic frauduleux, automatisé (bots, spiders), incitatif (« incentivized clicks »), mensonger ou généré en violation des règles publicitaires Meta / Google entraîne l&apos;annulation immédiate et rétroactive de l&apos;intégralité des commissions impayées et l&apos;exclusion définitive du partenaire média, sans préjudice de poursuites en dommages et intérêts pour atteinte à la réputation de la Plateforme.
          </p>
        </section>

        {/* 8. Protection des données & RGPD */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">8. Protection des données personnelles & Conformité RGPD</h2>
          <p className="mt-4 leading-relaxed">
            Dans le cadre de l&apos;exploitation de la Plateforme, l&apos;Exploitant et le Partenaire Installateur agissent respectivement en qualité de responsables distincts ou conjoints du traitement des données personnelles conformément au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679).
          </p>
          <p className="mt-3 leading-relaxed">
            Le Partenaire Installateur garantit disposer des mesures organisationnelles et techniques appropriées pour sécuriser les données transmises. Pour toute question ou information complémentaire, le Partenaire est invité à consulter la{" "}
            <a href="/politique-confidentialite" className="text-primary font-medium hover:underline">
              Politique de Confidentialité
            </a>{" "}
            d&apos;Aegis Solaire.
          </p>
        </section>

        {/* 9. Propriété Intellectuelle */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">9. Propriété intellectuelle</h2>
          <p className="mt-4 leading-relaxed">
            L&apos;ensemble de la Plateforme, comprenant sans limitation les marques, dénominations, chartes graphiques, codes sources, bases de données, algorithmes de simulation ROI, textes d&apos;ingénierie, vidéos, visuels et interfaces, est et demeure la propriété exclusive et intégrale d&apos;INIT42 / Nathan Remacle ou fait l&apos;objet de licences d&apos;exploitation concédées.
          </p>
          <p className="mt-3 leading-relaxed">
            L&apos;octroi d&apos;un accès à la Plateforme ne confère au Partenaire aucun droit de propriété intellectuelle sur les outils, algorithmes ou éléments de marque. Toute extraction substantielle de données, scraping, rétro-ingénierie ou contrefaçon fera l&apos;objet de poursuites judiciaires immédiates.
          </p>
        </section>

        {/* 10. Limitation Draconienne & Exonération Totale de Responsabilité */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">10. Statut de courtier technique & Limitation draconienne de responsabilité (B2B Shield)</h2>
          <p className="mt-4 leading-relaxed">
            <strong className="text-foreground">L&apos;EXPLOITANT AGIT EN QUALITÉ DE PUR INTERMÉDIAIRE TECHNIQUE ET APPORTEUR D&apos;INFORMATIONS PRÉ-QUALIFIÉES.</strong> À ce titre, les parties conviennent expressément des stipulations de limitation de responsabilité suivantes :
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Obligation de moyens stricte :</strong> L&apos;Exploitant est tenu à une obligation de moyens quant à la qualification algorithmique et éditoriale des formulaires. Les informations transmises dans les fiches Leads sont le reflet des déclarations fournies par les Prospects. L&apos;Exploitant ne garantit pas la solvabilité des Prospects, la véracité exhaustive de leurs déclarations, ni la faisabilité technique finale de leur projet solaire.
            </li>
            <li>
              <strong className="text-foreground">Absence totale de garantie de conversion ou de chiffre d&apos;affaires :</strong> L&apos;achat d&apos;un Lead confère uniquement un droit d&apos;accès à des coordonnées qualifiées. L&apos;Exploitant ne garantit en aucun cas qu&apos;un Lead aboutira à la signature d&apos;un bon de commande, d&apos;un devis ou à la réalisation d&apos;un chantier. Le Partenaire assume seul et intégralement l&apos;aléa commercial inhérent à son activité.
            </li>
            <li>
              <strong className="text-foreground">Indépendance absolue des prestations d&apos;installation :</strong> L&apos;Exploitant est un tiers total aux contrats conclus entre les Partenaires et les Prospects. Il ne saurait être tenu responsable d&apos;aucun retard, malfaçon, sinistre, litige tarifaire, inexécution ou désordre survenant lors de la réalisation des études ou des chantiers d&apos;installation.
            </li>
            <li>
              <strong className="text-foreground">Exclusion absolue des dommages indirects et immatériels :</strong> Dans toute la mesure permise par le droit belge applicable, l&apos;Exploitant ne pourra en aucun cas être tenu responsable envers le Partenaire ou tout tiers des dommages indirects, immatériels, consécutifs ou accessoires, incluant sans limitation les pertes de marge, manques à gagner, pertes de chiffre d&apos;affaires, coûts de personnel, pertes de données, atteintes à la réputation ou coûts d&apos;acquisition de substitution.
            </li>
            <li>
              <strong className="text-foreground">Plafond absolu de responsabilité financière :</strong> En tout état de cause, si la responsabilité de l&apos;Exploitant venait à être reconnue par une décision judiciaire définitive ayant autorité de la chose jugée, le montant total des dommages et intérêts auquel l&apos;Exploitant pourrait être condamné au profit d&apos;un Partenaire sera expressément plafonné, tous chefs de préjudice confondus, au montant hors taxes effectivement encaissé par l&apos;Exploitant auprès dudit Partenaire au cours des <span className="font-mono tabular-nums">trente (30) jours calendaires</span> précédant le fait générateur du litige, sans pouvoir en aucun cas excéder la somme forfaitaire maximale de <strong className="font-mono tabular-nums text-foreground">250,00 € HTVA</strong> (deux cent cinquante euros hors taxe).
            </li>
          </ul>
        </section>

        {/* 11. Clôture de Compte & Droit Discrétionnaire de Shutdown de la Plateforme Sans Remboursement */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">11. Suspension, Résiliation & Droit souverain de Shutdown de la Plateforme sans remboursement</h2>

          <h3 className="mt-6 text-lg font-medium text-foreground">11.1. Résiliation et exclusion immédiate pour faute ou manquement du Partenaire</h3>
          <p className="mt-3 leading-relaxed">
            L&apos;Exploitant est habilité à suspendre temporairement l&apos;accès ou à clôturer définitivement et de plein droit le compte de tout Partenaire, sans préavis ni mise en demeure préalable, dans les cas suivants :
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-6">
            <li>Perte, suspension ou non-renouvellement de la certification RESCERT ou des polices d&apos;assurance obligatoires ;</li>
            <li>Comportement déloyal, harcèlement, pressions ou démarches contraires à l&apos;éthique auprès des Prospects transmis ;</li>
            <li>Dénigrement, diffamation publique, diffusion d&apos;avis calomnieux ou tentative d&apos;atteinte à l&apos;image ou à la réputation d&apos;Aegis Solaire ;</li>
            <li>Déclarations répétées et abusives de litiges infondés en vue d&apos;obtenir des recrédits indus ;</li>
            <li>Rétrofacturation bancaire frauduleuse (« chargeback » non concerté) auprès de son établissement bancaire ou de Mollie ;</li>
            <li>Violation de la confidentialité des données personnelles ou revente illicite de Leads à des tiers.</li>
          </ul>
          <p className="mt-3 leading-relaxed">
            En cas de clôture pour faute ou manquement, l&apos;intégralité des Crédits résiduels subsistant sur le compte du Partenaire fautif sera acquise de plein droit et irrévocablement à l&apos;Exploitant à titre d&apos;indemnité forfaitaire conventionnelle et irréductible de gestion du préjudice, sans faculté de restitution monétaire.
          </p>

          <h3 className="mt-6 text-lg font-medium text-foreground">11.2. Droit discrétionnaire de Shutdown de la Plateforme (Fermeture, Suspension & Cessation d&apos;activité)</h3>
          <p className="mt-3 leading-relaxed">
            <strong className="text-foreground">L&apos;EXPLOITANT SE RÉSERVE LE DROIT UNILATÉRAL, DISCRÉTIONNAIRE ET ABSOLU, À TOUT MOMENT ET SANS AVOIR À JUSTIFIER D&apos;UN MOTIF LÉGITIME OU D&apos;UNE NÉCESSITÉ TECHNIQUE :</strong>
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-6">
            <li>De suspendre, restreindre, modifier ou interrompre temporairement tout ou partie des fonctionnalités de la Plateforme, des formulaires de simulation, de la marketplace de leads ou des accès aux Dashboards ;</li>
            <li>D&apos;arrêter définitivement, de fermer ou de cesser l&apos;exploitation globale de la Plateforme Aegis Solaire (« Shutdown définitif »), que cette décision résulte d&apos;une restructuration commerciale, d&apos;un choix stratégique, d&apos;une opportunité d&apos;affaires, d&apos;un changement de modèle économique, d&apos;une cessation volontaire d&apos;activité de l&apos;entreprise exploitante, ou d&apos;une contrainte juridique ou technologique.</li>
          </ul>

          <h3 className="mt-6 text-lg font-medium text-foreground">11.3. Absence totale de remboursement des crédits et renonciation irrévocable à indemnité en cas de Shutdown</h3>
          <p className="mt-3 leading-relaxed">
            En cas d&apos;arrêt temporaire, de suspension ou de Shutdown définitif de la Plateforme :
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-6">
            <li>
              <strong className="text-foreground">Extinction pure et simple des soldes de Crédits :</strong> L&apos;ensemble des Crédits non consommés figurant sur les comptes des Partenaires Installateurs ou utilisateurs sera purement et simplement annulé et réputé éteint de plein droit à la date effective de cessation du service.
            </li>
            <li>
              <strong className="text-foreground">Zéro remboursement monétaire :</strong> Aucun remboursement en espèces, par virement bancaire, chèque ou monnaie électronique ne sera consenti ni exigible de l&apos;Exploitant, quel que soit le solde résiduel de crédits inscrit sur le Dashboard.
            </li>
            <li>
              <strong className="text-foreground">Abandon irrévocable de tout recours indemnitaire :</strong> Le Partenaire et l&apos;Utilisateur reconnaissent expressément et solennellement que l&apos;achat de Crédits comporte un risque intrinsèque d&apos;inutilisation et d&apos;aléa commercial. En conséquence, ils renoncent formellement, définitivement et irrévocablement à engager toute action en justice, poursuite, réclamation financière, demande de dédommagement, de restitution de fonds ou de dommages-intérêts à l&apos;encontre de l&apos;Exploitant, de ses ayants droit ou de ses préposés du fait de la fermeture, de l&apos;interruption du service ou de la disparition de leur solde de crédits.
            </li>
            <li>
              <strong className="text-foreground">Préavis indicatif non contraignant :</strong> L&apos;Exploitant s&apos;efforcera, dans la mesure du raisonnable et si les circonstances matérielles le permettent, de notifier aux Partenaires un préavis indicatif de quinze (15) jours ouvrés avant un Shutdown définitif par e-mail ou notification Dashboard afin de leur permettre de consommer leurs crédits disponibles. Néanmoins, l&apos;absence de notification ou la survenance d&apos;une interruption immédiate (notamment pour cas de force majeure, impératif de cybersécurité ou décision de gestion d&apos;urgence) ne saurait ouvrir aucun droit à compensation financière.
            </li>
          </ul>
        </section>

        {/* 12. Droit Applicable, Juridiction Exclusive & Renonciation aux Recours Collectifs */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">12. Droit applicable, for judiciaire exclusif & Renonciation aux actions de groupe</h2>
          <p className="mt-4 leading-relaxed">
            Les présentes Conditions Générales ainsi que toute opération, litige ou contestation survenant entre l&apos;Exploitant et le Partenaire sont régis exclusivement par le <strong className="text-foreground">droit belge</strong>, à l&apos;exclusion de la Convention des Nations Unies sur les contrats de vente internationale de marchandises (CVIM) et des règles de conflit de lois.
          </p>
          <p className="mt-3 leading-relaxed">
            En cas de litige, réclamation ou différend relatif à la validité, l&apos;interprétation, l&apos;exécution ou la cessation des présentes, les parties rechercheront prioritairement un règlement amiable dans un délai de trente (30) jours à compter de la notification du litige.
          </p>
          <p className="mt-3 leading-relaxed">
            À défaut de résolution amiable dans ce délai, compétence territoriale et matérielle exclusive est attribuée aux <strong className="text-foreground">tribunaux francophones de l&apos;arrondissement judiciaire de Liège (Belgique)</strong>, même en cas d&apos;appel en garantie, de pluralité de défendeurs ou de procédure d&apos;urgence en référé.
          </p>
          <p className="mt-3 leading-relaxed">
            <strong className="text-foreground">Renonciation expresse aux actions collectives :</strong> Tout litige sera traité sur une base strictement individuelle entre le Partenaire et l&apos;Exploitant. Le Partenaire renonce expressément à intenter, participer ou se joindre à toute action collective (« class action »), procédure représentative ou action conjointe contre l&apos;Exploitant.
          </p>
        </section>

        {/* 13. Modifications des Conditions */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground">13. Évolutions unilatérales des présentes Conditions</h2>
          <p className="mt-4 leading-relaxed">
            L&apos;Exploitant se réserve la faculté de réviser, adapter et enrichir les présentes Conditions à tout moment afin de prendre en compte les évolutions technologiques, légales, jurisprudentielles ou commerciales de la Plateforme.
          </p>
          <p className="mt-3 leading-relaxed">
            Toute version modifiée prend effet immédiatement dès sa publication en ligne sur l&apos;URL <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">/cgv</code>. La passation d&apos;une nouvelle commande de recharges de Crédits ou le déblocage d&apos;un nouveau Lead suite à la mise en ligne des Conditions révisées vaut acceptation pleine, entière et irrévocable de la nouvelle rédaction.
          </p>
        </section>

        {/* 14. Mentions Légales Obligatoires & Coordonnées */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">14. Mentions légales d&apos;identification & Coordonnées</h2>
          <p className="mt-4 leading-relaxed">
            Pour toute demande d&apos;information contractuelle ou communication officielle :
          </p>
          <div className="mt-4 rounded-xl border border-border bg-card p-5 text-sm space-y-2">
            <p>
              <strong className="text-foreground">Plateforme exploitée par :</strong> INIT42 (Nathan Remacle, Personne physique)
            </p>
            <p>
              <strong className="text-foreground">BCE (Banque-Carrefour des Entreprises) :</strong> <span className="font-mono tabular-nums">1039.899.980</span>
            </p>
            <p>
              <strong className="text-foreground">Numéro de TVA intracommunautaire :</strong> <span className="font-mono tabular-nums">BE 1039.899.980</span>
            </p>
            <p>
              <strong className="text-foreground">Siège d&apos;exploitation :</strong> Liège, Belgique
            </p>
            <p>
              <strong className="text-foreground">Canal de contact contractuel :</strong>{" "}
              <a href="mailto:cgv@aegissolaire.com" className="text-primary font-medium hover:underline">
                cgv@aegissolaire.com
              </a>{" "}
              ou{" "}
              <a href="mailto:contact@aegissolaire.com" className="text-primary font-medium hover:underline">
                contact@aegissolaire.com
              </a>
            </p>
            <p>
              <strong className="text-foreground">URL officielle de la Plateforme :</strong>{" "}
              <a href="https://www.aegissolaire.com" className="text-primary font-medium hover:underline">
                www.aegissolaire.com
              </a>
            </p>
          </div>
        </section>
      </div>
    </LegalPageShell>
  )
}
