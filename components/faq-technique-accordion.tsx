"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import type { FaqItem } from "@/components/StructuredData"

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
            className={`overflow-hidden rounded-2xl border bg-card transition-all duration-300 ${
              isOpen
                ? "border-accent/30 shadow-md"
                : "border-border shadow-sm hover:border-accent/20 hover:-translate-y-0.5 hover:shadow-md"
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
