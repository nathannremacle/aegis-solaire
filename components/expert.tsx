"use client"

import { useRef, useState } from "react"
import { CheckCircle2, Pause, Play, AlertTriangle } from "lucide-react"

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
const VIDEO_TITLE = "Vidéo — Wallonie : PEB, Plan PACE 2030 et financement (PPA, tiers-investissement)"

function FounderVideoBlock() {
  const videoUrl = process.env.NEXT_PUBLIC_FOUNDER_VIDEO_URL
  const embedUrl = videoUrl ? getEmbedVideoUrl(videoUrl) : null
  // Hooks must be called unconditionally (lint rule-of-hooks).
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

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
  "Plus de 15 ans d'expérience dans le photovoltaïque B2B (Belgique, francophonie)",
  "Partenaires d'installation couverts par la certification RESCERT Photovoltaïque et respect strict du RGIE (régime général sur les installations électriques) — indispensable pour assurances et Certificats Verts",
  "Partenaire exclusif de fabricants premium (SunPower, Enphase)",
  "Structuration de projets : audit, réservation CV (SPW Énergie), montage Corporate PPA ou tiers-investissement, installation, maintenance",
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
    <section id="expert" className="scroll-mt-24 overflow-x-hidden bg-secondary py-14 sm:py-20 lg:py-24 [padding-left:max(1rem,env(safe-area-inset-left))] [padding-right:max(1rem,env(safe-area-inset-right))]">
      <div className="mx-auto max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8">
        {/* En-tête : titre + intro */}
        <header className="mb-10 lg:mb-12">
          <h4 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Un partenaire de confiance pour votre transition énergétique
          </h4>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Aegis Solaire simplifie la lecture de la rentabilité et du financement face aux nouvelles obligations PEB et à la trajectoire du Plan Air Climat Énergie (PACE 2030) en Wallonie. Nous structurons vos dossiers avec des Corporate PPA ou du tiers-investissement, en intégrant le mécanisme des Certificats Verts (CWaPE) lorsque votre centrale est éligible.
          </p>
        </header>

        {/* Alerte sanctions : bandeau discret mais visible */}
        <div className="mb-10 flex min-w-0 items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 sm:px-5 sm:py-5">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
          <p className="min-w-0 break-words text-sm font-medium text-foreground sm:text-base">
            <span className="font-semibold text-amber-700 dark:text-amber-400">En Wallonie</span>, le durcissement des exigences PEB et l&apos;accélération du Plan PACE 2030 transforment la transition énergétique en enjeu de valeur : un patrimoine industriel ou logistique mal aligné sur ces trajectoires peut perdre en attractivité et en liquidité à la revente ou au refinancement.
          </p>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Colonne gauche */}
          <div className="min-w-0 space-y-8">
            <div>
              <h4 className="text-base font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Conformité & cadre légal
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-foreground sm:text-base">
                Les exigences de <strong>performance PEB</strong> pour le non résidentiel, le <strong>Plan PACE 2030</strong> et la transposition progressive de la directive européenne PEB (solarisation des grands bâtiments, trajectoire ZEB) imposent d&apos;intégrer massivement les énergies renouvelables et de sécuriser l&apos;électrification des sites (y compris via les <strong>IRVE</strong> sur parkings). Nous vous aidons à cadrer le projet réglementairement tout en maximisant la rentabilité — notamment via les <strong>Certificats Verts</strong> et le pilotage avec les gestionnaires de réseau (ex. <strong>Ores</strong>, <strong>Resa</strong>, <strong>Elia</strong> selon le cas).
              </p>
            </div>

            <div>
              <h4 className="text-base font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Solutions de financement
              </h4>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {/* Carte Tiers-Investissement – texte collé en bas */}
                <div className="flex min-h-[180px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:min-h-[200px]">
                  <h4 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                    Tiers-Investissement (Zéro CAPEX)
                  </h4>
                  <p className="mt-auto pt-3 text-sm leading-relaxed text-muted-foreground">
                    Un tiers finance 100 % du CAPEX et de la maintenance ; les flux de <strong>Certificats Verts</strong> et la vente d&apos;électricité à votre site structurent le retour pour l&apos;investisseur, pendant que vous sécurisez prix et conformité sans alourdir le bilan.
                  </p>
                </div>
                {/* Carte PPA – texte collé en bas comme l'autre */}
                <div className="flex min-h-[180px] flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:min-h-[200px]">
                  <h4 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                    Corporate PPA
                  </h4>
                  <p className="mt-auto pt-3 text-sm leading-relaxed text-muted-foreground">
                    <strong>Corporate PPA</strong> (souvent 10 à 25 ans) : prix de l&apos;électricité fixé contractuellement, couverture contre la volatilité du marché. En <strong>on-site</strong>, l&apos;énergie est livrée derrière le compteur — levier majeur pour l&apos;autoconsommation et la maîtrise des coûts réseau, selon votre GRD et votre schéma de raccordement.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-base font-semibold uppercase tracking-wide text-muted-foreground sm:text-sm">
                Nos engagements
              </h4>
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
                  <h4 className="text-base font-semibold text-foreground sm:text-lg">
                  Vidéo — Wallonie : obligations PEB, PACE 2030 et rentabilité
                  </h4>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Transition énergétique en Wallonie, rôle des Certificats Verts (CWaPE) et structuration Corporate PPA ou tiers-investissement — vision d&apos;ensemble en quelques minutes.
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
