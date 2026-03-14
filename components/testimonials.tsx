import { Star, Building2, Car, Factory } from "lucide-react"

/** Études de cas chiffrées (Section Preuve – MEP) */
const caseStudies = [
  {
    icon: Building2,
    title: "Entrepôt logistique 2 000 m²",
    figure: "45 000 €",
    figureLabel: "d'économies annuelles",
    detail: "Toiture équipée, autoconsommation 72 %, ROI 8,5 ans.",
  },
  {
    icon: Car,
    title: "Parking 3 000 m² – Conformité LOM",
    figure: "52 000 €",
    figureLabel: "d'économies par an",
    detail: "Ombrières 50 % surface, production 420 kWc, facture divisée par deux.",
  },
  {
    icon: Factory,
    title: "Site industriel 5 000 m²",
    figure: "120 000 €",
    figureLabel: "économies annuelles",
    detail: "PPA sans mise de fonds. Mise en conformité Décret Tertiaire.",
  },
]

const testimonials = [
  {
    quote:
      "Grâce à Aegis Solaire, nous avons équipé notre entrepôt de 3000 m² et réduit notre facture énergétique de 65 %. Le ROI est au rendez-vous.",
    author: "Jean-Pierre Martin",
    role: "Directeur Financier",
    company: "LogiPark SAS",
    rating: 5,
  },
  {
    quote:
      "L'accompagnement a été exemplaire du début à la fin. Le simulateur nous a permis de convaincre notre comité de direction en 10 minutes.",
    author: "Sophie Durand",
    role: "Responsable RSE",
    company: "Groupe Carrefour Market",
    rating: 5,
  },
  {
    quote:
      "Installation réalisée en 3 semaines sans interruption de notre activité. Production conforme aux prévisions depuis 2 ans.",
    author: "Michel Bernard",
    role: "Directeur Général",
    company: "Bernard Industries",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section id="preuve" className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Études de cas chiffrées
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Des résultats concrets pour des entreprises comme la vôtre. Le B2B a besoin de réassurance.
          </p>
        </div>

        {/* Bloc études de cas – chiffres mis en avant */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {caseStudies.map((study, index) => (
            <div
              key={index}
              className="flex flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <study.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {study.title}
              </h3>
              <p className="mt-2 text-2xl font-bold text-primary">
                {study.figure}
              </p>
              <p className="text-sm text-muted-foreground">{study.figureLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">{study.detail}</p>
            </div>
          ))}
        </div>

        {/* Témoignages clients */}
        <div className="mt-16">
          <h3 className="text-center text-xl font-semibold text-foreground">
            Ils nous font confiance
          </h3>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="flex flex-col rounded-xl border border-border bg-card p-6"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-accent text-accent"
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="flex-1 text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-6 border-t border-border pt-4">
                  <p className="font-semibold text-foreground">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mt-16 border-t border-border pt-12">
          <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Certifications et partenaires
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale">
            <div className="flex h-12 items-center justify-center rounded bg-muted px-4">
              <span className="font-bold text-muted-foreground">RGE</span>
            </div>
            <div className="flex h-12 items-center justify-center rounded bg-muted px-4">
              <span className="font-bold text-muted-foreground">QualiPV</span>
            </div>
            <div className="flex h-12 items-center justify-center rounded bg-muted px-4">
              <span className="font-bold text-muted-foreground">ADEME</span>
            </div>
            <div className="flex h-12 items-center justify-center rounded bg-muted px-4">
              <span className="font-bold text-muted-foreground">France Relance</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
