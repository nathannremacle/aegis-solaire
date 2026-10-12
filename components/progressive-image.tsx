"use client"

import { useEffect, useState, useRef } from "react"

/**
 * ProgressiveHeroBackground
 *
 * Implements Google's recommended hero image loading pattern:
 * 1. Base64 blur placeholder renders instantly (zero network latency)
 * 2. High-res WebP image preloads in background
 * 3. Smooth crossfade once HD image is ready
 *
 * This delivers sub-second perceptual load time and eliminates
 * the blank-hero flash on slower mobile connections.
 */
export function ProgressiveHeroBackground({
  blurDataUrl,
  webpSrc,
  mobileSrc,
  fallbackSrc,
  className = "",
  style,
}: {
  blurDataUrl: string
  webpSrc: string
  mobileSrc?: string
  fallbackSrc?: string
  className?: string
  style?: React.CSSProperties
}) {
  const [loaded, setLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>(webpSrc)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768
    const targetSrc = isMobile && mobileSrc ? mobileSrc : webpSrc

    const img = new Image()
    img.src = targetSrc

    if (img.complete) {
      queueMicrotask(() => {
        setImageSrc(targetSrc)
        setLoaded(true)
      })
      return
    }

    img.onload = () => {
      setImageSrc(targetSrc)
      setLoaded(true)
    }
    img.onerror = () => {
      if (fallbackSrc) {
        const fallbackImg = new Image()
        fallbackImg.src = fallbackSrc
        fallbackImg.onload = () => {
          setImageSrc(fallbackSrc)
          setLoaded(true)
        }
      }
    }
  }, [webpSrc, mobileSrc, fallbackSrc])

  return (
    <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Blur placeholder — instantly visible, fades out once HD loads */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ${loaded ? "opacity-0" : "opacity-100"} ${className}`}
        style={{
          backgroundImage: `url('${blurDataUrl}')`,
          filter: "blur(20px)",
          transform: "scale(1.1)", // Prevent blur edge artifacts
          ...style,
        }}
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
    </div>
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
      queueMicrotask(() => setLoaded(true))
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
        className={`relative h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      />
    </div>
  )
}
