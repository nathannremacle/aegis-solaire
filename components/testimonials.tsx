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

const allTestimonials = [
  {
    quote: "Honnêtement on a comparé 4 devis, c'est Aegis qui nous a le mieux expliqué le truc des Certificats Verts et le raccordement Ores. Résultat : ROI en 5 ans et demi, validé par notre DAF.",
    author: "Jean-Pierre M.",
    subtitle: "Directeur financier · Logistique",
    rating: 5,
    image: "/JeanPierreMartin.jpeg",
  },
  {
    quote: "Ils ont tout géré, l'étude PEB, les démarches administratives, le raccordement… On n'a quasiment rien eu à faire côté interne. Franchement appréciable.",
    author: "Sophie D.",
    subtitle: "Responsable RSE · Distribution",
    rating: 5,
    image: "/SophieDurand.jpeg",
  },
  {
    quote: "On voulait pas investir de CAPEX, et le tiers-investissement a tout débloqué. Les ombrières de parking tournent depuis 8 mois, zéro souci.",
    author: "Michel B.",
    subtitle: "Dirigeant · Industrie",
    rating: 5,
    image: "/MichelBernard.jpeg",
  },
  {
    quote: "Ma facture Engie est passée de 210 € à 45 € par mois. Bon, le tarif prosumer pique un peu mais au final c'est tout bénéf. L'install a pris 3 jours.",
    author: "Catherine V.",
    subtitle: "Namur",
    rating: 5,
    image: "/CatherineV.jpeg",
  },
  {
    quote: "Moi j'y connaissais rien, ils m'ont tout expliqué sans jargon. La déclaration urbanistique, le compteur bidirectionnel, tout a été pris en charge.",
    author: "Philippe D.",
    subtitle: "Liège",
    rating: 5,
    image: "/PhilippeD.jpeg",
  },
  {
    quote: "Avec mon mari on hésitait beaucoup pour la batterie. Le conseiller nous a montré les vrais chiffres, pas du commercial. On a sauté le pas et on ne regrette rien.",
    author: "Isabelle L.",
    subtitle: "Mons",
    rating: 5,
    image: "/IsabelleL.jpeg",
  },
  {
    quote: "78 % d'autoconsommation sur notre entrepôt, c'est au-dessus de ce qui était annoncé. Et le montage Certificats Verts, c'est eux qui ont tout ficelé.",
    author: "Thomas R.",
    subtitle: "Gérant PME · Charleroi",
    rating: 5,
    image: "/ThomasR.jpeg",
  },
  {
    quote: "Ce qui m'a convaincue c'est le suivi après installation. Un an après, j'ai encore un interlocuteur quand j'ai une question. C'est rare dans le solaire.",
    author: "Nathalie P.",
    subtitle: "Wavre",
    rating: 5,
    image: "/NathalieP.jpeg",
  },
  {
    quote: "Je recharge ma voiture avec mes panneaux 8 mois sur 12. Ma femme pensait que c'était trop beau, mais les chiffres sont là. Meilleur investissement qu'on ait fait.",
    author: "François G.",
    subtitle: "Louvain-la-Neuve",
    rating: 5,
    image: "/FrancoisG.jpeg",
  },
  {
    quote: "Le dossier de primes wallonnes a été bouclé en 10 jours. Je m'attendais à des semaines de paperasse, au final c'était super fluide.",
    author: "Émilie S.",
    subtitle: "Arlon",
    rating: 4,
    image: "/EmilieS.jpeg",
  },
  {
    quote: "Avant l'install, ils ont repéré un problème de charpente que l'autre boîte avait zappé. Ça m'aurait coûté cher si j'avais signé ailleurs.",
    author: "Laurence M.",
    subtitle: "Tournai",
    rating: 5,
    image: "/LaurenceM.jpeg",
  },
  {
    quote: "L'appli de monitoring c'est vraiment sympa. Je vois en direct ce que je produis, ce que j'injecte. Ma fille de 12 ans est devenue obsédée par les graphiques !",
    author: "Stéphanie W.",
    subtitle: "Verviers",
    rating: 5,
    image: "/StephanieW.jpeg",
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
    transition: { type: "spring" as const, stiffness: 200, damping: 24 },
  },
}

export function Testimonials() {
  return (
    <section id="preuve" className="relative scroll-mt-24 overflow-x-hidden bg-background py-16 sm:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
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

        {/* ── Études de cas – 3 cols ── */}
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

        {/* ── Tous les avis — une seule bande défilante ── */}
        <div className="mt-16 sm:mt-24">
          <motion.h4
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-lg font-bold uppercase tracking-wider text-primary sm:text-xl"
          >
            Ils valident notre expertise
          </motion.h4>

          <style dangerouslySetInnerHTML={{ __html: `@keyframes avis-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}` }} />

          <div
            className="relative mt-8 w-full overflow-hidden sm:mt-10"
            role="region"
            aria-label="Avis clients"
          >
            <div
              className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-background to-transparent sm:w-24"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-background to-transparent sm:w-24"
              aria-hidden
            />

            <div
              className="flex w-max items-stretch gap-5"
              style={{ animation: "avis-scroll 80s linear infinite" }}
              onMouseEnter={(e) => { e.currentTarget.style.animationPlayState = "paused" }}
              onMouseLeave={(e) => { e.currentTarget.style.animationPlayState = "running" }}
            >
              {[...allTestimonials, ...allTestimonials].map((t, i) => (
                <div
                  key={i}
                  className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md sm:w-[330px]"
                >
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star
                        key={j}
                        className="h-4 w-4 fill-accent text-accent"
                        aria-hidden
                      />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-[13px] leading-relaxed text-foreground/85 sm:text-sm">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <div className="mt-4 flex items-center gap-3 border-t border-border/50 pt-3.5">
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-primary/15 bg-muted">
                      <Image
                        src={t.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight text-foreground">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.subtitle}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Certifications et partenaires – bandeau défilant ── */}
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
