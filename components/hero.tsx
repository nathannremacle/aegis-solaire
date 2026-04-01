"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Shield, Zap, Building2, Home } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

const HERO_BG_URL = "/hero-background.png"

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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
}

export function Hero() {
  const scrollToSimulator = () => {
    const element = document.getElementById("simulator")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section
      className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-x-hidden bg-[#001D3D] sm:min-h-[calc(100dvh-5rem)] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
        style={{
          backgroundImage: `url('${HERO_BG_URL}')`,
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)",
        }}
      />
      {/* Radial overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,29,61,0.3)_0%,rgba(0,29,61,0.95)_100%)]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-1 items-center min-w-0 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-4 flex flex-wrap justify-center gap-2 sm:mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-4 py-1.5 shadow-[0_0_15px_rgba(255,184,0,0.15)] backdrop-blur-md">
              <Zap className="h-4 w-4 shrink-0 text-accent drop-shadow-[0_0_8px_rgba(255,184,0,0.8)]" />
              <span className="text-xs font-medium tracking-wide text-white sm:text-sm">
                +500 entreprises équipées en Wallonie
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1 variants={itemVariants} className="text-balance text-3xl font-bold tracking-tight text-white min-[480px]:text-4xl sm:text-5xl md:text-6xl drop-shadow-xl">
            Transformez vos infrastructures en{" "}
            <span className="text-accent drop-shadow-[0_0_15px_rgba(255,184,0,0.3)]">centres de profit</span>.
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={itemVariants} className="mx-auto mt-5 max-w-2xl text-pretty text-base font-light leading-relaxed text-neutral-200 sm:mt-6 sm:text-lg md:text-xl">
            Anticipez le <strong className="font-semibold text-white">Plan PACE 2030</strong> et rentabilisez votre surface. Estimez votre modèle financier (Prêt Easy&apos;Green, Tiers-investissement) avec les <strong className="font-semibold text-white">Certificats Verts CWaPE</strong>.
          </motion.p>

          {/* Dual CTAs */}
          <motion.div variants={itemVariants} className="mt-8 flex flex-col items-stretch gap-4 sm:mt-10 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
            {/* B2B CTA — primary gold */}
            <Button
              size="lg"
              onClick={scrollToSimulator}
              className="group h-14 w-full gap-3 bg-accent text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.3)] transition-all hover:scale-[1.02] hover:bg-[#e6a600] hover:shadow-[0_0_35px_rgba(255,184,0,0.45)] sm:w-auto sm:min-w-[270px]"
            >
              <Building2 className="h-5 w-5 shrink-0" />
              <span>Entreprises & Industrie</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>

            {/* B2C CTA — secondary solid white on dark */}
            <Link href="/particuliers" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group h-14 w-full gap-3 border-2 border-white/30 bg-white/10 text-base font-bold text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-lg transition-all hover:scale-[1.02] hover:border-accent/50 hover:bg-white/15 hover:shadow-[0_0_25px_rgba(255,184,0,0.2)] sm:min-w-[270px]"
              >
                <Home className="h-5 w-5 shrink-0 text-accent" />
                <span>Propriétaires Particuliers</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div variants={itemVariants} className="mt-10 grid grid-cols-3 gap-3 sm:mt-14 sm:gap-6">
            <div className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all hover:border-accent/25 hover:bg-white/10 sm:flex-row sm:gap-4 sm:px-5 sm:py-5">
              <TrendingUp className="h-6 w-6 shrink-0 text-accent drop-shadow-[0_0_8px_rgba(255,184,0,0.5)] transition-transform group-hover:scale-110 sm:h-8 sm:w-8" />
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-white drop-shadow-md sm:text-2xl">5 - 7 ans</p>
                <p className="text-[11px] font-medium leading-tight text-neutral-300 sm:text-sm">ROI B2B constaté</p>
              </div>
            </div>
            <div className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all hover:border-accent/25 hover:bg-white/10 sm:flex-row sm:gap-4 sm:px-5 sm:py-5">
              <Shield className="h-6 w-6 shrink-0 text-accent drop-shadow-[0_0_8px_rgba(255,184,0,0.5)] transition-transform group-hover:scale-110 sm:h-8 sm:w-8" />
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-white drop-shadow-md sm:text-2xl">25 ans</p>
                <p className="text-[11px] font-medium leading-tight text-neutral-300 sm:text-sm">Garanties perfs</p>
              </div>
            </div>
            <div className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all hover:border-accent/25 hover:bg-white/10 sm:flex-row sm:gap-4 sm:px-5 sm:py-5">
              <Zap className="h-6 w-6 shrink-0 text-accent drop-shadow-[0_0_8px_rgba(255,184,0,0.5)] transition-transform group-hover:scale-110 sm:h-8 sm:w-8" />
              <div className="text-center sm:text-left">
                <p className="text-lg font-bold text-white drop-shadow-md sm:text-2xl">70%</p>
                <p className="text-[11px] font-medium leading-tight text-neutral-300 sm:text-sm">Autoconso estimée</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
