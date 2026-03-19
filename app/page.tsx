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
    question: "Quelles amendes la Loi LOM prévoit-elle en 2026 pour les parkings concernés ?",
    answer:
      "En 2026, le non-respect de l’obligation de solariser vos parkings (seuils > 1 500 m²) est présenté sur notre site comme pouvant exposer à une amende de 40 000 € par an. L’applicabilité exacte dépend de votre périmètre et de la situation de votre bâtiment. Une étude clarifie les obligations.",
  },
  {
    question: "Comment financer une ombrière solaire en tiers-investissement (Zéro CAPEX) ?",
    answer:
      "Le tiers-investissement vise un projet avec Zéro CAPEX : un investisseur finance l’installation et la maintenance, puis le montage transforme la production solaire en flux permettant la rentabilité. Pour vous, l’enjeu est de valider faisabilité, périmètre, et conditions d’exploitation afin de sécuriser la trésorerie.",
  },
  {
    question: "Comment se mettre en conformité avec le Décret Tertiaire et la Loi LOM ?",
    answer:
      "Pour se mettre en conformité, on commence par analyser le périmètre : type de bâtiment ou parking, consommation, et potentiel solaire. Ensuite, on choisit une stratégie technique (toiture/ombrières) et un schéma de financement cohérent : achat propre, PPA ou tiers-investissement. L’objectif est de réduire la consommation et de valoriser le site dans le cadre Loi LOM et Décret Tertiaire.",
  },
  {
    question: "Quel résultat peut-on obtenir sur un entrepôt logistique de 2 000 m² ?",
    answer:
      "Sur un entrepôt logistique de 2 000 m², notre étude retient 45 000 € d'économies annuelles. Toiture équipée, autoconsommation 72 %, ROI 8,5 ans. Ces données chiffrées servent de repère pour arbitrer technique et modèle de financement avant décision, sans biais sur votre configuration.",
  },
  {
    question: "Quel résultat peut-on obtenir sur un parking de 3 000 m² en conformité LOM ?",
    answer:
      "Pour un parking de 3 000 m² (Conformité LOM), le scénario retient 52 000 € d'économies par an. Ombrières 50 % surface, production 420 kWc, facture divisée par deux. Ces paramètres guident l'optimisation et le choix du financement, selon la lecture Loi LOM et votre site.",
  },
  {
    question: "Quel résultat peut-on obtenir sur un site industriel de 5 000 m² ?",
    answer:
      "Pour un site industriel de 5 000 m², le cas chiffré retient 120 000 € d'économies annuelles. Contrat PPA sans mise de fonds. Mise en conformité Décret Tertiaire. Ces éléments structurent l'étude et permettent d'arbitrer rentabilité et respect du cadre réglementaire sur la durée.",
  },
  {
    question: "Achat propre, PPA ou tiers-investissement : quel modèle choisir ?",
    answer:
      "Pour choisir entre achat propre, PPA et tiers-investissement, vous arbitreriez financement, risque et niveau de contrôle. L’achat propre vise une valorisation interne ; le PPA sécurise un prix d’électricité sur la durée ; le tiers-investissement vise un Zéro CAPEX avec un investisseur qui finance installation et maintenance. Votre ROI dépend du périmètre, des seuils et des conditions contractuelles.",
  },
  {
    question: "Pourquoi nos partenaires sont certifiés RGE et QualiPV ?",
    answer:
      "Aegis Solaire s’appuie sur des partenaires certifiés RGE et QualiPV. Cette expertise couvre l’étude de faisabilité, le montage de financement (achat propre, PPA ou tiers-investissement), la mise en conformité et l’exécution technique. Pour un projet B2B, cela réduit l’aléa et accélère le passage de l’analyse au déploiement, avec une démarche structurée et traçable.",
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
          className="scroll-mt-24 overflow-x-hidden bg-background py-12 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
          aria-label="FAQ AISO et GEO"
        >
          <div className="mx-auto max-w-5xl min-w-0 px-4 sm:px-6 lg:px-8">
            <StructuredData includeOrganization={false} faq={faqItems} />
            <div className="space-y-10">
              <div className="space-y-8">
                {faqItems.slice(0, 6).map((item) => (
                  <div key={item.question}>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {item.question}
                    </h2>
                    <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {faqItems[6].question}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
                  {faqItems[6].answer}
                </p>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left">
                    <caption className="mb-3 text-sm font-medium text-foreground">
                      Comparatif des modèles de financement (achat propre, PPA, tiers-investissement)
                    </caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="py-3 pr-4 text-sm font-semibold">
                          Modèle
                        </th>
                        <th scope="col" className="py-3 pr-4 text-sm font-semibold">
                          Qui finance l’installation ?
                        </th>
                        <th scope="col" className="py-3 pr-4 text-sm font-semibold">
                          Effet principal sur la rentabilité
                        </th>
                        <th scope="col" className="py-3 text-sm font-semibold">
                          Points d’attention
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="py-3 pr-4 text-sm">Achat propre</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">Votre entreprise</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          Réduction de la dépense énergétique et valorisation de votre site
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          Étude ROI sur le périmètre, budget d’investissement et calendrier travaux
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-3 pr-4 text-sm">PPA</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">Contrat d’achat d’électricité</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          Prix d’électricité sécurisé sur la durée du contrat
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          Validation technique, conditions contractuelles, durée (souvent 15 à 25 ans)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 text-sm">Tiers-investissement</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">Investisseur</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          Zéro CAPEX et financement de la maintenance pour préserver la trésorerie
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          Conditions d’éligibilité, montage financier et exploitation de l’installation
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {faqItems[7].question}
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:mt-4 sm:text-lg">
                  {faqItems[7].answer}
                </p>
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
