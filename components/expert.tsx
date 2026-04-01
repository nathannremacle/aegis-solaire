"use client"

import { useRef, useState } from "react"
import {
  Pause,
  Play,
  AlertTriangle,
  Scale,
  Banknote,
  Users,
  Zap,
  Activity,
  Clock,
  ShieldCheck,
  Wrench,
  Award,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedCounter } from "@/components/ui/animated-counter"

function getEmbedVideoUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === "www.youtube.com" || u.hostname === "youtube.com") {
      const v = u.searchParams.get("v")
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.slice(1).split("/")[0]
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
    if (u.hostname === "vimeo.com" || u.hostname === "www.vimeo.com") {
      const id = u.pathname.replace(/^\/+/, "").split("/")[0]
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch {
    return null
  }
  return null
}

const LOCAL_VIDEO_SRC = "/videos/virageenergitiquewallon.mp4"
const VIDEO_TITLE = "Vidéo — Wallonie : PEB, Plan PACE 2030 et financement (PPA, tiers-investissement)"

function FounderVideoBlock() {
  const videoUrl = process.env.NEXT_PUBLIC_FOUNDER_VIDEO_URL
  const embedUrl = videoUrl ? getEmbedVideoUrl(videoUrl) : null
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  if (embedUrl) {
    return (
      <div className="relative aspect-video w-full min-w-0 overflow-hidden rounded-2xl bg-muted shadow-2xl transition-all hover:shadow-[0_0_30px_rgba(255,184,0,0.15)]" aria-label={VIDEO_TITLE}>
        <iframe
          src={embedUrl}
          title={VIDEO_TITLE}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div
      className="group relative aspect-video w-full min-w-0 cursor-pointer overflow-hidden rounded-2xl bg-slate-900 shadow-2xl transition-all hover:shadow-[0_0_40px_rgba(0,29,61,0.4)] sm:rounded-3xl"
      aria-label={VIDEO_TITLE}
      onClick={togglePlay}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), togglePlay())}
      role="button"
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={LOCAL_VIDEO_SRC}
        title={VIDEO_TITLE}
        className="absolute left-1/2 top-1/2 h-[102%] w-[102%] min-h-[102%] min-w-[102%] -translate-x-1/2 -translate-y-1/2 object-cover opacity-90 transition-opacity group-hover:opacity-100"
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        Votre navigateur ne prend pas en charge la lecture de vidéos.
      </video>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent to-primary/40 transition-opacity duration-300" aria-hidden>
        <span className={`flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-accent/90 text-primary shadow-[0_0_30px_rgba(255,184,0,0.5)] backdrop-blur-md transition-all duration-300 group-hover:scale-110 ${isPlaying ? "scale-90 opacity-0" : "scale-100 opacity-100"}`}>
          <Play className="h-8 w-8 sm:h-10 sm:w-10 translate-x-1" />
        </span>
        {isPlaying && (
          <span className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-opacity duration-300 opacity-0 group-hover:opacity-100">
            <Pause className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  )
}

const credentials = [
  { icon: Award, text: "15 ans d'expertise en photovoltaïque B2B (Wallonie)" },
  { icon: ShieldCheck, text: "Installateurs certifiés RESCERT & conformes RGIE" },
  { icon: Zap, text: "Matériel Premium Tier-1 (Garantie de rendement max)" },
  { icon: Wrench, text: "Audit → CWaPE → Installation → Monitoring GRD" },
]

const stats = [
  { valueNum: 500, suffix: "+", label: "Entreprises équipées", icon: Users },
  { valueNum: 150, suffix: " MW", label: "Puissance installée", icon: Zap },
  { valueNum: 98, suffix: " %", label: "Satisfaction", icon: Activity },
  { staticValue: "24/7", label: "Monitoring", icon: Clock },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 }
  }
}

export function Expert() {
  return (
    <section id="expert" className="scroll-mt-24 overflow-x-hidden bg-secondary/30 py-16 sm:py-24 lg:py-32 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
      <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-16 max-w-3xl text-center lg:mb-20"
        >
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary sm:text-sm">
            Notre expertise régionale
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl xl:leading-[1.1]">
            Votre partenaire pour la <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">transition wallonne</span>
          </h2>
          <p className="mt-6 text-pretty text-base font-medium leading-relaxed text-muted-foreground sm:text-lg lg:text-xl">
            Rentabilité, financement et conformité PEB en Wallonie : nous structurons vos dossiers <strong>Corporate PPA</strong> ou <strong>Tiers-Investissement</strong> et valorisons les <strong>Certificats Verts (CWaPE)</strong> dès que votre actif y est éligible.
          </p>
        </motion.header>

        {/* Stats Strip */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="mb-16 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4 lg:mb-20"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-2xl border border-primary/5 bg-background p-6 text-center shadow-lg transition-all hover:-translate-y-2 hover:shadow-[0_15px_30px_rgba(0,29,61,0.08)] sm:p-8"
            >
              <div className="absolute top-0 right-0 h-24 w-24 translate-x-12 -translate-y-12 rounded-full bg-accent/5 transition-transform duration-500 group-hover:scale-150" />
              <stat.icon className="mx-auto mb-4 h-8 w-8 text-accent drop-shadow-sm transition-transform duration-300 group-hover:scale-125 sm:h-10 sm:w-10" />
              <p className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                {stat.valueNum !== undefined ? (
                  <>
                    <AnimatedCounter value={stat.valueNum} />
                    <span>{stat.suffix}</span>
                  </>
                ) : (
                  stat.staticValue
                )}
              </p>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Video + Compliance (2 cols stretched) */}
        <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Video Block */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl"
          >
            <div className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-6 py-5">
              <h3 className="text-lg font-bold text-foreground">
                Comprendre le virage énergétique Wallon
              </h3>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                Quotas PEB, Tiers-investissement et plan PACE 2030.
              </p>
            </div>
            <div className="flex flex-1 items-center p-4 sm:p-6 bg-secondary/10">
              <FounderVideoBlock />
            </div>
          </motion.div>

          {/* Compliance Card */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex min-w-0 flex-col gap-6"
          >
            <div className="flex flex-1 flex-col rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md">
                  <Scale className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  Conformité & Cadre Légal BE
                </h3>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground">
                Les exigences <strong>PEB non résidentiel</strong> et le <strong>Plan PACE 2030</strong> imposent de solariser massivement et de sécuriser la mobilité électrique (IRVE). Nous maximisons votre rentabilité B2B via les <strong>Certificats Verts</strong> et gérons l'ensemble des noeuds d'injection avec votre GRD local (Ores, Resa, Elia).
              </p>
              <div className="mt-auto pt-6 flex items-start gap-4 rounded-2xl border border-accent/40 bg-accent/10 p-5 shadow-inner">
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-accent" aria-hidden />
                <p className="text-sm font-medium leading-relaxed text-foreground/90">
                  <strong className="block text-base text-amber-700 dark:text-accent mb-1">
                    Enjeu immobilier capital :
                  </strong>
                  Un bâtiment industriel déclassé PEB perd activement en liquidité et subira les taxes CO2. L'inaction n'est plus une option financière.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Solutions de financement - Hover Floating */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 lg:mt-24"
        >
          <div className="mb-8 flex items-center justify-center gap-4 sm:justify-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent shadow-[0_0_15px_rgba(255,184,0,0.4)]">
              <Banknote className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              Structuration financière
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-accent hover:shadow-[0_20px_40px_rgba(0,29,61,0.12)] sm:p-8">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/10 transition-transform duration-500 group-hover:scale-150" />
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-amber-600 text-lg font-bold text-black shadow-lg">
                0 €
              </span>
              <h4 className="text-xl font-bold text-foreground">Tiers-Investissement</h4>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition-colors">
                Un investisseur prend en charge 100 % du CAPEX et la maintenance totale. Il se rémunère sur la revente et les <strong>Certificats Verts</strong>. Vous profitez d'une énergie locale sans alourdir votre bilan comptable.
              </p>
            </div>

            <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-primary hover:shadow-[0_20px_40px_rgba(0,29,61,0.12)] sm:p-8">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 transition-transform duration-500 group-hover:scale-150" />
              <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#003366] text-sm font-bold tracking-wider text-white shadow-lg">
                PPA
              </span>
              <h4 className="text-xl font-bold text-foreground">Corporate PPA On-Site</h4>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition-colors">
                Contrat de gré à gré (10-25 ans) sourçant l'énergie <strong className="font-semibold px-1 text-primary bg-primary/10 rounded">derrière le compteur</strong>. Vous figez un prix de l'électricité bas à long terme, vous couvrant contre toute la volatilité des marchés extérieurs.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Engagements strip */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-card via-card/50 to-card px-6 py-8 shadow-2xl backdrop-blur-sm sm:px-10 sm:py-10 lg:mt-24"
        >
          <h3 className="mb-8 text-center text-lg font-bold uppercase tracking-widest text-primary">
            L'Exigence B2B — Zéro Compromis
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:gap-x-12">
            {credentials.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <c.icon className="h-6 w-6 shrink-0 text-accent drop-shadow-sm" />
                <span className="text-sm font-semibold text-foreground/90 sm:text-base">{c.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
