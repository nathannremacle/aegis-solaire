"use client"

import { CheckCircle2, Play } from "lucide-react"

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

function FounderVideoBlock() {
  const videoUrl = process.env.NEXT_PUBLIC_FOUNDER_VIDEO_URL
  const embedUrl = videoUrl ? getEmbedVideoUrl(videoUrl) : null

  if (embedUrl) {
    return (
      <div
        className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted"
        aria-label="Vidéo explicative du fondateur"
      >
        <iframe
          src={embedUrl}
          title="Vidéo Fondateur – Décret Tertiaire & financement"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div
      className="relative aspect-video w-full min-w-0 overflow-hidden rounded-xl border border-border bg-muted"
      aria-label="Vidéo explicative du fondateur – à venir"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
          <Play className="h-8 w-8 text-primary" />
        </div>
        <span className="text-sm font-medium">Vidéo à venir</span>
        <span className="text-xs">Fondateur – Loi LOM, PPA & stockage</span>
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
    <section id="expert" className="bg-secondary py-12 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Contenu : Décret Tertiaire, PPA, stockage */}
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              Un partenaire de confiance pour votre transition énergétique
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Aegis Solaire réunit un réseau d'experts certifiés pour vous accompagner de l'étude de faisabilité jusqu'à la maintenance de votre installation, en France, en Belgique et en francophonie. Nous simplifions le financement : <strong>PPA</strong> (achat d'électricité sans mise de fonds), <strong>tiers-investissement</strong> et <strong>stockage batterie</strong> pour maximiser l'autoconsommation.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Le <strong>Décret Tertiaire</strong> et la <strong>Loi LOM</strong> imposent aux bâtiments &gt; 500 m² et aux parkings &gt; 1 500 m² des obligations de réduction de consommation et de couverture solaire. Nous vous aidons à vous mettre en conformité tout en rentabilisant vos surfaces.
            </p>

            <ul className="mt-8 space-y-4">
              {credentials.map((credential, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span className="text-foreground">{credential}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Vidéo Founder POV – configurable via NEXT_PUBLIC_FOUNDER_VIDEO_URL */}
          <div className="min-w-0 space-y-4">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">
              Vidéo Fondateur – Décret Tertiaire & financement
            </h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Explication des obligations légales (Décret Tertiaire) et des solutions de financement (PPA, tiers-investissement, stockage) en 2 à 3 minutes.
            </p>
            <FounderVideoBlock />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="min-w-0 rounded-xl border border-border bg-card p-4 text-center sm:p-6"
                >
                  <p className="text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
