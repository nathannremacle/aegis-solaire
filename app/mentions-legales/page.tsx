import { Metadata } from "next"
import { LegalPageShell } from "@/components/legal-page-shell"

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aegissolaire.com"

export const metadata: Metadata = {
  title: "Mentions légales | Aegis Solaire",
  description:
    "Mentions légales d'Aegis Solaire et INIT42. Éditeur responsable, numéro d'entreprise BCE, TVA, hébergement et cadre juridique belge.",
  alternates: { canonical: `${baseUrl}/mentions-legales` },
}

export default function MentionsLegales() {
  return (
    <LegalPageShell
      title="Mentions légales"
      description="Éditeur, hébergement et cadre juridique du site Aegis Solaire (Code de droit économique belge, art. XII.6)."
    >
      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground">1. Éditeur de la plateforme</h2>
          <div className="mt-4 rounded-xl border border-border bg-card/50 p-5 text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">Dénomination commerciale :</strong> Aegis Solaire
            </p>
            <p>
              <strong className="text-foreground">Exploitant & Forme juridique :</strong> Entreprise individuelle / Personne physique (PP) — Nathan Remacle
            </p>
            <p>
              <strong className="text-foreground">Nom d&apos;entreprise :</strong> INIT42
            </p>
            <p>
              <strong className="text-foreground">Numéro d&apos;entreprise (BCE / Banque-Carrefour des Entreprises) :</strong> 1039.899.980
            </p>
            <p>
              <strong className="text-foreground">Numéro de TVA intracommunautaire :</strong> BE 1039.899.980 (Assujetti à la TVA)
            </p>
            <p>
              <strong className="text-foreground">Codes NACEBEL principaux :</strong> 62100 (Programmation informatique), 73110 (Activités des agences de publicité), 63100 (Traitement de données & hébergement), 18130, 59113, 62200, 62900, 63910, 74201, 82400.
            </p>
            <p>
              <strong className="text-foreground">Éditeur responsable :</strong> Nathan Remacle
            </p>
            <p>
              <strong className="text-foreground">Contact électronique :</strong> contact@aegissolaire.com
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">2. Activité de la plateforme</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Aegis Solaire est une plateforme indépendante de qualification technique et de mise en relation dans le domaine de la transition énergétique solaire en Wallonie et en Belgique. Aegis Solaire met en relation des entreprises (B2B) et particuliers (B2C) avec des installateurs photovoltaïques partenaires détenteurs de la certification RESCERT ou de qualifications professionnelles équivalentes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">3. Hébergement des services</h2>
          <div className="mt-3 space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Hébergement de l&apos;application web :</strong>
              <br />
              Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis (Infrastructures de diffusion edge globales & région européenne Francfort).
            </p>
            <p>
              <strong className="text-foreground">Base de données & Stockage sécurisé :</strong>
              <br />
              Supabase Inc., 970 Toa Payoh North #07-04, Singapour (Serveurs hébergés au sein de l&apos;Union Européenne : AWS Région eu-central-1 Francfort, Allemagne).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">4. Propriété intellectuelle</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            L&apos;ensemble des contenus présents sur la plateforme Aegis Solaire (structure, charte graphique, textes, algorithmes de simulation, calculateurs de rentabilité, vidéos, logos et éléments graphiques) est la propriété exclusive d&apos;INIT42 / Nathan Remacle ou fait l&apos;objet d&apos;une licence légale d&apos;exploitation. Toute reproduction, copie ou exploitation sans autorisation écrite préalable est strictement interdite.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">5. Protection des données personnelles (RGPD)</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Le traitement de vos données est soumis au Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679) et à la loi belge du 30 juillet 2018 relative à la protection des personnes physiques à l&apos;égard des traitements de données à caractère personnel. Pour toute question ou pour exercer vos droits d&apos;accès, de rectification ou d&apos;effacement, contactez notre délégué à la protection des données à : <a href="mailto:dpo@aegissolaire.com" className="text-primary underline">dpo@aegissolaire.com</a> ou <a href="mailto:contact@aegissolaire.com" className="text-primary underline">contact@aegissolaire.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">6. Droit applicable & juridiction compétente</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Le présent site et ses mentions légales sont régis par le droit belge. En cas de litige relatif à l&apos;interprétation ou à l&apos;exécution des présentes, et à défaut de résolution amiable, les tribunaux de l&apos;arrondissement judiciaire de Liège (Belgique) sont seuls compétents.
          </p>
        </section>
      </div>
    </LegalPageShell>
  )
}
