"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Sparkles } from "lucide-react"
import type { FaqItem } from "@/components/StructuredData"

export function FaqTechniqueHero({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`relative overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,rgba(0,29,61,1)_0%,rgba(0,10,25,1)_100%)] p-8 text-white shadow-2xl sm:p-12 ${className}`}
    >
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1548618753-157945d81c4e?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />
      <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-accent/20 blur-[80px]" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(255,184,0,0.2)] backdrop-blur-md">
          <Sparkles className="h-8 w-8 text-accent" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          FAQ Technique (PPA, PEB & Wallonie)
        </h1>
        <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-neutral-300 sm:text-lg">
          L'essentiel pour les Directions Administratives et Financières : décryptage des Certificats Verts, du Plan PACE 2030 et des montages Tiers-Investisseur.
        </p>
      </div>
    </motion.div>
  )
}

export function FaqTechniqueAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <motion.div
            key={index}
            initial={false}
            animate={{ backgroundColor: isOpen ? "rgba(var(--background), 1)" : "rgba(var(--background), 0.5)" }}
            className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
              isOpen ? "border-accent/40 shadow-[0_10px_30px_rgba(0,29,61,0.1)]" : "border-border/60 hover:border-accent/20"
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors sm:px-8 sm:py-6"
              aria-expanded={isOpen}
            >
              <span className={`text-base font-bold sm:text-lg ${isOpen ? "text-primary" : "text-foreground"}`}>
                {item.question}
              </span>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 ${isOpen ? "rotate-180 bg-accent/10 px-0.5 text-accent" : "bg-muted text-muted-foreground"}`}>
                <ChevronDown className="h-5 w-5" />
              </div>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: "auto", marginBottom: 24 },
                    collapsed: { opacity: 0, height: 0, marginBottom: 0 }
                  }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="px-6 text-sm leading-relaxed text-muted-foreground sm:px-8 sm:text-base"
                >
                  <div className="whitespace-pre-wrap">{item.answer}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}
