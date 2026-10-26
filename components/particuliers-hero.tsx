"use client"

import { HeroBg } from "@/components/hero-bg"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  Sun,
  ArrowRight,
  Home,
  Building2,
  TrendingUp,
  Shield,
  BatteryFull,
  CheckCircle2,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 320, damping: 25 },
  },
}

const stats = [
  { value: "8-10 ans", label: "ROI résidentiel", icon: TrendingUp },
  { value: "25 ans", label: "Garantie matériel", icon: Shield },
  { value: "Jusqu'à 70%", label: "Autoconsommation", icon: BatteryFull },
  { value: "100%", label: "Conforme RESCERT", icon: CheckCircle2 },
]

export function ParticuliersHero() {
  const scrollToSimulator = () => {
    const el = document.getElementById("b2c-simulator")
    if (el) {
      el.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section
      className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-primary sm:min-h-[calc(100dvh-5rem)] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      style={{ viewTransitionName: "hero-section" }}
    >
      {/* Background image with progressive blur-up */}
      <HeroBg heroKey="hero-particuliers" />
      <div
        className="pointer-events-none select-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.15)_0%,rgba(15,23,42,0.85)_100%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div
            variants={itemVariants}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 shadow-xs backdrop-blur-md sm:mb-6"
          >
            <Sun className="h-4 w-4 shrink-0 text-blue-400" />
            <span className="text-xs font-medium tracking-wide text-white sm:text-sm">
              La technologie industrielle au service de votre foyer
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={itemVariants}
            className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl"
          >
            Devenez{" "}
            <span className="text-blue-400">
              autonome
            </span>
            <br className="hidden sm:block" /> et bloquez l&apos;inflation.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-neutral-300 sm:mt-6 sm:text-lg md:text-xl"
          >
            Nos ingénieurs déploient chez vous des panneaux certifiés{" "}
            <strong className="font-semibold text-white">RESCERT</strong> et{" "}
            <strong className="font-semibold text-white">RGIE</strong>. Matériel Premium,
            primes habitation wallonnes et autoconsommation maximisée avec une batterie
            de pointe.
          </motion.p>

          {/* Dual CTAs */}
          <motion.div
            variants={itemVariants}
            className="mt-6 flex flex-col items-stretch gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
          >
            <button
              onClick={scrollToSimulator}
              className="group inline-flex h-13 items-center justify-center gap-2.5 rounded-xl bg-accent px-7 text-base font-bold text-accent-foreground shadow-xs transition-all hover:bg-accent/90 sm:h-14 cursor-pointer"
            >
              <Home className="h-5 w-5 shrink-0" />
              <span>Simuler mes économies</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <Link
              href="/"
              prefetch={true}
              className="group inline-flex h-13 items-center justify-center gap-2.5 rounded-xl border border-white/25 bg-white/10 px-7 text-base font-bold text-white backdrop-blur-md transition-all duration-200 hover:border-white/40 hover:bg-white/15 hover:scale-[1.02] sm:h-14"
            >
              <Building2 className="h-5 w-5 shrink-0 text-blue-400 transition-transform group-hover:scale-110" />
              <span>Entreprises &amp; Industrie</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            variants={itemVariants}
            className="mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 sm:mt-12 sm:grid-cols-4 sm:max-w-none sm:gap-4"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="group flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 backdrop-blur-md transition-all hover:border-blue-400/30 hover:bg-white/10 sm:px-4"
              >
                <s.icon className="h-5 w-5 text-blue-400 opacity-90 transition-transform group-hover:scale-110 sm:h-6 sm:w-6" />
                <p className="font-mono tabular-nums text-lg font-bold text-white sm:text-xl">{s.value}</p>
                <p className="text-[11px] leading-tight text-neutral-400 sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
