import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Benefits } from "@/components/benefits"
import { Expert } from "@/components/expert"
import { Testimonials } from "@/components/testimonials"
import { WebinairePromo } from "@/components/webinaire-promo"
import { ROISimulator } from "@/components/roi-simulator"
import { Footer } from "@/components/footer"
import { StructuredData } from "@/components/StructuredData"
import type { FaqItem } from "@/components/StructuredData"

const faqItems: FaqItem[] = [
  {
    question:
      "Comment les Certificats Verts (CWaPE) influencent-ils la rentabilité d'une centrale B2B en Wallonie ?",
    answer:
      "Au-delà de 10 kW, le soutien wallon s'appuie sur le marché des Certificats Verts, sous supervision de la CWaPE. Le nombre de CV dépend de la production certifiée et de coefficients réglementaires (kECO, kCO2) ; le SPW Énergie gère des enveloppes avec réservation préalable. Les CV s'ajoutent aux économies sur prélèvements ; le cadre prévoit un filet de rachat par Elia à prix plancher pour les CV invendus, ce qui aide la bancabilité — sous réserve de dossier conforme (RGIE) et de calendrier de réservation.",
  },
  {
    question: "Pourquoi un DAF doit-il anticiper la réservation auprès du SPW Énergie avant d'engager un investissement ?",
    answer:
      "Les droits à Certificats Verts sont plafonnés par enveloppes budgétaires : la règle du premier arrivé, premier servi peut repousser ou conditionner votre rentabilité si le dossier arrive trop tard. Avant commande de matériel, il faut un dossier technique solide, souvent validé en amont avec le gestionnaire de réseau de distribution (GRD). Pour un DAF, c'est un risque de calendrier et de VAN : l'étude doit synchroniser investissement, réservation SPW et raccordement.",
  },
  {
    question: "Quelles exigences PEB (2026-2030) concernent le non résidentiel en Wallonie ?",
    answer:
      "La trajectoire wallonne renforce l'intégration d'énergies renouvelables sur site ou à proximité (ex. quota élevé de couverture du besoin pour le neuf ou travaux assimilés), accompagne l'interdiction de certains chauffages fossiles sur neuf/reconstruction, et croise les obligations en mobilité (IRVE) qui augmentent les pics de puissance. La solarisation des toitures et parkings devient un levier pour tenir la performance PEB tout en maîtrisant l'injection vers le GRD.",
  },
  {
    question: "En quoi le Plan PACE 2030 impacte-t-il la stratégie patrimoniale d'une entreprise ?",
    answer:
      "Le Plan Air Climat Énergie fixe des objectifs de réduction de consommation et d'émissions pour le tertiaire et l'industrie léger : l'inaction peut se traduire par un patrimoine mal aligné sur les attentes de marché (revente, refinancement, critères ESG). Un programme solaire documenté améliore la lisibilité de votre trajectoire bas-carbone et la valeur résiduelle de l'actif.",
  },
  {
    question: "Ores, Resa, autres GRD : qu'est-ce qui conditionne coût et délai de raccordement ?",
    answer:
      "Votre site est raccordé via un gestionnaire de réseau de distribution (GRD) — en Wallonie, notamment Ores ou Resa selon la zone. Le GRD valide la capacité d'accueil, les protections et parfois le renforcement ; au-delà d'un certain seuil, le transport (Elia) entre en jeu. L'injection excédentaire est valorisée à un tarif d'injection inférieur au prix d'achat : le dimensionnement doit maximiser l'autoconsommation et éviter une surproduction coûteuse en réseau.",
  },
  {
    question: "Quel ordre de grandeur sur un entrepôt logistique de 2 000 m² en Wallonie ?",
    answer:
      "À titre indicatif, une étude type sur 2 000 m² peut retenir de l'ordre de 45 000 € d'économies annuelles sur la facture, avec une autoconsommation cible autour de 72 % et un TRI souvent discuté dans une fourchette 5 à 7 ans selon hypothèses de prix, de CV et de montage. Les chiffres réels dépendent du profil de charge, du GRD et de la réservation SPW Énergie.",
  },
  {
    question: "Achat propre, Corporate PPA ou tiers-investissement : comment un DAF wallon arbitre-t-il ?",
    answer:
      "L'achat propre capitalise la DPI à 40 % (depuis 2025) et peut se combiner au prêt subordonné Easy'Green (Wallonie Entreprendre) pour préserver les garanties bancaires. Le Corporate PPA fige un prix sur 10-25 ans et limite l'exposition au marché ; le tiers-investissement vise un zéro CAPEX en transférant le risque technique et le bénéfice des CV au partenaire financier. Le bon modèle dépend du WACC, du bilan, des plafonds d'enveloppe SPW et de la politique de couverture énergétique du groupe.",
  },
  {
    question: "Pourquoi nos partenaires sont-ils certifiés RESCERT Photovoltaïque ?",
    answer:
      "En Belgique, la conformité au RGIE et une qualification reconnue comme RESCERT Photovoltaïque sont essentielles pour les assurances, la mise en service et le marché des Certificats Verts (CWaPE). Nos partenaires suivent ce cadre pour réduire l'aléa technique et sécuriser les délais — critère décisif quand un DAF engage la signature du client et le calendrier de réservation SPW Énergie.",
  },
]

export default function Home() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-[100] -translate-x-[200%] rounded bg-primary px-3 py-2.5 text-sm text-primary-foreground transition-transform focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [margin-left:env(safe-area-inset-left)] [margin-top:env(safe-area-inset-top)]"
      >
        Aller au contenu principal
      </a>
      <Header />
      <main id="main-content" className="min-w-0 flex-1 [padding-bottom:env(safe-area-inset-bottom)]" role="main">
        <Hero />
        <section
          className="scroll-mt-24 overflow-x-hidden bg-background py-8 sm:py-12 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          aria-label="FAQ technique Wallonie B2B"
        >
          <div className="mx-auto max-w-5xl min-w-0 px-4 sm:px-6 lg:px-8">
            <StructuredData includeOrganization={false} faq={faqItems} />

            <div className="mt-6">
              <div className="mx-auto max-w-3xl text-center">
                <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  FAQ technique (Certificats Verts, PEB, PACE 2030 et financement B2B)
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
                  Des réponses orientées DAF et direction générale : CWaPE, réservation SPW, trajectoire PEB, Plan PACE 2030, raccordement GRD (Ores, Resa) et montages Corporate PPA ou tiers-investissement — pour arbitrer risque, rentabilité et valeur immobilière.
                </p>
              </div>

              <div className="mt-7 rounded-2xl border border-border bg-gradient-to-br from-card/70 via-background/70 to-background p-4 shadow-sm backdrop-blur sm:p-6 lg:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  {faqItems.slice(0, 6).map((item, idx) => (
                    <article
                      key={item.question}
                      className="group rounded-xl border border-border bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <h2
                        id={`faq-${idx}`}
                        className="text-lg font-bold tracking-tight text-foreground sm:text-xl"
                      >
                        {item.question}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                        {item.answer}
                      </p>
                    </article>
                  ))}
                </div>

                <article className="mt-4 rounded-xl border border-border bg-background/70 p-4 sm:p-5">
                  <h2 id="faq-6" className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    {faqItems[6].question}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faqItems[6].answer}</p>

                  <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-background">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <caption className="sr-only">
                        Comparatif des modèles de financement wallon (achat propre, Corporate PPA, tiers-investissement)
                      </caption>
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th scope="col" className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide">
                            Modèle
                          </th>
                          <th scope="col" className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide">
                            Qui finance l’installation ?
                          </th>
                          <th scope="col" className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide">
                            Effet principal
                          </th>
                          <th scope="col" className="py-3 text-xs font-semibold uppercase tracking-wide">
                            Points d’attention
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-3 pr-4 text-sm font-medium">Achat propre</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">Votre entreprise</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">
                            Maîtrise de l’actif, DPI à 40 % possible, captation des Certificats Verts côté société
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            CAPEX, dépôt SPW, coordination GRD ; levier dette type Easy&apos;Green (Wallonie Entreprendre) à modéliser
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="py-3 pr-4 text-sm font-medium">Corporate PPA</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">Producteur / investisseur</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">
                            Prix de l’électricité fixé sur 10 à 25 ans, couverture contre la volatilité (hedging)
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            On-site : souvent derrière le compteur ; structuration contrat, profil de charge et GRD (Ores, Resa, etc.)
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 pr-4 text-sm font-medium">Tiers-investissement</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">Investisseur / ESCO</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">
                            Zéro CAPEX, CV et vente d’électricité au site pour structurer le retour investisseur
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">
                            Montage juridique (superficie, etc.), répartition des CV, échéance de rétrocession
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="mt-4 rounded-xl border border-border bg-background/70 p-4 sm:p-5">
                  <h2 id="faq-7" className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    {faqItems[7].question}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faqItems[7].answer}</p>
                </article>
              </div>
            </div>
          </div>
        </section>
        <Testimonials />
        <Expert />
        <WebinairePromo />
        <Benefits />
        <ROISimulator />
      </main>
      <Footer />
    </div>
  )
}
