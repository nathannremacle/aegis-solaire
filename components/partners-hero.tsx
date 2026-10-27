"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  Home,
  Users2,
  FileText,
  MapPin,
  Play,
} from "lucide-react"
import { motion } from "framer-motion"
import { HeroBg } from "@/components/hero-bg"

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
    transition: { type: "spring" as const, stiffness: 300, damping: 26 },
  },
}

export function PartnersHero() {
  const scrollToCandidature = () => {
    const element = document.getElementById("candidature")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const scrollToOverview = (e: React.MouseEvent) => {
    e.preventDefault()
    const element = document.getElementById("apercu")
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const scrollToB2CLead = (e: React.MouseEvent) => {
    e.preventDefault()
    const b2cCard = document.getElementById("lead-demo-b2c-1")
    if (b2cCard) {
      b2cCard.scrollIntoView({ behavior: "smooth", block: "center" })
      setTimeout(() => {
        b2cCard.focus()
        b2cCard.click()
      }, 550)
    } else {
      const apercu = document.getElementById("apercu")
      if (apercu) {
        apercu.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  return (
    <section
      className="relative flex min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] flex-col justify-between overflow-hidden bg-slate-950 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      style={{ viewTransitionName: "hero-section" }}
    >
      {/* Background Image — progressive blur-up with sunset lighting preserved */}
      <HeroBg
        heroKey="hero-partenaires"
        className="opacity-100 object-cover object-[center_right] sm:object-center"
        maskGradient="none"
      />

      {/* Cinematic gradient overlays to guarantee pristine contrast on text while preserving the golden sunset & engineers */}
      <div
        className="pointer-events-none select-none absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/65 to-slate-950/20 sm:via-slate-950/45 sm:to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none select-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-slate-950/50 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none select-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/70 to-transparent"
        aria-hidden
      />

      {/* Floating Live Lead Pin (Desktop: 100% fidèle à la maquette de référence) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-15 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute select-none pointer-events-auto"
          style={{
            left: "calc(83% - 370px)",
            top: "9.5%",
          }}
        >
          {/* Carte Flottante Détachée Interactive (Redirige vers l'exemple B2C au clic) */}
          <a
            href="#lead-demo-b2c-1"
            onClick={scrollToB2CLead}
            role="button"
            tabIndex={0}
            aria-label="Inspecter l'exemple de chantier B2C dans la marketplace"
            title="Cliquer pour inspecter ce chantier B2C dans la marketplace"
            className="group/card relative z-10 flex items-center gap-3 rounded-[20px] border border-white/15 bg-[#161F2C]/80 p-3 backdrop-blur-md shadow-[0_12px_36px_rgba(0,0,0,0.38)] w-[275px] hover:border-blue-400/50 hover:bg-[#161F2C]/95 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.25)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer text-left block"
          >
            {/* Vignette Photo Haute Résolution (200x200 crop retina) */}
            <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-inner">
              <Image
                src="/solar/namur-unifamiliale-thumb.webp"
                alt="Chantier solaire unifamilial à Namur"
                fill
                sizes="68px"
                className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                priority
              />
            </div>

            {/* Données Métier du Chantier */}
            <div className="flex flex-col justify-center min-w-0 pr-0.5 space-y-0.5">
              {/* Badge Statut avec point vert pulsant */}
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#52D68A] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#52D68A] shadow-[0_0_6px_rgba(82,214,138,0.9)]" />
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-[#52D68A]">
                  Chantier en cours
                </span>
              </div>

              {/* Type de Bâtiment */}
              <h3 className="text-[14px] sm:text-[15px] font-bold text-white tracking-tight leading-tight truncate group-hover/card:text-blue-300 transition-colors">
                Maison unifamiliale
              </h3>

              {/* Localisation & Code Postal */}
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-[#60A5FA] fill-[#60A5FA]/25 shrink-0" />
                <span className="truncate">
                  Namur (<span className="font-mono tabular-nums">5000</span>)
                </span>
              </div>

              {/* Puissance Nominale */}
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-200">
                <Zap className="h-3.5 w-3.5 text-[#60A5FA] fill-[#60A5FA] shrink-0" />
                <span className="font-mono tabular-nums font-bold text-white">
                  9,6
                </span>
                <span className="font-mono text-slate-300 text-[11px] font-medium">
                  kWc
                </span>
              </div>
            </div>
          </a>

          {/* Ligne Courbe SVG reliant la carte au panneau solaire */}
          <svg
            className="absolute inset-0 pointer-events-none overflow-visible z-0"
            style={{ width: "370px", height: "175px" }}
            viewBox="0 0 370 175"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M 275 49 C 315 49, 355 90, 370 170"
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Point Chaud (Hotspot Pinpoint) sur les panneaux solaires */}
          <div className="absolute left-[370px] top-[170px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
            <div className="relative flex h-7 w-7 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full border border-white/50 bg-white/20 opacity-60 duration-1000" />
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white/20 backdrop-blur-xs shadow-md">
                <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Hero Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8 lg:px-8">
        <motion.div
          className="max-w-2xl lg:max-w-3xl xl:max-w-4xl text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge institutionnel RESCERT Wallonie */}
          <motion.div variants={itemVariants} className="flex items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-xs sm:text-[13px] font-medium tracking-wide text-white/95">
                Réseau officiel des installateurs certifiés RESCERT Wallonie
              </span>
            </div>
          </motion.div>

          {/* Headline H1 Unique */}
          <motion.h1
            variants={itemVariants}
            className="mt-5 text-balance text-3xl font-extrabold tracking-tight text-white min-[480px]:text-4xl sm:text-5xl lg:text-[50px] xl:text-[54px] font-heading leading-[1.08] drop-shadow-md"
          >
            La marketplace<br />
            photovoltaïque des<br />
            <span className="text-[#3B82F6] whitespace-nowrap">professionnels en Wallonie.</span>
          </motion.h1>

          {/* Subheadline descriptive */}
          <motion.p
            variants={itemVariants}
            className="mt-5 max-w-2xl text-pretty text-sm sm:text-base lg:text-[16px] font-light leading-relaxed text-slate-200"
          >
            Accédez à un flux continu de chantiers qualifiés sans démarchage à froid.
            <br className="hidden sm:inline" />
            <strong className="font-semibold text-white">B2B 100% exclusif</strong> (1 seul acheteur dès 8 crédits) et{" "}
            <strong className="font-semibold text-white">B2C transparent</strong>
            <br className="hidden sm:inline" />
            (max 3 installateurs dès 2 crédits). Zéro abonnement mensuel forcé.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            variants={itemVariants}
            className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 sm:gap-4"
          >
            {/* Primary CTA Button */}
            <Button
              onClick={scrollToCandidature}
              className="h-12 sm:h-13 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold px-6 sm:px-7 text-sm sm:text-base shadow-lg shadow-blue-600/30 transition-all hover:shadow-blue-600/50 flex items-center justify-center gap-2 cursor-pointer border-0"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Postuler au réseau RESCERT (Gratuit)</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Button>

            {/* Secondary CTA Button (Glass pill) */}
            <a
              href="#apercu"
              onClick={scrollToOverview}
              className="h-12 sm:h-13 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white font-medium px-6 text-sm sm:text-base backdrop-blur-md transition-all flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 shrink-0">
                <Play className="h-2.5 w-2.5 fill-white text-white ml-0.5" />
              </div>
              <span>Découvrir le fonctionnement</span>
            </a>
          </motion.div>

          {/* Micro-réassurance sous les CTAs */}
          <motion.div
            variants={itemVariants}
            className="mt-7 flex flex-wrap lg:flex-nowrap items-center gap-x-4 sm:gap-x-5 lg:gap-x-6 gap-y-2 text-xs sm:text-xs lg:text-[12px] xl:text-[13px] text-slate-200/90 whitespace-nowrap"
          >
            <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300/40 bg-black/25 font-mono font-bold text-white shrink-0 text-xs">
                €
              </span>
              <span>
                <span className="font-mono tabular-nums">0 €</span> de frais fixes &amp; zéro abonnement forcé
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300/40 bg-black/25 text-white shrink-0 text-xs">
                <Check className="h-3 w-3 stroke-[2.5]" />
              </span>
              <span>
                Audit toiture &amp; TVA vérifiés sous <span className="font-mono tabular-nums">48 h</span>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300/40 bg-black/25 text-white shrink-0 text-xs">
                <Zap className="h-3 w-3 fill-white" />
              </span>
              <span>
                Remplacement garanti si prospect injoignable sous <span className="font-mono tabular-nums">7 j</span>
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Floating Glass Dock / Banner (Light Fintech Slate Card) */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mt-10 sm:mt-12 w-full rounded-2xl sm:rounded-3xl border border-neutral-200/90 bg-white/95 backdrop-blur-xl p-4 sm:p-5 lg:p-6 shadow-xl shadow-slate-950/25"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-neutral-200/80">
            {/* Colonne 1 : 100% Exclusif */}
            <div className="flex items-center gap-3.5 sm:px-3 first:pl-0">
              <Users2 className="h-7 w-7 sm:h-8 sm:w-8 text-[#2563EB] shrink-0" />
              <div>
                <p className="text-base sm:text-[17px] font-bold text-neutral-900 tracking-tight font-heading">
                  <span className="font-mono tabular-nums">100%</span> Exclusif
                </p>
                <p className="text-xs text-neutral-600">
                  B2B : <span className="font-mono tabular-nums font-medium text-neutral-800">1 seul</span> installateur par projet
                </p>
              </div>
            </div>

            {/* Colonne 2 : Max 3 devis */}
            <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
              <Home className="h-7 w-7 sm:h-8 sm:w-8 text-[#2563EB] shrink-0" />
              <div>
                <p className="text-base sm:text-[17px] font-bold text-neutral-900 tracking-tight font-heading">
                  Max <span className="font-mono tabular-nums">3</span> devis
                </p>
                <p className="text-xs text-neutral-600">
                  B2C : Transparence &amp; concurrence limitée
                </p>
              </div>
            </div>

            {/* Colonne 3 : 524 kWc disponibles */}
            <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
              <FileText className="h-7 w-7 sm:h-8 sm:w-8 text-[#2563EB] shrink-0" />
              <div>
                <p className="text-base sm:text-[17px] font-bold text-neutral-900 tracking-tight font-heading">
                  <span className="font-mono tabular-nums">524 kWc</span> disponibles
                </p>
                <p className="text-xs text-neutral-600">
                  <span className="font-mono tabular-nums font-medium text-neutral-800">28</span> chantiers ouverts en direct
                </p>
              </div>
            </div>

            {/* Colonne 4 : Couverture Wallonie */}
            <div className="flex items-center gap-3.5 pt-3 sm:pt-0 sm:px-4">
              <MapPin className="h-7 w-7 sm:h-8 sm:w-8 text-[#2563EB] shrink-0" />
              <div>
                <p className="text-base sm:text-[17px] font-bold text-neutral-900 tracking-tight font-heading">
                  Couverture Wallonie
                </p>
                <p className="text-xs text-neutral-600">
                  Particuliers &amp; professionnels qualifiés
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

