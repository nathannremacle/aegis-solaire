"use client"

import { useRef, useState } from "react"
import {
  CheckCircle2,
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
const VIDEO_TITLE =
  "Vidéo — Wallonie : PEB, Plan PACE 2030 et financement (PPA, tiers-investissement)"

function FounderVideoBlock() {
  const videoUrl = process.env.NEXT_PUBLIC_FOUNDER_VIDEO_URL
  const embedUrl = videoUrl ? getEmbedVideoUrl(videoUrl) : null
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  if (embedUrl) {
    return (
      <div
        className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl bg-muted"
        aria-label={VIDEO_TITLE}
      >
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
      className="group relative aspect-video w-full min-w-0 cursor-pointer overflow-hidden rounded-xl bg-muted"
      aria-label={VIDEO_TITLE}
      onClick={togglePlay}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") &&
        (e.preventDefault(), togglePlay())
      }
      role="button"
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={LOCAL_VIDEO_SRC}
        title={VIDEO_TITLE}
        className="absolute left-1/2 top-1/2 h-[102%] w-[102%] min-h-[102%] min-w-[102%] -translate-x-1/2 -translate-y-1/2 object-cover"
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        Votre navigateur ne prend pas en charge la lecture de vidéos.
      </video>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
        aria-hidden
      >
        <span
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition-opacity duration-200 ${isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}
        >
          {isPlaying ? (
            <Pause className="h-7 w-7" />
          ) : (
            <Play className="h-7 w-7 translate-x-0.5" />
          )}
        </span>
      </div>
    </div>
  )
}

const credentials = [
  {
    icon: Award,
    text: "15+ ans d\u2019exp\u00e9rience en photovolta\u00efque B2B (Belgique & Europe)",
  },
  {
    icon: ShieldCheck,
    text: "Installateurs certifi\u00e9s RESCERT Photovolta\u00efque & conformes RGIE",
  },
  {
    icon: Zap,
    text: "Partenaire exclusif SunPower & Enphase (fabricants premium)",
  },
  {
    icon: Wrench,
    text: "Audit \u2192 r\u00e9servation Certificats Verts \u2192 installation \u2192 maintenance",
  },
  {
    icon: ShieldCheck,
    text: "Garantie d\u00e9cennale & assurance tous risques incluses",
  },
]

const stats = [
  { value: "500+", label: "Entreprises \u00e9quip\u00e9es", icon: Users },
  { value: "150 MW", label: "Puissance install\u00e9e", icon: Zap },
  { value: "98 %", label: "Satisfaction client", icon: Activity },
  { value: "24/7", label: "Monitoring inclus", icon: Clock },
]

export function Expert() {
  return (
    <section
      id="expert"
      className="scroll-mt-24 overflow-x-hidden bg-secondary py-16 sm:py-20 lg:py-28 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]"
    >
      <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <header className="mx-auto mb-12 max-w-3xl text-center lg:mb-16">
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-accent sm:text-sm">
            Notre expertise
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl xl:text-[2.75rem] xl:leading-tight">
            Un partenaire de confiance pour votre transition énergétique
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Rentabilité, financement et conformité PEB en Wallonie : nous
            structurons vos dossiers Corporate PPA ou tiers-investissement et
            intégrons les Certificats Verts (CWaPE) dès que votre centrale est
            éligible.
          </p>
        </header>

        {/* ── Stats strip ── */}
        <div className="mb-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:mb-16">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-center shadow-sm transition-all hover:shadow-md sm:p-6"
            >
              <stat.icon className="mx-auto mb-2 h-6 w-6 text-accent opacity-70 transition-transform group-hover:scale-110 sm:h-7 sm:w-7" />
              <p className="text-2xl font-bold text-primary sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Video + Conformité (2 cols, stretch to same height) ── */}
        <div className="grid items-stretch gap-6 lg:grid-cols-2 lg:gap-10">
          {/* Video card */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                Obligations PEB, PACE 2030 et rentabilité
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Certificats Verts, Corporate PPA et tiers-investissement —
                vision d&apos;ensemble en quelques minutes.
              </p>
            </div>
            <div className="flex flex-1 items-center p-4 sm:p-5">
              <FounderVideoBlock />
            </div>
          </div>

          {/* Right — Conformité card stretches + alert at bottom */}
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-1 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  Conformité &amp; cadre légal
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                Exigences <strong>PEB non résidentiel</strong>,{" "}
                <strong>Plan PACE 2030</strong> et directive européenne
                (solarisation, trajectoire ZEB) imposent d&apos;intégrer les
                renouvelables et de sécuriser l&apos;électrification des
                sites — y compris les <strong>IRVE</strong> sur parkings.
                Nous cadrons le volet réglementaire en maximisant la
                rentabilité via les <strong>Certificats Verts</strong> et le
                pilotage avec votre GRD (Ores, Resa, Elia).
              </p>
              <div className="mt-auto flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-50/60 px-4 py-3 pt-4 dark:bg-amber-500/10">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
                <p className="min-w-0 text-sm leading-relaxed text-foreground">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Enjeu patrimonial&nbsp;:
                  </span>{" "}
                  un bâtiment mal aligné sur les trajectoires PEB / PACE 2030
                  peut perdre en attractivité et en liquidité à la revente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Financement ── */}
        <div className="mt-10 lg:mt-14">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15">
              <Banknote className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              Solutions de financement
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md sm:p-6">
              <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                0 &euro;
              </span>
              <h4 className="text-base font-semibold text-foreground">
                Tiers-Investissement
              </h4>
              <p className="mt-auto pt-3 text-sm leading-relaxed text-muted-foreground">
                Un tiers finance 100 % du CAPEX et de la maintenance. Les
                flux de <strong>Certificats Verts</strong> et la vente
                d&apos;électricité structurent le retour investisseur — vous
                sécurisez prix et conformité sans alourdir le bilan.
              </p>
            </div>

            <div className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md sm:p-6">
              <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                PPA
              </span>
              <h4 className="text-base font-semibold text-foreground">
                Corporate PPA
              </h4>
              <p className="mt-auto pt-3 text-sm leading-relaxed text-muted-foreground">
                Contrat 10–25 ans à prix fixe : couverture contre la
                volatilité du marché. En <strong>on-site</strong>,
                l&apos;énergie est livrée derrière le compteur — levier
                majeur pour l&apos;autoconsommation et la maîtrise des coûts
                réseau.
              </p>
            </div>
          </div>
        </div>

        {/* ── Engagements (compact strip) ── */}
        <div className="mt-10 rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-8 lg:mt-14">
          <h3 className="mb-5 text-center text-base font-semibold text-foreground sm:text-lg">
            Nos engagements
          </h3>
          <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4 sm:gap-x-10">
            {credentials.map((c, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <c.icon className="h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm text-foreground">{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
