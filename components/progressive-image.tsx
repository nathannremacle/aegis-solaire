"use client"

import { useState, useEffect, useRef } from "react"

/**
 * ProgressiveHeroBackground
 *
 * Implements blur-up (LQIP) progressive loading for hero section backgrounds:
 * 1. Immediately shows an inline base64 blur placeholder via CSS background
 * 2. Loads the optimized WebP image in the background
 * 3. Once loaded, cross-fades from blur → sharp with a smooth transition
 *
 * Also supports responsive images: loads mobile variant on small screens.
 */
export function ProgressiveHeroBackground({
  blurDataUrl,
  webpSrc,
  mobileSrc,
  fallbackSrc,
  className = "",
  style = {},
}: {
  /** Tiny base64 data URI for instant blur placeholder */
  blurDataUrl: string
  /** Optimized WebP source (desktop) */
  webpSrc: string
  /** Optimized WebP source (mobile, ≤768px) */
  mobileSrc?: string
  /** Original image fallback for browsers without WebP support */
  fallbackSrc?: string
  className?: string
  style?: React.CSSProperties
}) {
  const [loaded, setLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Determine which image to load based on viewport width
    const isMobile = window.innerWidth <= 768
    const src = isMobile && mobileSrc ? mobileSrc : webpSrc

    setImageSrc(src)

    const img = new Image()
    img.src = src

    if (img.complete) {
      setLoaded(true)
      return
    }

    img.onload = () => setLoaded(true)
    img.onerror = () => {
      // Fallback to original source if WebP fails
      if (fallbackSrc) {
        setImageSrc(fallbackSrc)
        const fallbackImg = new Image()
        fallbackImg.src = fallbackSrc
        fallbackImg.onload = () => setLoaded(true)
      }
    }
  }, [webpSrc, mobileSrc, fallbackSrc])

  return (
    <>
      {/* Blur placeholder — instantly visible, fades out once HD loads */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ${loaded ? "opacity-0" : "opacity-100"} ${className}`}
        style={{
          backgroundImage: `url('${blurDataUrl}')`,
          filter: "blur(20px)",
          transform: "scale(1.1)", // Prevent blur edge artifacts
          ...style,
        }}
        aria-hidden
      />
      {/* High-quality image — fades in on load */}
      <div
        ref={containerRef}
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
        style={{
          backgroundImage: imageSrc ? `url('${imageSrc}')` : "none",
          ...style,
        }}
      />
    </>
  )
}

/**
 * ProgressiveAvatar
 *
 * Small image component with blur-up:
 * - Shows tiny blur instantly
 * - Fades to optimized WebP once loaded
 */
export function ProgressiveAvatar({
  blurDataUrl,
  webpSrc,
  alt,
  className = "",
  size = 36,
}: {
  blurDataUrl: string
  webpSrc: string
  alt: string
  className?: string
  size?: number
}) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = new Image()
    img.src = webpSrc
    if (img.complete) {
      setLoaded(true)
      return
    }
    img.onload = () => setLoaded(true)
  }, [webpSrc])

  return (
    <div
      className="relative overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* Blur placeholder */}
      <img
        src={blurDataUrl}
        alt=""
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"} ${className}`}
        style={{ filter: "blur(8px)", transform: "scale(1.2)" }}
      />
      {/* Actual image */}
      <img
        ref={imgRef}
        src={webpSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={size}
        height={size}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      />
    </div>
  )
}
