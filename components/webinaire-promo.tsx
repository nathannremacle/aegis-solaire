"use client"

import Link from "next/link"
import { Video, ArrowRight, PlayCircle } from "lucide-react"
import { motion } from "framer-motion"

export function WebinairePromo() {
  return (
    <section
      className="overflow-x-hidden border-y border-white/5 bg-[radial-gradient(ellipse_at_top,rgba(0,29,61,1)_0%,rgba(0,10,25,1)_100%)] py-12 sm:py-16 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      aria-labelledby="webinaire-promo-title"
    >
      <div className="mx-auto max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8">
        <Link href="/webinaire" className="group block">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_40px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-300 hover:border-accent/40 hover:bg-white/10 hover:shadow-[0_0_50px_rgba(255,184,0,0.15)] sm:p-10 lg:p-12"
          >
            {/* Décoration asymétrique Glow */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-[80px] transition-transform duration-700 group-hover:scale-150" />
            
            <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:text-left">
              
              <div className="flex flex-col sm:flex-row gap-6 sm:items-center w-full">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-amber-600 shadow-[0_0_20px_rgba(255,184,0,0.4)] mx-auto sm:mx-0">
                  <PlayCircle className="h-8 w-8 text-[#001D3D]" fill="currentColor" />
                </div>
                <div className="min-w-0 max-w-2xl">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-accent sm:text-sm">
                    Masterclass Privée
                  </span>
                  <h4 id="webinaire-promo-title" className="text-2xl font-extrabold text-white sm:text-3xl">
                    Sécuriser prix & patrimoine en Wallonie
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-300 sm:text-base">
                    Corporate PPA, tiers-investissement et lecture des Certificats Verts pour les DAF : comment Aegis Solaire structure des projets B2B à forte valeur, sans perdre le fil du raccordement GRD (Ores, Resa).
                  </p>
                </div>
              </div>

              <div className="flex w-full shrink-0 sm:w-auto">
                <span className="flex w-full items-center justify-center gap-3 rounded-xl bg-accent px-8 py-4 text-base font-bold text-black shadow-[0_0_20px_rgba(255,184,0,0.3)] transition-all group-hover:scale-105 group-hover:bg-accent/90 sm:w-auto">
                  Accéder au replay
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </motion.div>
        </Link>
      </div>
    </section>
  )
}
