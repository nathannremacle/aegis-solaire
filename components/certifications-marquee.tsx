"use client"

/**
 * Bandeau défilant des logos certifications / partenaires.
 * Fichiers attendus dans public/logos/ : rge.png, qualipv.png, ademe.png, spw-energie.png (ou .svg)
 * (ou .svg à la place de .png). Hauteur recommandée : 96–120 px.
 */
const LOGOS = [
  { src: "/logos/rge.png", alt: "RGE - Reconnu Garant de l'Environnement", name: "RGE" },
  { src: "/logos/qualipv.png", alt: "QualiPV", name: "QualiPV" },
  { src: "/logos/ademe.png", alt: "ADEME", name: "ADEME" },
  { src: "/logos/spw-energie.png", alt: "SPW Énergie — Wallonie", name: "SPW Énergie" },
]

function LogoItem({ src, alt, name }: { src: string; alt: string; name: string }) {
  return (
    <li className="flex h-20 w-40 shrink-0 items-center justify-center px-8 sm:h-24 sm:w-52 sm:px-10">
      <div className="relative flex h-full w-full items-center justify-center">
        <img
          src={src}
          alt={alt}
          className="max-h-14 w-full object-contain opacity-80 transition-opacity hover:opacity-100 sm:max-h-20"
          loading="lazy"
          onError={(e) => {
            const target = e.currentTarget
            target.style.display = "none"
            const fallback = target.parentElement?.querySelector("[data-fallback]") as HTMLElement
            if (fallback) fallback.style.display = "block"
          }}
        />
        <span
          data-fallback
          className="hidden text-center text-base font-semibold text-muted-foreground sm:text-lg"
          style={{ display: "none" }}
        >
          {name}
        </span>
      </div>
    </li>
  )
}

export function CertificationsMarquee() {
  return (
    <div className="certifications-marquee-pause relative w-full overflow-hidden py-2" role="region" aria-label="Logos certifications et partenaires">
      {/* Masques en dégradé pour un fondu propre sur les bords */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-background to-transparent sm:w-20"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-background to-transparent sm:w-20"
        aria-hidden
      />

      <div className="certifications-marquee-track flex w-max gap-0">
        <ul className="flex items-center gap-0" aria-hidden>
          {LOGOS.map((logo) => (
            <LogoItem key={`a-${logo.name}`} {...logo} />
          ))}
        </ul>
        <ul className="flex items-center gap-0" aria-hidden>
          {LOGOS.map((logo) => (
            <LogoItem key={`b-${logo.name}`} {...logo} />
          ))}
        </ul>
      </div>
    </div>
  )
}
