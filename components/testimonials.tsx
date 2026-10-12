"use client"

import { Building2, Car, Factory, ShieldCheck, FileCheck2, Cpu, Award } from "lucide-react"
import { CertificationsMarquee } from "@/components/certifications-marquee"
import { motion } from "framer-motion"
import { AnimatedCounter } from "@/components/ui/animated-counter"

/** Modélisations indicatives types — Wallonie B2B (avec hypothèses techniques explicites) */
const caseStudies = [
  {
    icon: Building2,
    badge: "Modèle Toiture Logistique",
    location: "Province de Liège",
    title: "Entrepôt logistique 2 000 m²",
    figure: 45000,
    figureLabel: "d'économies annuelles estimées",
    specs: "Puissance type : ~250 kWc | Production : ~232 500 kWh/an",
    detail: "Toiture industrielle acier/bac, autoconsommation modélisée à 72 %. Amortissement financier en ~5,5 ans via l'économie sur facture réseau et les Certificats Verts CWaPE.",
    assumptions: "Hypothèses : Facture initiale > 65 000 € HT/an, prix évité 0,20 €/kWh, injection surplus valorisée à 0,045 €/kWh.",
  },
  {
    icon: Car,
    badge: "Modèle Ombrières & IRVE",
    location: "Brabant wallon",
    title: "Parking tertiaire 3 000 m²",
    figure: 52000,
    figureLabel: "d'économies annuelles sur facture",
    specs: "Puissance type : ~320 kWc | Production : ~297 000 kWh/an",
    detail: "Ombrières photovoltaïques couplées à des bornes de recharge pour véhicules de société (IRVE). Sécurise les quotas du décret PACE 2030 sans renforcement cabine HT disproportionné.",
    assumptions: "Hypothèses : Recharge diurne des flottes électriques, puissance de raccordement Ores optimisée, autoconsommation 75 %.",
  },
  {
    icon: Factory,
    badge: "Modèle PPA / Tiers-Investissement",
    location: "Province de Hainaut",
    title: "Site industriel 5 000 m²",
    figure: 115000,
    figureLabel: "d'économies annuelles sans CAPEX",
    specs: "Puissance type : ~600 kWc | Production : ~558 000 kWh/an",
    detail: "Contrat Corporate PPA sur 15 ans : un tiers-investisseur finance 100 % du matériel et de la pose. L'industriel achète l'électricité verte produite sur site avec une décote garantie de 25 %.",
    assumptions: "Hypothèses : 0 € d'investissement initial, maintenance et assurances intégrées au contrat PPA par le partenaire.",
  },
]

const charterPillars = [
  {
    icon: ShieldCheck,
    title: "Certification RESCERT vérifiée",
    description: "Chaque installateur partenaire fait l'objet d'un contrôle de son numéro d'agrément RESCERT Photovoltaïque actif auprès de la Région wallonne.",
  },
  {
    icon: FileCheck2,
    title: "Assurances & Décennale belge",
    description: "Attestation de responsabilité civile professionnelle et garantie décennale en cours de validité requises avant toute mise en relation.",
  },
  {
    icon: Cpu,
    title: "Matériel Tier-1 & Synergrid",
    description: "Composants certifiés Bloomberg Tier-1 (panneaux garantis 25 ans) et onduleurs conformes aux prescriptions C10/11 pour le raccordement Ores / Resa.",
  },
  {
    icon: Award,
    title: "Audit sur site sans engagement",
    description: "Visite technique préalable obligatoire (vérification structurelle toiture, tableau général basse tension, dimensionnement réel) avant signature.",
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
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.4 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary"
          >
            Modélisations indicatives B2B
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-2xl font-bold tracking-tight text-primary sm:text-3xl md:text-4xl"
          >
            Études de cas & <span className="text-accent">modèles économiques types</span>
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-4 text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg"
          >
            Simulations calculées selon le gisement solaire wallon (930 kWh/kWc/an), les coûts de réseau actuels et les exigences de conformité du <strong className="font-semibold text-foreground">Plan PACE 2030</strong>.
          </motion.p>
        </div>

        {/* ── Modèles de cas – 3 colonnes détaillées ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="mt-10 grid grid-cols-1 gap-6 sm:mt-14 lg:grid-cols-3"
        >
          {caseStudies.map((study, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-primary/10 bg-card/60 p-6 shadow-lg shadow-black/5 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-xl sm:p-7"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 transition-transform group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,184,0,0.2)]">
                  <study.icon className="h-6 w-6 text-accent drop-shadow-sm" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {study.location}
                </span>
              </div>

              <div className="mt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  {study.badge}
                </span>
                <h4 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                  {study.title}
                </h4>
              </div>

              <div className="mt-4 rounded-xl bg-accent/10 p-3.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold tracking-tight text-accent drop-shadow-sm sm:text-3xl">
                    − <AnimatedCounter value={study.figure} /> €
                  </span>
                  <span className="text-xs font-medium text-foreground/80">
                    / an
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{study.specs}</p>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {study.detail}
              </p>

              <div className="mt-auto border-t border-border/50 pt-4">
                <p className="text-[11px] italic leading-normal text-muted-foreground/80">
                  {study.assumptions}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Charte Qualité Installateurs RESCERT ── */}
        <div className="mt-16 rounded-3xl border border-border bg-card/40 p-6 shadow-sm backdrop-blur-sm sm:mt-24 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-accent/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-accent">
              Sélection rigoureuse
            </span>
            <h4 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
              Notre charte d&apos;engagement pour les installateurs partenaires
            </h4>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Aegis Solaire agit en intermédiaire indépendant : nous sélectionnons exclusivement des professionnels qualifiés répondant à des critères stricts de conformité technique et juridique.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {charterPillars.map((pillar, i) => (
              <div
                key={i}
                className="flex flex-col rounded-2xl border border-border/60 bg-background/50 p-5 transition-colors hover:border-accent/30"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <pillar.icon className="h-5 w-5" />
                </div>
                <h5 className="text-base font-semibold text-foreground">
                  {pillar.title}
                </h5>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Certifications et partenaires – bandeau défilant ── */}
        <div className="mt-16 border-t border-border/50 pt-10 sm:mt-24 sm:pt-14">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:mb-10 sm:text-sm">
            Organismes de référence, Régulateurs & Réseau Wallonie
          </p>
          <div className="opacity-80 transition-opacity hover:opacity-100">
            <CertificationsMarquee />
          </div>
        </div>
      </div>
    </section>
  )
}
