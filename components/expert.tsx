"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Pause, Play } from "lucide-react"

/** Retourne l'URL d'embed YouTube ou Vimeo, ou null si non reconnu. */
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

const LOCAL_VIDEO_SRC = "/videos/decrettertiaireetfinancement.mp4"
const VIDEO_TITLE = "Vidéo Explicative - Décret Tertiaire et Financement"

function FounderVideoBlock() {
  const videoUrl = process.env.NEXT_PUBLIC_FOUNDER_VIDEO_URL
  const embedUrl = videoUrl ? getEmbedVideoUrl(videoUrl) : null

  if (embedUrl) {
    return (
      <div
        className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted"
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

  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

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
      className="group relative aspect-video w-full min-w-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-muted"
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
  "Plus de 15 ans d'expérience dans le photovoltaïque B2B",
  "Certification RGE et QualiPV",
  "Partenaire exclusif de fabricants premium (SunPower, Enphase)",
  "Accompagnement complet : audit, financement, installation, maintenance",
  "Garantie décennale et assurance tous risques",
]

const stats = [
  { value: "500+", label: "Entreprises équipées" },
  { value: "150 MW", label: "Puissance installée" },
  { value: "98%", label: "Satisfaction client" },
  { value: "24/7", label: "Monitoring inclus" },
]

export function Expert() {
  return (
    <section id="expert" className="scroll-mt-24 bg-secondary py-14 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* En-tête : titre + intro */}
        <header className="mb-10 lg:mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Un partenaire de confiance pour votre transition énergétique
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Aegis Solaire réunit un réseau d'experts certifiés pour vous accompagner de l'étude de faisabilité jusqu'à la maintenance de votre installation, en France, en Belgique et en francophonie.
          </p>
        </header>

        {/* Alerte sanctions : bandeau discret mais visible */}
        <div className="mb-10 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:px-5 sm:py-4">
          <span className="text-lg sm:text-xl" aria-hidden>⚠️</span>
          <p className="text-sm font-medium text-foreground sm:text-base">
            <span className="font-semibold text-amber-700 dark:text-amber-400">En 2026</span>, le non-respect de l'obligation de solariser vos parkings vous expose à une amende de <strong>40 000 € par an</strong>.
          </p>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Colonne gauche */}
          <div className="min-w-0 space-y-8">
            <div>
              <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Conformité & cadre légal
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground sm:text-base">
                Le <strong>Décret Tertiaire</strong> et la <strong>Loi LOM</strong> imposent aux bâtiments &gt; 500 m² et aux parkings &gt; 1 500 m² des obligations de réduction de consommation et de couverture solaire. Nous vous aidons à vous mettre en conformité tout en rentabilisant vos surfaces.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Solutions de financement
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Carte Tiers-Investissement – texte collé en bas */}
                <div className="flex min-h-[180px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:min-h-[200px]">
                  <h4 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                    Tiers-Investissement (Zéro CAPEX)
                  </h4>
                  <p className="mt-auto pt-3 text-sm leading-relaxed text-muted-foreground">
                    L'investisseur finance 100 % de l'installation et de la maintenance. Rentabilité dès la première année sans avance de trésorerie.
                  </p>
                </div>
                {/* Carte PPA – texte collé en bas comme l'autre */}
                <div className="flex min-h-[180px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:min-h-[200px]">
                  <h4 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                    Contrat PPA
                  </h4>
                  <p className="mt-auto pt-3 text-sm leading-relaxed text-muted-foreground">
                    Achat d'électricité à prix fixe sur 15 à 25 ans. Sécurisez votre budget énergétique et préservez votre trésorerie sur la durée du contrat.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Nos engagements
              </h3>
              <ul className="mt-4 space-y-3">
                {credentials.map((credential, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm text-foreground sm:text-base">{credential}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Colonne droite : Vidéo + Stats */}
          <div className="min-w-0 space-y-6 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-4 py-4 sm:px-5 sm:py-4">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  Vidéo – Décret Tertiaire et Financement
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Obligations légales et solutions de financement (PPA, tiers-investissement, stockage) en 2 minutes.
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <FounderVideoBlock />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md sm:p-5"
                >
                  <p className="text-2xl font-bold text-primary sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
