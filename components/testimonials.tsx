import Image from "next/image"
import { Star, Building2, Car, Factory } from "lucide-react"
import { CertificationsMarquee } from "@/components/certifications-marquee"

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
      "Grâce à Aegis Solaire, nous avons équipé notre entrepôt et réduit notre facture énergétique. Le ROI est au rendez-vous.",
    author: "J.-P.",
    role: "Directeur financier",
    company: "Secteur logistique",
    rating: 5,
    image: "/JeanPierreMartin.jpeg",
  },
  {
    quote:
      "L'accompagnement a été exemplaire du début à la fin. Le simulateur nous a permis de convaincre notre comité de direction rapidement.",
    author: "S. D.",
    role: "Responsable RSE",
    company: "Secteur commerce & distribution",
    rating: 5,
    image: "/SophieDurand.jpeg",
  },
  {
    quote:
      "Installation réalisée sans interruption de notre activité. Production conforme aux prévisions.",
    author: "M. B.",
    role: "Dirigeant",
    company: "Secteur industrie",
    rating: 5,
    image: "/MichelBernard.jpeg",
  },
]

export function Testimonials() {
  return (
    <section id="preuve" className="scroll-mt-24 bg-background py-12 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Études de cas chiffrées
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">
            Des résultats concrets pour des entreprises comme la vôtre. Le B2B a besoin de réassurance.
          </p>
        </div>

        {/* Bloc études de cas – 1 col mobile, 3 cols tablet+ */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
          {caseStudies.map((study, index) => (
            <div
              key={index}
              className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-lg sm:p-6"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <study.icon className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                {study.title}
              </h3>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-0">
                <span className="text-xl font-bold text-primary sm:text-2xl">
                  − {study.figure}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  en moins · {study.figureLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{study.detail}</p>
            </div>
          ))}
        </div>

        {/* Témoignages clients */}
        <div className="mt-12 sm:mt-16">
          <h3 className="text-center text-lg font-semibold text-foreground sm:text-xl">
            Ils nous font confiance
          </h3>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 md:grid-cols-3 md:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 sm:p-6"
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
                <div className="mt-6 flex items-center gap-4 border-t border-border pt-4">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                    <Image
                      src={testimonial.image}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
              ))}
          </div>
        </div>

        {/* Certifications et partenaires – bandeau défilant */}
        <div className="mt-12 border-t border-border pt-8 sm:mt-16 sm:pt-12">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground sm:mb-8 sm:text-sm">
            Certifications et partenaires
          </p>
          <CertificationsMarquee />
        </div>
      </div>
    </section>
  )
}
