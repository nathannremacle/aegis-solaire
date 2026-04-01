"use client"

import { Wallet, Leaf, Building2, BarChart3 } from "lucide-react"
import { motion } from "framer-motion"

const benefits = [
  {
    icon: Wallet,
    title: "Réduisez vos coûts",
    description:
      "Autoconsommation et arbitrage sur les flux de Certificats Verts pour améliorer la VAN : un projet B2B wallon se modèle sur votre profil de charge, votre GRD et votre réservation auprès du SPW Énergie. Les réseaux réalisés par des installateurs RESCERT sécurisent la traçabilité.",
  },
  {
    icon: Leaf,
    title: "Alignez RSE & PEB",
    description:
      "Donnez de la lisibilité à votre trajectoire bas-carbone et aux critères ESG : un actif mieux documenté soutient le financement et la crédibilité auprès des partenaires et investisseurs.",
  },
  {
    icon: Building2,
    title: "Valeur de votre patrimoine",
    description:
      "Un site aligné sur la performance PEB et le Plan PACE 2030 limite le risque de décote sur les actifs logistiques ou industriels lors d'une cession ou d'un refinancement.",
  },
  {
    icon: BarChart3,
    title: "Sécurisez votre budget",
    description:
      "Corporate PPA ou tiers-investissement pour figer un prix : réduisez l'exposition au marché de gros tout en protégeant votre trésorerie sur la durée totale du projet.",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 }
  }
}

export function Benefits() {
  return (
    <section id="benefits" className="scroll-mt-24 overflow-hidden relative bg-[radial-gradient(circle_at_bottom,rgba(0,29,61,0.4)_0%,rgba(0,10,25,1)_100%)] text-white py-16 sm:py-24 lg:py-32 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
      <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
      <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-accent/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-accent sm:text-sm">
            Vos avantages Wallonie
          </span>
          <h4 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Pourquoi passer au <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-[#FFE066]">solaire B2B</span> ?
          </h4>
          <p className="mt-6 text-base text-neutral-300 sm:text-lg lg:text-xl leading-relaxed">
            Aegis Solaire accompagne les directions financières et techniques sur le marché wallon : rentabilité, conformité et valeur d’actif, sans sous-estimer le raccordement.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative min-w-0 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-accent/40 hover:bg-white/10 hover:shadow-[0_15px_30px_rgba(255,184,0,0.15)] sm:p-8"
            >
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-accent/20 blur-2xl transition-all group-hover:bg-accent/40" />
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 ring-1 ring-accent/30 shadow-inner">
                <benefit.icon className="h-7 w-7 text-accent" />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">
                {benefit.title}
              </h4>
              <p className="text-sm leading-relaxed text-neutral-400 group-hover:text-neutral-300 transition-colors">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
