import { Metadata } from "next"
import { LegalPageShell } from "@/components/legal-page-shell"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Politique de confidentialité | Aegis Solaire",
  description:
    "Politique de confidentialité et traitement des données personnelles d'Aegis Solaire (INIT42). Conforme RGPD et APD Belgique.",
  alternates: { canonical: `${baseUrl}/politique-confidentialite` },
}

export default function PolitiqueConfidentialite() {
  return (
    <LegalPageShell
      title="Politique de confidentialité"
      badge="RGPD & protection des données"
      description="Traitement transparent de vos données personnelles, finalités de mise en relation et exercice de vos droits (RGPD / APD)."
    >
      <div className="prose prose-gray max-w-none space-y-8">
        <p className="text-sm text-muted-foreground">Dernière mise à jour : Octobre 2026</p>

        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Responsable du traitement</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Le responsable du traitement des données à caractère personnel collectées sur la plateforme <strong>Aegis Solaire</strong> est l&apos;entreprise individuelle <strong>INIT42</strong>, exploitée par <strong>Nathan Remacle</strong>, inscrite à la Banque-Carrefour des Entreprises sous le numéro <strong>1039.899.980</strong> (TVA BE 1039.899.980), dont le siège d&apos;exploitation est situé en Belgique.
            <br />
            Contact DPO / Référent vie privée : <a href="mailto:dpo@aegissolaire.com" className="text-primary underline">dpo@aegissolaire.com</a> ou <a href="mailto:contact@aegissolaire.com" className="text-primary underline">contact@aegissolaire.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Données collectées</h2>
          <p className="mt-4 text-muted-foreground">
            Dans le cadre de l&apos;utilisation de nos simulateurs photovoltaïques et de nos formulaires, nous collectons :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>Identité & contact :</strong> Nom, prénom, adresse e-mail professionnelle ou personnelle, numéro de téléphone.</li>
            <li><strong>Données professionnelles (B2B) :</strong> Dénomination sociale, fonction du déclarant, numéro d&apos;entreprise / TVA.</li>
            <li><strong>Caractéristiques du site & de l&apos;infrastructure :</strong> Type de surface (toiture, parking, sol, friche), superficie estimée, localisation (province wallonne ou commune), gestionnaire de réseau (GRD).</li>
            <li><strong>Données de consommation :</strong> Montant de la facture d&apos;électricité annuelle, puissance de raccordement ou intérêt pour bornes IRVE / batterie.</li>
            <li><strong>Données techniques de navigation :</strong> Adresse IP, horodatage de soumission, paramètres de campagne publicitaire (UTM), balises de conversion.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Finalités du traitement & Modèle de mise en relation</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Vos données personnelles sont traitées pour les finalités suivantes :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>Calcul et délivrance de votre estimation :</strong> Génération de la modélisation indicative de rentabilité, du TRI estimé et des économies annuelles projetées.</li>
            <li><strong>Mise en relation avec des installateurs certifiés :</strong> Transmission de votre dossier technique et de vos coordonnées à des professionnels photovoltaïques rigoureusement sélectionnés détenteurs de la certification RESCERT ou équivalente. Dans le segment <strong>B2B</strong>, votre demande est transmise à un installateur unique en exclusivité. Dans le segment <strong>B2C</strong>, votre demande peut être transmise à un maximum de 3 installateurs pour vous permettre de comparer les offres.</li>
            <li><strong>Envoi du récapitulatif par e-mail :</strong> Transmission instantanée de votre dossier complet d&apos;estimation via notre infrastructure d&apos;e-mails.</li>
            <li><strong>Information et suivi (si consentement spécifique) :</strong> Envoi d&apos;actualités sur les réglementations énergétiques (CWaPE, PEB Wallonie, certificats verts).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Base légale des traitements</h2>
          <p className="mt-4 text-muted-foreground">Nos traitements reposent sur :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>L&apos;exécution de mesures précontractuelles :</strong> Réalisation de la simulation de rentabilité et transmission de votre demande de devis aux installateurs sélectionnés.</li>
            <li><strong>Votre consentement explicite :</strong> Recueilli au moyen de cases à cocher libres et distinctes pour la transmission des coordonnées et la réception d&apos;informations ultérieures.</li>
            <li><strong>Notre intérêt légitime :</strong> Prévention de la fraude, détection des soumissions automatisées par robots et sécurité de nos serveurs.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Destinataires et sous-traitants</h2>
          <p className="mt-4 text-muted-foreground">Vos données sont strictement réservées aux destinataires suivants :</p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>Les installateurs partenaires agréés :</strong> Destinataires directs habilités à vous recontacter pour finaliser l&apos;étude de faisabilité sur site.</li>
            <li><strong>Supabase Inc. :</strong> Hébergement de la base de données sécurisée (serveurs chiffrés situés dans l&apos;UE, AWS Francfort).</li>
            <li><strong>Vercel Inc. :</strong> Hébergement technique de l&apos;application web.</li>
            <li><strong>Resend Inc. :</strong> Solution de routage de nos e-mails transactionnels de confirmation.</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune donnée n&apos;est cédée à des fins de prospection publicitaire sauvage à des tiers sans rapport avec votre projet photovoltaïque.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Durée de conservation</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Vos données de simulation et de contact sont conservées pour une durée maximale de <strong>3 ans</strong> à compter de votre dernière démarche active sur le site, délai préconisé par l&apos;Autorité de Protection des Données (APD) pour les démarches précontractuelles. À l&apos;issue de ce délai, vos données sont automatiquement purgées ou anonymisées.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">7. Vos droits et modalités d&apos;exercice</h2>
          <p className="mt-4 text-muted-foreground">
            Conformément au RGPD (Règlement UE 2016/679), vous bénéficiez des droits suivants :
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
            <li><strong>Droit d&apos;accès et de copie :</strong> Connaître les données que nous détenons à votre sujet.</li>
            <li><strong>Droit de rectification :</strong> Mettre à jour des coordonnées erronées.</li>
            <li><strong>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;) :</strong> Demander la suppression immédiate de votre fiche prospect.</li>
            <li><strong>Droit d&apos;opposition :</strong> Vous opposer à tout moment au recontact commercial.</li>
            <li><strong>Droit de retirer votre consentement :</strong> Sans affecter la licéité des traitements préalables.</li>
          </ul>
          <p className="mt-4 text-muted-foreground">
            Pour exercer l&apos;un de ces droits, écrivez simplement à :{" "}
            <a href="mailto:dpo@aegissolaire.com" className="font-semibold text-primary underline">
              dpo@aegissolaire.com
            </a>{" "}
            en précisant votre demande. Un accusé de réception vous est adressé sous 48h ouvrées.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">8. Réclamation auprès de l&apos;autorité de contrôle</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Si vous estimez que vos données ne sont pas traitées conformément à la législation applicable, vous pouvez introduire une réclamation auprès de l&apos;<strong>Autorité de Protection des Données (APD) belge</strong> :
            <br />
            Rue de la Presse 35, 1000 Bruxelles — Téléphone : +32 (0)2 274 48 00 — Site officiel :{" "}
            <a
              href="https://www.autoriteprotectiondonnees.be"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              www.autoriteprotectiondonnees.be
            </a>.
          </p>
        </section>
      </div>
    </LegalPageShell>
  )
}
