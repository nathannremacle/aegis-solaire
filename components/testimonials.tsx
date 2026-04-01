"use client"

import Image from "next/image"
import { Star, Building2, Car, Factory } from "lucide-react"
import { CertificationsMarquee } from "@/components/certifications-marquee"
import { motion } from "framer-motion"
import { AnimatedCounter } from "@/components/ui/animated-counter"

/** Études de cas chiffrées (Section Preuve – MEP) — Wallonie B2B */
const caseStudies = [
  {
    icon: Building2,
    title: "Entrepôt logistique 2 000 m²",
    figure: 45000,
    figureLabel: "d'économies annuelles sur la facture",
    detail: "Toiture équipée, autoconsommation 72 %. Les Certificats Verts (CWaPE) viennent structurer un ROI financé de 5 à 7 ans.",
  },
  {
    icon: Car,
    title: "Parking 3 000 m² – Ombrières",
    figure: 52000,
    figureLabel: "d'économies par an",
    detail: "Projet dimensionné pour IRVE et sécuriser le quota PEB sans surdimensionner l'injection GRD (Ores/Resa).",
  },
  {
    icon: Factory,
    title: "Site industriel 5 000 m²",
    figure: 120000,
    figureLabel: "économies annuelles",
    detail: "Corporate PPA B2B. Alignement parfait avec les exigences du Plan PACE 2030 wallon pour l'industrie lourde.",
  },
]

const testimonials = [
  {
    quote: "L'approche d'Aegis Solaire sur la structuration des flux (Certificats Verts, validation ORES) a été décisive. ROI validé en comité de direction pour 5,5 ans.",
    author: "J.-P.",
    role: "Directeur financier",
    company: "Secteur Logistique",
    rating: 5,
    image: "/JeanPierreMartin.jpeg",
  },
  {
    quote: "De l'étude PEB au raccordement final, l'équipe maîtrise parfaitement le cadre réglementaire wallon. Une transition sans accroc.",
    author: "S. D.",
    role: "Responsable RSE",
    company: "Secteur Distribution",
    rating: 5,
    image: "/SophieDurand.jpeg",
  },
  {
    quote: "L'option tiers-investissement nous a permis d'équiper notre parking d'ombrières sans immobiliser de CAPEX.",
    author: "M. B.",
    role: "Dirigeant",
    company: "Secteur Industrie",
    rating: 5,
    image: "/MichelBernard.jpeg",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 200, damping: 24 },
  },
}

export function Testimonials() {
  return (
    <section id="preuve" className="relative scroll-mt-24 overflow-x-hidden bg-background py-16 sm:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
      {/* Subtle radial background to make the section pop */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-full max-w-7xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(0,29,61,0.05)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h4
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold tracking-tight text-primary sm:text-3xl md:text-4xl"
          >
            Chiffres clés & <span className="text-accent">Études de cas</span> B2B
          </motion.h4>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg"
          >
            Anticipez le <strong className="font-medium text-foreground">Plan PACE 2030</strong> et améliorez votre <strong>score PEB</strong> régional. Découvrez nos modélisations PPA et Tiers-Investissement.
          </motion.p>
        </div>

        {/* Bloc études de cas – 1 col mobile, 3 cols tablet+ */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-10 grid grid-cols-1 gap-5 sm:mt-14 sm:gap-6 md:grid-cols-3"
        >
          {caseStudies.map((study, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/10 bg-card/60 p-5 shadow-lg shadow-black/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl sm:p-7"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 transition-transform group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,184,0,0.2)]">
                <study.icon className="h-7 w-7 text-accent drop-shadow-sm" />
              </div>
              <h4 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
                {study.title}
              </h4>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="bg-gradient-to-br from-accent to-amber-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent drop-shadow-sm sm:text-3xl">
                  − <AnimatedCounter value={study.figure} /> €
                </span>
                <span className="text-sm font-medium text-muted-foreground/80">
                  {study.figureLabel}
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {study.detail}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Témoignages clients */}
        <div className="mt-16 sm:mt-24">
          <motion.h4
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-lg font-bold uppercase tracking-wider text-primary sm:text-xl"
          >
            Ils valident notre expertise
          </motion.h4>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="mt-8 grid grid-cols-1 gap-6 sm:mt-10 md:grid-cols-3 md:gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex min-w-0 flex-col rounded-2xl border border-border bg-card/40 p-5 shadow-sm backdrop-blur-md transition-shadow hover:border-border/80 hover:shadow-md sm:p-7"
              >
                <div className="mb-5 flex gap-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-accent text-accent drop-shadow-sm"
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="flex-1 text-base leading-relaxed text-foreground/90">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-4 border-t border-border/60 pt-5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-muted shadow-inner">
                    <Image
                      src={testimonial.image}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 hover:scale-110"
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold tracking-tight text-foreground">
                      {testimonial.author}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, <span className="font-medium">{testimonial.company}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Certifications et partenaires – bandeau défilant */}
        <div className="mt-16 border-t border-border/50 pt-10 sm:mt-24 sm:pt-14">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:mb-10 sm:text-sm">
            Partenaires techniques & Certifications B2B
          </p>
          <div className="opacity-80 transition-opacity hover:opacity-100">
            <CertificationsMarquee />
          </div>
        </div>
      </div>
    </section>
  )
}
