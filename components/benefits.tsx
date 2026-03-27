import { Wallet, Leaf, Building2, BarChart3 } from "lucide-react"

const benefits = [
  {
    icon: Wallet,
    title: "Réduisez vos coûts énergétiques",
    description:
      "Autoconsommation et arbitrage sur les flux de Certificats Verts pour améliorer la VAN : un projet B2B wallon se modèle sur votre profil de charge, votre GRD et votre réservation auprès du SPW Énergie. Les réseaux réalisés par des installateurs RESCERT, conformes au RGIE, sécurisent la bancabilité et la traçabilité.",
  },
  {
    icon: Leaf,
    title: "Alignez RSE et exigences PEB / PACE",
    description:
      "Donnez de la lisibilité à votre trajectoire bas-carbone et aux critères ESG : un actif mieux documenté soutient le financement et la crédibilité auprès des partenaires et investisseurs.",
  },
  {
    icon: Building2,
    title: "Valorisez votre patrimoine industriel",
    description:
      "Un site aligné sur la performance PEB et le Plan PACE 2030 limite le risque de décote sur les actifs logistiques ou industriels lors d'une cession ou d'un refinancement.",
  },
  {
    icon: BarChart3,
    title: "Sécurisez votre budget énergie",
    description:
      "Corporate PPA ou tiers-investissement pour figer un prix ou éviter le CAPEX : réduisez l'exposition au marché de gros tout en protégeant votre trésorerie sur la durée du contrat.",
  },
]

export function Benefits() {
  return (
    <section id="benefits" className="scroll-mt-24 overflow-x-hidden bg-background py-10 sm:py-18 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
      <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h4 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Pourquoi passer au solaire B2B ?
          </h4>
          <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Aegis Solaire accompagne les directions financières et techniques sur le marché wallon : rentabilité, conformité et valeur d’actif, sans sous-estimer le réseau (raccordement, injection).
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative min-w-0 rounded-2xl border border-border/70 bg-card p-4 transition-all hover:border-accent/50 hover:shadow-lg sm:p-6"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <benefit.icon className="h-6 w-6 text-accent" />
              </div>
                <h4 className="text-base font-semibold text-foreground sm:text-lg">
                {benefit.title}
                </h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-sm">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
