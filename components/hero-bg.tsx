"use client"

import { ProgressiveHeroBackground } from "@/components/progressive-image"
import { heroImages } from "@/lib/optimized-images"

type HeroKey = keyof typeof heroImages

/**
 * A thin client wrapper that renders a ProgressiveHeroBackground for a given hero key.
 * Use this inside Server Components that can't use hooks directly.
 */
export function HeroBg({
  heroKey,
  className = "opacity-80",
  maskGradient = "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.1) 100%)",
}: {
  heroKey: HeroKey
  className?: string
  maskGradient?: string
}) {
  const img = heroImages[heroKey]
  return (
    <ProgressiveHeroBackground
      blurDataUrl={img.blurDataUrl}
      webpSrc={img.webp}
      mobileSrc={img.mobile}
      fallbackSrc={img.original}
      className={className}
      style={{
        maskImage: maskGradient,
        WebkitMaskImage: maskGradient,
      }}
    />
  )
}
