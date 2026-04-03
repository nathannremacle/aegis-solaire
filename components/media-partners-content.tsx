"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import {
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  Euro,
  Building2,
  Home,
  Send,
  KeyRound,
  Wallet,
  ClipboardCheck,
  Server,
  Activity,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const infraCards = [
  {
    icon: Shield,
    accent: Bot,
    title: "Rate Limiting Redis",
    subtitle: "Anti-fraude & anti-bot",
    description:
      "Chaque soumission passe par notre middleware Upstash Redis. IP dupliquées, bots et trafic invalide sont rejetés avant qu'un lead ne soit comptabilisé. Vous ne payez que pour du trafic propre.",
    stat: "< 50 ms",
    statLabel: "Latence de vérification",
  },
  {
    icon: Zap,
    accent: Server,
    title: "Next.js Edge Runtime",
    subtitle: "Vitesse de conversion",
    description:
      "Landing pages générées en ISR avec un score Lighthouse > 95. Temps de chargement sub-seconde partout en Europe. Chaque milliseconde gagnée augmente votre taux de conversion.",
    stat: "> 95",
    statLabel: "Score Lighthouse",
  },
  {
    icon: BarChart3,
    accent: Activity,
    title: "Dashboard Temps Réel",
    subtitle: "Suivi & transparence",
    description:
      "Accédez à votre tableau de bord dédié : leads soumis, qualifiés, rejetés, commissions générées. Données rafraîchies en temps réel, exportables en CSV.",
    stat: "24/7",
    statLabel: "Accès aux données",
  },
]

const payoutData = [
  {
    segment: "B2B",
    icon: Building2,
    amount: "100 €",
    per: "par lead qualifié",
    criteria: "Projets industriels, toitures > 500 m²",
    color: "from-accent/20 to-accent/5",
    border: "border-accent/30",
    badge: "High Ticket",
    badgeColor: "bg-accent/20 text-accent",
  },
  {
    segment: "B2C",
    icon: Home,
    amount: "25 €",
    per: "par lead qualifié",
    criteria: "Résidentiel, propriétaires en Wallonie",
    color: "from-blue-500/15 to-blue-500/5",
    border: "border-blue-400/30",
    badge: "Volume",
    badgeColor: "bg-blue-400/20 text-blue-300",
  },
]

const steps = [
  {
    icon: ClipboardCheck,
    number: "01",
    title: "Postulez",
    description: "Envoyez votre candidature. Nous validons votre profil sous 48 h.",
  },
  {
    icon: KeyRound,
    number: "02",
    title: "Recevez votre accès",
    description: "Liens trackés, créatifs et accès au dashboard partenaire.",
  },
  {
    icon: Send,
    number: "03",
    title: "Envoyez le trafic",
    description: "Facebook Ads, Google Ads, SEO, email — tous les canaux acceptés.",
  },
  {
    icon: Wallet,
    number: "04",
    title: "Encaissez",
    description: "Commissions hebdomadaires. Virement chaque vendredi, sans minimum.",
  },
]

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

export function MediaPartnersContent() {
  return (
    <>
      {/* ═══ HERO — même config que particuliers / page d'accueil (image + masque + radial) ═══ */}
      <section
        className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#001D3D] sm:min-h-[calc(100dvh-5rem)] [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
        style={{ viewTransitionName: "hero-section" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
          style={{
            backgroundImage: "url('/hero-media-partner.png')",
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,29,61,0.15)_0%,rgba(0,29,61,0.75)_100%)]" />

        <div className="relative z-10 mx-auto flex max-w-5xl flex-1 items-center px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div initial="hidden" animate="visible" custom={0} variants={fadeUp}>
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-white/[0.06] px-5 py-2.5 shadow-[0_0_30px_rgba(255,184,0,0.1)] backdrop-blur-xl">
                <Euro className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold uppercase tracking-widest text-accent/90 sm:text-sm">
                  Programme Partenaires Média
                </span>
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={fadeUp}
              className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Générez des{" "}
              <span className="bg-gradient-to-r from-accent via-yellow-300 to-accent bg-clip-text text-transparent">
                revenus passifs
              </span>{" "}
              sur le marché Solaire Wallon.
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              custom={2}
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-neutral-400 sm:text-xl"
            >
              Zéro frais fixes, paiement au lead. Rejoignez notre réseau de Media Buyers et monétisez le boom photovoltaïque belge.
            </motion.p>

            <motion.div initial="hidden" animate="visible" custom={3} variants={fadeUp} className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a href="#candidature">
                <Button
                  size="lg"
                  className="h-14 gap-2.5 rounded-xl bg-accent px-8 text-base font-bold text-[#001D3D] shadow-[0_0_30px_rgba(255,184,0,0.25)] transition-all hover:scale-[1.03] hover:bg-[#e6a600] hover:shadow-[0_0_40px_rgba(255,184,0,0.4)]"
                >
                  Devenir Partenaire Média
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
              <a href="#payout" className="text-sm font-medium text-neutral-400 underline underline-offset-4 transition-colors hover:text-white">
                Voir les commissions
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial="hidden"
              animate="visible"
              custom={4}
              variants={fadeUp}
              className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-3 sm:mt-16 sm:max-w-xl sm:gap-5"
            >
              {[
                { value: "100 €", label: "Par lead B2B" },
                { value: "25 €", label: "Par lead B2C" },
                { value: "7 j", label: "Cycle de paiement" },
              ].map((s) => (
                <GlassCard key={s.label} className="px-4 py-5 text-center">
                  <p className="text-2xl font-bold text-accent sm:text-3xl">{s.value}</p>
                  <p className="mt-1 text-xs text-neutral-500 sm:text-sm">{s.label}</p>
                </GlassCard>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ INFRASTRUCTURE ═══ */}
      <section className="relative overflow-hidden bg-[#000d1f] py-20 sm:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-14 max-w-2xl text-center"
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent/80 sm:text-sm">
              L&apos;infrastructure
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Une machine de conversion{" "}
              <span className="text-accent">enterprise-grade</span>
            </h2>
            <p className="mt-4 text-base text-neutral-400 sm:text-lg">
              Vos campagnes atterrissent sur une infrastructure construite pour la performance et la fiabilité.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {infraCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                custom={i}
                variants={scaleIn}
              >
                <GlassCard className="group relative flex h-full flex-col p-7 transition-all duration-300 hover:border-accent/25 hover:bg-white/[0.06] hover:shadow-[0_0_40px_rgba(255,184,0,0.06)] sm:p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20 transition-transform group-hover:scale-110">
                      <card.icon className="h-6 w-6 text-accent" />
                    </div>
                    <card.accent className="h-5 w-5 text-neutral-600 transition-colors group-hover:text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{card.title}</h3>
                  <p className="mt-1 text-sm font-medium text-accent/70">{card.subtitle}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-neutral-400">
                    {card.description}
                  </p>
                  <div className="mt-6 flex items-baseline gap-2 border-t border-white/5 pt-5">
                    <span className="text-2xl font-bold text-white">{card.stat}</span>
                    <span className="text-xs text-neutral-500">{card.statLabel}</span>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PAYOUT ═══ */}
      <section
        id="payout"
        className="relative scroll-mt-24 overflow-hidden bg-[#000a19] py-20 sm:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-accent/[0.04] blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-14 max-w-2xl text-center"
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent/80 sm:text-sm">
              Le payout
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Commissions claires,{" "}
              <span className="text-accent">zéro surprise</span>
            </h2>
            <p className="mt-4 text-base text-neutral-400 sm:text-lg">
              Deux segments, deux prix fixes. Pas de paliers, pas de plafond. Vous scalez, vous gagnez.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2">
            {payoutData.map((p, i) => (
              <motion.div
                key={p.segment}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                custom={i}
                variants={scaleIn}
              >
                <GlassCard className={`group relative flex h-full flex-col overflow-hidden p-8 transition-all duration-300 hover:border-accent/25 hover:shadow-[0_0_50px_rgba(255,184,0,0.06)] sm:p-10 ${p.border}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${p.color} opacity-0 transition-opacity group-hover:opacity-100`} />
                  <div className="relative z-10">
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06]">
                          <p.icon className="h-5 w-5 text-neutral-300" />
                        </div>
                        <span className="text-lg font-bold text-white">Segment {p.segment}</span>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${p.badgeColor}`}>
                        {p.badge}
                      </span>
                    </div>
                    <div className="mb-4">
                      <span className="text-5xl font-extrabold text-white sm:text-6xl">{p.amount}</span>
                      <span className="ml-2 text-sm text-neutral-500">{p.per}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-400">{p.criteria}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-8 max-w-xl text-center"
          >
            <GlassCard className="flex items-center justify-center gap-3 px-6 py-4">
              <Euro className="h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm text-neutral-300">
                <strong className="text-white">Paiement hebdomadaire</strong> — chaque vendredi par virement SEPA. Aucun minimum requis.
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* ═══ PROCESSUS ═══ */}
      <section className="relative overflow-hidden bg-[#000d1f] py-20 sm:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-14 max-w-2xl text-center"
          >
            <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent/80 sm:text-sm">
              Comment ça marche
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              4 étapes vers vos{" "}
              <span className="text-accent">premières commissions</span>
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                custom={i}
                variants={scaleIn}
              >
                <GlassCard className="group relative flex h-full flex-col p-7 transition-all duration-300 hover:border-accent/25 hover:bg-white/[0.06]">
                  <span className="mb-5 text-3xl font-black text-accent/20 transition-colors group-hover:text-accent/40">
                    {step.number}
                  </span>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                    <step.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">
                    {step.description}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section
        id="candidature"
        className="relative scroll-mt-24 overflow-hidden bg-[#000a19] py-24 sm:py-32 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] blur-[120px]" />
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          custom={0}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-2xl px-4 text-center"
        >
          <Euro className="mx-auto mb-6 h-12 w-12 text-accent drop-shadow-[0_0_20px_rgba(255,184,0,0.4)]" />
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Prêt à monétiser le solaire ?
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-neutral-400 sm:text-lg">
            Envoyez votre candidature par email. Précisez vos canaux d&apos;acquisition, vos volumes mensuels et votre expérience en performance marketing.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="mailto:contact@aegissolaire.com?subject=Candidature%20Partenaire%20M%C3%A9dia">
              <Button
                size="lg"
                className="h-14 gap-2.5 rounded-xl bg-accent px-10 text-base font-bold text-[#001D3D] shadow-[0_0_30px_rgba(255,184,0,0.25)] transition-all hover:scale-[1.03] hover:bg-[#e6a600] hover:shadow-[0_0_40px_rgba(255,184,0,0.4)]"
              >
                Devenir Partenaire Média
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-neutral-600">
            Réponse sous 48 h ouvrées · contact@aegissolaire.com
          </p>
        </motion.div>
      </section>
    </>
  )
}
