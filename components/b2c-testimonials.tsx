"use client"

import { Star, ShieldCheck, HeartHandshake, CheckCircle } from "lucide-react"
import { motion } from "framer-motion"
import { ProgressiveAvatar } from "@/components/progressive-image"
import { avatarImages } from "@/lib/optimized-images"

const b2cReviews = [
  {
    quote: "Ma facture Engie est passée de 210 € à 45 € par mois. Bon, le tarif prosumer pique un peu mais au final c'est tout bénéf. L'installation a pris 3 jours, équipe très pro.",
    author: "Catherine V.",
    city: "Namur",
    rating: 5,
    image: "/CatherineV.jpeg",
    highlight: "-78% sur la facture mensuelle",
  },
  {
    quote: "Moi j'y connaissais rien, ils m'ont tout expliqué sans jargon. La déclaration urbanistique, le compteur bidirectionnel, tout a été pris en charge de A à Z.",
    author: "Philippe D.",
    city: "Liège",
    rating: 5,
    image: "/PhilippeD.jpeg",
    highlight: "Démarches administratives 100% gérées",
  },
  {
    quote: "Avec mon mari on hésitait beaucoup pour la batterie. Le conseiller nous a montré les vrais chiffres, pas du commercial. On a sauté le pas et on ne regrette rien.",
    author: "Isabelle L.",
    city: "Mons",
    rating: 5,
    image: "/IsabelleL.jpeg",
    highlight: "Autonomie optimisée avec batterie",
  },
  {
    quote: "Ce qui m'a convaincue c'est le suivi après installation. Un an après, j'ai encore un interlocuteur dédié quand j'ai une question. C'est rare et rassurant dans le solaire.",
    author: "Nathalie P.",
    city: "Wavre",
    rating: 5,
    image: "/NathalieP.jpeg",
    highlight: "Suivi & monitoring inclus",
  },
  {
    quote: "Je recharge ma voiture avec mes panneaux 8 mois sur 12. Ma femme pensait que c'était trop beau, mais les chiffres sont là. Le meilleur investissement de notre maison.",
    author: "François G.",
    city: "Louvain-la-Neuve",
    rating: 5,
    image: "/FrancoisG.jpeg",
    highlight: "Recharge VE solaire 8 mois / an",
  },
  {
    quote: "Le dossier de primes wallonnes a été bouclé en 10 jours. Je m'attendais à des semaines de paperasse, au final c'était super fluide et transparent.",
    author: "Émilie S.",
    city: "Arlon",
    rating: 5,
    image: "/EmilieS.jpeg",
    highlight: "Primes SPW obtenues rapidement",
  },
]

export function B2CTestimonials() {
  return (
    <section
      id="preuve"
      className="relative scroll-mt-24 overflow-hidden bg-background py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-full max-w-7xl -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,184,0,0.06)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Preuve & Témoignages</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            La confiance de nos <span className="text-accent">clients résidentiels</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Découvrez comment des foyers en Wallonie réduisent durablement leur facture grâce à nos installations conformes RESCERT et RGIE.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <div className="flex gap-0.5 text-accent">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent" />
                ))}
              </div>
              <span>4.9 / 5</span>
              <span className="text-xs text-muted-foreground font-normal">(+150 installations)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span>100% conformité SPW & GRD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HeartHandshake className="h-4 w-4 text-accent" />
              <span>Garantie 25 ans</span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {b2cReviews.map((review, index) => {
            const avatar = avatarImages[review.image]
            return (
              <motion.div
                key={review.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex gap-0.5 text-accent">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent" />
                      ))}
                    </div>
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                      {review.highlight}
                    </span>
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground italic sm:text-base">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                  {avatar ? (
                    <ProgressiveAvatar
                      webpSrc={avatar.webp}
                      blurDataUrl={avatar.blurDataUrl}
                      alt={review.author}
                      size={40}
                      className="rounded-full ring-2 ring-accent/30"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 font-bold text-accent">
                      {review.author[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {review.author}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Propriétaire · {review.city}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
