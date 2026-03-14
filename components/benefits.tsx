import { Wallet, Leaf, Building2, BarChart3 } from "lucide-react"

const benefits = [
  {
    icon: Wallet,
    title: "Réduisez vos coûts énergétiques",
    description:
      "Jusqu'à 70 % d'économies sur votre facture d'électricité grâce à l'autoconsommation. Amortissez votre investissement en moins de 8 ans.",
  },
  {
    icon: Leaf,
    title: "Renforcez votre engagement RSE",
    description:
      "Réduisez votre empreinte carbone et communiquez sur vos actions concrètes pour l'environnement auprès de vos clients et partenaires.",
  },
  {
    icon: Building2,
    title: "Valorisez votre patrimoine",
    description:
      "Une installation photovoltaïque augmente la valeur de vos actifs immobiliers et améliore le DPE de vos bâtiments.",
  },
  {
    icon: BarChart3,
    title: "Sécurisez votre budget énergie",
    description:
      "Protégez-vous contre la volatilité des prix de l'électricité avec une production stable et prévisible sur 25 ans.",
  },
]

export function Benefits() {
  return (
    <section id="benefits" className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pourquoi passer au solaire B2B ?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Des avantages concrets pour votre entreprise et votre bilan carbone.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative rounded-xl border border-border bg-card p-6 transition-all hover:border-accent/50 hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <benefit.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
