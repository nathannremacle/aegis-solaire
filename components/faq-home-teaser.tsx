"use client"

import Link from "next/link"
import { BookOpen, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

export function FaqHomeTeaser() {
  return (
    <section
      className="scroll-mt-24 border-t border-white/10 bg-gradient-to-b from-[#001019] to-[#001D3D] py-12 sm:py-16 lg:py-20 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      aria-labelledby="faq-teaser-heading"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex max-w-6xl min-w-0 flex-col items-stretch gap-8 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"
      >
        <div className="flex min-w-0 flex-col sm:flex-row gap-6 sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-amber-600 text-black shadow-[0_0_30px_rgba(255,184,0,0.3)]">
            <BookOpen className="h-8 w-8" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 id="faq-teaser-heading" className="text-xl font-bold tracking-tight text-white sm:text-2xl md:text-3xl">
              FAQ Technique Wallonie
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-neutral-300">
              Certificats Verts, PEB, PACE 2030, GRD et financement B2B — réponses détaillées pour DAF et direction.
            </p>
          </div>
        </div>
        
        <Link
          href="/faq-technique"
          className="group inline-flex shrink-0 items-center justify-center gap-3 self-start rounded-xl border border-accent/50 bg-accent/10 px-6 py-4 text-base font-bold text-accent shadow-[0_0_20px_rgba(255,184,0,0.1)] transition-all hover:bg-accent hover:text-black hover:shadow-[0_0_30px_rgba(255,184,0,0.4)] sm:self-center"
        >
          Consulter la FAQ
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden />
        </Link>
      </motion.div>
    </section>
  )
}
