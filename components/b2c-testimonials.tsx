"use client"

import { ShieldCheck, CheckCircle2, Home, Zap, BatteryCharging } from "lucide-react"
import { motion } from "framer-motion"
import { AnimatedCounter } from "@/components/ui/animated-counter"

const residentialModels = [
  {
    icon: Home,
    tag: "Configuration Familiale",
    title: "Maison 4 façades — Famille 4 personnes",
    power: "6 kWc (14 panneaux)",
    production: 5580,
    savings: 1250,
    selfConsumption: "45 %",
    description: "Orientation Sud/Sud-Ouest. Amortissement centré sur l'autoconsommation des appareils électroménagers et de l'eau chaude sanitaire en journée.",
    detail: "Hypothèses : Facture initiale ~1 800 €/an, injection du surplus valorisée sur contrat dynamique ou fixe wallon.",
  },
  {
    icon: Zap,
    tag: "Haute Performance Électrique",
    title: "Villa avec Pompe à Chaleur (PAC)",
    power: "9 kWc (21 panneaux)",
    production: 8370,
    savings: 1850,
    selfConsumption: "58 %",
    description: "Toiture bi-pente Est/Ouest lissant la production sur toute la journée. Couverture optimale des cycles de chauffe diurnes de la pompe à chaleur.",
    detail: "Hypothèses : Facture initiale ~2 600 €/an, synchronisation heure pleine / heure creuse et gestionnaire d'énergie.",
  },
  {
    icon: BatteryCharging,
    tag: "Autonomie Maximale",
    title: "Foyer avec Véhicule Électrique & Batterie 10 kWh",
    power: "7,5 kWc + Batterie 10 kWh",
    production: 6975,
    savings: 2100,
    selfConsumption: "76 %",
    description: "Stockage diurne du surplus solaire dans la batterie domestique pour alimenter le domicile le soir et programmer la recharge du VE.",
    detail: "Hypothèses : Recharge voiture ~15 000 km/an, tarif capacitaire réseau minimisé par l'écrêtage de batterie.",
  },
]

const guarantees = [
  {
    title: "Jusqu'à 3 devis comparatifs gratuits",
    description: "Comparez en toute liberté des propositions techniques détaillées sans engagement d'achat.",
  },
  {
    title: "Installateurs certifiés RESCERT Wallonie",
    description: "Tous nos partenaires disposent du certificat de compétence officiel et d'assurances décennales belges.",
  },
  {
    title: "Matériel garanti 25 ans",
    description: "Garantie linéaire de production sur les panneaux photovoltaïques et onduleurs aux normes Synergrid C10/11.",
  },
  {
    title: "TVA réduite à 6 % applicable",
    description: "Pour les habitations privées de plus de 10 ans en Région wallonne, profitez du taux réduit de TVA.",
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
        <header className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            <span>Modélisations techniques & Garanties</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Exemples types d&apos;installations <span className="text-accent">résidentielles en Wallonie</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Modélisations indicatives basées sur le gisement régional (930 kWh/kWc/an), les tarifs actuels de fourniture et le coût évité du réseau électrique.
          </p>
        </header>

        {/* ── 3 Modèles Résidentiels Types ── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {residentialModels.map((model, index) => (
            <motion.div
              key={model.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <model.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                    {model.tag}
                  </span>
                </div>

                <h3 className="mt-4 text-base font-bold text-foreground sm:text-lg">
                  {model.title}
                </h3>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {model.power}
                </p>

                <div className="mt-4 rounded-xl bg-muted/60 p-3.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-accent">
                      ~ <AnimatedCounter value={model.savings} /> €
                    </span>
                    <span className="text-xs text-muted-foreground">/ an d&apos;économies</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                    <span>Production : ~{model.production.toLocaleString("fr-BE")} kWh/an</span>
                    <span>Autoconso : {model.selfConsumption}</span>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {model.description}
                </p>
              </div>

              <div className="mt-6 border-t border-border/60 pt-3">
                <p className="text-[11px] italic text-muted-foreground/80">
                  {model.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── 4 Engagements Résidentiels ── */}
        <div className="mt-12 rounded-2xl border border-border bg-card/50 p-6 sm:mt-16 sm:p-8">
          <h3 className="text-center text-lg font-bold text-foreground sm:text-xl">
            Les 4 engagements du réseau Aegis Solaire Particuliers
          </h3>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((g, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-accent mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-foreground sm:text-sm">{g.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
