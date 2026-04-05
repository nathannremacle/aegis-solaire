"use client"

import { motion } from "framer-motion"
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
import { MediaPartnerApplicationForm } from "@/components/media-partner-application-form"

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
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
    title: "Rate limiting & anti-fraude",
    subtitle: "Qualification du trafic",
    description:
      "Chaque soumission est contrôlée (rate limiting, signaux anti-bot). Le tri et la qualification des leads combinent l’expertise de l’équipe Aegis et des traitements algorithmiques avancés avant toute comptabilisation.",
    stat: "< 50 ms",
    statLabel: "Latence indicative",
  },
  {
    icon: Zap,
    accent: Server,
    title: "Performance web",
    subtitle: "Expérience utilisateur",
    description:
      "Pages servies via Next.js : chargement rapide, SEO et stabilité pour maximiser la conversion des campagnes.",
    stat: "> 95",
    statLabel: "Objectif Lighthouse",
  },
  {
    icon: BarChart3,
    accent: Activity,
    title: "Pilotage",
    subtitle: "Transparence",
    description:
      "Tableau de bord partenaire : volumes, statuts, commissions. Données actualisées pour un suivi opérationnel.",
    stat: "24/7",
    statLabel: "Accès en ligne",
  },
]

const payoutData = [
  {
    segment: "B2B",
    icon: Building2,
    amount: "100 €",
    per: "par lead qualifié",
    criteria: "Projets industriels, toitures > 500 m²",
    badge: "B2B",
    badgeClass: "bg-blue-50 text-blue-700",
  },
  {
    segment: "B2C",
    icon: Home,
    amount: "25 €",
    per: "par lead qualifié",
    criteria: "Résidentiel, propriétaires en Wallonie",
    badge: "B2C",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },
]

const steps = [
  {
    icon: ClipboardCheck,
    number: "01",
    title: "Candidature",
    description: "Envoyez votre dossier. Validation sous 48 h ouvrées.",
  },
  {
    icon: KeyRound,
    number: "02",
    title: "Accès",
    description: "Liens trackés, supports et accès au portail partenaire.",
  },
  {
    icon: Send,
    number: "03",
    title: "Trafic",
    description: "Canaux acquisition conformes à la charte (Ads, SEO, e-mail, etc.).",
  },
  {
    icon: Wallet,
    number: "04",
    title: "Paiement",
    description: "Commissions récurrentes, virement hebdomadaire par SEPA.",
  },
]

/** Cartes « glass » uniquement sur le hero sombre (DA §4.2) */
function HeroTrustCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center backdrop-blur-md transition-all hover:border-accent/30 hover:bg-white/10 ${className}`}
    >
      {children}
    </div>
  )
}

function LightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:border-accent/25 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  )
}

export function MediaPartnersContent() {
  return (
    <>
      {/* Hero — DA §4.2 */}
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
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-accent backdrop-blur-md sm:text-sm">
                <Euro className="h-4 w-4 text-accent" aria-hidden />
                Programme partenaires média
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={fadeUp}
              className="mt-4 text-balance text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Monétisez le{" "}
              <span className="text-accent drop-shadow-[0_0_12px_rgba(255,184,0,0.35)]">solaire wallon</span>{" "}
              sans frais fixes
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              custom={2}
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-pretty text-base font-medium leading-relaxed text-neutral-300 sm:text-lg"
            >
              Rémunération au lead qualifié : chaque dossier est trié et validé par l&apos;équipe Aegis Solaire,
              avec l&apos;appui d&apos;algorithmes avancés (scoring, signaux techniques et conformité). Cadre
              contractuel clair, suivi dans un portail dédié, aligné sur les segments B2B et B2C.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              custom={3}
              variants={fadeUp}
              className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <a href="#candidature">
                <Button
                  size="lg"
                  className="h-14 gap-2.5 rounded-xl bg-accent px-8 text-base font-bold text-[#001D3D] shadow-[0_0_25px_rgba(255,184,0,0.25)] transition-all hover:bg-[#e6a600] hover:shadow-[0_0_35px_rgba(255,184,0,0.35)]"
                >
                  Candidater
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </a>
              <a
                href="#payout"
                className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-lg transition-all hover:border-accent/40 hover:bg-white/15"
              >
                Voir les commissions
              </a>
            </motion.div>

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
                { value: "7 j", label: "Cycle indicatif" },
              ].map((s) => (
                <HeroTrustCard key={s.label}>
                  <p className="font-sans text-2xl font-extrabold tabular-nums text-accent sm:text-3xl">{s.value}</p>
                  <p className="mt-1 text-[11px] font-medium text-neutral-400 sm:text-xs">{s.label}</p>
                </HeroTrustCard>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Corps clair — DA §2.4 */}
      <section className="relative overflow-hidden bg-secondary py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-12 max-w-2xl text-center sm:mb-14"
          >
            <span className="mb-3 inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
              Infrastructure
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#001D3D] sm:text-3xl lg:text-4xl">
              Une plateforme pensée pour la conversion
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Parcours prospects, qualification et pilotage : les briques techniques au service du rendement
              média.
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
                <LightCard className="group flex h-full flex-col p-7 sm:p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20 transition-transform group-hover:scale-105">
                      <card.icon className="h-6 w-6 text-accent" />
                    </div>
                    <card.accent className="h-5 w-5 text-slate-400 transition-colors group-hover:text-slate-600" />
                  </div>
                  <h3 className="text-lg font-bold text-[#001D3D]">{card.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-accent">{card.subtitle}</p>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
                  <div className="mt-6 flex items-baseline gap-2 border-t border-slate-100 pt-5">
                    <span className="font-sans text-2xl font-bold tabular-nums text-[#001D3D]">{card.stat}</span>
                    <span className="text-xs font-medium text-slate-400">{card.statLabel}</span>
                  </div>
                </LightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="payout"
        className="scroll-mt-24 bg-background py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-12 max-w-2xl text-center"
          >
            <span className="mb-3 inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
              Commissions
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#001D3D] sm:text-3xl lg:text-4xl">
              Tarifs fixes par segment
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Deux grilles, pas de palier caché. Un lead est comptabilisé comme qualifié après passage par la chaîne
              humaine Aegis et nos moteurs de décision (modèles et règles métier complexes). Les montants sont
              contractualisés avec votre interlocuteur.
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
                <LightCard className="flex h-full flex-col p-8 sm:p-10">
                  <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                        <p.icon className="h-5 w-5 text-[#001D3D]" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">Segment {p.segment}</span>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${p.badgeClass}`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="font-sans text-4xl font-extrabold tabular-nums text-[#001D3D] sm:text-5xl">
                      {p.amount}
                    </span>
                    <span className="ml-2 text-sm text-slate-500">{p.per}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.criteria}</p>
                </LightCard>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-8 max-w-xl"
          >
            <LightCard className="flex items-center gap-3 px-6 py-4">
              <Euro className="h-5 w-5 shrink-0 text-accent" />
              <p className="text-sm text-slate-600">
                <strong className="text-[#001D3D]">Paiement hebdomadaire</strong> — virement SEPA. Modalités
                précisées au contrat partenaire.
              </p>
            </LightCard>
          </motion.div>
        </div>
      </section>

      <section className="bg-secondary py-16 sm:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            custom={0}
            variants={fadeUp}
            className="mx-auto mb-12 max-w-2xl text-center"
          >
            <span className="mb-3 inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">
              Processus
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#001D3D] sm:text-3xl lg:text-4xl">
              Quatre étapes
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
                <LightCard className="flex h-full flex-col p-7">
                  <span className="mb-4 font-sans text-2xl font-black tabular-nums text-accent/25">{step.number}</span>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                    <step.icon className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold text-[#001D3D]">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </LightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bloc CTA sombre — même famille que Benefits / Webinaire (DA §2.4) */}
      <section
        id="candidature"
        className="relative scroll-mt-24 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(0,29,61,1)_0%,rgba(0,10,25,1)_100%)] py-20 sm:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
      >
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1548618753-157945d81c4e?q=80&w=2670&auto=format&fit=crop')",
            }}
          />
        </div>
        <div className="absolute inset-0 bg-[#001D3D]/85" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          custom={0}
          variants={fadeUp}
          className="relative z-10 mx-auto max-w-2xl px-4 text-center"
        >
          <Euro className="mx-auto mb-6 h-11 w-11 text-accent drop-shadow-[0_0_12px_rgba(255,184,0,0.5)]" />
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Candidature partenaire média</h2>
          <p className="mx-auto mt-5 max-w-lg text-neutral-300 sm:text-lg">
            Soumettez votre dossier : canaux, volumes indicatifs et expérience en acquisition qualifiée. Traitement sous 48h
            ouvrées.
          </p>
          <div className="mx-auto mt-10 flex w-full max-w-lg justify-center px-0 sm:px-2">
            <MediaPartnerApplicationForm />
          </div>
          <p className="mt-8 text-xs text-neutral-400">
            Besoin d&apos;aide ?{" "}
            <a
              href="mailto:contact@aegissolaire.com?subject=Candidature%20Partenaire%20M%C3%A9dia"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              contact@aegissolaire.com
            </a>
          </p>
        </motion.div>
      </section>
    </>
  )
}
